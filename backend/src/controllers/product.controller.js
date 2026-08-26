import mongoose from 'mongoose';
import ExcelJS from 'exceljs';
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

const BULK_CREATE_COLUMNS = [
  { header: 'Age Group', key: 'ageGroup', width: 16 },
  { header: 'Design', key: 'design', width: 20 },
  { header: 'Product Type', key: 'productType', width: 16 },
  { header: 'Color', key: 'color', width: 14 },
  { header: 'Opening Stock', key: 'openingStock', width: 14 },
  { header: 'Cost Price', key: 'costPrice', width: 12 },
  { header: 'Selling Price', key: 'sellingPrice', width: 13 },
  { header: 'Reorder Level', key: 'reorderLevel', width: 14 },
];
const BULK_CREATE_TEMPLATE_ROWS = 300;

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export const downloadBulkCreateTemplate = asyncHandler(async (req, res) => {
  const [ageGroups, designs, productTypes, colors] = await Promise.all([
    AgeGroup.find({ status: 'ACTIVE' }).sort({ sortOrder: 1, name: 1 }),
    Design.find({ status: 'ACTIVE' }).sort({ name: 1 }),
    ProductType.find({ status: 'ACTIVE' }).sort({ name: 1 }),
    Color.find({ status: 'ACTIVE' }).sort({ name: 1 }),
  ]);

  const workbook = new ExcelJS.Workbook();

  const listSheet = workbook.addWorksheet('Lists');
  listSheet.columns = [
    { header: 'Age Group', key: 'ageGroup', width: 18 },
    { header: 'Design', key: 'design', width: 22 },
    { header: 'Product Type', key: 'productType', width: 18 },
    { header: 'Color', key: 'color', width: 16 },
  ];
  listSheet.getRow(1).font = { bold: true };
  const maxRows = Math.max(ageGroups.length, designs.length, productTypes.length, colors.length);
  for (let i = 0; i < maxRows; i += 1) {
    listSheet.addRow({
      ageGroup: ageGroups[i]?.name || '',
      design: designs[i]?.name || '',
      productType: productTypes[i]?.name || '',
      color: colors[i]?.name || '',
    });
  }

  const sheet = workbook.addWorksheet('New Products');
  sheet.columns = BULK_CREATE_COLUMNS;
  sheet.getRow(1).font = { bold: true };

  const validations = [
    { col: 'A', ref: `Lists!$A$2:$A$${ageGroups.length + 1}` },
    { col: 'B', ref: `Lists!$B$2:$B$${designs.length + 1}` },
    { col: 'C', ref: `Lists!$C$2:$C$${productTypes.length + 1}` },
    { col: 'D', ref: `Lists!$D$2:$D$${colors.length + 1}` },
  ];
  for (let row = 2; row <= BULK_CREATE_TEMPLATE_ROWS; row += 1) {
    validations.forEach(({ col, ref }) => {
      sheet.getCell(`${col}${row}`).dataValidation = {
        type: 'list', allowBlank: true, formulae: [ref],
      };
    });
  }

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="new-products-template.xlsx"');
  await workbook.xlsx.write(res);
  res.end();
});

export const bulkCreateProducts = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('Please attach an Excel file (.xlsx).');

  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(req.file.buffer);
  } catch {
    throw ApiError.badRequest('Could not read this file. Please make sure it is a valid .xlsx Excel file — ideally the downloaded template.');
  }
  const sheet = workbook.worksheets.find((ws) => ws.name !== 'Lists') || workbook.worksheets[0];
  if (!sheet) throw ApiError.badRequest('The uploaded file has no worksheet.');

  const headerIndex = {};
  sheet.getRow(1).eachCell((cell, colNumber) => {
    const key = String(cell.value ?? '').trim().toLowerCase();
    if (key) headerIndex[key] = colNumber;
  });
  const cols = {
    ageGroup: headerIndex['age group'],
    design: headerIndex['design'],
    productType: headerIndex['product type'],
    color: headerIndex['color'],
    openingStock: headerIndex['opening stock'],
    costPrice: headerIndex['cost price'],
    sellingPrice: headerIndex['selling price'],
    reorderLevel: headerIndex['reorder level'],
  };
  const requiredCols = ['ageGroup', 'design', 'productType', 'color', 'openingStock', 'costPrice', 'sellingPrice'];
  if (requiredCols.some((key) => !cols[key])) {
    throw ApiError.badRequest('The file must have "Age Group", "Design", "Product Type", "Color", "Opening Stock", "Cost Price" and "Selling Price" columns. Download the template and keep its headers.');
  }

  const cellText = (row, colNumber) => (colNumber ? String(row.getCell(colNumber).value ?? '').trim() : '');
  const cellNumber = (row, colNumber) => {
    if (!colNumber) return undefined;
    const raw = row.getCell(colNumber).value;
    if (raw === null || raw === undefined || raw === '') return undefined;
    const num = Number(raw);
    return Number.isNaN(num) ? NaN : num;
  };

  const results = [];
  for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    const ageGroupName = cellText(row, cols.ageGroup);
    const designName = cellText(row, cols.design);
    const productTypeName = cellText(row, cols.productType);
    const colorName = cellText(row, cols.color);
    if (!ageGroupName && !designName && !productTypeName && !colorName) continue;

    const label = [ageGroupName, designName, productTypeName, colorName].filter(Boolean).join(' + ') || `row ${rowNumber}`;

    try {
      if (!ageGroupName || !designName || !productTypeName || !colorName) {
        throw ApiError.badRequest('Age Group, Design, Product Type and Color are all required.');
      }

      const openingStock = cellNumber(row, cols.openingStock);
      const costPrice = cellNumber(row, cols.costPrice);
      const sellingPrice = cellNumber(row, cols.sellingPrice);
      const reorderLevel = cellNumber(row, cols.reorderLevel);
      if (openingStock === undefined || Number.isNaN(openingStock) || openingStock < 0) {
        throw ApiError.badRequest('Opening Stock must be a number >= 0.');
      }
      if (costPrice === undefined || Number.isNaN(costPrice) || costPrice < 0) {
        throw ApiError.badRequest('Cost Price must be a number >= 0.');
      }
      if (sellingPrice === undefined || Number.isNaN(sellingPrice) || sellingPrice < 0) {
        throw ApiError.badRequest('Selling Price must be a number >= 0.');
      }
      if (reorderLevel !== undefined && (Number.isNaN(reorderLevel) || reorderLevel < 0)) {
        throw ApiError.badRequest('Reorder Level must be a number >= 0.');
      }

      const [ageGroupDoc, designDoc, productTypeDoc, colorDoc] = await Promise.all([
        AgeGroup.findOne({ name: new RegExp(`^${escapeRegExp(ageGroupName)}$`, 'i') }),
        Design.findOne({ name: new RegExp(`^${escapeRegExp(designName)}$`, 'i') }),
        ProductType.findOne({ name: new RegExp(`^${escapeRegExp(productTypeName)}$`, 'i') }),
        Color.findOne({ name: new RegExp(`^${escapeRegExp(colorName)}$`, 'i') }),
      ]);
      if (!ageGroupDoc) throw ApiError.badRequest(`Unknown Age Group "${ageGroupName}".`);
      if (!designDoc) throw ApiError.badRequest(`Unknown Design "${designName}".`);
      if (!productTypeDoc) throw ApiError.badRequest(`Unknown Product Type "${productTypeName}".`);
      if (!colorDoc) throw ApiError.badRequest(`Unknown Color "${colorName}".`);

      const existingCombo = await Product.findOne({
        ageGroup: ageGroupDoc._id, design: designDoc._id, productType: productTypeDoc._id, color: colorDoc._id,
      });
      if (existingCombo) throw ApiError.conflict('A product with this Age Group + Design + Product Type + Color already exists.');

      const finalSku = buildSku({
        ageGroupCode: ageGroupDoc.code, designCode: designDoc.code, productTypeCode: productTypeDoc.code, colorCode: colorDoc.code,
      });
      const skuExists = await Product.findOne({ sku: finalSku });
      if (skuExists) throw ApiError.conflict(`SKU "${finalSku}" is already in use.`);

      const session = await mongoose.startSession();
      let product;
      try {
        await session.withTransaction(async () => {
          const productId = await generateProductId(session);
          const created = await Product.create(
            [{
              productId,
              ageGroup: ageGroupDoc._id,
              design: designDoc._id,
              productType: productTypeDoc._id,
              color: colorDoc._id,
              sku: finalSku,
              barcode: finalSku,
              qrCode: productId,
              openingStock,
              currentStock: openingStock,
              totalAdded: openingStock,
              totalSold: 0,
              costPrice,
              sellingPrice,
              reorderLevel: reorderLevel ?? 10,
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
                notes: 'Opening stock at bulk product creation',
              }],
              { session }
            );
          }
        });
      } finally {
        session.endSession();
      }

      results.push({ row: rowNumber, label, sku: product.sku, status: 'CREATED' });

      await recordAudit({ req, action: 'CREATE_PRODUCT', entityType: 'Product', entityId: product._id, newValue: { sku: product.sku, source: 'BULK_UPLOAD' } });
    } catch (err) {
      results.push({ row: rowNumber, label, sku: '', status: 'FAILED', message: err.message || 'Could not create this product.' });
    }
  }

  const created = results.filter((r) => r.status === 'CREATED').length;
  const failed = results.filter((r) => r.status === 'FAILED').length;

  await recordAudit({
    req,
    action: 'BULK_CREATE_PRODUCTS',
    entityType: 'Product',
    newValue: { totalRows: results.length, created, failed },
  });

  sendSuccess(res, {
    message: `Bulk product creation complete: ${created} created, ${failed} failed.`,
    data: { totalRows: results.length, created, failed, results },
  });
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
  downloadBulkCreateTemplate, bulkCreateProducts,
};
