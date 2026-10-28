const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizeEmail = (value) => (typeof value === 'string' ? value.trim().toLowerCase() : '');

const isValidEmail = (email) => email.length > 0 && email.length <= 255 && EMAIL_RE.test(email);

// bcrypt only uses the first 72 bytes, so cap the length.
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 72;

const slugify = (text) =>
  String(text)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 200);

export { normalizeEmail, isValidEmail, slugify, PASSWORD_MIN, PASSWORD_MAX };
