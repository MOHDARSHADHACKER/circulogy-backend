import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Always load .env from the project root, no matter which folder the command is run from.
const envPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.env');

if (!fs.existsSync(envPath)) {
  throw new Error(
    `No .env file found. Expected it at:\n  ${envPath}\n` +
      'Create it by copying .env.example to .env (the name must be exactly ".env", not ".env.txt" or ".env.example").'
  );
}

const loaded = dotenv.config({ path: envPath, quiet: true });
if (loaded.error) {
  throw new Error(`Could not read ${envPath}: ${loaded.error.message}`);
}
if (!Object.keys(loaded.parsed || {}).length) {
  throw new Error(
    `${envPath} was found but contains no settings. It is empty or saved in the wrong encoding. ` +
      'Open it in Notepad, choose Save As, set Encoding to UTF-8, and make sure lines look like DB_HOST=localhost.'
  );
}
const required = ['DB_HOST', 'DB_USER', 'DB_NAME', 'JWT_SECRET'];
const missing = required.filter((key) => !process.env[key]);
if (missing.length) {
  throw new Error(`Missing required variables in ${envPath}: ${missing.join(', ')}. Add them as NAME=value lines (no spaces, no quotes needed).`);
}

const isProd = process.env.NODE_ENV === 'production';

if (process.env.JWT_SECRET.length < 32) {
  const msg = 'JWT_SECRET should be at least 32 characters long.';
  if (isProd) throw new Error(msg);
  console.warn(`[warn] ${msg}`);
}

const sameSite = (process.env.COOKIE_SAMESITE || 'lax').toLowerCase();
if (!['lax', 'strict', 'none'].includes(sameSite)) {
  throw new Error('COOKIE_SAMESITE must be one of: lax, strict, none');
}

const env = {
  isProd,
  port: Number(process.env.PORT) || 5000,
  clientOrigins: (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
  db: {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME,
  },
  jwtSecret: process.env.JWT_SECRET,
  sessionHours: Number(process.env.SESSION_HOURS) || 24,
  cookieName: process.env.COOKIE_NAME || 'circulogy_admin_token',
  cookieSameSite: sameSite,
};

export default env;
