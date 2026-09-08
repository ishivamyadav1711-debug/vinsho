import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.resolve('data/vinsho.db');
const db = new Database(dbPath);

const users = db.prepare('SELECT id, name, email, role, is_active FROM admin_users').all();
console.log('Admin Users:', users);

db.close();
