import User, { ROLES } from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import sendSuccess from '../utils/ApiResponse.js';
import recordAudit from '../services/audit.service.js';

export const listUsers = asyncHandler(async (req, res) => {
  const { search = '', role, isActive, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
    ];
  }
  if (role) filter.role = role;
  if (isActive !== undefined) filter.isActive = isActive === 'true';

  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.min(100, Number(limit));

  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip((pageNum - 1) * limitNum).limit(limitNum),
    User.countDocuments(filter),
  ]);

  sendSuccess(res, {
    message: 'Users fetched successfully.',
    data: users.map((u) => u.toSafeJSON()),
    meta: { total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) },
  });
});

export const createUser = asyncHandler(async (req, res) => {
  const { name, email, phone, password, role } = req.body;

  const existing = await User.findOne({ email });
  if (existing) {
    throw ApiError.conflict('A user with this email already exists.');
  }

  const passwordHash = await User.hashPassword(password);
  const user = await User.create({ name, email, phone, passwordHash, role });

  await recordAudit({
    req,
    action: role === ROLES.SUPER_ADMIN ? 'CREATE_ADMIN' : 'CREATE_ADMIN',
    entityType: 'User',
    entityId: user._id,
    newValue: user.toSafeJSON(),
  });

  sendSuccess(res, { statusCode: 201, message: 'User created successfully.', data: user.toSafeJSON() });
});

export const getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('User not found.');
  sendSuccess(res, { message: 'User fetched successfully.', data: user.toSafeJSON() });
});

export const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('User not found.');

  const oldValue = user.toSafeJSON();
  const { name, phone, role, isActive, password } = req.body;

  if (name !== undefined) user.name = name;
  if (phone !== undefined) user.phone = phone;
  if (role !== undefined) user.role = role;
  if (isActive !== undefined) {
    if (String(user._id) === String(req.user._id) && isActive === false) {
      throw ApiError.badRequest('You cannot disable your own account.');
    }
    user.isActive = isActive;
  }
  if (password) user.passwordHash = await User.hashPassword(password);

  await user.save();

  await recordAudit({
    req,
    action: 'UPDATE_ADMIN',
    entityType: 'User',
    entityId: user._id,
    oldValue,
    newValue: user.toSafeJSON(),
  });

  sendSuccess(res, { message: 'User updated successfully.', data: user.toSafeJSON() });
});

export const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('User not found.');

  if (String(user._id) === String(req.user._id)) {
    throw ApiError.badRequest('You cannot delete your own account.');
  }

  await user.deleteOne();

  await recordAudit({ req, action: 'DELETE_ADMIN', entityType: 'User', entityId: req.params.id, oldValue: user.toSafeJSON() });

  sendSuccess(res, { message: 'User deleted successfully.' });
});

export default { listUsers, createUser, getUser, updateUser, deleteUser };
