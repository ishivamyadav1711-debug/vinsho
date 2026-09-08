import fs from 'fs';
import Database from 'better-sqlite3';

const targetSlugs = [
  'cat-sculptural-candle',
  'ocean-wave-pillar-candle',
  'ribbed-pumpkin-bowl-candle',
  'wood-log-jar-candle'
];

const targetNames = [
  'Cat Sculptural Candle',
  'Ocean Wave Pillar Candle',
  'Ribbed Pumpkin Bowl Candle',
  'Wood Log Jar Candle'
];

console.log('--- Step 1: Remove from SQLite database ---');
try {
  const db = new Database('data/vinsho.db');
  
  const placeholders = targetSlugs.map(() => '?').join(',');
  const queryStr = `SELECT id, name, slug FROM products WHERE slug IN (${placeholders}) OR name IN (${placeholders})`;
  const products = db.prepare(queryStr).all(...targetSlugs, ...targetNames);
  
  console.log('Found in DB:', products);
  
  if (products.length > 0) {
    const ids = products.map(p => p.id);
    const idPlaceholders = ids.map(() => '?').join(',');
    
    // Delete product variants
    const delVariants = db.prepare(`DELETE FROM product_variants WHERE product_id IN (${idPlaceholders})`).run(...ids);
    console.log('Deleted product variants:', delVariants.changes);

    // Delete product images
    const delImages = db.prepare(`DELETE FROM product_images WHERE product_id IN (${idPlaceholders})`).run(...ids);
    console.log('Deleted product images:', delImages.changes);

    // Delete products
    const delProducts = db.prepare(`DELETE FROM products WHERE id IN (${idPlaceholders})`).run(...ids);
    console.log('Deleted products:', delProducts.changes);
  }
} catch (err) {
  console.error('Error updating SQLite DB:', err.message);
}

function filterJsonFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  console.log('Filtering JSON file:', filePath);
  const raw = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(raw);
  
  if (Array.isArray(data)) {
    const initialLen = data.length;
    const filtered = data.filter(item => !targetSlugs.includes(item.slug) && !targetNames.includes(item.name));
    fs.writeFileSync(filePath, JSON.stringify(filtered, null, 2), 'utf8');
    console.log(`  Removed ${initialLen - filtered.length} item(s). New count: ${filtered.length}`);
  } else if (data.products && Array.isArray(data.products)) {
    const initialLen = data.products.length;
    data.products = data.products.filter(item => !targetSlugs.includes(item.slug) && !targetNames.includes(item.name));
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    console.log(`  Removed ${initialLen - data.products.length} item(s). New count: ${data.products.length}`);
  }
}

console.log('--- Step 2: Remove from JSON files ---');
filterJsonFile('vinsho-commerce-seed.json');
filterJsonFile('src/data/products/candles.json');
filterJsonFile('vinsho_products.json');

console.log('Done!');
