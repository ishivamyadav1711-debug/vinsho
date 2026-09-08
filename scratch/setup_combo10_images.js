import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

const src1 = 'C:\\Users\\udayb\\.gemini\\antigravity-ide\\brain\\7bf9c3f9-c097-4cec-a226-1f2fe55c0492\\media__1788759492186.jpg';
const src2 = 'C:\\Users\\udayb\\.gemini\\antigravity-ide\\brain\\7bf9c3f9-c097-4cec-a226-1f2fe55c0492\\media__1788759496225.jpg';

const targetDir = path.join(process.cwd(), 'public', 'images', 'vinsho', 'products', 'Corporate-gifting');
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

const dest1 = path.join(targetDir, '03_ecodesk_diary_as_combo_10_1.jpg');
const dest2 = path.join(targetDir, '03_ecodesk_diary_as_combo_10_2.jpg');
const destOriginal = path.join(targetDir, '03_ecodesk_diary_as_combo_10.jpg');

fs.copyFileSync(src1, dest1);
fs.copyFileSync(src2, dest2);
fs.copyFileSync(src1, destOriginal);

console.log('Copied image files to public directory.');

const db = new Database('data/vinsho.db');
const product = db.prepare('SELECT id FROM products WHERE slug = ?').get('ecodesk-diary-combo-10');

if (product) {
  const productId = product.id;
  
  // Remove old images
  db.prepare('DELETE FROM product_images WHERE product_id = ?').run(productId);
  
  const now = new Date().toISOString();
  
  // Insert image 1 (Primary)
  db.prepare(`
    INSERT INTO product_images (product_id, url, alt, position, is_primary, created_at, updated_at)
    VALUES (?, ?, ?, 1, 1, ?, ?)
  `).run(
    productId,
    '/images/vinsho/products/Corporate-gifting/03_ecodesk_diary_as_combo_10_1.jpg',
    'Ecodesk Diary — Combo 10',
    now,
    now
  );

  // Insert image 2
  db.prepare(`
    INSERT INTO product_images (product_id, url, alt, position, is_primary, created_at, updated_at)
    VALUES (?, ?, ?, 2, 0, ?, ?)
  `).run(
    productId,
    '/images/vinsho/products/Corporate-gifting/03_ecodesk_diary_as_combo_10_2.jpg',
    'Ecodesk Diary — Combo 10 Info',
    now,
    now
  );

  console.log('Successfully updated product_images in SQLite database.');
  
  const images = db.prepare('SELECT * FROM product_images WHERE product_id = ? ORDER BY position ASC').all(productId);
  console.log('Current DB images:', images);
} else {
  console.error('Product ecodesk-diary-combo-10 not found in DB!');
}

// Also update vinsho-commerce-seed.json if present
const seedPath = path.join(process.cwd(), 'vinsho-commerce-seed.json');
if (fs.existsSync(seedPath)) {
  const seed = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
  const seedProd = seed.find((p) => p.slug === 'ecodesk-diary-combo-10');
  if (seedProd) {
    seedProd.image = '/images/vinsho/products/Corporate-gifting/03_ecodesk_diary_as_combo_10_1.jpg';
    seedProd.images = [
      '/images/vinsho/products/Corporate-gifting/03_ecodesk_diary_as_combo_10_1.jpg',
      '/images/vinsho/products/Corporate-gifting/03_ecodesk_diary_as_combo_10_2.jpg'
    ];
    fs.writeFileSync(seedPath, JSON.stringify(seed, null, 2));
    console.log('Updated vinsho-commerce-seed.json');
  }
}
