import db from '../db.js';
import crypto from 'node:crypto';

export function logAudit({ employeeId, action, entityType, entityId, req, details }) {
  try {
    const id = `audit_${crypto.randomUUID()}`;
    const ipAddress = req?.headers?.['x-forwarded-for'] || req?.socket?.remoteAddress || '127.0.0.1';
    const userAgent = req?.headers?.['user-agent'] || 'Unknown';
    const detailsStr = typeof details === 'object' ? JSON.stringify(details) : (details || null);

    db.prepare(`
      INSERT INTO audit_logs (id, employee_id, action, entity_type, entity_id, ip_address, user_agent, details)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, employeeId || null, action, entityType, entityId ? String(entityId) : null, String(ipAddress), String(userAgent), detailsStr);
  } catch (err) {
    console.error('Audit log failed:', err.message);
  }
}
