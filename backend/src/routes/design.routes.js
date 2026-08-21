import { Router } from 'express';
import { listDesigns, createDesign, updateDesign, deleteDesign } from '../controllers/design.controller.js';
import { protect, authorize } from '../middleware/auth.js';
import { uploadDesignImage } from '../middleware/upload.js';
import { ROLES } from '../models/User.js';

const router = Router();

router.use(protect);

router.get('/', listDesigns);
router.post('/', authorize(ROLES.SUPER_ADMIN), uploadDesignImage, createDesign);
router.put('/:id', authorize(ROLES.SUPER_ADMIN), uploadDesignImage, updateDesign);
router.delete('/:id', authorize(ROLES.SUPER_ADMIN), deleteDesign);

export default router;
