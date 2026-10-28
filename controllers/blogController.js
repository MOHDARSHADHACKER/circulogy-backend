import pool from '../config/db.js';
import HttpError from '../utils/httpError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { slugify } from '../utils/validators.js';

const LIST_COLUMNS =
  'id, title, slug, excerpt, cover_image, category, author, status, published_at, created_at, updated_at';

// ---------- helpers ----------
const parsePaging = (query) => {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 9, 1), 50);
  return { page, limit, offset: (page - 1) * limit };
};

const pagination = (page, limit, total) => ({
  page,
  limit,
  total,
  totalPages: Math.max(Math.ceil(total / limit), 1),
});

const isHttpOrPath = (v) => /^(https?:\/\/|\/)/i.test(v);

const uniqueSlug = async (base, excludeId = null) => {
  const root = slugify(base) || 'post';
  let candidate = root;
  let n = 2;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const [rows] = await pool.execute('SELECT id FROM blogs WHERE slug = ? AND id <> ? LIMIT 1', [
      candidate,
      excludeId || 0,
    ]);
    if (!rows.length) return candidate;
    candidate = `${root}-${n++}`;
  }
};

// Validates input. With partial=true only supplied fields are checked (used by PUT).
const readInput = (body, partial = false) => {
  const errors = {};
  const data = {};
  const has = (k) => body[k] !== undefined;
  const str = (k) => (typeof body[k] === 'string' ? body[k].trim() : '');

  if (!partial || has('title')) {
    const title = str('title');
    if (title.length < 3 || title.length > 255) errors.title = 'Title must be 3 to 255 characters.';
    else data.title = title;
  }
  if (!partial || has('content')) {
    const content = typeof body.content === 'string' ? body.content : '';
    if (!content.trim()) errors.content = 'Content is required.';
    else data.content = content;
  }
  if (has('description') && !has('excerpt')) body.excerpt = body.description;
  if (has('excerpt')) {
    const v = str('excerpt');
    if (v.length > 500) errors.excerpt = 'Excerpt must be 500 characters or fewer.';
    else data.excerpt = v || null;
  }
  if (has('cover_image')) {
    const v = str('cover_image');
    if (v && (v.length > 500 || !isHttpOrPath(v))) {
      errors.cover_image = 'Cover image must be an http(s) URL or a path starting with /.';
    } else data.cover_image = v || null;
  }
  if (has('category')) {
    const v = str('category');
    if (v.length > 100) errors.category = 'Category must be 100 characters or fewer.';
    else data.category = v || null;
  }
  if (has('author')) {
    const v = str('author');
    if (v.length > 255) errors.author = 'Author must be 255 characters or fewer.';
    else data.author = v || null;
  }
  if (has('slug')) {
    const v = slugify(str('slug'));
    if (str('slug') && !v) errors.slug = 'Slug contains no valid characters.';
    else if (v) data.slug = v;
  }
  if (has('status')) {
    if (!['draft', 'published'].includes(body.status)) errors.status = 'Status must be draft or published.';
    else data.status = body.status;
  }

  if (Object.keys(errors).length) throw new HttpError(400, 'Please fix the highlighted fields.', errors);
  return data;
};

// ---------- public ----------
// GET /api/blogs?page=&limit=&search=&category=
const listPublished = asyncHandler(async (req, res) => {
  const { page, limit, offset } = parsePaging(req.query);
  const where = ["status = 'published'"];
  const params = [];

  if (req.query.category) {
    where.push('category = ?');
    params.push(String(req.query.category));
  }
  if (req.query.search) {
    where.push('(title LIKE ? OR excerpt LIKE ?)');
    const term = `%${String(req.query.search).slice(0, 100)}%`;
    params.push(term, term);
  }
  const clause = `WHERE ${where.join(' AND ')}`;

  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM blogs ${clause}`, params);
  const [rows] = await pool.query(
    `SELECT ${LIST_COLUMNS} FROM blogs ${clause} ORDER BY published_at DESC, id DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  res.json({ data: rows, pagination: pagination(page, limit, total) });
});

// GET /api/blogs/:slug
const getPublishedBySlug = asyncHandler(async (req, res) => {
  const [rows] = await pool.execute(
    "SELECT * FROM blogs WHERE slug = ? AND status = 'published' LIMIT 1",
    [req.params.slug]
  );
  if (!rows.length) throw new HttpError(404, 'Blog post not found.');
  res.json({ data: rows[0] });
});

// ---------- admin ----------
// GET /api/admin/blogs?status=&search=&page=&limit=
const listAll = asyncHandler(async (req, res) => {
  const { page, limit, offset } = parsePaging(req.query);
  const where = [];
  const params = [];

  if (['draft', 'published'].includes(req.query.status)) {
    where.push('status = ?');
    params.push(req.query.status);
  }
  if (req.query.search) {
    where.push('(title LIKE ? OR excerpt LIKE ?)');
    const term = `%${String(req.query.search).slice(0, 100)}%`;
    params.push(term, term);
  }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM blogs ${clause}`, params);
  const [rows] = await pool.query(
    `SELECT ${LIST_COLUMNS} FROM blogs ${clause} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  res.json({ data: rows, pagination: pagination(page, limit, total) });
});

// GET /api/admin/blogs/:id
const getById = asyncHandler(async (req, res) => {
  const [rows] = await pool.execute('SELECT * FROM blogs WHERE id = ? LIMIT 1', [req.params.id]);
  if (!rows.length) throw new HttpError(404, 'Blog post not found.');
  res.json({ data: rows[0] });
});

// POST /api/admin/blogs
const create = asyncHandler(async (req, res) => {
  const input = readInput(req.body ?? {}, false);
  const status = input.status || 'draft';
  const slug = await uniqueSlug(input.slug || input.title);

  const [result] = await pool.execute(
    `INSERT INTO blogs (title, slug, excerpt, content, cover_image, category, author, status, author_id, published_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ${status === 'published' ? 'NOW()' : 'NULL'})`,
    [
      input.title,
      slug,
      input.excerpt ?? null,
      input.content,
      input.cover_image ?? null,
      input.category ?? null,
      input.author ?? req.admin.name,
      status,
      req.admin.id,
    ]
  );

  const [rows] = await pool.execute('SELECT * FROM blogs WHERE id = ?', [result.insertId]);
  res.status(201).json({ message: 'Blog post created.', data: rows[0] });
});

// PUT /api/admin/blogs/:id
const update = asyncHandler(async (req, res) => {
  const [existingRows] = await pool.execute('SELECT * FROM blogs WHERE id = ? LIMIT 1', [req.params.id]);
  const existing = existingRows[0];
  if (!existing) throw new HttpError(404, 'Blog post not found.');

  const input = readInput(req.body ?? {}, true);
  if (!Object.keys(input).length) throw new HttpError(400, 'Nothing to update.');

  // Existing URLs stay stable unless a new slug is explicitly supplied.
  if (input.slug && input.slug !== existing.slug) input.slug = await uniqueSlug(input.slug, existing.id);
  else delete input.slug;

  const sets = [];
  const params = [];
  for (const [key, value] of Object.entries(input)) {
    sets.push(`${key} = ?`);
    params.push(value);
  }

  if (input.status === 'published' && existing.status !== 'published') sets.push('published_at = NOW()');
  if (input.status === 'draft') sets.push('published_at = NULL');

  await pool.execute(`UPDATE blogs SET ${sets.join(', ')} WHERE id = ?`, [...params, existing.id]);

  const [rows] = await pool.execute('SELECT * FROM blogs WHERE id = ?', [existing.id]);
  res.json({ message: 'Blog post updated.', data: rows[0] });
});

// DELETE /api/admin/blogs/:id
const remove = asyncHandler(async (req, res) => {
  const [result] = await pool.execute('DELETE FROM blogs WHERE id = ?', [req.params.id]);
  if (!result.affectedRows) throw new HttpError(404, 'Blog post not found.');
  res.json({ message: 'Blog post deleted.' });
});

export { listPublished, getPublishedBySlug, listAll, getById, create, update, remove };
