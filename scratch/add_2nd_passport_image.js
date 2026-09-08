import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const artifactsDir = 'C:\\Users\\udayb\\.gemini\\antigravity-ide\\brain\\b2d132e4-5985-4719-95f7-509195ce6419';
const targetDir = path.resolve('public/images/vinsho/products/Corporate-gifting');

const srcFile = 'media__1788784425506.jpg';
const destFile = '09_passport_holder_ocean_mist_combo_18_02.jpg';

console.log('--- Step 1: Copying 2nd passport image ---');
fs.copyFileSync(path.join(artifactsDir, srcFile), path.join(targetDir, destFile));
console.log(`Copied ${srcFile} -> ${destFile}`);

console.log('\n--- Step 2: Updating SQLite DB (data/vinsho.db) ---');
const dbPath = path.resolve('data/vinsho.db');
const db = new Database(dbPath);

const dbId = 3872;
const img1 = '/images/vinsho/products/Corporate-gifting/09_passport_holder_ocean_mist_combo_18.jpg';
const img2 = '/images/vinsho/products/Corporate-gifting/09_passport_holder_ocean_mist_combo_18_02.jpg';

// Clear existing product_images for 3872
db.prepare(`DELETE FROM product_images WHERE product_id = ?`).run(dbId);

// Insert 1st and 2nd images
db.prepare(`
  INSERT INTO product_images (product_id, url, position, is_primary, created_at, updated_at)
  VALUES (?, ?, 1, 1, datetime('now'), datetime('now'))
`).run(dbId, img1);

db.prepare(`
  INSERT INTO product_images (product_id, url, position, is_primary, created_at, updated_at)
  VALUES (?, ?, 2, 0, datetime('now'), datetime('now'))
`).run(dbId, img2);

console.log(`Updated DB Product ID ${dbId} with 2 images.`);
db.close();

console.log('\n--- Step 3: Updating vinsho-commerce-seed.json ---');
const seedPath = path.resolve('vinsho-commerce-seed.json');
const seedData = JSON.parse(fs.readFileSync(seedPath, 'utf8'));

const prod = seedData.products.find(p => p.slug === 'passport-holder-ocean-mist-combo-18' || String(p.id) === '3872' || p.id === 'cg-09');
if (prod) {
  prod.image = img1;
  prod.images = [img1, img2];
  console.log(`Updated seed JSON for product: ${prod.title || prod.name} (${prod.slug})`);
}

fs.writeFileSync(seedPath, JSON.stringify(seedData, null, 2), 'utf8');

console.log('\n--- Step 4: Verification ---');
console.log(`Disk check for ${img1}: ${fs.existsSync(path.resolve('public', img1.substring(1)))}`);
console.log(`Disk check for ${img2}: ${fs.existsSync(path.resolve('public', img2.substring(1)))}`);
