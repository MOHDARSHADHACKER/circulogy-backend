import bcrypt from 'bcrypt';
import pool from '../config/db.js';
import HttpError from '../utils/httpError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { signToken, setAuthCookie, clearAuthCookie } from '../utils/token.js';
import { normalizeEmail, isValidEmail, PASSWORD_MIN, PASSWORD_MAX } from '../utils/validators.js';

const BCRYPT_ROUNDS = 12;

// Compared against when the email is unknown so response time doesn't reveal valid emails.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', BCRYPT_ROUNDS);

const publicAdmin = (a) => ({ id: a.id, name: a.name, email: a.email });

const findAdminByEmail = async (email) => {
  const [rows] = await pool.execute(
    `SELECT id, name, email, password_hash, token_version, is_active
       FROM admins WHERE email = ? LIMIT 1`,
    [email]
  );
  return rows[0] || null;
};

// POST /api/auth/login
const login = asyncHandler(async (req, res) => {
  const email = normalizeEmail((req.body ?? {}).email);
  const password = (req.body ?? {}).password;

  if (!isValidEmail(email) || typeof password !== 'string' || !password) {
    throw new HttpError(400, 'Enter a valid email and password.');
  }

  const admin = await findAdminByEmail(email);
  const matches = await bcrypt.compare(password, admin ? admin.password_hash : DUMMY_HASH);

  if (!admin || !matches || !admin.is_active) {
    throw new HttpError(401, 'Invalid email or password.');
  }

  await pool.execute('UPDATE admins SET last_login_at = NOW() WHERE id = ?', [admin.id]);

  const token = signToken(admin);
  setAuthCookie(res, token);
  res.json({ message: 'Signed in successfully.', token, admin: publicAdmin(admin) });
});

// POST /api/auth/logout
const logout = asyncHandler(async (req, res) => {
  clearAuthCookie(res);
  res.json({ message: 'Signed out.' });
});

// GET /api/auth/me  (requires admin)
const me = asyncHandler(async (req, res) => {
  res.json({ admin: req.admin });
});

// POST /api/auth/change-password
// Works from the login screen: verifies email + current password, so no active session is needed.
const changePassword = asyncHandler(async (req, res) => {
  const email = normalizeEmail((req.body ?? {}).email);
  const { currentPassword, newPassword, confirmPassword } = req.body ?? {};

  if (!isValidEmail(email) || typeof currentPassword !== 'string' || !currentPassword) {
    throw new HttpError(400, 'Enter your admin email and current password.');
  }
  if (typeof newPassword !== 'string' || newPassword.length < PASSWORD_MIN) {
    throw new HttpError(400, `New password must contain at least ${PASSWORD_MIN} characters.`);
  }
  if (newPassword.length > PASSWORD_MAX) {
    throw new HttpError(400, `New password must be at most ${PASSWORD_MAX} characters.`);
  }
  if (confirmPassword !== undefined && confirmPassword !== newPassword) {
    throw new HttpError(400, 'New password and confirmation do not match.');
  }
  if (Buffer.byteLength(newPassword, 'utf8') > 72) {
    throw new HttpError(400, 'New password must not exceed 72 UTF-8 bytes.');
  }
  if (newPassword === currentPassword) {
    throw new HttpError(400, 'New password must be different from the current password.');
  }

  const admin = await findAdminByEmail(email);
  const matches = await bcrypt.compare(currentPassword, admin ? admin.password_hash : DUMMY_HASH);

  if (!admin || !matches || !admin.is_active) {
    throw new HttpError(401, 'Email or current password is incorrect.');
  }

  const hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

  // Bumping token_version invalidates every existing session for this admin.
  await pool.execute(
    `UPDATE admins
        SET password_hash = ?, token_version = token_version + 1, password_changed_at = NOW()
      WHERE id = ?`,
    [hash, admin.id]
  );

  clearAuthCookie(res);
  res.json({ message: 'Password updated. Sign in with your new password.' });
});

export { login, logout, me, changePassword };
