import { Router } from 'express';
import { listUsers, createUser, getUser, updateUser, deleteUser } from '../controllers/user.controller.js';
import { protect, authorize } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { createUserSchema, updateUserSchema } from '../validators/user.validator.js';
import { ROLES } from '../models/User.js';

const router = Router();

router.use(protect, authorize(ROLES.SUPER_ADMIN));

router.get('/', listUsers);
router.post('/', validateBody(createUserSchema), createUser);
router.get('/:id', getUser);
router.put('/:id', validateBody(updateUserSchema), updateUser);
router.delete('/:id', deleteUser);

export default router;
