import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.resolve('data/vinsho.db');
const db = new Database(dbPath);

const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(t => t.name);
console.log('DB Tables:', tables);

db.close();
