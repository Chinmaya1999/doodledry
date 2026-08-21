import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import sendSuccess from '../utils/ApiResponse.js';
import generateToken, { setAuthCookie, clearAuthCookie } from '../utils/generateToken.js';
import recordAudit from '../services/audit.service.js';

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user) {
    throw ApiError.unauthorized('Invalid email or password.');
  }
  if (!user.isActive) {
    throw ApiError.forbidden('Your account has been disabled. Contact a Super Admin.');
  }

  const match = await user.comparePassword(password);
  if (!match) {
    throw ApiError.unauthorized('Invalid email or password.');
  }

  const token = generateToken(user);
  setAuthCookie(res, token);

  req.user = user;
  await recordAudit({ req, action: 'LOGIN', entityType: 'User', entityId: user._id });

  sendSuccess(res, {
    message: 'Logged in successfully.',
    data: { user: user.toSafeJSON(), token },
  });
});

export const logout = asyncHandler(async (req, res) => {
  clearAuthCookie(res);
  if (req.user) {
    await recordAudit({ req, action: 'LOGOUT', entityType: 'User', entityId: req.user._id });
  }
  sendSuccess(res, { message: 'Logged out successfully.' });
});

export const me = asyncHandler(async (req, res) => {
  sendSuccess(res, { message: 'Current user', data: { user: req.user.toSafeJSON() } });
});

export default { login, logout, me };
