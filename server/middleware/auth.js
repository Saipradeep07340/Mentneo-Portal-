import jwt from 'jsonwebtoken';
import db from '../db.js';

export const JWT_SECRET = process.env.JWT_SECRET || 'mentneo-enterprise-portal-secret-key-2026';

export function authenticateEmployee(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required. Please login.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    // Verify session in database
    const session = db.prepare(`
      SELECT s.*, u.email, u.role, u.status, e.id as employee_id, e.employee_code, e.first_name, e.last_name, e.department_id, e.designation
      FROM user_sessions s
      JOIN users u ON s.user_id = u.id
      JOIN employees e ON s.employee_id = e.id
      WHERE s.token = ? AND u.status = 'ACTIVE'
    `).get(token);

    if (!session) {
      return res.status(401).json({ error: 'Session expired or invalid. Please login again.' });
    }

    // Touch last_active_at
    db.prepare("UPDATE user_sessions SET last_active_at = datetime('now') WHERE id = ?").run(session.id);

    req.user = {
      id: session.user_id,
      email: session.email,
      role: session.role
    };

    req.employee = {
      id: session.employee_id,
      code: session.employee_code,
      name: `${session.first_name} ${session.last_name}`,
      email: session.email,
      departmentId: session.department_id,
      designation: session.designation
    };

    req.token = token;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Your session has expired. Please log in again.' });
    }
    return res.status(401).json({ error: 'Invalid authentication token.' });
  }
}
