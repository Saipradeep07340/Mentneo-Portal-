import express from 'express';
import crypto from 'node:crypto';
import bcryptjs from 'bcryptjs';
import db from '../db.js';
import { authenticateEmployee } from '../middleware/auth.js';
import { logAudit } from '../services/auditService.js';

const router = express.Router();

// Helper to format ISO time in HH:MM AM/PM
function formatTime(dateObj = new Date()) {
  return dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function getTodayString() {
  return new Date().toISOString().slice(0, 10);
}

// ==================== DASHBOARD OVERVIEW ====================
router.get('/dashboard', authenticateEmployee, (req, res) => {
  try {
    const empId = req.employee.id;
    const today = getTodayString();

    // 1. Attendance Card Data
    const attendance = db.prepare(`
      SELECT * FROM attendance WHERE employee_id = ? AND date = ?
    `).get(empId, today);

    let activeBreak = null;
    if (attendance) {
      activeBreak = db.prepare(`
        SELECT * FROM attendance_breaks 
        WHERE attendance_id = ? AND end_time IS NULL 
        ORDER BY created_at DESC LIMIT 1
      `).get(attendance.id);
    }

    // 2. Task Card Data
    const taskStats = db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'IN_PROGRESS' THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status != 'COMPLETED' AND due_date < ? THEN 1 ELSE 0 END) as overdue
      FROM tasks
      WHERE assigned_to = ?
    `).get(today, empId);

    const urgentTasks = db.prepare(`
      SELECT id, task_code, title, priority, status, progress, due_date
      FROM tasks
      WHERE assigned_to = ? AND status != 'COMPLETED'
      ORDER BY 
        CASE priority WHEN 'URGENT' THEN 1 WHEN 'HIGH' THEN 2 WHEN 'MEDIUM' THEN 3 ELSE 4 END,
        due_date ASC
      LIMIT 4
    `).all(empId);

    // 3. Leave Card Data
    const leaveBalances = db.prepare(`
      SELECT 
        lb.total_entitlement,
        lb.used_days,
        lb.pending_days,
        (lb.total_entitlement - lb.used_days - lb.pending_days) as available_days,
        lt.name as leave_type_name,
        lt.code as leave_type_code
      FROM leave_balances lb
      JOIN leave_types lt ON lb.leave_type_id = lt.id
      WHERE lb.employee_id = ? AND lb.year = ?
    `).all(empId, new Date().getFullYear());

    const totalLeaveBalance = leaveBalances.reduce((acc, curr) => ({
      total: acc.total + curr.total_entitlement,
      used: acc.used + curr.used_days,
      pending: acc.pending + curr.pending_days,
      available: acc.available + curr.available_days
    }), { total: 0, used: 0, pending: 0, available: 0 });

    // 4. Daily Work Card Data
    const todayWorkLogs = db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(hours_spent), 0) as total_hours
      FROM work_logs
      WHERE employee_id = ? AND date = ?
    `).get(empId, today);

    const todayReport = db.prepare(`
      SELECT id, status, submitted_at FROM daily_reports
      WHERE employee_id = ? AND date = ?
    `).get(empId, today);

    // 5. Performance Card Data
    const goalStats = db.prepare(`
      SELECT 
        COUNT(*) as total_goals,
        COALESCE(AVG(progress_percent), 0) as avg_progress,
        SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) as completed_goals
      FROM employee_goals
      WHERE employee_id = ?
    `).get(empId);

    const recentFeedback = db.prepare(`
      SELECT review_period, reviewer_name, overall_rating, feedback, review_date
      FROM performance_reviews
      WHERE employee_id = ?
      ORDER BY review_date DESC LIMIT 1
    `).get(empId);

    // 6. Notifications Card Data
    const unreadNotifCount = db.prepare(`
      SELECT COUNT(*) as count FROM notifications WHERE employee_id = ? AND is_read = 0
    `).get(empId).count;

    const latestNotifications = db.prepare(`
      SELECT * FROM notifications 
      WHERE employee_id = ? 
      ORDER BY created_at DESC LIMIT 4
    `).all(empId);

    // 7. Announcements Card Data
    const announcements = db.prepare(`
      SELECT a.*, 
        EXISTS(SELECT 1 FROM announcement_reads r WHERE r.announcement_id = a.id AND r.employee_id = ?) as is_read
      FROM announcements a
      WHERE a.department_id IS NULL OR a.department_id = ?
      ORDER BY a.published_at DESC LIMIT 3
    `).all(empId, req.employee.departmentId);

    res.json({
      employee: req.employee,
      attendance: {
        record: attendance || null,
        activeBreak: activeBreak || null,
        today
      },
      tasks: {
        stats: taskStats,
        urgentTasks
      },
      leave: {
        summary: totalLeaveBalance,
        breakdown: leaveBalances
      },
      dailyWork: {
        workLogsCount: todayWorkLogs.count,
        totalHoursToday: todayWorkLogs.total_hours,
        reportStatus: todayReport ? todayReport.status : 'NOT_STARTED',
        reportId: todayReport ? todayReport.id : null
      },
      performance: {
        goals: goalStats,
        feedback: recentFeedback || null
      },
      notifications: {
        unreadCount: unreadNotifCount,
        latest: latestNotifications
      },
      announcements
    });
  } catch (error) {
    console.error('Dashboard API Error:', error);
    res.status(500).json({ error: 'Failed to load dashboard data.' });
  }
});

// ==================== ATTENDANCE MODULE ====================

// GET attendance history & today's status
router.get('/attendance', authenticateEmployee, (req, res) => {
  try {
    const empId = req.employee.id;
    const { period, startDate, endDate } = req.query;
    const today = getTodayString();

    let query = 'SELECT * FROM attendance WHERE employee_id = ?';
    const params = [empId];

    if (period === 'today') {
      query += ' AND date = ?';
      params.push(today);
    } else if (period === 'this_week') {
      query += " AND date >= date('now', 'weekday 0', '-6 days') AND date <= date('now')";
    } else if (period === 'this_month') {
      query += " AND date >= date('now', 'start of month') AND date <= date('now')";
    } else if (startDate && endDate) {
      query += ' AND date >= ? AND date <= ?';
      params.push(startDate, endDate);
    }

    query += ' ORDER BY date DESC';

    const records = db.prepare(query).all(...params);

    // Get today's record and active break
    const todayRecord = records.find(r => r.date === today) || null;
    let activeBreak = null;
    if (todayRecord) {
      activeBreak = db.prepare(`
        SELECT * FROM attendance_breaks 
        WHERE attendance_id = ? AND end_time IS NULL 
        ORDER BY created_at DESC LIMIT 1
      `).get(todayRecord.id);
    }

    // Breaks for records
    const breaks = db.prepare(`
      SELECT * FROM attendance_breaks WHERE employee_id = ? ORDER BY start_time DESC
    `).all(empId);

    res.json({
      todayRecord,
      activeBreak,
      history: records,
      breaks
    });
  } catch (error) {
    console.error('Attendance GET error:', error);
    res.status(500).json({ error: 'Failed to retrieve attendance records.' });
  }
});

// POST Check In
router.post('/attendance/check-in', authenticateEmployee, (req, res) => {
  try {
    const empId = req.employee.id;
    const today = getTodayString();
    const { method = 'STANDARD' } = req.body;

    const existing = db.prepare('SELECT * FROM attendance WHERE employee_id = ? AND date = ?').get(empId, today);
    if (existing && existing.check_in) {
      return res.status(400).json({ error: `Already checked in today at ${existing.check_in}` });
    }

    const checkInTime = formatTime();
    
    // Check if late (after 09:30 AM)
    const now = new Date();
    const isLate = (now.getHours() > 9 || (now.getHours() === 9 && now.getMinutes() > 30)) ? 1 : 0;
    const status = isLate ? 'LATE' : 'PRESENT';

    const id = existing ? existing.id : `att_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    if (existing) {
      db.prepare(`
        UPDATE attendance 
        SET check_in = ?, status = ?, is_late = ?, check_in_method = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(checkInTime, status, isLate, method, existing.id);
    } else {
      db.prepare(`
        INSERT INTO attendance (id, employee_id, date, check_in, status, is_late, check_in_method)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(id, empId, today, checkInTime, status, isLate, method);
    }

    logAudit({
      employeeId: empId,
      action: 'CHECK_IN',
      entityType: 'ATTENDANCE',
      entityId: id,
      req,
      details: { checkInTime, method, isLate }
    });

    const updated = db.prepare('SELECT * FROM attendance WHERE id = ?').get(id);
    res.json({ success: true, message: `Successfully checked in at ${checkInTime}`, record: updated });
  } catch (error) {
    console.error('Check-in error:', error);
    res.status(500).json({ error: 'Failed to record check-in.' });
  }
});

// POST Check Out
router.post('/attendance/check-out', authenticateEmployee, (req, res) => {
  try {
    const empId = req.employee.id;
    const today = getTodayString();

    const attendance = db.prepare('SELECT * FROM attendance WHERE employee_id = ? AND date = ?').get(empId, today);
    if (!attendance || !attendance.check_in) {
      return res.status(400).json({ error: 'Cannot check out before checking in.' });
    }
    if (attendance.check_out) {
      return res.status(400).json({ error: `Already checked out today at ${attendance.check_out}` });
    }

    // If an active break is ongoing, auto-end it
    const activeBreak = db.prepare(`
      SELECT * FROM attendance_breaks WHERE attendance_id = ? AND end_time IS NULL
    `).get(attendance.id);

    const checkOutTime = formatTime();
    let totalBreakMinutes = attendance.total_break_minutes || 0;

    if (activeBreak) {
      const breakEndTime = checkOutTime;
      const breakDuration = 15; // default closed duration
      totalBreakMinutes += breakDuration;
      db.prepare(`
        UPDATE attendance_breaks SET end_time = ?, duration_minutes = ? WHERE id = ?
      `).run(breakEndTime, breakDuration, activeBreak.id);
    }

    // Calculate working minutes roughly based on normal work day or 8 hours
    const now = new Date();
    const isEarly = (now.getHours() < 17 || (now.getHours() === 17 && now.getMinutes() < 30)) ? 1 : 0;
    
    // Calculate total minutes worked
    const workingMinutes = Math.max(30, 480 - totalBreakMinutes);

    db.prepare(`
      UPDATE attendance 
      SET check_out = ?, total_working_minutes = ?, total_break_minutes = ?, is_early = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(checkOutTime, workingMinutes, totalBreakMinutes, isEarly, attendance.id);

    logAudit({
      employeeId: empId,
      action: 'CHECK_OUT',
      entityType: 'ATTENDANCE',
      entityId: attendance.id,
      req,
      details: { checkOutTime, workingMinutes, totalBreakMinutes, isEarly }
    });

    const updated = db.prepare('SELECT * FROM attendance WHERE id = ?').get(attendance.id);
    res.json({ success: true, message: `Successfully checked out at ${checkOutTime}`, record: updated });
  } catch (error) {
    console.error('Check-out error:', error);
    res.status(500).json({ error: 'Failed to record check-out.' });
  }
});

// POST Start Break
router.post('/attendance/break/start', authenticateEmployee, (req, res) => {
  try {
    const empId = req.employee.id;
    const today = getTodayString();
    const { reason = 'Standard Break' } = req.body;

    const attendance = db.prepare('SELECT * FROM attendance WHERE employee_id = ? AND date = ?').get(empId, today);
    if (!attendance || !attendance.check_in || attendance.check_out) {
      return res.status(400).json({ error: 'Breaks can only be taken during an active workday.' });
    }

    const activeBreak = db.prepare(`
      SELECT * FROM attendance_breaks WHERE attendance_id = ? AND end_time IS NULL
    `).get(attendance.id);

    if (activeBreak) {
      return res.status(400).json({ error: 'You already have an active break in progress.' });
    }

    const breakId = `brk_${Date.now()}`;
    const startTime = formatTime();

    db.prepare(`
      INSERT INTO attendance_breaks (id, attendance_id, employee_id, start_time, reason)
      VALUES (?, ?, ?, ?, ?)
    `).run(breakId, attendance.id, empId, startTime, reason);

    logAudit({
      employeeId: empId,
      action: 'BREAK_START',
      entityType: 'ATTENDANCE_BREAK',
      entityId: breakId,
      req,
      details: { startTime, reason }
    });

    res.json({ success: true, message: `Break started at ${startTime}`, breakId, startTime });
  } catch (error) {
    console.error('Break start error:', error);
    res.status(500).json({ error: 'Failed to start break.' });
  }
});

// POST End Break
router.post('/attendance/break/end', authenticateEmployee, (req, res) => {
  try {
    const empId = req.employee.id;
    const today = getTodayString();

    const attendance = db.prepare('SELECT * FROM attendance WHERE employee_id = ? AND date = ?').get(empId, today);
    if (!attendance) {
      return res.status(400).json({ error: 'No active attendance record found.' });
    }

    const activeBreak = db.prepare(`
      SELECT * FROM attendance_breaks WHERE attendance_id = ? AND end_time IS NULL ORDER BY created_at DESC LIMIT 1
    `).get(attendance.id);

    if (!activeBreak) {
      return res.status(400).json({ error: 'No active break to end.' });
    }

    const endTime = formatTime();
    const durationMinutes = 30; // 30 minutes nominal duration
    const newTotalBreaks = (attendance.total_break_minutes || 0) + durationMinutes;

    db.prepare(`
      UPDATE attendance_breaks SET end_time = ?, duration_minutes = ? WHERE id = ?
    `).run(endTime, durationMinutes, activeBreak.id);

    db.prepare(`
      UPDATE attendance SET total_break_minutes = ?, updated_at = datetime('now') WHERE id = ?
    `).run(newTotalBreaks, attendance.id);

    logAudit({
      employeeId: empId,
      action: 'BREAK_END',
      entityType: 'ATTENDANCE_BREAK',
      entityId: activeBreak.id,
      req,
      details: { endTime, durationMinutes, newTotalBreaks }
    });

    res.json({ success: true, message: `Break ended at ${endTime}`, durationMinutes });
  } catch (error) {
    console.error('Break end error:', error);
    res.status(500).json({ error: 'Failed to end break.' });
  }
});

// POST Request Attendance Correction
router.post('/attendance/correction', authenticateEmployee, (req, res) => {
  try {
    const empId = req.employee.id;
    const { date, requestedCheckIn, requestedCheckOut, reason } = req.body;

    if (!date || !requestedCheckIn || !requestedCheckOut || !reason) {
      return res.status(400).json({ error: 'Please provide date, requested check-in/out times, and reason.' });
    }

    const existing = db.prepare('SELECT * FROM attendance WHERE employee_id = ? AND date = ?').get(empId, date);
    const corrId = `corr_${Date.now()}`;

    db.prepare(`
      INSERT INTO attendance_corrections (
        id, employee_id, attendance_id, date, existing_check_in, existing_check_out,
        requested_check_in, requested_check_out, reason, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')
    `).run(
      corrId, empId, existing ? existing.id : null, date,
      existing ? existing.check_in : null, existing ? existing.check_out : null,
      requestedCheckIn, requestedCheckOut, reason
    );

    logAudit({
      employeeId: empId,
      action: 'CORRECTION_REQUEST',
      entityType: 'ATTENDANCE_CORRECTION',
      entityId: corrId,
      req,
      details: { date, requestedCheckIn, requestedCheckOut, reason }
    });

    res.json({ success: true, message: 'Attendance correction request submitted for manager review.', correctionId: corrId });
  } catch (error) {
    console.error('Correction request error:', error);
    res.status(500).json({ error: 'Failed to submit correction request.' });
  }
});

// GET Attendance Corrections
router.get('/attendance/corrections', authenticateEmployee, (req, res) => {
  try {
    const corrections = db.prepare(`
      SELECT * FROM attendance_corrections WHERE employee_id = ? ORDER BY created_at DESC
    `).all(req.employee.id);
    res.json({ corrections });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load correction requests.' });
  }
});

// ==================== FACE RECOGNITION MODULE ====================

// Helper for Euclidean distance calculation
function calculateVectorDistance(v1, v2) {
  if (v1.length !== v2.length) return 1.0;
  let sum = 0;
  for (let i = 0; i < v1.length; i++) {
    const diff = v1[i] - v2[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

// POST Register Face
router.post('/face/register', authenticateEmployee, (req, res) => {
  try {
    const empId = req.employee.id;
    const { templateData, qualityScore = 0.95, algorithm = 'MentneoFaceVector128' } = req.body;

    if (!templateData || !Array.isArray(templateData) || templateData.length < 32) {
      return res.status(400).json({ error: 'Invalid face template vector data. Face detection quality insufficient.' });
    }

    if (qualityScore < 0.6) {
      return res.status(400).json({ error: 'Face image quality too low. Ensure adequate front lighting and centered posture.' });
    }

    const templateString = JSON.stringify(templateData);
    const existing = db.prepare('SELECT id FROM face_enrollments WHERE employee_id = ?').get(empId);

    if (existing) {
      db.prepare(`
        UPDATE face_enrollments 
        SET template_data = ?, quality_score = ?, algorithm = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(templateString, qualityScore, algorithm, existing.id);
    } else {
      const id = `face_${Date.now()}`;
      db.prepare(`
        INSERT INTO face_enrollments (id, employee_id, template_data, algorithm, quality_score)
        VALUES (?, ?, ?, ?, ?)
      `).run(id, empId, templateString, algorithm, qualityScore);
    }

    logAudit({
      employeeId: empId,
      action: 'FACE_REGISTER',
      entityType: 'FACE_ENROLLMENT',
      entityId: empId,
      req,
      details: { qualityScore, vectorDim: templateData.length }
    });

    res.json({ success: true, message: 'Face biometric template registered securely.' });
  } catch (error) {
    console.error('Face register error:', error);
    res.status(500).json({ error: 'Failed to register face template.' });
  }
});

// POST Face Verification Check-In / Check-Out
router.post('/face/verify', authenticateEmployee, (req, res) => {
  try {
    const empId = req.employee.id;
    const { templateData, action = 'CHECK_IN' } = req.body;

    if (!templateData || !Array.isArray(templateData)) {
      return res.status(400).json({ error: 'No face descriptor supplied from camera.' });
    }

    const enrollment = db.prepare('SELECT * FROM face_enrollments WHERE employee_id = ?').get(empId);
    if (!enrollment) {
      return res.status(404).json({ 
        error: 'Face biometric not enrolled yet. Please complete Face Registration first.' 
      });
    }

    const registeredVector = JSON.parse(enrollment.template_data);
    const distance = calculateVectorDistance(registeredVector, templateData);
    const similarity = Math.max(0, 1 - (distance / 2));

    // Threshold for verification (0.65 similarity or Euclidean distance <= 0.70)
    const isMatched = similarity >= 0.65;

    if (!isMatched) {
      logAudit({
        employeeId: empId,
        action: 'FACE_VERIFY_FAILED',
        entityType: 'FACE_VERIFICATION',
        req,
        details: { similarity, action, result: 'REJECTED' }
      });
      return res.status(401).json({ 
        error: 'Face verification failed. Features did not match registered biometric profile.',
        similarity: Math.round(similarity * 100)
      });
    }

    // Verification passed: record attendance check-in or check-out
    const today = getTodayString();
    const timeStr = formatTime();

    if (action === 'CHECK_IN') {
      const existing = db.prepare('SELECT * FROM attendance WHERE employee_id = ? AND date = ?').get(empId, today);
      if (existing && existing.check_in) {
        return res.status(400).json({ error: `Already checked in today at ${existing.check_in}` });
      }

      const now = new Date();
      const isLate = (now.getHours() > 9 || (now.getHours() === 9 && now.getMinutes() > 30)) ? 1 : 0;
      const status = isLate ? 'LATE' : 'PRESENT';
      const id = existing ? existing.id : `att_${Date.now()}`;

      if (existing) {
        db.prepare(`
          UPDATE attendance 
          SET check_in = ?, status = ?, is_late = ?, check_in_method = 'FACE', updated_at = datetime('now')
          WHERE id = ?
        `).run(timeStr, status, isLate, existing.id);
      } else {
        db.prepare(`
          INSERT INTO attendance (id, employee_id, date, check_in, status, is_late, check_in_method)
          VALUES (?, ?, ?, ?, ?, ?, 'FACE')
        `).run(id, empId, today, timeStr, status, isLate);
      }

      logAudit({
        employeeId: empId,
        action: 'FACE_CHECK_IN',
        entityType: 'ATTENDANCE',
        entityId: id,
        req,
        details: { timeStr, similarity }
      });

      return res.json({
        success: true,
        message: `Face Verified! Checked in successfully at ${timeStr}`,
        similarity: Math.round(similarity * 100),
        record: db.prepare('SELECT * FROM attendance WHERE id = ?').get(id)
      });
    } else {
      // CHECK_OUT
      const attendance = db.prepare('SELECT * FROM attendance WHERE employee_id = ? AND date = ?').get(empId, today);
      if (!attendance || !attendance.check_in) {
        return res.status(400).json({ error: 'Cannot check out before checking in.' });
      }
      if (attendance.check_out) {
        return res.status(400).json({ error: `Already checked out today at ${attendance.check_out}` });
      }

      const workingMinutes = 480;
      db.prepare(`
        UPDATE attendance 
        SET check_out = ?, total_working_minutes = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(timeStr, workingMinutes, attendance.id);

      logAudit({
        employeeId: empId,
        action: 'FACE_CHECK_OUT',
        entityType: 'ATTENDANCE',
        entityId: attendance.id,
        req,
        details: { timeStr, similarity }
      });

      return res.json({
        success: true,
        message: `Face Verified! Checked out successfully at ${timeStr}`,
        similarity: Math.round(similarity * 100),
        record: db.prepare('SELECT * FROM attendance WHERE id = ?').get(attendance.id)
      });
    }
  } catch (error) {
    console.error('Face verification error:', error);
    res.status(500).json({ error: 'Face verification process encountered an error.' });
  }
});

// ==================== MY TASKS & TASK PROGRESS ====================

// GET employee tasks
router.get('/tasks', authenticateEmployee, (req, res) => {
  try {
    const empId = req.employee.id;
    const { status, priority, search } = req.query;
    const today = getTodayString();

    let query = 'SELECT * FROM tasks WHERE assigned_to = ?';
    const params = [empId];

    if (status && status !== 'all') {
      if (status === 'overdue') {
        query += " AND status != 'COMPLETED' AND due_date < ?";
        params.push(today);
      } else {
        query += ' AND status = ?';
        params.push(status.toUpperCase());
      }
    }

    if (priority && priority !== 'all') {
      query += ' AND priority = ?';
      params.push(priority.toUpperCase());
    }

    if (search) {
      query += ' AND (title LIKE ? OR description LIKE ? OR task_code LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY due_date ASC';

    const tasks = db.prepare(query).all(...params);
    res.json({ tasks });
  } catch (error) {
    console.error('Tasks GET error:', error);
    res.status(500).json({ error: 'Failed to retrieve tasks.' });
  }
});

// GET single task details with comments and activities
router.get('/tasks/:id', authenticateEmployee, (req, res) => {
  try {
    const empId = req.employee.id;
    const task = db.prepare('SELECT * FROM tasks WHERE id = ? AND assigned_to = ?').get(req.params.id, empId);

    if (!task) {
      return res.status(404).json({ error: 'Task not found or unauthorized.' });
    }

    const activities = db.prepare(`
      SELECT * FROM task_activities WHERE task_id = ? ORDER BY created_at DESC
    `).all(task.id);

    const comments = db.prepare(`
      SELECT tc.*, e.first_name, e.last_name, e.designation, e.avatar_url
      FROM task_comments tc
      JOIN employees e ON tc.employee_id = e.id
      WHERE tc.task_id = ?
      ORDER BY tc.created_at ASC
    `).all(task.id);

    res.json({ task, activities, comments });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve task details.' });
  }
});

// PATCH update task progress & status
router.patch('/tasks/:id/progress', authenticateEmployee, (req, res) => {
  try {
    const empId = req.employee.id;
    const taskId = req.params.id;
    const { progress, status, workUpdate, blockerNote } = req.body;

    const task = db.prepare('SELECT * FROM tasks WHERE id = ? AND assigned_to = ?').get(taskId, empId);
    if (!task) {
      return res.status(404).json({ error: 'Task not found or unauthorized.' });
    }

    const newProgress = progress !== undefined ? Math.min(100, Math.max(0, parseInt(progress, 10))) : task.progress;
    let newStatus = status ? status.toUpperCase() : task.status;

    if (newProgress === 100 && newStatus !== 'COMPLETED') {
      newStatus = 'COMPLETED';
    }

    const completedAt = newStatus === 'COMPLETED' ? new Date().toISOString() : task.completed_at;
    const newBlocker = blockerNote !== undefined ? blockerNote : task.blocker_note;

    db.prepare(`
      UPDATE tasks 
      SET progress = ?, status = ?, blocker_note = ?, completed_at = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(newProgress, newStatus, newBlocker, completedAt, taskId);

    // Append to immutable activity history
    const actId = `act_${Date.now()}`;
    const activityMsg = workUpdate || (newProgress === 100 ? 'Task marked completed and submitted for review' : `Progress updated to ${newProgress}%`);

    db.prepare(`
      INSERT INTO task_activities (id, task_id, employee_id, activity_type, message, old_progress, new_progress, old_status, new_status)
      VALUES (?, ?, ?, 'PROGRESS_UPDATE', ?, ?, ?, ?, ?)
    `).run(actId, taskId, empId, activityMsg, task.progress, newProgress, task.status, newStatus);

    logAudit({
      employeeId: empId,
      action: 'TASK_PROGRESS_UPDATE',
      entityType: 'TASK',
      entityId: taskId,
      req,
      details: { oldProgress: task.progress, newProgress, oldStatus: task.status, newStatus }
    });

    const updatedTask = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
    res.json({ success: true, message: 'Task progress updated successfully', task: updatedTask });
  } catch (error) {
    console.error('Task progress update error:', error);
    res.status(500).json({ error: 'Failed to update task progress.' });
  }
});

// POST add task comment
router.post('/tasks/:id/comments', authenticateEmployee, (req, res) => {
  try {
    const empId = req.employee.id;
    const taskId = req.params.id;
    const { comment, attachmentUrl, attachmentName } = req.body;

    if (!comment || !comment.trim()) {
      return res.status(400).json({ error: 'Comment text is required.' });
    }

    const task = db.prepare('SELECT id FROM tasks WHERE id = ? AND assigned_to = ?').get(taskId, empId);
    if (!task) {
      return res.status(404).json({ error: 'Task not found or unauthorized.' });
    }

    const commId = `tcom_${Date.now()}`;
    db.prepare(`
      INSERT INTO task_comments (id, task_id, employee_id, comment, attachment_url, attachment_name)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(commId, taskId, empId, comment.trim(), attachmentUrl || null, attachmentName || null);

    res.json({ success: true, message: 'Comment added.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to post comment.' });
  }
});

// ==================== DAILY WORK LOG ====================

// GET work logs
router.get('/work-logs', authenticateEmployee, (req, res) => {
  try {
    const empId = req.employee.id;
    const { date, taskId } = req.query;

    let query = `
      SELECT wl.*, t.title as task_title, t.task_code
      FROM work_logs wl
      LEFT JOIN tasks t ON wl.task_id = t.id
      WHERE wl.employee_id = ?
    `;
    const params = [empId];

    if (date) {
      query += ' AND wl.date = ?';
      params.push(date);
    }
    if (taskId) {
      query += ' AND wl.task_id = ?';
      params.push(taskId);
    }

    query += ' ORDER BY wl.date DESC, wl.created_at DESC';

    const logs = db.prepare(query).all(...params);
    const totalHours = logs.reduce((sum, l) => sum + (l.hours_spent || 0), 0);

    res.json({ logs, totalHours: Math.round(totalHours * 10) / 10 });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve work logs.' });
  }
});

// POST add work log
router.post('/work-logs', authenticateEmployee, (req, res) => {
  try {
    const empId = req.employee.id;
    const { taskId, date = getTodayString(), description, startTime, endTime, hoursSpent, status = 'COMPLETED', challenges, notes } = req.body;

    if (!description || !hoursSpent) {
      return res.status(400).json({ error: 'Work description and hours spent are required.' });
    }

    const id = `wl_${Date.now()}`;
    db.prepare(`
      INSERT INTO work_logs (id, employee_id, task_id, date, description, start_time, end_time, hours_spent, status, challenges, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, empId, taskId || null, date, description, startTime || null, endTime || null, parseFloat(hoursSpent), status, challenges || null, notes || null);

    logAudit({
      employeeId: empId,
      action: 'WORK_LOG_ADD',
      entityType: 'WORK_LOG',
      entityId: id,
      req,
      details: { date, hoursSpent, taskId }
    });

    res.json({ success: true, message: 'Work log recorded successfully.', logId: id });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save work log.' });
  }
});

// PATCH edit work log (Strictly allowed ONLY for today's logs)
router.patch('/work-logs/:id', authenticateEmployee, (req, res) => {
  try {
    const empId = req.employee.id;
    const logId = req.params.id;
    const today = getTodayString();

    const existing = db.prepare('SELECT * FROM work_logs WHERE id = ? AND employee_id = ?').get(logId, empId);
    if (!existing) {
      return res.status(404).json({ error: 'Work log not found.' });
    }

    if (existing.date !== today) {
      return res.status(403).json({ error: 'Historical work logs cannot be edited.' });
    }

    const { description, startTime, endTime, hoursSpent, challenges, notes } = req.body;

    db.prepare(`
      UPDATE work_logs 
      SET description = COALESCE(?, description),
          start_time = COALESCE(?, start_time),
          end_time = COALESCE(?, end_time),
          hours_spent = COALESCE(?, hours_spent),
          challenges = COALESCE(?, challenges),
          notes = COALESCE(?, notes),
          updated_at = datetime('now')
      WHERE id = ?
    `).run(description, startTime, endTime, hoursSpent ? parseFloat(hoursSpent) : null, challenges, notes, logId);

    logAudit({
      employeeId: empId,
      action: 'WORK_LOG_EDIT',
      entityType: 'WORK_LOG',
      entityId: logId,
      req
    });

    res.json({ success: true, message: 'Work log updated successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update work log.' });
  }
});

// ==================== DAILY REPORT MODULE ====================

// GET today's report
router.get('/daily-reports/today', authenticateEmployee, (req, res) => {
  try {
    const empId = req.employee.id;
    const today = getTodayString();
    const report = db.prepare('SELECT * FROM daily_reports WHERE employee_id = ? AND date = ?').get(empId, today);
    res.json({ report: report || null });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get today daily report.' });
  }
});

// GET all reports
router.get('/daily-reports', authenticateEmployee, (req, res) => {
  try {
    const reports = db.prepare(`
      SELECT * FROM daily_reports WHERE employee_id = ? ORDER BY date DESC
    `).all(req.employee.id);
    res.json({ reports });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve daily reports.' });
  }
});

// POST save draft / create report
router.post('/daily-reports', authenticateEmployee, (req, res) => {
  try {
    const empId = req.employee.id;
    const today = getTodayString();
    const { accomplishments, workInProgress, blockers, tomorrowPlan, additionalNotes, isSubmit = false } = req.body;

    if (!accomplishments || !accomplishments.trim()) {
      return res.status(400).json({ error: "Please provide today's accomplishments." });
    }

    const existing = db.prepare('SELECT * FROM daily_reports WHERE employee_id = ? AND date = ?').get(empId, today);
    const status = isSubmit ? 'SUBMITTED' : 'DRAFT';
    const submittedAt = isSubmit ? new Date().toISOString() : null;

    if (existing) {
      if (existing.status === 'SUBMITTED' && !isSubmit) {
        return res.status(400).json({ error: 'Report is already submitted.' });
      }
      db.prepare(`
        UPDATE daily_reports 
        SET accomplishments = ?, work_in_progress = ?, blockers = ?, tomorrow_plan = ?, additional_notes = ?,
            status = ?, submitted_at = COALESCE(?, submitted_at), updated_at = datetime('now')
        WHERE id = ?
      `).run(accomplishments, workInProgress || null, blockers || null, tomorrowPlan || null, additionalNotes || null, status, submittedAt, existing.id);

      logAudit({
        employeeId: empId,
        action: isSubmit ? 'DAILY_REPORT_SUBMIT' : 'DAILY_REPORT_SAVE_DRAFT',
        entityType: 'DAILY_REPORT',
        entityId: existing.id,
        req
      });

      return res.json({ success: true, message: isSubmit ? 'Daily report submitted successfully!' : 'Draft saved.', reportId: existing.id });
    } else {
      const id = `rep_${Date.now()}`;
      db.prepare(`
        INSERT INTO daily_reports (id, employee_id, date, accomplishments, work_in_progress, blockers, tomorrow_plan, additional_notes, status, submitted_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, empId, today, accomplishments, workInProgress || null, blockers || null, tomorrowPlan || null, additionalNotes || null, status, submittedAt);

      logAudit({
        employeeId: empId,
        action: isSubmit ? 'DAILY_REPORT_SUBMIT' : 'DAILY_REPORT_SAVE_DRAFT',
        entityType: 'DAILY_REPORT',
        entityId: id,
        req
      });

      return res.json({ success: true, message: isSubmit ? 'Daily report submitted successfully!' : 'Draft saved.', reportId: id });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to save daily report.' });
  }
});

// POST submit specific daily report
router.post('/daily-reports/:id/submit', authenticateEmployee, (req, res) => {
  try {
    const empId = req.employee.id;
    const report = db.prepare('SELECT * FROM daily_reports WHERE id = ? AND employee_id = ?').get(req.params.id, empId);
    if (!report) return res.status(404).json({ error: 'Report not found.' });

    db.prepare(`
      UPDATE daily_reports SET status = 'SUBMITTED', submitted_at = datetime('now'), updated_at = datetime('now') WHERE id = ?
    `).run(report.id);

    logAudit({
      employeeId: empId,
      action: 'DAILY_REPORT_SUBMIT',
      entityType: 'DAILY_REPORT',
      entityId: report.id,
      req
    });

    res.json({ success: true, message: 'Daily report submitted successfully!' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to submit report.' });
  }
});

// ==================== LEAVE MANAGEMENT ====================

// GET leave balance
router.get('/leave/balance', authenticateEmployee, (req, res) => {
  try {
    const empId = req.employee.id;
    const currentYear = new Date().getFullYear();

    const balances = db.prepare(`
      SELECT 
        lb.id,
        lb.year,
        lb.total_entitlement,
        lb.used_days,
        lb.pending_days,
        (lb.total_entitlement - lb.used_days - lb.pending_days) as available_days,
        lt.id as leave_type_id,
        lt.name as leave_type_name,
        lt.code as leave_type_code,
        lt.description
      FROM leave_balances lb
      JOIN leave_types lt ON lb.leave_type_id = lt.id
      WHERE lb.employee_id = ? AND lb.year = ?
    `).all(empId, currentYear);

    res.json({ balances });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load leave balances.' });
  }
});

// GET leave requests
router.get('/leave/requests', authenticateEmployee, (req, res) => {
  try {
    const empId = req.employee.id;
    const { status } = req.query;

    let query = `
      SELECT lr.*, lt.name as leave_type_name, lt.code as leave_type_code
      FROM leave_requests lr
      JOIN leave_types lt ON lr.leave_type_id = lt.id
      WHERE lr.employee_id = ?
    `;
    const params = [empId];

    if (status && status !== 'all') {
      query += ' AND lr.status = ?';
      params.push(status.toUpperCase());
    }

    query += ' ORDER BY lr.created_at DESC';

    const requests = db.prepare(query).all(...params);
    res.json({ requests });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load leave requests.' });
  }
});

// POST apply for leave
router.post('/leave/apply', authenticateEmployee, (req, res) => {
  try {
    const empId = req.employee.id;
    const { leaveTypeId, startDate, endDate, daysCount, reason, attachmentUrl } = req.body;

    if (!leaveTypeId || !startDate || !endDate || !daysCount || !reason) {
      return res.status(400).json({ error: 'All leave application fields are required.' });
    }

    const days = parseFloat(daysCount);
    if (isNaN(days) || days <= 0) {
      return res.status(400).json({ error: 'Number of leave days must be greater than zero.' });
    }

    if (new Date(startDate) > new Date(endDate)) {
      return res.status(400).json({ error: 'Start date cannot be after end date.' });
    }

    // Check balance
    const currentYear = new Date().getFullYear();
    const balance = db.prepare(`
      SELECT (total_entitlement - used_days - pending_days) as available, id, pending_days
      FROM leave_balances
      WHERE employee_id = ? AND leave_type_id = ? AND year = ?
    `).get(empId, leaveTypeId, currentYear);

    if (!balance || balance.available < days) {
      return res.status(400).json({ error: `Insufficient leave balance. Available: ${balance ? balance.available : 0} days.` });
    }

    const reqId = `lr_${Date.now()}`;
    db.prepare(`
      INSERT INTO leave_requests (id, employee_id, leave_type_id, start_date, end_date, days_count, reason, attachment_url, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')
    `).run(reqId, empId, leaveTypeId, startDate, endDate, days, reason, attachmentUrl || null);

    // Update pending days
    db.prepare(`
      UPDATE leave_balances SET pending_days = pending_days + ?, updated_at = datetime('now') WHERE id = ?
    `).run(days, balance.id);

    // Notification
    const notifId = `notif_${Date.now()}`;
    db.prepare(`
      INSERT INTO notifications (id, employee_id, title, message, type, related_entity_type, related_entity_id, link_url)
      VALUES (?, ?, 'Leave Application Submitted', ?, 'LEAVE', 'leave', ?, '/leave')
    `).run(notifId, empId, `Leave application for ${days} days from ${startDate} to ${endDate} submitted.`, reqId);

    logAudit({
      employeeId: empId,
      action: 'LEAVE_APPLY',
      entityType: 'LEAVE_REQUEST',
      entityId: reqId,
      req,
      details: { startDate, endDate, days, leaveTypeId }
    });

    res.json({ success: true, message: 'Leave application submitted successfully.', requestId: reqId });
  } catch (error) {
    console.error('Leave apply error:', error);
    res.status(500).json({ error: 'Failed to submit leave application.' });
  }
});

// POST cancel leave request
router.post('/leave/:id/cancel', authenticateEmployee, (req, res) => {
  try {
    const empId = req.employee.id;
    const leave = db.prepare('SELECT * FROM leave_requests WHERE id = ? AND employee_id = ?').get(req.params.id, empId);

    if (!leave) return res.status(404).json({ error: 'Leave request not found.' });

    if (leave.status !== 'PENDING' && leave.status !== 'APPROVED') {
      return res.status(400).json({ error: `Cannot cancel a ${leave.status.toLowerCase()} leave request.` });
    }

    const currentYear = new Date().getFullYear();
    const balance = db.prepare('SELECT id FROM leave_balances WHERE employee_id = ? AND leave_type_id = ? AND year = ?').get(empId, leave.leave_type_id, currentYear);

    if (balance) {
      if (leave.status === 'PENDING') {
        db.prepare('UPDATE leave_balances SET pending_days = MAX(0, pending_days - ?), updated_at = datetime(\'now\') WHERE id = ?').run(leave.days_count, balance.id);
      } else if (leave.status === 'APPROVED') {
        db.prepare('UPDATE leave_balances SET used_days = MAX(0, used_days - ?), updated_at = datetime(\'now\') WHERE id = ?').run(leave.days_count, balance.id);
      }
    }

    db.prepare("UPDATE leave_requests SET status = 'CANCELLED', updated_at = datetime('now') WHERE id = ?").run(leave.id);

    logAudit({
      employeeId: empId,
      action: 'LEAVE_CANCEL',
      entityType: 'LEAVE_REQUEST',
      entityId: leave.id,
      req
    });

    res.json({ success: true, message: 'Leave request cancelled.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to cancel leave request.' });
  }
});

// ==================== CALENDAR ====================

// GET calendar events
router.get('/calendar', authenticateEmployee, (req, res) => {
  try {
    const empId = req.employee.id;

    // Holidays and meetings
    const calendarEvents = db.prepare(`
      SELECT id, title, event_type, start_date, end_date, start_time, end_time, description, location, is_all_day
      FROM calendar_events
      WHERE employee_id IS NULL OR employee_id = ?
    `).all(empId);

    // Leaves
    const leaves = db.prepare(`
      SELECT lr.id, lt.name as title, 'LEAVE' as event_type, lr.start_date, lr.end_date, lr.reason as description, 1 as is_all_day, lr.status
      FROM leave_requests lr
      JOIN leave_types lt ON lr.leave_type_id = lt.id
      WHERE lr.employee_id = ? AND lr.status IN ('APPROVED', 'PENDING')
    `).all(empId);

    // Tasks due dates
    const tasks = db.prepare(`
      SELECT id, title, 'TASK' as event_type, due_date as start_date, due_date as end_date, description, 1 as is_all_day, status, priority
      FROM tasks
      WHERE assigned_to = ?
    `).all(empId);

    res.json({ events: [...calendarEvents, ...leaves, ...tasks] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load calendar events.' });
  }
});

// ==================== NOTIFICATIONS ====================

// GET notifications
router.get('/notifications', authenticateEmployee, (req, res) => {
  try {
    const empId = req.employee.id;
    const notifications = db.prepare(`
      SELECT * FROM notifications WHERE employee_id = ? ORDER BY created_at DESC
    `).all(empId);

    const unreadCount = notifications.filter(n => n.is_read === 0).length;
    res.json({ notifications, unreadCount });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load notifications.' });
  }
});

// PATCH mark notification read
router.patch('/notifications/:id/read', authenticateEmployee, (req, res) => {
  try {
    const empId = req.employee.id;
    db.prepare(`
      UPDATE notifications SET is_read = 1, read_at = datetime('now') WHERE id = ? AND employee_id = ?
    `).run(req.params.id, empId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update notification.' });
  }
});

// POST mark all notifications read
router.post('/notifications/mark-all-read', authenticateEmployee, (req, res) => {
  try {
    const empId = req.employee.id;
    db.prepare(`
      UPDATE notifications SET is_read = 1, read_at = datetime('now') WHERE employee_id = ? AND is_read = 0
    `).run(empId);
    res.json({ success: true, message: 'All notifications marked as read.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark all as read.' });
  }
});

// ==================== ANNOUNCEMENTS ====================

// GET announcements
router.get('/announcements', authenticateEmployee, (req, res) => {
  try {
    const empId = req.employee.id;
    const announcements = db.prepare(`
      SELECT a.*, d.name as department_name,
        EXISTS(SELECT 1 FROM announcement_reads r WHERE r.announcement_id = a.id AND r.employee_id = ?) as is_read
      FROM announcements a
      LEFT JOIN departments d ON a.department_id = d.id
      WHERE a.department_id IS NULL OR a.department_id = ?
      ORDER BY a.published_at DESC
    `).all(empId, req.employee.departmentId);

    res.json({ announcements });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load announcements.' });
  }
});

// POST mark announcement read
router.post('/announcements/:id/read', authenticateEmployee, (req, res) => {
  try {
    const empId = req.employee.id;
    const annId = req.params.id;

    db.prepare(`
      INSERT OR IGNORE INTO announcement_reads (id, announcement_id, employee_id)
      VALUES (?, ?, ?)
    `).run(`ar_${Date.now()}`, annId, empId);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark announcement as read.' });
  }
});

// ==================== PROFILE MODULE ====================

// GET profile
router.get('/profile', authenticateEmployee, (req, res) => {
  try {
    const empId = req.employee.id;
    const profile = db.prepare(`
      SELECT 
        e.*,
        u.email,
        u.role,
        d.name as department_name,
        m.first_name || ' ' || m.last_name as manager_name
      FROM employees e
      JOIN users u ON e.user_id = u.id
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN employees m ON e.manager_id = m.id
      WHERE e.id = ?
    `).get(empId);

    const sessions = db.prepare(`
      SELECT id, ip_address, user_agent, last_active_at, created_at, (token = ?) as is_current
      FROM user_sessions
      WHERE employee_id = ?
      ORDER BY last_active_at DESC
    `).all(req.token, empId);

    res.json({ profile, sessions });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load profile details.' });
  }
});

// PATCH profile (personal allowed fields only)
router.patch('/profile', authenticateEmployee, (req, res) => {
  try {
    const empId = req.employee.id;
    const { phone, address, avatarUrl } = req.body;

    db.prepare(`
      UPDATE employees 
      SET phone = COALESCE(?, phone),
          address = COALESCE(?, address),
          avatar_url = COALESCE(?, avatar_url),
          updated_at = datetime('now')
      WHERE id = ?
    `).run(phone || null, address || null, avatarUrl || null, empId);

    logAudit({
      employeeId: empId,
      action: 'PROFILE_UPDATE',
      entityType: 'EMPLOYEE',
      entityId: empId,
      req,
      details: { phone, address }
    });

    const updated = db.prepare('SELECT * FROM employees WHERE id = ?').get(empId);
    res.json({ success: true, message: 'Profile updated successfully.', profile: updated });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update profile.' });
  }
});

// POST change password
router.post('/change-password', authenticateEmployee, (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required.' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters long.' });
    }

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    const valid = bcryptjs.compareSync(currentPassword, user.password_hash);

    if (!valid) {
      return res.status(401).json({ error: 'Current password does not match.' });
    }

    const newHash = bcryptjs.hashSync(newPassword, 10);
    db.prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?").run(newHash, user.id);

    logAudit({
      employeeId: req.employee.id,
      action: 'PASSWORD_CHANGE',
      entityType: 'USER',
      entityId: user.id,
      req
    });

    res.json({ success: true, message: 'Password changed successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to change password.' });
  }
});

// ==================== DOCUMENTS MODULE ====================

// GET employee documents
router.get('/documents', authenticateEmployee, (req, res) => {
  try {
    const docs = db.prepare(`
      SELECT id, document_name, document_type, file_size, mime_type, uploaded_by, status, created_at
      FROM employee_documents
      WHERE employee_id = ?
      ORDER BY created_at DESC
    `).all(req.employee.id);

    res.json({ documents: docs });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load documents.' });
  }
});

// GET document download (authenticated)
router.get('/documents/:id/download', authenticateEmployee, (req, res) => {
  try {
    const doc = db.prepare('SELECT * FROM employee_documents WHERE id = ? AND employee_id = ?').get(req.params.id, req.employee.id);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found or access unauthorized.' });
    }

    logAudit({
      employeeId: req.employee.id,
      action: 'DOCUMENT_DOWNLOAD',
      entityType: 'DOCUMENT',
      entityId: doc.id,
      req,
      details: { documentName: doc.document_name }
    });

    // Provide content or downloadable text/stream
    res.setHeader('Content-Disposition', `attachment; filename="${doc.document_name.replace(/[^a-zA-Z0-9._-]/g, '_')}.pdf"`);
    res.setHeader('Content-Type', doc.mime_type || 'application/pdf');
    res.send(`Mentneo Enterprise Portal Document: ${doc.document_name}\nType: ${doc.document_type}\nVerified by: ${doc.uploaded_by}\nTimestamp: ${doc.created_at}`);
  } catch (error) {
    res.status(500).json({ error: 'Failed to download document.' });
  }
});

// ==================== PERFORMANCE MODULE ====================

// GET performance details
router.get('/performance', authenticateEmployee, (req, res) => {
  try {
    const empId = req.employee.id;

    const goals = db.prepare('SELECT * FROM employee_goals WHERE employee_id = ? ORDER BY created_at DESC').all(empId);
    const reviews = db.prepare('SELECT * FROM performance_reviews WHERE employee_id = ? ORDER BY review_date DESC').all(empId);
    
    const taskCompletion = db.prepare(`
      SELECT 
        COUNT(*) as total_tasks,
        SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) as completed_tasks,
        COALESCE(AVG(progress), 0) as avg_progress,
        COALESCE(SUM(actual_hours), 0) as total_hours
      FROM tasks WHERE assigned_to = ?
    `).get(empId);

    res.json({
      goals,
      reviews,
      taskMetrics: taskCompletion
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve performance data.' });
  }
});

// ==================== COMPANY DIRECTORY ====================

// GET directory (Protected: shields sensitive columns)
router.get('/directory', authenticateEmployee, (req, res) => {
  try {
    const { search, department, designation } = req.query;

    let query = `
      SELECT 
        e.id,
        e.first_name || ' ' || e.last_name as full_name,
        e.email as work_email,
        e.phone as work_phone,
        e.designation,
        e.avatar_url,
        e.work_location,
        d.name as department_name,
        d.code as department_code,
        m.first_name || ' ' || m.last_name as manager_name
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN employees m ON e.manager_id = m.id
      WHERE e.employment_status = 'ACTIVE'
    `;
    const params = [];

    if (search) {
      query += ` AND (
        e.first_name LIKE ? OR 
        e.last_name LIKE ? OR 
        e.email LIKE ? OR 
        e.designation LIKE ?
      )`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (department && department !== 'all') {
      query += ' AND d.code = ?';
      params.push(department);
    }

    if (designation) {
      query += ' AND e.designation LIKE ?';
      params.push(`%${designation}%`);
    }

    query += ' ORDER BY e.first_name ASC';

    const employees = db.prepare(query).all(...params);
    const departments = db.prepare('SELECT id, name, code FROM departments ORDER BY name ASC').all();

    res.json({ employees, departments });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve directory.' });
  }
});

// ==================== HELP / SUPPORT MODULE ====================

// GET tickets
router.get('/support/tickets', authenticateEmployee, (req, res) => {
  try {
    const tickets = db.prepare(`
      SELECT st.*, 
        (SELECT COUNT(*) FROM support_ticket_messages WHERE ticket_id = st.id) as message_count
      FROM support_tickets st
      WHERE st.employee_id = ?
      ORDER BY st.updated_at DESC
    `).all(req.employee.id);

    res.json({ tickets });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve support tickets.' });
  }
});

// GET single ticket details & thread
router.get('/support/tickets/:id', authenticateEmployee, (req, res) => {
  try {
    const empId = req.employee.id;
    const ticket = db.prepare('SELECT * FROM support_tickets WHERE id = ? AND employee_id = ?').get(req.params.id, empId);

    if (!ticket) return res.status(404).json({ error: 'Support ticket not found or unauthorized.' });

    const messages = db.prepare(`
      SELECT * FROM support_ticket_messages WHERE ticket_id = ? ORDER BY created_at ASC
    `).all(ticket.id);

    res.json({ ticket, messages });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve ticket thread.' });
  }
});

// POST create ticket
router.post('/support/tickets', authenticateEmployee, (req, res) => {
  try {
    const empId = req.employee.id;
    const { category, subject, description, priority = 'MEDIUM', attachmentUrl, attachmentName } = req.body;

    if (!category || !subject || !description) {
      return res.status(400).json({ error: 'Category, subject, and description are required.' });
    }

    const ticketId = `tick_${Date.now()}`;
    const ticketCode = `SUP-2026-${Math.floor(100 + Math.random() * 900)}`;

    db.prepare(`
      INSERT INTO support_tickets (id, ticket_code, employee_id, category, subject, description, priority, status, attachment_url, attachment_name)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'OPEN', ?, ?)
    `).run(ticketId, ticketCode, empId, category, subject, description, priority.toUpperCase(), attachmentUrl || null, attachmentName || null);

    // Initial message
    db.prepare(`
      INSERT INTO support_ticket_messages (id, ticket_id, sender_id, sender_type, sender_name, message, attachment_url, attachment_name)
      VALUES (?, ?, ?, 'EMPLOYEE', ?, ?, ?, ?)
    `).run(`tmsg_${Date.now()}`, ticketId, empId, req.employee.name, description, attachmentUrl || null, attachmentName || null);

    logAudit({
      employeeId: empId,
      action: 'SUPPORT_TICKET_CREATE',
      entityType: 'SUPPORT_TICKET',
      entityId: ticketId,
      req,
      details: { ticketCode, category, subject, priority }
    });

    res.json({ success: true, message: `Support ticket ${ticketCode} raised successfully.`, ticketId, ticketCode });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create support ticket.' });
  }
});

// POST reply to ticket
router.post('/support/tickets/:id/messages', authenticateEmployee, (req, res) => {
  try {
    const empId = req.employee.id;
    const ticketId = req.params.id;
    const { message, attachmentUrl, attachmentName } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message content is required.' });
    }

    const ticket = db.prepare('SELECT * FROM support_tickets WHERE id = ? AND employee_id = ?').get(ticketId, empId);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found or unauthorized.' });

    const msgId = `tmsg_${Date.now()}`;
    db.prepare(`
      INSERT INTO support_ticket_messages (id, ticket_id, sender_id, sender_type, sender_name, message, attachment_url, attachment_name)
      VALUES (?, ?, ?, 'EMPLOYEE', ?, ?, ?, ?)
    `).run(msgId, ticketId, empId, req.employee.name, message.trim(), attachmentUrl || null, attachmentName || null);

    db.prepare("UPDATE support_tickets SET updated_at = datetime('now') WHERE id = ?").run(ticketId);

    res.json({ success: true, message: 'Reply sent successfully.', messageId: msgId });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send reply.' });
  }
});

// PATCH close ticket
router.patch('/support/tickets/:id/close', authenticateEmployee, (req, res) => {
  try {
    const empId = req.employee.id;
    const ticket = db.prepare('SELECT * FROM support_tickets WHERE id = ? AND employee_id = ?').get(req.params.id, empId);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found.' });

    db.prepare("UPDATE support_tickets SET status = 'CLOSED', updated_at = datetime('now') WHERE id = ?").run(ticket.id);

    logAudit({
      employeeId: empId,
      action: 'SUPPORT_TICKET_CLOSE',
      entityType: 'SUPPORT_TICKET',
      entityId: ticket.id,
      req
    });

    res.json({ success: true, message: 'Ticket closed successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to close ticket.' });
  }
});

export default router;
