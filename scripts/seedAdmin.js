// Creates the first admin from ADMIN_EMAIL / ADMIN_PASSWORD in .env (skips if the email exists).
import bcrypt from 'bcrypt';
import pool from '../config/db.js';
import { normalizeEmail, isValidEmail, PASSWORD_MIN, PASSWORD_MAX } from '../utils/validators.js';

(async () => {
  const email = normalizeEmail(process.env.ADMIN_EMAIL);
  const password = process.env.ADMIN_PASSWORD || '';
  const name = (process.env.ADMIN_NAME || 'Admin').trim();

  if (!isValidEmail(email)) {
    console.error('Set a valid ADMIN_EMAIL in .env');
    process.exit(1);
  }
  if (password.length < PASSWORD_MIN || password.length > PASSWORD_MAX) {
    console.error(`ADMIN_PASSWORD must be ${PASSWORD_MIN}-${PASSWORD_MAX} characters.`);
    process.exit(1);
  }

  try {
    const [existing] = await pool.execute('SELECT id FROM admins WHERE email = ? LIMIT 1', [email]);
    if (existing.length) {
      console.log(`Admin ${email} already exists. Nothing to do.`);
    } else {
      const hash = await bcrypt.hash(password, 12);
      await pool.execute('INSERT INTO admins (name, email, password_hash) VALUES (?, ?, ?)', [
        name,
        email,
        hash,
      ]);
      console.log(`Admin created: ${email}`);
      console.log('Sign in, then change the password from the "Change password?" link.');
    }
  } catch (err) {
    console.error('Seeding failed:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
