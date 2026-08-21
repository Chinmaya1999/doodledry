import jwt from 'jsonwebtoken';
import env from '../config/env.js';

export function generateToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), role: user.role },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn }
  );
}

export function setAuthCookie(res, token) {
  const isProd = env.nodeEnv === 'production';
  res.cookie(env.jwtCookieName, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'strict' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

export function clearAuthCookie(res) {
  res.clearCookie(env.jwtCookieName);
}

export default generateToken;
