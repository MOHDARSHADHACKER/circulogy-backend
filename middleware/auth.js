import pool from '../config/db.js';
import env from '../config/env.js';
import HttpError from '../utils/httpError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { verifyToken } from '../utils/token.js';

const extractToken = (req) => {
  if (req.cookies && req.cookies[env.cookieName]) return req.cookies[env.cookieName];
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7);
  return null;
};

// Protects admin-only routes.
const requireAdmin = asyncHandler(async (req, res, next) => {
  const token = extractToken(req);
  if (!token) throw new HttpError(401, 'Authentication required.');

  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    throw new HttpError(401, 'Session expired. Please sign in again.');
  }

  const [rows] = await pool.execute(
    'SELECT id, name, email, token_version, is_active FROM admins WHERE id = ? LIMIT 1',
    [payload.sub]
  );
  const admin = rows[0];

  // token_version changes whenever the password changes, which signs out old sessions.
  if (!admin || !admin.is_active || admin.token_version !== payload.tv) {
    throw new HttpError(401, 'Session expired. Please sign in again.');
  }

  req.admin = { id: admin.id, name: admin.name, email: admin.email };
  next();
});

export { requireAdmin };
