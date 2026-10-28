import jwt from 'jsonwebtoken';
import env from '../config/env.js';

const signToken = (admin) =>
  jwt.sign({ sub: admin.id, tv: admin.token_version }, env.jwtSecret, {
    expiresIn: `${env.sessionHours}h`,
  });

const verifyToken = (token) => jwt.verify(token, env.jwtSecret);

const cookieOptions = () => ({
  httpOnly: true,
  // SameSite=None requires Secure
  secure: env.isProd || env.cookieSameSite === 'none',
  sameSite: env.cookieSameSite,
  path: '/',
});

const setAuthCookie = (res, token) =>
  res.cookie(env.cookieName, token, {
    ...cookieOptions(),
    maxAge: env.sessionHours * 60 * 60 * 1000,
  });

const clearAuthCookie = (res) => res.clearCookie(env.cookieName, cookieOptions());

export { signToken, verifyToken, setAuthCookie, clearAuthCookie };
