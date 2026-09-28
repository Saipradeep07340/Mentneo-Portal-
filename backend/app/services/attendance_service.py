import uuid
import json
from datetime import datetime, date, time, timedelta
from zoneinfo import ZoneInfo
from fastapi import HTTPException, status
from backend.app.core.database import get_db
from backend.app.core.config import settings
import logging

logger = logging.getLogger("mentneo.attendance")

class AttendanceService:
    @staticmethod
    def get_current_time():
        tz = ZoneInfo(settings.TIMEZONE)
        return datetime.now(tz)

    @staticmethod
    def get_today_date():
        return AttendanceService.get_current_time().date()

    @staticmethod
    def check_in(employee_id: str, method: str = "FACE_RECOGNITION", notes: str = None, client_ip: str = None, user_agent: str = None):
        now = AttendanceService.get_current_time()
        today = now.date()

        with get_db() as cur:
            # 1. Check if on approved leave today
            cur.execute("""
                SELECT id, leave_type_id FROM leave_requests
                WHERE employee_id = %s AND status = 'APPROVED'
                  AND %s BETWEEN start_date AND end_date
            """, (employee_id, today))
            approved_leave = cur.fetchone()
            if approved_leave:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot check in: Employee has an approved leave scheduled for today."
                )

            # 2. Check existing attendance for today
            cur.execute("""
                SELECT id, check_in, check_out, status
                FROM attendance
                WHERE employee_id = %s AND date = %s
            """, (employee_id, today))
            existing = cur.fetchone()

            if existing and existing["check_in"] is not None:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Employee is already checked in for today."
                )

            # 3. Calculate Shift & Late Arrival
            # Shift Start: "09:00" -> 09:00 + grace period (15m) -> 09:15
            shift_parts = [int(p) for p in settings.SHIFT_START.split(":")]
            shift_start_dt = datetime.combine(today, time(shift_parts[0], shift_parts[1]), tzinfo=now.tzinfo)
            grace_cutoff = shift_start_dt + timedelta(minutes=settings.GRACE_PERIOD_MINUTES)

            is_late = False
            late_minutes = 0
            att_status = "PRESENT"

            if now > grace_cutoff:
                is_late = True
                late_minutes = int((now - shift_start_dt).total_seconds() // 60)
                att_status = "LATE"

            att_id = existing["id"] if existing else f"att_{today.strftime('%Y%m%d')}_{uuid.uuid4().hex[:6]}"

            if existing:
                cur.execute("""
                    UPDATE attendance SET
                        check_in = %s,
                        status = %s,
                        late_minutes = %s,
                        is_late = %s,
                        attendance_method = %s,
                        notes = COALESCE(%s, notes),
                        updated_at = NOW()
                    WHERE id = %s
                    RETURNING *;
                """, (now, att_status, late_minutes, is_late, method, notes, att_id))
            else:
                cur.execute("""
                    INSERT INTO attendance (
                        id, employee_id, date, check_in, status, late_minutes, is_late, attendance_method, notes
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING *;
                """, (att_id, employee_id, today, now, att_status, late_minutes, is_late, method, notes))

            record = cur.fetchone()

            # Record audit log
            cur.execute("""
                INSERT INTO audit_logs (id, employee_id, action, entity_type, entity_id, details, ip_address, user_agent)
                VALUES (%s, %s, 'CHECK_IN', 'ATTENDANCE', %s, %s, %s, %s)
            """, (
                f"aud_{uuid.uuid4().hex[:12]}",
                employee_id,
                att_id,
                json.dumps({"method": method, "time": now.isoformat(), "is_late": is_late, "late_minutes": late_minutes}),
                client_ip,
                user_agent
            ))

        return AttendanceService._format_attendance_record(record)

    @staticmethod
    def start_break(employee_id: str, reason: str = "Regular Break", client_ip: str = None, user_agent: str = None):
        now = AttendanceService.get_current_time()
        today = now.date()

        with get_db() as cur:
            cur.execute("""
                SELECT id, check_in, check_out FROM attendance
                WHERE employee_id = %s AND date = %s
            """, (employee_id, today))
            att = cur.fetchone()

            if not att or not att["check_in"]:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot start a break before checking in for the day."
                )
            if att["check_out"]:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot start a break after checking out."
                )

            # Check if there is already an active break
            cur.execute("""
                SELECT id FROM attendance_breaks
                WHERE attendance_id = %s AND break_end IS NULL
            """, (att["id"],))
            active_break = cur.fetchone()
            if active_break:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="A break is already in progress. End current break before starting a new one."
                )

            break_id = f"brk_{uuid.uuid4().hex[:12]}"
            cur.execute("""
                INSERT INTO attendance_breaks (id, attendance_id, employee_id, break_start, reason)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING *;
            """, (break_id, att["id"], employee_id, now, reason))
            new_break = cur.fetchone()

            # Audit
            cur.execute("""
                INSERT INTO audit_logs (id, employee_id, action, entity_type, entity_id, details, ip_address, user_agent)
                VALUES (%s, %s, 'BREAK_STARTED', 'ATTENDANCE_BREAK', %s, %s, %s, %s)
            """, (
                f"aud_{uuid.uuid4().hex[:12]}",
                employee_id,
                break_id,
                json.dumps({"break_start": now.isoformat(), "reason": reason}),
                client_ip,
                user_agent
            ))

        return {
            "success": True,
            "message": "Break started.",
            "break": {
                "id": new_break["id"],
                "break_start": new_break["break_start"].isoformat(),
                "reason": new_break["reason"]
            }
        }

    @staticmethod
    def end_break(employee_id: str, client_ip: str = None, user_agent: str = None):
        now = AttendanceService.get_current_time()
        today = now.date()

        with get_db() as cur:
            cur.execute("""
                SELECT id, check_in, check_out FROM attendance
                WHERE employee_id = %s AND date = %s
            """, (employee_id, today))
            att = cur.fetchone()
            if not att or not att["check_in"]:
                raise HTTPException(status_code=400, detail="No active attendance record found today.")

            # Find active break
            cur.execute("""
                SELECT id, break_start FROM attendance_breaks
                WHERE attendance_id = %s AND break_end IS NULL
                ORDER BY break_start DESC LIMIT 1
            """, (att["id"],))
            active_break = cur.fetchone()
            if not active_break:
                raise HTTPException(status_code=400, detail="No active break currently in progress to end.")

            start_dt = active_break["break_start"]
            duration_minutes = max(1, int((now - start_dt).total_seconds() // 60))

            cur.execute("""
                UPDATE attendance_breaks SET
                    break_end = %s,
                    duration_minutes = %s,
                    updated_at = NOW()
                WHERE id = %s
                RETURNING *;
            """, (now, duration_minutes, active_break["id"]))
            closed_break = cur.fetchone()

            # Recalculate total break duration for this attendance
            cur.execute("""
                SELECT COALESCE(SUM(duration_minutes), 0) as total_break
                FROM attendance_breaks
                WHERE attendance_id = %s AND break_end IS NOT NULL
            """, (att["id"],))
            total_breaks = cur.fetchone()["total_break"]

            cur.execute("""
                UPDATE attendance SET
                    total_break_minutes = %s,
                    updated_at = NOW()
                WHERE id = %s
            """, (total_breaks, att["id"]))

            # Audit
            cur.execute("""
                INSERT INTO audit_logs (id, employee_id, action, entity_type, entity_id, details, ip_address, user_agent)
                VALUES (%s, %s, 'BREAK_ENDED', 'ATTENDANCE_BREAK', %s, %s, %s, %s)
            """, (
                f"aud_{uuid.uuid4().hex[:12]}",
                employee_id,
                active_break["id"],
                json.dumps({"break_end": now.isoformat(), "duration_minutes": duration_minutes, "total_breaks": total_breaks}),
                client_ip,
                user_agent
            ))

        return {
            "success": True,
            "message": "Break ended successfully.",
            "duration_minutes": duration_minutes,
            "total_break_minutes": total_breaks
        }

    @staticmethod
    def check_out(employee_id: str, method: str = "FACE_RECOGNITION", client_ip: str = None, user_agent: str = None):
        now = AttendanceService.get_current_time()
        today = now.date()

        with get_db() as cur:
            cur.execute("""
                SELECT * FROM attendance
                WHERE employee_id = %s AND date = %s
            """, (employee_id, today))
            att = cur.fetchone()

            if not att or not att["check_in"]:
                raise HTTPException(status_code=400, detail="Cannot check out: No active check-in record found for today.")
            if att["check_out"]:
                raise HTTPException(status_code=400, detail="Employee has already checked out for today.")

            # 1. Close any dangling break
            cur.execute("""
                SELECT id, break_start FROM attendance_breaks
                WHERE attendance_id = %s AND break_end IS NULL
            """, (att["id"],))
            open_break = cur.fetchone()
            if open_break:
                brk_mins = max(1, int((now - open_break["break_start"]).total_seconds() // 60))
                cur.execute("""
                    UPDATE attendance_breaks SET break_end = %s, duration_minutes = %s, updated_at = NOW()
                    WHERE id = %s
                """, (now, brk_mins, open_break["id"]))

            # 2. Sum up total breaks
            cur.execute("""
                SELECT COALESCE(SUM(duration_minutes), 0) as total_break
                FROM attendance_breaks
                WHERE attendance_id = %s AND break_end IS NOT NULL
            """, (att["id"],))
            total_breaks = cur.fetchone()["total_break"]

            # 3. Compute presence & net working time
            check_in_dt = att["check_in"]
            total_presence = int((now - check_in_dt).total_seconds() // 60)
            net_work = max(0, total_presence - total_breaks)

            # 4. Early Departure check (Expected End: "18:00")
            shift_end_parts = [int(p) for p in settings.SHIFT_END.split(":")]
            shift_end_dt = datetime.combine(today, time(shift_end_parts[0], shift_end_parts[1]), tzinfo=now.tzinfo)

            is_early = False
            early_minutes = 0
            if now < shift_end_dt:
                is_early = True
                early_minutes = int((shift_end_dt - now).total_seconds() // 60)

            # 5. Overtime check (after EXPECTED_WORK_MINUTES e.g. 480m)
            overtime_minutes = 0
            if net_work > settings.EXPECTED_WORK_MINUTES:
                overtime_minutes = net_work - settings.EXPECTED_WORK_MINUTES

            # 6. Final Status resolution
            final_status = att["status"]
            if net_work < settings.HALF_DAY_MINUTES:
                final_status = "HALF_DAY"
            elif att["is_late"]:
                final_status = "LATE"
            else:
                final_status = "PRESENT"

            cur.execute("""
                UPDATE attendance SET
                    check_out = %s,
                    total_presence_minutes = %s,
                    total_break_minutes = %s,
                    net_work_minutes = %s,
                    early_departure_minutes = %s,
                    is_early = %s,
                    overtime_minutes = %s,
                    status = %s,
                    updated_at = NOW()
                WHERE id = %s
                RETURNING *;
            """, (
                now, total_presence, total_breaks, net_work, early_minutes, is_early, overtime_minutes, final_status, att["id"]
            ))
            updated = cur.fetchone()

            # Audit
            cur.execute("""
                INSERT INTO audit_logs (id, employee_id, action, entity_type, entity_id, details, ip_address, user_agent)
                VALUES (%s, %s, 'CHECK_OUT', 'ATTENDANCE', %s, %s, %s, %s)
            """, (
                f"aud_{uuid.uuid4().hex[:12]}",
                employee_id,
                att["id"],
                json.dumps({
                    "check_out": now.isoformat(),
                    "net_work_minutes": net_work,
                    "overtime_minutes": overtime_minutes,
                    "final_status": final_status
                }),
                client_ip,
                user_agent
            ))

        return AttendanceService._format_attendance_record(updated)

    @staticmethod
    def get_today_status(employee_id: str):
        now = AttendanceService.get_current_time()
        today = now.date()

        with get_db() as cur:
            cur.execute("""
                SELECT a.*, d.name as department_name, e.designation
                FROM attendance a
                JOIN employees e ON a.employee_id = e.id
                LEFT JOIN departments d ON e.department_id = d.id
                WHERE a.employee_id = %s AND a.date = %s
            """, (employee_id, today))
            att = cur.fetchone()

            if not att:
                # Return empty day template
                return {
                    "has_attendance": False,
                    "date": today.isoformat(),
                    "status": "NOT_CHECKED_IN",
                    "check_in": None,
                    "check_out": None,
                    "is_on_break": False,
                    "working_minutes": 0,
                    "break_minutes": 0,
                    "overtime_minutes": 0,
                    "formatted_working_hours": "00h 00m",
                    "formatted_break_time": "00h 00m",
                    "breaks": []
                }

            # Check if break is in progress
            cur.execute("""
                SELECT * FROM attendance_breaks
                WHERE attendance_id = %s
                ORDER BY break_start ASC
            """, (att["id"],))
            breaks = cur.fetchall()

            active_break = next((b for b in breaks if b["break_end"] is None), None)

            # If checked in and not checked out, calculate dynamic live work minutes
            if att["check_in"] and not att["check_out"]:
                total_presence = int((now - att["check_in"]).total_seconds() // 60)
                # Compute total completed break minutes + active break elapsed
                completed_breaks = sum(b["duration_minutes"] for b in breaks if b["duration_minutes"])
                active_break_mins = int((now - active_break["break_start"]).total_seconds() // 60) if active_break else 0
                current_total_break = completed_breaks + active_break_mins
                current_net_work = max(0, total_presence - current_total_break)
            else:
                current_net_work = att["net_work_minutes"] or 0
                current_total_break = att["total_break_minutes"] or 0

            return {
                "has_attendance": True,
                "id": att["id"],
                "date": att["date"].isoformat(),
                "status": att["status"],
                "check_in": att["check_in"].strftime("%I:%M %p") if att["check_in"] else None,
                "check_out": att["check_out"].strftime("%I:%M %p") if att["check_out"] else None,
                "is_late": att["is_late"],
                "late_minutes": att["late_minutes"],
                "is_early": att["is_early"],
                "early_departure_minutes": att["early_departure_minutes"],
                "overtime_minutes": att["overtime_minutes"],
                "working_minutes": current_net_work,
                "break_minutes": current_total_break,
                "formatted_working_hours": f"{current_net_work // 60:02d}h {current_net_work % 60:02d}m",
                "formatted_break_time": f"{current_total_break // 60:02d}h {current_total_break % 60:02d}m",
                "is_on_break": active_break is not None,
                "active_break_start": active_break["break_start"].isoformat() if active_break else None,
                "breaks": [
                    {
                        "id": b["id"],
                        "start": b["break_start"].strftime("%I:%M %p"),
                        "end": b["break_end"].strftime("%I:%M %p") if b["break_end"] else "In Progress",
                        "duration": b["duration_minutes"] or 0
                    } for b in breaks
                ]
            }

    @staticmethod
    def get_attendance_history(employee_id: str, month: int = None, year: int = None, status_filter: str = None):
        today = AttendanceService.get_today_date()
        target_year = year or today.year
        target_month = month or today.month

        with get_db() as cur:
            query = """
                SELECT * FROM attendance
                WHERE employee_id = %s
                  AND EXTRACT(YEAR FROM date) = %s
                  AND EXTRACT(MONTH FROM date) = %s
            """
            params = [employee_id, target_year, target_month]

            if status_filter and status_filter.upper() != "ALL":
                query += " AND status = %s"
                params.append(status_filter.upper())

            query += " ORDER BY date DESC;"
            cur.execute(query, tuple(params))
            rows = cur.fetchall()

            history = [AttendanceService._format_attendance_record(r) for r in rows]

            # Fetch corrections
            cur.execute("""
                SELECT * FROM attendance_corrections
                WHERE employee_id = %s
                ORDER BY created_at DESC LIMIT 10
            """, (employee_id,))
            corrections = cur.fetchall()

        return {
            "year": target_year,
            "month": target_month,
            "count": len(history),
            "history": history,
            "corrections": [
                {
                    "id": c["id"],
                    "date": c["date"].isoformat(),
                    "requestedCheckIn": c["requested_check_in"],
                    "requestedCheckOut": c["requested_check_out"],
                    "reason": c["reason"],
                    "status": c["status"],
                    "comments": c["approver_comments"],
                    "createdAt": c["created_at"].isoformat()
                } for c in corrections
            ]
        }

    @staticmethod
    def get_monthly_summary(employee_id: str, month: int = None, year: int = None):
        today = AttendanceService.get_today_date()
        target_year = year or today.year
        target_month = month or today.month

        with get_db() as cur:
            cur.execute("""
                SELECT status, COUNT(*) as count,
                       SUM(net_work_minutes) as total_work,
                       SUM(overtime_minutes) as total_ot
                FROM attendance
                WHERE employee_id = %s
                  AND EXTRACT(YEAR FROM date) = %s
                  AND EXTRACT(MONTH FROM date) = %s
                GROUP BY status
            """, (employee_id, target_year, target_month))
            status_counts = cur.fetchall()

            # Holidays in this month
            cur.execute("""
                SELECT COUNT(*) as count FROM company_holidays
                WHERE EXTRACT(YEAR FROM date) = %s
                  AND EXTRACT(MONTH FROM date) = %s
            """, (target_year, target_month))
            holidays_count = cur.fetchone()["count"]

            # Leaves in this month
            cur.execute("""
                SELECT COALESCE(SUM(days_count), 0) as count FROM leave_requests
                WHERE employee_id = %s AND status = 'APPROVED'
                  AND EXTRACT(YEAR FROM start_date) = %s
                  AND EXTRACT(MONTH FROM start_date) = %s
            """, (employee_id, target_year, target_month))
            leave_count = cur.fetchone()["count"]

        counts = {r["status"]: r["count"] for r in status_counts}
        total_work_mins = sum(r["total_work"] or 0 for r in status_counts)
        total_ot_mins = sum(r["total_ot"] or 0 for r in status_counts)

        present = counts.get("PRESENT", 0)
        late = counts.get("LATE", 0)
        half_day = counts.get("HALF_DAY", 0)
        absent = counts.get("ABSENT", 0)
        total_working_days = present + late + half_day

        return {
            "month": target_month,
            "year": target_year,
            "working_days": total_working_days,
            "present": present,
            "late": late,
            "half_days": half_day,
            "absent": absent,
            "leave": leave_count,
            "holidays": holidays_count,
            "total_working_minutes": total_work_mins,
            "total_overtime_minutes": total_ot_mins,
            "formatted_total_hours": f"{total_work_mins // 60}h {total_work_mins % 60}m",
            "formatted_overtime": f"{total_ot_mins // 60}h {total_ot_mins % 60}m"
        }

    @staticmethod
    def request_correction(employee_id: str, corr_date: date, requested_in: str, requested_out: str, reason: str, client_ip: str = None, user_agent: str = None):
        corr_id = f"corr_{uuid.uuid4().hex[:12]}"
        with get_db() as cur:
            cur.execute("""
                INSERT INTO attendance_corrections (
                    id, employee_id, date, requested_check_in, requested_check_out, reason, status
                )
                VALUES (%s, %s, %s, %s, %s, %s, 'PENDING')
                RETURNING *;
            """, (corr_id, employee_id, corr_date, requested_in, requested_out, reason))
            row = cur.fetchone()

            cur.execute("""
                INSERT INTO audit_logs (id, employee_id, action, entity_type, entity_id, details, ip_address, user_agent)
                VALUES (%s, %s, 'ATTENDANCE_CORRECTION_REQUESTED', 'ATTENDANCE', %s, %s, %s, %s)
            """, (
                f"aud_{uuid.uuid4().hex[:12]}",
                employee_id,
                corr_id,
                json.dumps({"date": corr_date.isoformat(), "reason": reason}),
                client_ip,
                user_agent
            ))

        return {
            "success": True,
            "message": "Attendance correction request submitted for supervisor approval.",
            "correction_id": row["id"]
        }

    @staticmethod
    def _format_attendance_record(r: dict):
        if not r:
            return None
        net = r["net_work_minutes"] or 0
        brk = r["total_break_minutes"] or 0
        return {
            "id": r["id"],
            "employeeId": r["employee_id"],
            "date": r["date"].isoformat(),
            "checkIn": r["check_in"].strftime("%I:%M %p") if r["check_in"] else "-",
            "checkOut": r["check_out"].strftime("%I:%M %p") if r["check_out"] else "-",
            "status": r["status"],
            "workingMinutes": net,
            "breakMinutes": brk,
            "lateMinutes": r["late_minutes"] or 0,
            "earlyDepartureMinutes": r["early_departure_minutes"] or 0,
            "overtimeMinutes": r["overtime_minutes"] or 0,
            "isLate": bool(r["is_late"]),
            "isEarly": bool(r["is_early"]),
            "formattedWorkingHours": f"{net // 60:02d}h {net % 60:02d}m",
            "formattedBreakTime": f"{brk // 60:02d}h {brk % 60:02d}m",
            "method": r["attendance_method"]
        }
