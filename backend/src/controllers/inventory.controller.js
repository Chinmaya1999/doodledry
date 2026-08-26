import mongoose from 'mongoose';
import ExcelJS from 'exceljs';
import Product from '../models/Product.js';
import InventoryTransaction, { TRANSACTION_TYPES } from '../models/InventoryTransaction.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import sendSuccess from '../utils/ApiResponse.js';
import recordAudit from '../services/audit.service.js';

const BULK_TEMPLATE_COLUMNS = [
  { header: 'SKU', key: 'sku', width: 22 },
  { header: 'Age Group', key: 'ageGroup', width: 16 },
  { header: 'Design', key: 'design', width: 20 },
  { header: 'Product Type', key: 'productType', width: 16 },
  { header: 'Color', key: 'color', width: 14 },
  { header: 'Current Stock', key: 'currentStock', width: 14 },
  { header: 'Add Stock', key: 'addStock', width: 12 },
  { header: 'Notes', key: 'notes', width: 28 },
];

export const downloadBulkStockTemplate = asyncHandler(async (req, res) => {
  const products = await Product.find({ isActive: true })
    .populate([{ path: 'ageGroup', select: 'name' }, { path: 'design', select: 'name' }, { path: 'productType', select: 'name' }, { path: 'color', select: 'name' }])
    .sort({ sku: 1 });

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Stock Update');
  sheet.columns = BULK_TEMPLATE_COLUMNS;
  sheet.getRow(1).font = { bold: true };

  products.forEach((p) => {
    sheet.addRow({
      sku: p.sku,
      ageGroup: p.ageGroup?.name || '',
      design: p.design?.name || '',
      productType: p.productType?.name || '',
      color: p.color?.name || '',
      currentStock: p.currentStock,
      addStock: '',
      notes: '',
    });
  });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="stock-update-template.xlsx"');
  await workbook.xlsx.write(res);
  res.end();
});

export const bulkUpdateStock = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('Please attach an Excel file (.xlsx or .xls).');

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(req.file.buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) throw ApiError.badRequest('The uploaded file has no worksheet.');

  const headerIndex = {};
  sheet.getRow(1).eachCell((cell, colNumber) => {
    const key = String(cell.value ?? '').trim().toLowerCase();
    if (key) headerIndex[key] = colNumber;
  });
  const skuCol = headerIndex['sku'];
  const addStockCol = headerIndex['add stock'];
  const notesCol = headerIndex['notes'];
  if (!skuCol || !addStockCol) {
    throw ApiError.badRequest('The file must have "SKU" and "Add Stock" columns. Download the sample template and keep its headers.');
  }

  const results = [];
  for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    const skuRaw = row.getCell(skuCol).value;
    const sku = skuRaw ? String(skuRaw).trim().toUpperCase() : '';
    if (!sku) continue;

    const addStockRaw = row.getCell(addStockCol).value;
    const addStock = Number(addStockRaw);
    const notes = notesCol ? String(row.getCell(notesCol).value ?? '').trim() : '';

    if (!addStockRaw || Number.isNaN(addStock) || addStock <= 0) {
      results.push({ row: rowNumber, sku, status: 'SKIPPED', message: 'No stock quantity to add.' });
      continue;
    }

    const session = await mongoose.startSession();
    try {
      let product;
      let previousStock;
      await session.withTransaction(async () => {
        product = await Product.findOne({ sku }).session(session);
        if (!product) throw ApiError.notFound(`No product found with SKU "${sku}".`);
        if (!product.isActive) throw ApiError.badRequest(`Product "${sku}" is inactive.`);

        previousStock = product.currentStock;
        product.currentStock += addStock;
        product.totalAdded += addStock;
        await product.save({ session });

        await InventoryTransaction.create(
          [{
            product: product._id,
            type: TRANSACTION_TYPES.STOCK_IN,
            quantity: addStock,
            previousStock,
            newStock: product.currentStock,
            user: req.user._id,
            notes: notes ? `${notes} (bulk upload)` : 'Bulk upload',
          }],
          { session }
        );
      });

      results.push({ row: rowNumber, sku, status: 'UPDATED', previousStock, newStock: previousStock + addStock, added: addStock });

      await recordAudit({
        req,
        action: 'ADD_STOCK',
        entityType: 'Product',
        entityId: product._id,
        oldValue: { currentStock: previousStock },
        newValue: { currentStock: previousStock + addStock, added: addStock, source: 'BULK_UPLOAD' },
      });
    } catch (err) {
      results.push({ row: rowNumber, sku, status: 'FAILED', message: err.message || 'Could not update stock.' });
    } finally {
      session.endSession();
    }
  }

  const updated = results.filter((r) => r.status === 'UPDATED').length;
  const skipped = results.filter((r) => r.status === 'SKIPPED').length;
  const failed = results.filter((r) => r.status === 'FAILED').length;

  await recordAudit({
    req,
    action: 'BULK_STOCK_UPDATE',
    entityType: 'Product',
    newValue: { totalRows: results.length, updated, skipped, failed },
  });

  sendSuccess(res, {
    message: `Bulk stock update complete: ${updated} updated, ${skipped} skipped, ${failed} failed.`,
    data: { totalRows: results.length, updated, skipped, failed, results },
  });
});

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

export default { stockIn, adjustStock, stockHistory, lowStock, downloadBulkStockTemplate, bulkUpdateStock };
