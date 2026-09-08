import Database from 'better-sqlite3';
import path from 'node:path';

const dbPath = path.join(process.cwd(), 'data', 'vinsho.db');
const db = new Database(dbPath);

const cols = db.prepare("PRAGMA table_info(products)").all();
const colNames = new Set(cols.map((c) => c.name));
if (!colNames.has('gift_eligible')) {
  db.exec("ALTER TABLE products ADD COLUMN gift_eligible INTEGER NOT NULL DEFAULT 0");
  console.log('Added column gift_eligible to products table.');
}

const eligibleSlugs = [
  'candles', 'decorative-candles', 'photo-frames', 'diaries', 'pen', 'flower-vases', 
  'artificial-flowers', 'flowers-bouquet', 'wall-art', 'wall-clock', 'show-piece', 
  'show-pieces', 'buddha', 'laughing-buddha', 'jaguar', 'cork-belly-coaster', 
  'cork-box-print-coaster', 'cork-coaster-with-stand', 'combo-10-cork-executive-essentials',
  'combo-11-cork-signature-desk-set', 'combo-12-cork-traveller-set', 'combo-13-cork-desk-grow-set',
  'combo-14-cork-hosting-set', 'combo-29-cork-diary-pen-set', 'combo-30-cork-printed-diary-pen-set'
];

const placeholders = eligibleSlugs.map(() => '?').join(',');
const stmt = db.prepare(`UPDATE products SET gift_eligible = 1 WHERE slug IN (${placeholders})`);
const info = stmt.run(...eligibleSlugs);

console.log(`Successfully updated ${info.changes} products to gift_eligible = 1.`);
