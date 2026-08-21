import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';

export const protect = asyncHandler(async (req, res, next) => {
  const token = req.cookies?.[env.jwtCookieName] || extractBearer(req);

  if (!token) {
    throw ApiError.unauthorized('Please log in to continue.');
  }

  let decoded;
  try {
    decoded = jwt.verify(token, env.jwtSecret);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw ApiError.unauthorized('Your session has expired. Please log in again.');
    }
    throw ApiError.unauthorized('Invalid authentication token.');
  }

  const user = await User.findById(decoded.sub);
  if (!user) {
    throw ApiError.unauthorized('Account no longer exists.');
  }
  if (!user.isActive) {
    throw ApiError.forbidden('Your account has been disabled. Contact a Super Admin.');
  }

  req.user = user;
  next();
});

function extractBearer(req) {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    return header.split(' ')[1];
  }
  return null;
}

export const authorize = (...roles) => (req, res, next) => {
  if (!req.user) {
    throw ApiError.unauthorized();
  }
  if (!roles.includes(req.user.role)) {
    throw ApiError.forbidden();
  }
  next();
};

export default protect;
