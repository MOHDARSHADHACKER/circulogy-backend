// Creates the database (if missing) and all tables from sql/schema.sql.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import env from '../config/env.js';

(async () => {
  if (!/^[A-Za-z0-9_]+$/.test(env.db.database)) {
    console.error('DB_NAME may only contain letters, numbers and underscores.');
    process.exit(1);
  }

  const conn = await mysql.createConnection({
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
    multipleStatements: true,
  });

  try {
    await conn.query(
      `CREATE DATABASE IF NOT EXISTS \`${env.db.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    await conn.query(`USE \`${env.db.database}\``);
    const sql = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '../sql/schema.sql'), 'utf8');
    await conn.query(sql);
    // Keep existing installations compatible with the current blog editor.
    const [blogColumns] = await conn.query("SHOW COLUMNS FROM blogs LIKE 'author'");
    if (!blogColumns.length) {
      await conn.query('ALTER TABLE blogs ADD COLUMN author VARCHAR(255) NULL AFTER category');
    }
    console.log(`Database "${env.db.database}" is ready.`);
  } catch (err) {
    console.error('Database setup failed:', err.message);
    process.exitCode = 1;
  } finally {
    await conn.end();
  }
})();
