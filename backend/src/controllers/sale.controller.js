import mongoose from 'mongoose';
import Product from '../models/Product.js';
import Sale from '../models/Sale.js';
import Return from '../models/Return.js';
import InventoryTransaction, { TRANSACTION_TYPES } from '../models/InventoryTransaction.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import sendSuccess from '../utils/ApiResponse.js';
import recordAudit from '../services/audit.service.js';
import { generateSaleId, generateReturnId } from '../services/barcode.service.js';

const SALE_POPULATE = [
  { path: 'ageGroup', select: 'name code' },
  { path: 'design', select: 'name code' },
  { path: 'productType', select: 'name code' },
  { path: 'color', select: 'name code hexCode' },
  { path: 'soldBy', select: 'name role' },
];

export const createSale = asyncHandler(async (req, res) => {
  const { code, product: productId, quantity, paymentMethod, notes, idempotencyKey } = req.body;

  if (idempotencyKey) {
    const existingSale = await Sale.findOne({ idempotencyKey });
    if (existingSale) {
      return sendSuccess(res, { message: 'Sale already recorded.', data: existingSale });
    }
  }

  const session = await mongoose.startSession();
  let sale;
  let product;
  try {
    await session.withTransaction(async () => {
      const lookupFilter = code
        ? { $or: [{ barcode: code }, { qrCode: code }, { sku: code.toUpperCase() }, { productId: code.toUpperCase() }] }
        : { _id: productId };

      product = await Product.findOne(lookupFilter).session(session);
      if (!product || !product.isActive) {
        throw ApiError.notFound('Product not found. Please scan a valid product barcode.');
      }

      const previousStock = product.currentStock;
      if (quantity > previousStock) {
        throw ApiError.badRequest(`Insufficient stock. Available stock: ${previousStock}`);
      }

      const newStock = previousStock - quantity;
      product.currentStock = newStock;
      product.totalSold += quantity;
      await product.save({ session });

      const saleId = await generateSaleId(session);
      const totalAmount = Number((quantity * product.sellingPrice).toFixed(2));

      const created = await Sale.create(
        [{
          saleId,
          product: product._id,
          sku: product.sku,
          ageGroup: product.ageGroup,
          design: product.design,
          productType: product.productType,
          color: product.color,
          quantity,
          unitPrice: product.sellingPrice,
          totalAmount,
          previousStock,
          remainingStock: newStock,
          soldBy: req.user._id,
          paymentMethod,
          notes,
          idempotencyKey: idempotencyKey || undefined,
        }],
        { session }
      );
      sale = created[0];

      await InventoryTransaction.create(
        [{
          product: product._id,
          type: TRANSACTION_TYPES.SALE,
          quantity: -quantity,
          previousStock,
          newStock,
          user: req.user._id,
          reference: { refType: 'SALE', refId: sale._id },
        }],
        { session }
      );
    });
  } finally {
    session.endSession();
  }

  await sale.populate(SALE_POPULATE);
  await recordAudit({
    req,
    action: 'SELL_PRODUCT',
    entityType: 'Sale',
    entityId: sale._id,
    newValue: { saleId: sale.saleId, product: product.productId, quantity, remainingStock: sale.remainingStock },
  });

  sendSuccess(res, {
    statusCode: 201,
    message: 'Sale completed successfully.',
    data: { sale, product },
  });
});

export const listSales = asyncHandler(async (req, res) => {
  const {
    search = '', ageGroup, design, productType, color, soldBy, sku,
    range, startDate, endDate, page = 1, limit = 20,
  } = req.query;

  const filter = {};
  if (ageGroup) filter.ageGroup = ageGroup;
  if (design) filter.design = design;
  if (productType) filter.productType = productType;
  if (color) filter.color = color;
  if (soldBy) filter.soldBy = soldBy;
  if (sku) filter.sku = sku.toUpperCase();
  if (search) {
    filter.$or = [
      { saleId: { $regex: search, $options: 'i' } },
      { sku: { $regex: search, $options: 'i' } },
    ];
  }

  const { $gte, $lte } = resolveDateRange(range, startDate, endDate);
  if ($gte || $lte) {
    filter.soldAt = {};
    if ($gte) filter.soldAt.$gte = $gte;
    if ($lte) filter.soldAt.$lte = $lte;
  }

  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.min(200, Number(limit));

  const [sales, total, agg] = await Promise.all([
    Sale.find(filter).populate(SALE_POPULATE).sort({ soldAt: -1 }).skip((pageNum - 1) * limitNum).limit(limitNum),
    Sale.countDocuments(filter),
    Sale.aggregate([{ $match: filter }, { $group: { _id: null, totalAmount: { $sum: '$totalAmount' }, totalQuantity: { $sum: '$quantity' } } }]),
  ]);

  sendSuccess(res, {
    message: 'Sales fetched successfully.',
    data: sales,
    meta: {
      total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum),
      totalAmount: agg[0]?.totalAmount || 0,
      totalQuantity: agg[0]?.totalQuantity || 0,
    },
  });
});

export const getSale = asyncHandler(async (req, res) => {
  const sale = await Sale.findById(req.params.id).populate(SALE_POPULATE).populate('product');
  if (!sale) throw ApiError.notFound('Sale not found.');
  sendSuccess(res, { message: 'Sale fetched successfully.', data: sale });
});

export const createReturn = asyncHandler(async (req, res) => {
  const { sale: saleId, quantity, reason } = req.body;

  const session = await mongoose.startSession();
  let returnDoc;
  let product;
  try {
    await session.withTransaction(async () => {
      const sale = await Sale.findById(saleId).session(session);
      if (!sale) throw ApiError.notFound('Sale not found.');

      const alreadyReturned = sale.returnedQuantity || 0;
      const returnableQty = sale.quantity - alreadyReturned;
      if (quantity > returnableQty) {
        throw ApiError.badRequest(`Cannot return more than sold. Returnable quantity: ${returnableQty}`);
      }

      product = await Product.findById(sale.product).session(session);
      if (!product) throw ApiError.notFound('Product not found.');

      const previousStock = product.currentStock;
      const newStock = previousStock + quantity;
      product.currentStock = newStock;
      product.totalSold = Math.max(0, product.totalSold - quantity);
      await product.save({ session });

      sale.returnedQuantity = alreadyReturned + quantity;
      await sale.save({ session });

      const returnId = await generateReturnId(session);
      const created = await Return.create(
        [{
          returnId,
          sale: sale._id,
          product: product._id,
          quantity,
          previousStock,
          newStock,
          reason,
          processedBy: req.user._id,
        }],
        { session }
      );
      returnDoc = created[0];

      await InventoryTransaction.create(
        [{
          product: product._id,
          type: TRANSACTION_TYPES.STOCK_RETURN,
          quantity,
          previousStock,
          newStock,
          user: req.user._id,
          reason,
          reference: { refType: 'RETURN', refId: returnDoc._id },
        }],
        { session }
      );
    });
  } finally {
    session.endSession();
  }

  await recordAudit({
    req,
    action: 'PRODUCT_RETURN',
    entityType: 'Return',
    entityId: returnDoc._id,
    newValue: returnDoc,
  });

  sendSuccess(res, { statusCode: 201, message: 'Return processed successfully.', data: { return: returnDoc, product } });
});

export const listReturns = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.min(200, Number(limit));

  const [returns, total] = await Promise.all([
    Return.find({})
      .populate({ path: 'sale', select: 'saleId' })
      .populate({ path: 'product', select: 'productId sku', populate: [{ path: 'ageGroup', select: 'name' }, { path: 'design', select: 'name' }, { path: 'productType', select: 'name' }] })
      .populate('processedBy', 'name role')
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    Return.countDocuments({}),
  ]);

  sendSuccess(res, { message: 'Returns fetched successfully.', data: returns, meta: { total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) } });
});

function resolveDateRange(range, startDate, endDate) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (range) {
    case 'today':
      return { $gte: startOfToday, $lte: now };
    case 'yesterday': {
      const start = new Date(startOfToday);
      start.setDate(start.getDate() - 1);
      const end = new Date(startOfToday.getTime() - 1);
      return { $gte: start, $lte: end };
    }
    case 'this_week': {
      const start = new Date(startOfToday);
      start.setDate(start.getDate() - start.getDay());
      return { $gte: start, $lte: now };
    }
    case 'this_month': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { $gte: start, $lte: now };
    }
    case 'last_month': {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      return { $gte: start, $lte: end };
    }
    case 'custom':
      return {
        $gte: startDate ? new Date(startDate) : undefined,
        $lte: endDate ? new Date(endDate) : undefined,
      };
    default:
      return {};
  }
}

export { resolveDateRange };
export default { createSale, listSales, getSale, createReturn, listReturns };
