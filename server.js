import env from './config/env.js';
import pool from './config/db.js';
import app from './app.js';


const start = async () => {
  try {
    await pool.query('SELECT 1');
    console.log(`MySQL connected (${env.db.host}:${env.db.port}/${env.db.database})`);
  } catch (err) {
    console.error('Could not connect to MySQL:', err.message);
    console.error('Check your .env values and run `npm run db:init` if the database does not exist yet.');
    process.exit(1);
  }


  const server = app.listen(env.port, () => {
    console.log(`API running on http://localhost:${env.port}`);
  });

  const shutdown = (signal) => {
    console.log(`${signal} received, shutting down...`);
    server.close(async () => {
      await pool.end();
      process.exit(0);
    });
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
};

start();

