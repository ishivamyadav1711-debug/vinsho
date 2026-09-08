import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const dbPath = path.resolve('data/vinsho.db');
const db = new Database(dbPath);

const target = 'Passport Holder Cork Wrist-C-18';

const rows = db.prepare(`SELECT id, name, slug FROM products`).all();

const matching = rows.filter(r => r.name.toLowerCase().includes('passport') || r.slug.toLowerCase().includes('passport'));

console.log('Matching DB products for passport:', matching);

for (const p of matching) {
  const imgs = db.prepare(`SELECT * FROM product_images WHERE product_id = ?`).all(p.id);
  console.log(`Product ID=${p.id} (${p.name}, slug=${p.slug}):`, imgs);
}

db.close();

const seedPath = path.resolve('vinsho-commerce-seed.json');
const seedData = JSON.parse(fs.readFileSync(seedPath, 'utf8'));

const matchingSeed = seedData.products.filter(p => (p.title || p.name || '').toLowerCase().includes('passport') || (p.slug || '').includes('passport'));
console.log('\nMatching Seed products:', matchingSeed.map(p => ({ id: p.id, title: p.title || p.name, slug: p.slug, image: p.image, images: p.images })));
