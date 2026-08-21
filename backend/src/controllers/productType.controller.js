import ProductType from '../models/ProductType.js';
import Product from '../models/Product.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import sendSuccess from '../utils/ApiResponse.js';
import recordAudit from '../services/audit.service.js';

export const listProductTypes = asyncHandler(async (req, res) => {
  const { status, search } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (search) filter.name = { $regex: search, $options: 'i' };
  const productTypes = await ProductType.find(filter).sort({ name: 1 });
  sendSuccess(res, { message: 'Product types fetched successfully.', data: productTypes });
});

export const createProductType = asyncHandler(async (req, res) => {
  const { name, code, description } = req.body;
  const existing = await ProductType.findOne({ code: code.toUpperCase() });
  if (existing) throw ApiError.conflict('A product type with this code already exists.');

  const productType = await ProductType.create({ name, code, description });
  await recordAudit({ req, action: 'CREATE_PRODUCT_TYPE', entityType: 'ProductType', entityId: productType._id, newValue: productType });
  sendSuccess(res, { statusCode: 201, message: 'Product type created successfully.', data: productType });
});

export const updateProductType = asyncHandler(async (req, res) => {
  const productType = await ProductType.findById(req.params.id);
  if (!productType) throw ApiError.notFound('Product type not found.');
  const oldValue = productType.toObject();

  Object.assign(productType, req.body);
  await productType.save();

  await recordAudit({ req, action: 'UPDATE_PRODUCT_TYPE', entityType: 'ProductType', entityId: productType._id, oldValue, newValue: productType });
  sendSuccess(res, { message: 'Product type updated successfully.', data: productType });
});

export const deleteProductType = asyncHandler(async (req, res) => {
  const productType = await ProductType.findById(req.params.id);
  if (!productType) throw ApiError.notFound('Product type not found.');

  const dependentCount = await Product.countDocuments({ productType: productType._id });
  if (dependentCount > 0) {
    throw ApiError.conflict('This product type has existing inventory products and cannot be deleted. Deactivate it instead.');
  }

  await productType.deleteOne();
  await recordAudit({ req, action: 'DELETE_PRODUCT_TYPE', entityType: 'ProductType', entityId: req.params.id, oldValue: productType });
  sendSuccess(res, { message: 'Product type deleted successfully.' });
});

export default { listProductTypes, createProductType, updateProductType, deleteProductType };
