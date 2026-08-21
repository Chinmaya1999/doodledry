import { Router } from 'express';
import {
  listInvestors, createInvestor, getInvestor, updateInvestor, addInvestorTransaction,
} from '../controllers/investor.controller.js';
import { protect, authorize } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { createInvestorSchema, updateInvestorSchema, investorTransactionSchema } from '../validators/investor.validator.js';
import { ROLES } from '../models/User.js';

const router = Router();

router.use(protect, authorize(ROLES.SUPER_ADMIN));

router.get('/', listInvestors);
router.post('/', validateBody(createInvestorSchema), createInvestor);
router.get('/:id', getInvestor);
router.put('/:id', validateBody(updateInvestorSchema), updateInvestor);
router.post('/:id/transactions', validateBody(investorTransactionSchema), addInvestorTransaction);

export default router;
