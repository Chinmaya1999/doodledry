import { Router } from 'express';
import {
  stockIn, adjustStock, stockHistory, lowStock, downloadBulkStockTemplate, downloadStockReport, bulkUpdateStock,
} from '../controllers/inventory.controller.js';
import { protect, authorize } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { stockInSchema, stockAdjustSchema } from '../validators/product.validator.js';
import { ROLES } from '../models/User.js';
import { uploadExcelFile } from '../middleware/upload.js';

const router = Router();

router.use(protect);

router.get('/history', stockHistory);
router.get('/low-stock', lowStock);
router.get('/stock-report', downloadStockReport);
router.get('/bulk-template', authorize(ROLES.SUPER_ADMIN), downloadBulkStockTemplate);
router.post('/bulk-upload', authorize(ROLES.SUPER_ADMIN), uploadExcelFile, bulkUpdateStock);
router.post('/stock-in', authorize(ROLES.SUPER_ADMIN), validateBody(stockInSchema), stockIn);
router.post('/adjust', authorize(ROLES.SUPER_ADMIN), validateBody(stockAdjustSchema), adjustStock);

export default router;
