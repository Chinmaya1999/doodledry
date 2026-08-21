import { Router } from 'express';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import ageGroupRoutes from './ageGroup.routes.js';
import designRoutes from './design.routes.js';
import productTypeRoutes from './productType.routes.js';
import colorRoutes from './color.routes.js';
import productRoutes from './product.routes.js';
import inventoryRoutes from './inventory.routes.js';
import saleRoutes, { returnsRouter } from './sale.routes.js';
import investorRoutes from './investor.routes.js';
import reportRoutes from './report.routes.js';
import auditRoutes from './audit.routes.js';

const router = Router();

router.get('/health', (req, res) => res.json({ success: true, message: 'API is healthy.' }));

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/age-groups', ageGroupRoutes);
router.use('/designs', designRoutes);
router.use('/product-types', productTypeRoutes);
router.use('/colors', colorRoutes);
router.use('/products', productRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/sales', saleRoutes);
router.use('/returns', returnsRouter);
router.use('/investors', investorRoutes);
router.use('/reports', reportRoutes);
router.use('/audit-logs', auditRoutes);

export default router;
