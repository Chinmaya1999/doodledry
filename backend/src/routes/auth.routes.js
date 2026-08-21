import { Router } from 'express';
import { login, logout, me } from '../controllers/auth.controller.js';
import { protect } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { loginSchema } from '../validators/auth.validator.js';
import { authLimiter } from '../middleware/rateLimiter.js';

const router = Router();

router.post('/login', authLimiter, validateBody(loginSchema), login);
router.post('/logout', protect, logout);
router.get('/me', protect, me);

export default router;
