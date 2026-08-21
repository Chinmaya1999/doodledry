import Design from '../models/Design.js';
import Product from '../models/Product.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import sendSuccess from '../utils/ApiResponse.js';
import recordAudit from '../services/audit.service.js';

export const listDesigns = asyncHandler(async (req, res) => {
  const { status, search } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (search) filter.name = { $regex: search, $options: 'i' };
  const designs = await Design.find(filter).sort({ name: 1 });
  sendSuccess(res, { message: 'Designs fetched successfully.', data: designs });
});

export const createDesign = asyncHandler(async (req, res) => {
  const { name, code, description = '' } = req.body;
  if (!name || !name.trim()) throw ApiError.badRequest('Design name cannot be empty.');
  if (!code || !code.trim()) throw ApiError.badRequest('Design code is required.');

  const existing = await Design.findOne({ code: code.toUpperCase() });
  if (existing) throw ApiError.conflict('A design with this code already exists.');

  const isSolid = req.body.isSolid === true || req.body.isSolid === 'true';
  const image = req.file ? `/uploads/designs/${req.file.filename}` : '';
  const design = await Design.create({ name, code, description, isSolid, image });

  await recordAudit({ req, action: 'CREATE_DESIGN', entityType: 'Design', entityId: design._id, newValue: design });
  sendSuccess(res, { statusCode: 201, message: 'Design created successfully.', data: design });
});

export const updateDesign = asyncHandler(async (req, res) => {
  const design = await Design.findById(req.params.id);
  if (!design) throw ApiError.notFound('Design not found.');
  const oldValue = design.toObject();

  const { name, code, description, status } = req.body;
  if (name !== undefined) design.name = name;
  if (code !== undefined) design.code = code;
  if (description !== undefined) design.description = description;
  if (status !== undefined) design.status = status;
  if (req.body.isSolid !== undefined) design.isSolid = req.body.isSolid === true || req.body.isSolid === 'true';
  if (req.file) design.image = `/uploads/designs/${req.file.filename}`;
  await design.save();

  await recordAudit({ req, action: 'UPDATE_DESIGN', entityType: 'Design', entityId: design._id, oldValue, newValue: design });
  sendSuccess(res, { message: 'Design updated successfully.', data: design });
});

export const deleteDesign = asyncHandler(async (req, res) => {
  const design = await Design.findById(req.params.id);
  if (!design) throw ApiError.notFound('Design not found.');

  const dependentCount = await Product.countDocuments({ design: design._id });
  if (dependentCount > 0) {
    throw ApiError.conflict('This design has existing inventory products and cannot be deleted. Deactivate it instead.');
  }

  await design.deleteOne();
  await recordAudit({ req, action: 'DELETE_DESIGN', entityType: 'Design', entityId: req.params.id, oldValue: design });
  sendSuccess(res, { message: 'Design deleted successfully.' });
});

export default { listDesigns, createDesign, updateDesign, deleteDesign };
