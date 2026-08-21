import AgeGroup from '../models/AgeGroup.js';
import Product from '../models/Product.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import sendSuccess from '../utils/ApiResponse.js';
import recordAudit from '../services/audit.service.js';

export const listAgeGroups = asyncHandler(async (req, res) => {
  const { status, search } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (search) filter.name = { $regex: search, $options: 'i' };
  const ageGroups = await AgeGroup.find(filter).sort({ sortOrder: 1, name: 1 });
  sendSuccess(res, { message: 'Age groups fetched successfully.', data: ageGroups });
});

export const createAgeGroup = asyncHandler(async (req, res) => {
  const { name, code, description, sortOrder } = req.body;
  const existing = await AgeGroup.findOne({ code: code.toUpperCase() });
  if (existing) throw ApiError.conflict('An age group with this code already exists.');

  const ageGroup = await AgeGroup.create({ name, code, description, sortOrder });
  await recordAudit({ req, action: 'CREATE_AGE_GROUP', entityType: 'AgeGroup', entityId: ageGroup._id, newValue: ageGroup });
  sendSuccess(res, { statusCode: 201, message: 'Age group created successfully.', data: ageGroup });
});

export const updateAgeGroup = asyncHandler(async (req, res) => {
  const ageGroup = await AgeGroup.findById(req.params.id);
  if (!ageGroup) throw ApiError.notFound('Age group not found.');
  const oldValue = ageGroup.toObject();

  Object.assign(ageGroup, req.body);
  await ageGroup.save();

  await recordAudit({ req, action: 'UPDATE_AGE_GROUP', entityType: 'AgeGroup', entityId: ageGroup._id, oldValue, newValue: ageGroup });
  sendSuccess(res, { message: 'Age group updated successfully.', data: ageGroup });
});

export const deleteAgeGroup = asyncHandler(async (req, res) => {
  const ageGroup = await AgeGroup.findById(req.params.id);
  if (!ageGroup) throw ApiError.notFound('Age group not found.');

  const dependentCount = await Product.countDocuments({ ageGroup: ageGroup._id });
  if (dependentCount > 0) {
    throw ApiError.conflict('This age group has existing inventory products and cannot be deleted. Deactivate it instead.');
  }

  await ageGroup.deleteOne();
  await recordAudit({ req, action: 'DELETE_AGE_GROUP', entityType: 'AgeGroup', entityId: req.params.id, oldValue: ageGroup });
  sendSuccess(res, { message: 'Age group deleted successfully.' });
});

export default { listAgeGroups, createAgeGroup, updateAgeGroup, deleteAgeGroup };
