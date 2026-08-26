import { Router } from 'express';
import {
  listProducts, getProduct, lookupProduct, createProduct, updateProduct, deleteProduct, clearAllInventory, getProductLabels,
  downloadBulkCreateTemplate, bulkCreateProducts,
} from '../controllers/product.controller.js';
import { protect, authorize } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { createProductSchema, updateProductSchema } from '../validators/product.validator.js';
import { ROLES } from '../models/User.js';
import { uploadSpreadsheetFile } from '../middleware/upload.js';

const router = Router();

router.use(protect);

router.get('/', listProducts);
router.get('/labels', authorize(ROLES.SUPER_ADMIN), getProductLabels);
router.get('/lookup/:code', lookupProduct);
router.get('/bulk-template', authorize(ROLES.SUPER_ADMIN), downloadBulkCreateTemplate);
router.post('/bulk-upload', authorize(ROLES.SUPER_ADMIN), uploadSpreadsheetFile, bulkCreateProducts);
router.delete('/clear-all', authorize(ROLES.SUPER_ADMIN), clearAllInventory);
router.get('/:id', getProduct);
router.post('/', authorize(ROLES.SUPER_ADMIN), validateBody(createProductSchema), createProduct);
router.put('/:id', authorize(ROLES.SUPER_ADMIN), validateBody(updateProductSchema), updateProduct);
router.delete('/:id', authorize(ROLES.SUPER_ADMIN), deleteProduct);

export default router;
