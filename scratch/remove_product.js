import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SLUG = 'couple-embrace-sculptural-candle';

// --- 1. Remove from SQLite DB ---
const db = new Database(path.join(__dirname, '..', 'data', 'vinsho.db'));

const product = db.prepare('SELECT id, slug, name FROM products WHERE slug = ?').get(SLUG);
console.log('Found in DB:', product);

if (product) {
  // Delete cascades to product_images and product_variants via FK
  db.prepare('DELETE FROM products WHERE slug = ?').run(SLUG);
  const check = db.prepare('SELECT id FROM products WHERE slug = ?').get(SLUG);
  console.log(check ? '❌ Still in DB!' : '✓ Removed from DB.');
} else {
  console.log('Not found in DB.');
}
db.close();

// --- 2. Remove from vinsho-commerce-seed.json ---
const seedPath = path.join(__dirname, '..', 'vinsho-commerce-seed.json');
const data = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
const before = data.products.length;
data.products = data.products.filter(p => p.slug !== SLUG);
const after = data.products.length;
fs.writeFileSync(seedPath, JSON.stringify(data, null, 2), 'utf8');
console.log(`Seed JSON: ${before} → ${after} products (removed ${before - after})`);

console.log('\nDone.');
