import bcrypt from 'bcryptjs'; // if bcryptjs isn't installed, use 'bcrypt'
import mysql from 'mysql2/promise';

(async () => {
  const hash = await bcrypt.hash('ChangeMe@12345', 10); // your login password
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Arshad@2003',
    database: 'circulogy',
  });
  await conn.execute(
    'INSERT INTO admins (name, email, password_hash) VALUES (?, ?, ?)',
    ['Admin', 'admin@circulogy.com', hash]
  );
  console.log('Admin created');
  await conn.end();
})();