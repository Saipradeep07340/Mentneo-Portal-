from fastapi import APIRouter, Depends, HTTPException, Request, Query, UploadFile, File, Form, status
from typing import Optional
from backend.app.core.security import get_current_employee
from backend.app.schemas.attendance import AttendanceActionPayload, BreakStartPayload, CorrectionRequestPayload
from backend.app.services.attendance_service import AttendanceService
from backend.app.services.face_service import FaceService
from backend.app.utils.image_processing import load_image_from_bytes_or_base64

router = APIRouter(prefix="/attendance", tags=["Attendance Tracking"])

@router.post("/check-in")
async def check_in(
    request: Request,
    image_file: Optional[UploadFile] = File(None),
    payload: Optional[AttendanceActionPayload] = None,
    current_employee: dict = Depends(get_current_employee)
):
    """
    Performs Clock-In for the authenticated employee:
    If a face capture is submitted, verifies biometrics through the ArcFace/SFace pipeline first,
    then automatically calculates shift timeliness and persists the attendance record.
    """
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")

    # If image provided in request, perform face verification first
    image = None
    if image_file:
        content = await image_file.read()
        image = load_image_from_bytes_or_base64(content)
    elif payload and payload.image:
        image = load_image_from_bytes_or_base64(payload.image)

    method = "FACE_RECOGNITION"
    if image is not None:
        FaceService.verify_face(current_employee["id"], image, action="CHECK_IN", client_ip=client_ip, user_agent=user_agent)

    notes = payload.notes if payload else None
    result = AttendanceService.check_in(current_employee["id"], method=method, notes=notes, client_ip=client_ip, user_agent=user_agent)
    return {
        "success": True,
        "message": f"Clock In recorded successfully at {result['checkIn']}.",
        "attendance": result
    }

@router.post("/check-out")
async def check_out(
    request: Request,
    image_file: Optional[UploadFile] = File(None),
    payload: Optional[AttendanceActionPayload] = None,
    current_employee: dict = Depends(get_current_employee)
):
    """
    Performs Clock-Out for the authenticated employee:
    Verifies biometrics if image provided, closes running breaks, and automatically calculates:
    - Total presence duration
    - Total break duration
    - Net working hours
    - Early departure minutes
    - Overtime minutes
    - Final attendance status (PRESENT / LATE / HALF_DAY)
    """
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")

    image = None
    if image_file:
        content = await image_file.read()
        image = load_image_from_bytes_or_base64(content)
    elif payload and payload.image:
        image = load_image_from_bytes_or_base64(payload.image)

    method = "FACE_RECOGNITION"
    if image is not None:
        FaceService.verify_face(current_employee["id"], image, action="CHECK_OUT", client_ip=client_ip, user_agent=user_agent)

    result = AttendanceService.check_out(current_employee["id"], method=method, client_ip=client_ip, user_agent=user_agent)
    return {
        "success": True,
        "message": f"Clock Out recorded at {result['checkOut']}. Worked: {result['formattedWorkingHours']}.",
        "attendance": result
    }

@router.post("/break/start")
async def break_start(
    request: Request,
    payload: Optional[BreakStartPayload] = None,
    current_employee: dict = Depends(get_current_employee)
):
    """
    Initiates a new break period. Validates that employee is checked in and not currently on break.
    """
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")
    reason = payload.reason if payload else "Regular Break"
    result = AttendanceService.start_break(current_employee["id"], reason=reason, client_ip=client_ip, user_agent=user_agent)
    return result

@router.post("/break/end")
async def break_end(
    request: Request,
    current_employee: dict = Depends(get_current_employee)
):
    """
    Terminates active break period and updates total break minutes.
    """
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")
    result = AttendanceService.end_break(current_employee["id"], client_ip=client_ip, user_agent=user_agent)
    return result

@router.get("/today")
async def get_today(current_employee: dict = Depends(get_current_employee)):
    """
    Fetches the live attendance card state for today including active break and worked minutes.
    """
    return AttendanceService.get_today_status(current_employee["id"])

@router.get("/history")
async def get_history(
    month: Optional[int] = Query(None, ge=1, le=12),
    year: Optional[int] = Query(None, ge=2020, le=2050),
    status: Optional[str] = Query("ALL"),
    current_employee: dict = Depends(get_current_employee)
):
    """
    Retrieves filtered attendance records and regularizations for the selected month/year.
    """
    return AttendanceService.get_attendance_history(current_employee["id"], month=month, year=year, status_filter=status)

@router.get("/monthly")
async def get_monthly(
    month: Optional[int] = Query(None, ge=1, le=12),
    year: Optional[int] = Query(None, ge=2020, le=2050),
    current_employee: dict = Depends(get_current_employee)
):
    """
    Alias for monthly timesheet view.
    """
    return AttendanceService.get_attendance_history(current_employee["id"], month=month, year=year)

@router.get("/summary")
async def get_summary(
    month: Optional[int] = Query(None, ge=1, le=12),
    year: Optional[int] = Query(None, ge=2020, le=2050),
    current_employee: dict = Depends(get_current_employee)
):
    """
    Calculates monthly attendance summary metrics (working days, present, late, half days, overtime).
    """
    return AttendanceService.get_monthly_summary(current_employee["id"], month=month, year=year)

@router.post("/correction")
async def request_correction(
    payload: CorrectionRequestPayload,
    request: Request,
    current_employee: dict = Depends(get_current_employee)
):
    """
    Submits an attendance regularization/correction request for supervisor review.
    """
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")
    return AttendanceService.request_correction(
        employee_id=current_employee["id"],
        corr_date=payload.date,
        requested_in=payload.requestedCheckIn,
        requested_out=payload.requestedCheckOut,
        reason=payload.reason,
        client_ip=client_ip,
        user_agent=user_agent
    )
