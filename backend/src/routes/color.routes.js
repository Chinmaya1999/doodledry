import { Router } from 'express';
import { listColors, createColor, updateColor, deleteColor } from '../controllers/color.controller.js';
import { protect, authorize } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { colorSchema, colorUpdateSchema } from '../validators/catalog.validator.js';
import { ROLES } from '../models/User.js';

const router = Router();

router.use(protect);

router.get('/', listColors);
router.post('/', authorize(ROLES.SUPER_ADMIN), validateBody(colorSchema), createColor);
router.put('/:id', authorize(ROLES.SUPER_ADMIN), validateBody(colorUpdateSchema), updateColor);
router.delete('/:id', authorize(ROLES.SUPER_ADMIN), deleteColor);

export default router;
