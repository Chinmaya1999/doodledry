import { Router } from 'express';
import { createSale, listSales, getSale, createReturn, listReturns } from '../controllers/sale.controller.js';
import { protect } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { createSaleSchema, createReturnSchema } from '../validators/sale.validator.js';

const router = Router();

router.use(protect);

router.get('/', listSales);
router.post('/', validateBody(createSaleSchema), createSale);
router.get('/:id', getSale);

export const returnsRouter = Router();
returnsRouter.use(protect);
returnsRouter.get('/', listReturns);
returnsRouter.post('/', validateBody(createReturnSchema), createReturn);

export default router;
