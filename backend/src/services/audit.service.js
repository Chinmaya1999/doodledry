import AuditLog from '../models/AuditLog.js';

export async function recordAudit({ req, action, entityType, entityId = '', oldValue = null, newValue = null }) {
  try {
    await AuditLog.create({
      user: req.user?._id || null,
      userName: req.user?.name || 'System',
      role: req.user?.role || '',
      action,
      entityType,
      entityId: entityId ? String(entityId) : '',
      oldValue,
      newValue,
      ipAddress: req.ip || req.headers['x-forwarded-for'] || '',
    });
  } catch (err) {
    // Audit logging must never break the primary operation.
    // eslint-disable-next-line no-console
    console.error('[audit] failed to record audit log:', err.message);
  }
}

export default recordAudit;
