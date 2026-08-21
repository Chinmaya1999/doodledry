import Color from '../models/Color.js';
import Product from '../models/Product.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import sendSuccess from '../utils/ApiResponse.js';
import recordAudit from '../services/audit.service.js';

export const listColors = asyncHandler(async (req, res) => {
  const { status, search } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (search) filter.name = { $regex: search, $options: 'i' };
  const colors = await Color.find(filter).sort({ name: 1 });
  sendSuccess(res, { message: 'Colors fetched successfully.', data: colors });
});

export const createColor = asyncHandler(async (req, res) => {
  const { name, code, hexCode, description } = req.body;
  const existing = await Color.findOne({ code: code.toUpperCase() });
  if (existing) throw ApiError.conflict('A color with this code already exists.');

  const color = await Color.create({ name, code, hexCode, description });
  await recordAudit({ req, action: 'CREATE_COLOR', entityType: 'Color', entityId: color._id, newValue: color });
  sendSuccess(res, { statusCode: 201, message: 'Color created successfully.', data: color });
});

export const updateColor = asyncHandler(async (req, res) => {
  const color = await Color.findById(req.params.id);
  if (!color) throw ApiError.notFound('Color not found.');
  const oldValue = color.toObject();

  Object.assign(color, req.body);
  await color.save();

  await recordAudit({ req, action: 'UPDATE_COLOR', entityType: 'Color', entityId: color._id, oldValue, newValue: color });
  sendSuccess(res, { message: 'Color updated successfully.', data: color });
});

export const deleteColor = asyncHandler(async (req, res) => {
  const color = await Color.findById(req.params.id);
  if (!color) throw ApiError.notFound('Color not found.');

  const dependentCount = await Product.countDocuments({ color: color._id });
  if (dependentCount > 0) {
    throw ApiError.conflict('This color has existing inventory products and cannot be deleted. Deactivate it instead.');
  }

  await color.deleteOne();
  await recordAudit({ req, action: 'DELETE_COLOR', entityType: 'Color', entityId: req.params.id, oldValue: color });
  sendSuccess(res, { message: 'Color deleted successfully.' });
});

export default { listColors, createColor, updateColor, deleteColor };
