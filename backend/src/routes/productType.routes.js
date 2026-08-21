import { Router } from 'express';
import { listProductTypes, createProductType, updateProductType, deleteProductType } from '../controllers/productType.controller.js';
import { protect, authorize } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { productTypeSchema, productTypeUpdateSchema } from '../validators/catalog.validator.js';
import { ROLES } from '../models/User.js';

const router = Router();

router.use(protect);

router.get('/', listProductTypes);
router.post('/', authorize(ROLES.SUPER_ADMIN), validateBody(productTypeSchema), createProductType);
router.put('/:id', authorize(ROLES.SUPER_ADMIN), validateBody(productTypeUpdateSchema), updateProductType);
router.delete('/:id', authorize(ROLES.SUPER_ADMIN), deleteProductType);

export default router;
