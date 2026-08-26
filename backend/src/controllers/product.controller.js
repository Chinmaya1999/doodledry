import mongoose from 'mongoose';
import Product from '../models/Product.js';
import AgeGroup from '../models/AgeGroup.js';
import Design from '../models/Design.js';
import ProductType from '../models/ProductType.js';
import Color from '../models/Color.js';
import InventoryTransaction, { TRANSACTION_TYPES } from '../models/InventoryTransaction.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import sendSuccess from '../utils/ApiResponse.js';
import recordAudit from '../services/audit.service.js';
import { generateProductId, buildSku, renderProductCodes } from '../services/barcode.service.js';

const POPULATE = [
  { path: 'ageGroup', select: 'name code' },
  { path: 'design', select: 'name code image' },
  { path: 'productType', select: 'name code' },
  { path: 'color', select: 'name code hexCode' },
];

function computeStockStatus(product) {
  if (product.currentStock <= 0) return 'OUT_OF_STOCK';
  if (product.currentStock <= product.reorderLevel) return 'LOW_STOCK';
  return 'IN_STOCK';
}

export const listProducts = asyncHandler(async (req, res) => {
  const {
    search = '', ageGroup, design, productType, color, stockStatus,
    page = 1, limit = 20, sortBy = 'createdAt', sortDir = 'desc',
  } = req.query;

  const filter = { isActive: true };
  if (ageGroup) filter.ageGroup = ageGroup;
  if (design) filter.design = design;
  if (productType) filter.productType = productType;
  if (color) filter.color = color;
  if (search) {
    filter.$or = [
      { sku: { $regex: search, $options: 'i' } },
      { barcode: { $regex: search, $options: 'i' } },
      { productId: { $regex: search, $options: 'i' } },
    ];
  }

  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.min(200, Number(limit));

  if (stockStatus === 'OUT_OF_STOCK') {
    filter.currentStock = { $lte: 0 };
  } else if (stockStatus === 'LOW_STOCK') {
    filter.currentStock = { $gt: 0 };
    filter.$expr = { $lte: ['$currentStock', '$reorderLevel'] };
  } else if (stockStatus === 'IN_STOCK') {
    filter.$expr = { $gt: ['$currentStock', '$reorderLevel'] };
  }

  const total = await Product.countDocuments(filter);
  const products = await Product.find(filter)
    .populate(POPULATE)
    .sort({ [sortBy]: sortDir === 'asc' ? 1 : -1 })
    .skip((pageNum - 1) * limitNum)
    .limit(limitNum);

  sendSuccess(res, {
    message: 'Products fetched successfully.',
    data: products,
    meta: { total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) },
  });
});

export const getProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id).populate(POPULATE);
  if (!product) throw ApiError.notFound('Product not found.');

  const codes = await renderProductCodes(product);
  const history = await InventoryTransaction.find({ product: product._id })
    .sort({ createdAt: -1 })
    .limit(100)
    .populate('user', 'name role');

  sendSuccess(res, { message: 'Product fetched successfully.', data: { product, codes, history } });
});

export const lookupProduct = asyncHandler(async (req, res) => {
  const { code } = req.params;
  const product = await Product.findOne({
    $or: [{ barcode: code }, { qrCode: code }, { sku: code.toUpperCase() }, { productId: code.toUpperCase() }],
  }).populate(POPULATE);

  if (!product || !product.isActive) {
    throw ApiError.notFound('Product not found. Please scan a valid product barcode.');
  }

  const codes = await renderProductCodes(product);
  sendSuccess(res, { message: 'Product found.', data: { product, codes, stockStatus: computeStockStatus(product) } });
});

export const createProduct = asyncHandler(async (req, res) => {
  const { ageGroup, design, productType, color, openingStock, costPrice, sellingPrice, reorderLevel } = req.body;

  const [ageGroupDoc, designDoc, productTypeDoc, colorDoc] = await Promise.all([
    AgeGroup.findById(ageGroup),
    Design.findById(design),
    ProductType.findById(productType),
    Color.findById(color),
  ]);
  if (!ageGroupDoc) throw ApiError.badRequest('Selected age group does not exist.');
  if (!designDoc) throw ApiError.badRequest('Selected design does not exist.');
  if (!productTypeDoc) throw ApiError.badRequest('Selected product type does not exist.');
  if (!colorDoc) throw ApiError.badRequest('Selected color does not exist.');

  const existingCombo = await Product.findOne({ ageGroup, design, productType, color });
  if (existingCombo) {
    throw ApiError.conflict(
      `A product already exists for ${ageGroupDoc.name} + ${designDoc.name} + ${productTypeDoc.name} + ${colorDoc.name}. Each combination must be unique.`
    );
  }

  const finalSku = buildSku({
    ageGroupCode: ageGroupDoc.code,
    designCode: designDoc.code,
    productTypeCode: productTypeDoc.code,
    colorCode: colorDoc.code,
  });

  const skuExists = await Product.findOne({ sku: finalSku });
  if (skuExists) throw ApiError.conflict('SKU must be unique. This SKU is already in use.');

  const session = await mongoose.startSession();
  let product;
  try {
    await session.withTransaction(async () => {
      const productId = await generateProductId(session);
      const barcode = finalSku;
      const qrCode = productId;

      const created = await Product.create(
        [{
          productId,
          ageGroup,
          design,
          productType,
          color,
          sku: finalSku,
          barcode,
          qrCode,
          openingStock,
          currentStock: openingStock,
          totalAdded: openingStock,
          totalSold: 0,
          costPrice,
          sellingPrice,
          reorderLevel,
        }],
        { session }
      );
      product = created[0];

      if (openingStock > 0) {
        await InventoryTransaction.create(
          [{
            product: product._id,
            type: TRANSACTION_TYPES.STOCK_IN,
            quantity: openingStock,
            previousStock: 0,
            newStock: openingStock,
            user: req.user._id,
            notes: 'Opening stock at product creation',
          }],
          { session }
        );
      }
    });
  } finally {
    session.endSession();
  }

  await product.populate(POPULATE);
  const codes = await renderProductCodes(product);

  await recordAudit({ req, action: 'CREATE_PRODUCT', entityType: 'Product', entityId: product._id, newValue: product });

  sendSuccess(res, { statusCode: 201, message: 'Inventory product created successfully.', data: { product, codes } });
});

export const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw ApiError.notFound('Product not found.');
  const oldValue = product.toObject();

  const { costPrice, sellingPrice, reorderLevel, isActive } = req.body;
  if (costPrice !== undefined) product.costPrice = costPrice;
  if (sellingPrice !== undefined) product.sellingPrice = sellingPrice;
  if (reorderLevel !== undefined) product.reorderLevel = reorderLevel;
  if (isActive !== undefined) product.isActive = isActive;
  await product.save();
  await product.populate(POPULATE);

  await recordAudit({ req, action: 'UPDATE_PRODUCT', entityType: 'Product', entityId: product._id, oldValue, newValue: product });
  sendSuccess(res, { message: 'Product updated successfully.', data: product });
});

export const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw ApiError.notFound('Product not found.');

  const deletedTransactions = await InventoryTransaction.deleteMany({ product: product._id });
  await product.deleteOne();

  await recordAudit({
    req,
    action: 'DELETE_PRODUCT',
    entityType: 'Product',
    entityId: req.params.id,
    oldValue: product,
    newValue: { deletedTransactions: deletedTransactions.deletedCount },
  });

  sendSuccess(res, {
    message: `Product and its stock history were permanently deleted (${deletedTransactions.deletedCount} transaction records removed).`,
  });
});

export const clearAllInventory = asyncHandler(async (req, res) => {
  const productCount = await Product.countDocuments({});
  const transactionCount = await InventoryTransaction.countDocuments({});

  await InventoryTransaction.deleteMany({});
  await Product.deleteMany({});

  await recordAudit({
    req,
    action: 'CLEAR_ALL_INVENTORY',
    entityType: 'Product',
    newValue: { deletedProducts: productCount, deletedTransactions: transactionCount },
  });

  sendSuccess(res, {
    message: `Cleared all inventory: ${productCount} products and ${transactionCount} stock transactions permanently deleted.`,
    data: { deletedProducts: productCount, deletedTransactions: transactionCount },
  });
});

export const getProductLabels = asyncHandler(async (req, res) => {
  const { ids = '' } = req.query;
  const idList = ids.split(',').map((s) => s.trim()).filter(Boolean);
  if (idList.length === 0) throw ApiError.badRequest('Select at least one product to generate labels.');

  const products = await Product.find({ _id: { $in: idList } }).populate(POPULATE);
  const labels = await Promise.all(
    products.map(async (product) => ({
      product,
      codes: await renderProductCodes(product),
    }))
  );

  sendSuccess(res, { message: 'Labels generated successfully.', data: labels });
});

export default {
  listProducts, getProduct, lookupProduct, createProduct, updateProduct, deleteProduct, clearAllInventory, getProductLabels,
};
