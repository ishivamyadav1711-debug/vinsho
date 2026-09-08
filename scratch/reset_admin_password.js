import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';

const dbPath = path.resolve('data/vinsho.db');
const db = new Database(dbPath);

const passwordHash = bcrypt.hashSync('VinshoDevAdminPass2026!', 10);
db.prepare('UPDATE admin_users SET password_hash = ? WHERE email = ?').run(passwordHash, 'admin@vinsho.com');

console.log('Reset password for admin@vinsho.com to VinshoDevAdminPass2026!');
db.close();
