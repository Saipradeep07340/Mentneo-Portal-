import express from 'express';
import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import db from '../db.js';
import { JWT_SECRET, authenticateEmployee } from '../middleware/auth.js';
import { logAudit } from '../services/auditService.js';

const router = express.Router();

// POST /api/auth/employee/login
router.post('/employee/login', (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Please enter both corporate email and password.' });
    }

    const cleanEmail = String(email).trim().toLowerCase();

    const user = db.prepare(`
      SELECT u.*, e.id as employee_id, e.employee_code, e.first_name, e.last_name, e.designation, e.department_id, e.avatar_url as emp_avatar
      FROM users u
      LEFT JOIN employees e ON u.id = e.user_id
      WHERE LOWER(u.email) = ?
    `).get(cleanEmail);

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password credentials.' });
    }

    if (user.status !== 'ACTIVE') {
      return res.status(403).json({ error: 'Your account has been deactivated. Please contact HR.' });
    }

    const isMatch = bcryptjs.compareSync(password, user.password_hash);
    if (!isMatch) {
      logAudit({
        employeeId: user.employee_id,
        action: 'LOGIN_FAILED',
        entityType: 'AUTH',
        req,
        details: { email: cleanEmail, reason: 'Bad credentials' }
      });
      return res.status(401).json({ error: 'Invalid email or password credentials.' });
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, employeeId: user.employee_id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Save session
    const sessionId = `sess_${crypto.randomUUID()}`;
    const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'Unknown';

    db.prepare(`
      INSERT INTO user_sessions (id, user_id, employee_id, token, ip_address, user_agent)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(sessionId, user.id, user.employee_id, token, String(ipAddress), String(userAgent));

    logAudit({
      employeeId: user.employee_id,
      action: 'LOGIN',
      entityType: 'AUTH',
      entityId: sessionId,
      req,
      details: { email: cleanEmail }
    });

    const unreadCount = db.prepare('SELECT COUNT(*) as count FROM notifications WHERE employee_id = ? AND is_read = 0').get(user.employee_id).count;

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        fullName: user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : (user.full_name || 'Employee'),
        employeeId: user.employee_id,
        employeeCode: user.employee_code,
        designation: user.designation,
        avatarUrl: user.emp_avatar || user.avatar_url,
        unreadNotifications: unreadCount
      }
    });
  } catch (error) {
    console.error('Employee Login Error:', error);
    res.status(500).json({ error: 'An error occurred during authentication.' });
  }
});

// POST /api/auth/employee/logout
router.post('/employee/logout', authenticateEmployee, (req, res) => {
  try {
    db.prepare('DELETE FROM user_sessions WHERE token = ?').run(req.token);

    logAudit({
      employeeId: req.employee.id,
      action: 'LOGOUT',
      entityType: 'AUTH',
      req
    });

    res.json({ success: true, message: 'Successfully logged out.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to process logout.' });
  }
});

// GET /api/auth/employee/me
router.get('/employee/me', authenticateEmployee, (req, res) => {
  try {
    const user = db.prepare(`
      SELECT u.id, u.email, u.role, u.full_name, e.id as employee_id, e.employee_code, e.first_name, e.last_name, e.designation, e.department_id, e.avatar_url
      FROM users u
      JOIN employees e ON u.id = e.user_id
      WHERE u.id = ?
    `).get(req.user.id);

    const unreadCount = db.prepare('SELECT COUNT(*) as count FROM notifications WHERE employee_id = ? AND is_read = 0').get(user.employee_id).count;

    res.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        fullName: user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : (user.full_name || 'Employee'),
        employeeId: user.employee_id,
        employeeCode: user.employee_code,
        designation: user.designation,
        avatarUrl: user.avatar_url,
        unreadNotifications: unreadCount
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve profile.' });
  }
});

export default router;
