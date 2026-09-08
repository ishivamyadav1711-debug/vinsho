import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const artifactsDir = 'C:\\Users\\udayb\\.gemini\\antigravity-ide\\brain\\b2d132e4-5985-4719-95f7-509195ce6419';
const targetDir = path.resolve('public/images/vinsho/products/Corporate-gifting');

const fileMap = [
  { src: 'media__1788785071589.jpg', dest: '04_card_stacker_combo_10_01.jpg' },
  { src: 'media__1788785084932.jpg', dest: '04_card_stacker_combo_10_02.jpg' }
];

console.log('--- Step 1: Copying Card Stacker media files ---');
for (const item of fileMap) {
  const srcPath = path.join(artifactsDir, item.src);
  const destPath = path.join(targetDir, item.dest);
  fs.copyFileSync(srcPath, destPath);
  console.log(`Copied ${item.src} -> ${item.dest}`);
}

console.log('\n--- Step 2: Updating SQLite DB (data/vinsho.db) ---');
const dbPath = path.resolve('data/vinsho.db');
const db = new Database(dbPath);

const dbId = 3867;
const img1 = '/images/vinsho/products/Corporate-gifting/04_card_stacker_combo_10_01.jpg';
const img2 = '/images/vinsho/products/Corporate-gifting/04_card_stacker_combo_10_02.jpg';

db.prepare(`DELETE FROM product_images WHERE product_id = ?`).run(dbId);

db.prepare(`
  INSERT INTO product_images (product_id, url, position, is_primary, created_at, updated_at)
  VALUES (?, ?, 1, 1, datetime('now'), datetime('now'))
`).run(dbId, img1);

db.prepare(`
  INSERT INTO product_images (product_id, url, position, is_primary, created_at, updated_at)
  VALUES (?, ?, 2, 0, datetime('now'), datetime('now'))
`).run(dbId, img2);

console.log(`Updated DB product ID ${dbId} with 2 images.`);
db.close();

console.log('\n--- Step 3: Updating vinsho-commerce-seed.json ---');
const seedPath = path.resolve('vinsho-commerce-seed.json');
const seedData = JSON.parse(fs.readFileSync(seedPath, 'utf8'));

const prod = seedData.products.find(p => p.slug === 'cork-card-stacker-combo-10' || String(p.id) === '3867' || p.id === 'cg-04');
if (prod) {
  prod.image = img1;
  prod.images = [img1, img2];
  console.log(`Updated seed JSON for product: ${prod.title || prod.name} (${prod.slug})`);
}

fs.writeFileSync(seedPath, JSON.stringify(seedData, null, 2), 'utf8');

console.log('\n--- Card Stacker Image Update Complete ---');
