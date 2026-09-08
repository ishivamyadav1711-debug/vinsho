import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const dbPath = path.resolve('data/vinsho.db');
const db = new Database(dbPath);

const targetTitles = [
  'Box UV Printed Coaster Combo-46',
  'Cork Diary A5 Fab India Combo 30',
  'Cork Metal Pen Combo 10',
  'Pen Holder Combo-36'
];

const rows = db.prepare(`SELECT id, name, slug FROM products`).all();

const matching = rows.filter(r => targetTitles.some(t => r.name.toLowerCase().includes(t.toLowerCase()) || t.toLowerCase().includes(r.name.toLowerCase())));

console.log('Matching DB products:', matching);

for (const p of matching) {
  const imgs = db.prepare(`SELECT * FROM product_images WHERE product_id = ?`).all(p.id);
  console.log(`Product ID=${p.id} (${p.name}):`, imgs);
}

db.close();
