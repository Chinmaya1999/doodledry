import AuditLog from '../models/AuditLog.js';
import asyncHandler from '../utils/asyncHandler.js';
import sendSuccess from '../utils/ApiResponse.js';

export const listAuditLogs = asyncHandler(async (req, res) => {
  const { action, entityType, userId, page = 1, limit = 30 } = req.query;
  const filter = {};
  if (action) filter.action = action;
  if (entityType) filter.entityType = entityType;
  if (userId) filter.user = userId;

  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.min(200, Number(limit));

  const [logs, total] = await Promise.all([
    AuditLog.find(filter).sort({ createdAt: -1 }).skip((pageNum - 1) * limitNum).limit(limitNum),
    AuditLog.countDocuments(filter),
  ]);

  sendSuccess(res, {
    message: 'Audit logs fetched successfully.',
    data: logs,
    meta: { total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) },
  });
});

export default { listAuditLogs };
