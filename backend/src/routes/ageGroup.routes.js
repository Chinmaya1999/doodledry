import { Router } from 'express';
import { listAgeGroups, createAgeGroup, updateAgeGroup, deleteAgeGroup } from '../controllers/ageGroup.controller.js';
import { protect, authorize } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { ageGroupSchema, ageGroupUpdateSchema } from '../validators/catalog.validator.js';
import { ROLES } from '../models/User.js';

const router = Router();

router.use(protect);

router.get('/', listAgeGroups);
router.post('/', authorize(ROLES.SUPER_ADMIN), validateBody(ageGroupSchema), createAgeGroup);
router.put('/:id', authorize(ROLES.SUPER_ADMIN), validateBody(ageGroupUpdateSchema), updateAgeGroup);
router.delete('/:id', authorize(ROLES.SUPER_ADMIN), deleteAgeGroup);

export default router;
