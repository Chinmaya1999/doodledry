import mongoose from 'mongoose';
import Investor from '../models/Investor.js';
import InvestorTransaction from '../models/InvestorTransaction.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import sendSuccess from '../utils/ApiResponse.js';
import recordAudit from '../services/audit.service.js';

export const listInvestors = asyncHandler(async (req, res) => {
  const { search = '', status } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (search) filter.name = { $regex: search, $options: 'i' };

  const investors = await Investor.find(filter).sort({ createdAt: -1 });
  const summary = await Investor.aggregate([
    { $group: { _id: null, totalInvestors: { $sum: 1 }, totalInvestment: { $sum: '$investmentAmount' }, activeInvestors: { $sum: { $cond: [{ $eq: ['$status', 'ACTIVE'] }, 1, 0] } } } },
  ]);

  sendSuccess(res, {
    message: 'Investors fetched successfully.',
    data: investors,
    meta: summary[0] || { totalInvestors: 0, totalInvestment: 0, activeInvestors: 0 },
  });
});

export const createInvestor = asyncHandler(async (req, res) => {
  const payload = req.body;

  const session = await mongoose.startSession();
  let investor;
  try {
    await session.withTransaction(async () => {
      const created = await Investor.create(
        [{
          ...payload,
          investmentAmount: 0, // built up via the initial INVESTMENT transaction below
        }],
        { session }
      );
      investor = created[0];

      if (payload.investmentAmount > 0) {
        investor.investmentAmount = payload.investmentAmount;
        await investor.save({ session });

        await InvestorTransaction.create(
          [{
            investor: investor._id,
            type: 'INVESTMENT',
            amount: payload.investmentAmount,
            previousBalance: 0,
            newBalance: payload.investmentAmount,
            date: payload.investmentDate || new Date(),
            notes: 'Initial investment',
            recordedBy: req.user._id,
          }],
          { session }
        );
      }
    });
  } finally {
    session.endSession();
  }

  await recordAudit({ req, action: 'CREATE_INVESTOR', entityType: 'Investor', entityId: investor._id, newValue: investor });
  sendSuccess(res, { statusCode: 201, message: 'Investor added successfully.', data: investor });
});

export const getInvestor = asyncHandler(async (req, res) => {
  const investor = await Investor.findById(req.params.id);
  if (!investor) throw ApiError.notFound('Investor not found.');

  const transactions = await InvestorTransaction.find({ investor: investor._id })
    .populate('recordedBy', 'name')
    .sort({ createdAt: -1 });

  sendSuccess(res, { message: 'Investor fetched successfully.', data: { investor, transactions } });
});

export const updateInvestor = asyncHandler(async (req, res) => {
  const investor = await Investor.findById(req.params.id);
  if (!investor) throw ApiError.notFound('Investor not found.');
  const oldValue = investor.toObject();

  Object.assign(investor, req.body);
  await investor.save();

  await recordAudit({ req, action: 'UPDATE_INVESTOR', entityType: 'Investor', entityId: investor._id, oldValue, newValue: investor });
  sendSuccess(res, { message: 'Investor updated successfully.', data: investor });
});

export const addInvestorTransaction = asyncHandler(async (req, res) => {
  const { type, amount, date, notes } = req.body;

  const session = await mongoose.startSession();
  let investor;
  let transaction;
  try {
    await session.withTransaction(async () => {
      investor = await Investor.findById(req.params.id).session(session);
      if (!investor) throw ApiError.notFound('Investor not found.');

      const previousBalance = investor.investmentAmount;
      let newBalance;

      if (type === 'WITHDRAWAL') {
        if (amount > previousBalance) {
          throw ApiError.badRequest(`Insufficient investment balance. Available: ${previousBalance}`);
        }
        newBalance = previousBalance - amount;
      } else {
        newBalance = previousBalance + amount;
      }

      investor.investmentAmount = newBalance;
      await investor.save({ session });

      const created = await InvestorTransaction.create(
        [{
          investor: investor._id,
          type,
          amount,
          previousBalance,
          newBalance,
          date: date || new Date(),
          notes,
          recordedBy: req.user._id,
        }],
        { session }
      );
      transaction = created[0];
    });
  } finally {
    session.endSession();
  }

  await recordAudit({ req, action: 'INVESTOR_TRANSACTION', entityType: 'Investor', entityId: investor._id, newValue: transaction });
  sendSuccess(res, { statusCode: 201, message: 'Investor transaction recorded successfully.', data: { investor, transaction } });
});

export default { listInvestors, createInvestor, getInvestor, updateInvestor, addInvestorTransaction };
