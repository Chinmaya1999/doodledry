import { Router } from 'express';
import {
  dashboard, salesReport, inventoryReport, designReport, ageGroupReport, productTypeReport, colorReport,
} from '../controllers/report.controller.js';
import { protect } from '../middleware/auth.js';

const router = Router();

router.use(protect);

router.get('/dashboard', dashboard);
router.get('/sales', salesReport);
router.get('/inventory', inventoryReport);
router.get('/designs', designReport);
router.get('/age-groups', ageGroupReport);
router.get('/product-types', productTypeReport);
router.get('/colors', colorReport);

export default router;
