import { Router } from 'express';
import { listAuditLogs } from '../controllers/audit.controller.js';
import { protect, authorize } from '../middleware/auth.js';
import { ROLES } from '../models/User.js';

const router = Router();

router.use(protect, authorize(ROLES.SUPER_ADMIN));
router.get('/', listAuditLogs);

export default router;
