import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';

console.log('--- Step 1: Copy image for Ceramic Storage Jars Set ---');
const srcImage = `C:\\Users\\udayb\\.gemini\\antigravity-ide\\brain\\1d514bfd-502f-4210-a3af-9083b8b92d8e\\media__1788167025663.png`;
const destImageRelative = '/images/vinsho/products/ceramic-storage-jars-set.jpg';
const destImagePath = path.join(process.cwd(), 'public', destImageRelative);

if (fs.existsSync(srcImage)) {
  fs.copyFileSync(srcImage, destImagePath);
  console.log(`Copied user image to ${destImagePath}`);
} else {
  console.error(`Source image not found at ${srcImage}`);
}

console.log('--- Step 2: Update SQLite Database ---');
const db = new Database('data/vinsho.db');

const removeSlugs = ['crystal-candle-holders', 'candle-holders'];

// Remove Candle Holders
const placeholders = removeSlugs.map(() => '?').join(',');
const toRemove = db.prepare(`SELECT id FROM products WHERE slug IN (${placeholders})`).all(...removeSlugs);

if (toRemove.length > 0) {
  const ids = toRemove.map(p => p.id);
  const idPlaceholders = ids.map(() => '?').join(',');
  db.prepare(`DELETE FROM product_variants WHERE product_id IN (${idPlaceholders})`).run(...ids);
  db.prepare(`DELETE FROM product_images WHERE product_id IN (${idPlaceholders})`).run(...ids);
  const res = db.prepare(`DELETE FROM products WHERE id IN (${idPlaceholders})`).run(...ids);
  console.log(`Deleted ${res.changes} products (Candle Holders & Crystal Candle Holders) from DB.`);
}

// Update Ceramic Storage Jars Set Image in DB
const jarProduct = db.prepare("SELECT id FROM products WHERE slug = 'ceramic-storage-jars-set'").get();
if (jarProduct) {
  const existingImg = db.prepare("SELECT id FROM product_images WHERE product_id = ? AND is_primary = 1").get(jarProduct.id);
  if (existingImg) {
    db.prepare("UPDATE product_images SET url = ? WHERE id = ?").run(destImageRelative, existingImg.id);
  } else {
    db.prepare("INSERT INTO product_images (product_id, url, alt_text, is_primary, position) VALUES (?, ?, 'Ceramic Storage Jars Set', 1, 1)").run(jarProduct.id, destImageRelative);
  }
  console.log(`Updated product image for Ceramic Storage Jars Set (ID ${jarProduct.id}) to ${destImageRelative}`);
}

console.log('--- Step 3: Update JSON Files ---');

function updateJsonFiles(filePath) {
  if (!fs.existsSync(filePath)) return;
  console.log(`Updating JSON file: ${filePath}`);
  const raw = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(raw);

  let list = Array.isArray(data) ? data : (data.products || []);
  const initialLen = list.length;

  // Filter out removed candle holders
  list = list.filter(item => !removeSlugs.includes(item.slug));
  const removedCount = initialLen - list.length;

  // Update Ceramic Storage Jars Set image
  let updatedCount = 0;
  list.forEach(item => {
    if (item && item.slug === 'ceramic-storage-jars-set') {
      item.image = destImageRelative;
      if (item.images && Array.isArray(item.images) && item.images.length > 0) {
        item.images[0] = destImageRelative;
      } else {
        item.images = [destImageRelative];
      }
      updatedCount++;
    }
  });

  const finalOutput = Array.isArray(data) ? list : { ...data, products: list };
  fs.writeFileSync(filePath, JSON.stringify(finalOutput, null, 2), 'utf8');
  console.log(`  Removed ${removedCount} product(s), updated image for ${updatedCount} item(s) in ${filePath}`);
}

updateJsonFiles('vinsho-commerce-seed.json');
updateJsonFiles('src/data/products/candles.json');
updateJsonFiles('vinsho_products.json');
updateJsonFiles('vinsho-content.json');

console.log('All operations complete!');
