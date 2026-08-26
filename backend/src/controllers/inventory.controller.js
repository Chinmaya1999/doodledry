import mongoose from 'mongoose';
import Product from '../models/Product.js';
import InventoryTransaction, { TRANSACTION_TYPES } from '../models/InventoryTransaction.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import sendSuccess from '../utils/ApiResponse.js';
import recordAudit from '../services/audit.service.js';

export const stockIn = asyncHandler(async (req, res) => {
  const { product: productId, quantity, notes } = req.body;

  const session = await mongoose.startSession();
  let product;
  let previousStock;
  try {
    await session.withTransaction(async () => {
      product = await Product.findById(productId).session(session);
      if (!product) throw ApiError.notFound('Product not found.');
      if (!product.isActive) throw ApiError.badRequest('Cannot add stock to an inactive product.');

      previousStock = product.currentStock;
      product.currentStock += quantity;
      product.totalAdded += quantity;
      await product.save({ session });

      await InventoryTransaction.create(
        [{
          product: product._id,
          type: TRANSACTION_TYPES.STOCK_IN,
          quantity,
          previousStock,
          newStock: product.currentStock,
          user: req.user._id,
          notes,
        }],
        { session }
      );
    });
  } finally {
    session.endSession();
  }

  await recordAudit({
    req,
    action: 'ADD_STOCK',
    entityType: 'Product',
    entityId: product._id,
    oldValue: { currentStock: previousStock },
    newValue: { currentStock: product.currentStock, added: quantity },
  });

  sendSuccess(res, {
    message: 'Stock added successfully.',
    data: { product, previousStock, added: quantity, newStock: product.currentStock },
  });
});

export const adjustStock = asyncHandler(async (req, res) => {
  const { product: productId, type, direction, quantity, reason, notes } = req.body;
  // DAMAGE and LOSS always reduce stock, regardless of direction.
  const effectiveDirection = type === TRANSACTION_TYPES.STOCK_ADJUSTMENT ? direction : 'DECREASE';

  const session = await mongoose.startSession();
  let product;
  let previousStock;
  try {
    await session.withTransaction(async () => {
      product = await Product.findById(productId).session(session);
      if (!product) throw ApiError.notFound('Product not found.');

      previousStock = product.currentStock;

      if (effectiveDirection === 'DECREASE') {
        if (quantity > previousStock) {
          throw ApiError.badRequest(`Insufficient stock. Only ${previousStock} units are available.`);
        }
        product.currentStock -= quantity;
      } else {
        product.currentStock += quantity;
        product.totalAdded += quantity;
      }

      await product.save({ session });

      await InventoryTransaction.create(
        [{
          product: product._id,
          type,
          quantity: effectiveDirection === 'DECREASE' ? -quantity : quantity,
          previousStock,
          newStock: product.currentStock,
          user: req.user._id,
          reason,
          notes,
        }],
        { session }
      );
    });
  } finally {
    session.endSession();
  }

  await recordAudit({
    req,
    action: 'ADJUST_STOCK',
    entityType: 'Product',
    entityId: product._id,
    oldValue: { currentStock: previousStock },
    newValue: { currentStock: product.currentStock, type, quantity, reason },
  });

  sendSuccess(res, {
    message: 'Stock adjusted successfully.',
    data: { product, previousStock, newStock: product.currentStock },
  });
});

export const stockHistory = asyncHandler(async (req, res) => {
  const { product, type, startDate, endDate, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (product) filter.product = product;
  if (type) filter.type = type;
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) filter.createdAt.$lte = new Date(endDate);
  }

  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.min(200, Number(limit));

  const [transactions, total] = await Promise.all([
    InventoryTransaction.find(filter)
      .populate({ path: 'product', select: 'productId sku barcode', populate: [{ path: 'ageGroup', select: 'name' }, { path: 'design', select: 'name' }, { path: 'productType', select: 'name' }, { path: 'color', select: 'name hexCode' }] })
      .populate('user', 'name role')
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    InventoryTransaction.countDocuments(filter),
  ]);

  sendSuccess(res, {
    message: 'Stock history fetched successfully.',
    data: transactions,
    meta: { total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) },
  });
});

export const lowStock = asyncHandler(async (req, res) => {
  const products = await Product.find({
    isActive: true,
    $expr: { $lte: ['$currentStock', '$reorderLevel'] },
  })
    .populate([{ path: 'ageGroup', select: 'name' }, { path: 'design', select: 'name' }, { path: 'productType', select: 'name' }, { path: 'color', select: 'name hexCode' }])
    .sort({ currentStock: 1 });

  sendSuccess(res, { message: 'Low stock products fetched successfully.', data: products });
});

export default { stockIn, adjustStock, stockHistory, lowStock };
