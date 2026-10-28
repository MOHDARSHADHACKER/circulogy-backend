# Circulogy Admin Panel Backend

Express 5 + MySQL backend for admin authentication, password changes, and blog management. Blog data is stored in MySQL; it is not hardcoded in the API.

## Requirements

- Node.js 20 or newer
- MySQL 8 (or a compatible MySQL server)

## Setup (Windows PowerShell / CMD)

1. Extract this folder.
2. Install dependencies:

   ```bash
   npm install
   ```

3. Create your local environment file:

   ```powershell
   Copy-Item .env.example .env
   ```

   Edit `.env` and set `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `JWT_SECRET`, `CLIENT_ORIGIN`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD`. Generate a strong JWT secret with:

   ```bash
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
   ```

   Use a unique admin password and do not commit or share `.env`.

4. Make sure the MySQL user has permission to create/use the configured database, then run:

   ```bash
   npm run db:init
   npm run seed
   npm run dev
   ```

   `db:init` creates the tables and adds the blog `author` column to an existing installation if needed. `seed` creates the admin configured in `.env` only if that email does not already exist.

API base URL: `http://localhost:5000/api`
Health check: `GET http://localhost:5000/api/health`

## Authentication

`POST /api/auth/login` accepts `{ "email": "...", "password": "..." }`. It sets an HttpOnly cookie and also returns a bearer token for clients that store/use tokens. For browser cookie authentication, send requests with `credentials: 'include'`. For bearer authentication, send `Authorization: Bearer <token>`.

`POST /api/auth/change-password` accepts `{ "email": "...", "currentPassword": "...", "newPassword": "...", "confirmPassword": "..." }`. The confirmation field is optional, but if provided must match. The current password is required. Changing the password invalidates existing sessions; sign in again with the new password.

`GET /api/auth/me` requires an active session. `POST /api/auth/logout` clears the authentication cookie.

## Blog API

Public endpoints (published posts only):

- `GET /api/blogs?page=1&limit=9&search=&category=`
- `GET /api/blogs/:slug`

Admin endpoints (authentication required):

- `GET /api/admin/blogs?page=1&limit=9&status=draft&search=`
- `POST /api/admin/blogs`
- `GET /api/admin/blogs/:id`
- `PUT /api/admin/blogs/:id`
- `DELETE /api/admin/blogs/:id`

Example create/update body:

```json
{
  "title": "Rethinking India's Critical Mineral Stockpile",
  "slug": "rethinking-indias-critical-mineral-stockpile",
  "category": "STRATEGY & SCALE",
  "author": "Abhishek Tiwari",
  "cover_image": "/images/blog-cover.png",
  "description": "A short summary displayed in blog listings.",
  "content": "Full article content goes here.",
  "status": "draft"
}
```

`description` is accepted as an alias for `excerpt`. Valid statuses are `draft` and `published`. Publishing sets `published_at`; switching back to draft clears it. Slugs are generated from the title when omitted and made unique automatically. `cover_image` must be an `http(s)` URL or a site path beginning with `/`.

## Notes

- Do not upload `node_modules` or `.env`; install dependencies locally and keep credentials private.
- This backend does not contain the React admin UI. The frontend must call the API paths above and use cookie credentials or the returned bearer token consistently.
