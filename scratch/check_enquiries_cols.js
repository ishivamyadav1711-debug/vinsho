import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.resolve('data/vinsho.db');
const db = new Database(dbPath);

const cols = db.prepare("PRAGMA table_info(enquiries)").all();
console.log('Enquiries Columns:', cols.map(c => c.name));

db.close();
