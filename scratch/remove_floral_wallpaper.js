import fs from 'fs';
import Database from 'better-sqlite3';

const targetSlug = 'customised-wall-paper-floral-design';
const targetName = 'Customised Wall Paper — Floral Design';

console.log('--- Step 1: Remove Customised Wall Paper — Floral Design from SQLite database ---');
try {
  const db = new Database('data/vinsho.db');
  
  const product = db.prepare('SELECT id, name, slug FROM products WHERE slug = ? OR name = ?').get(targetSlug, targetName);
  
  console.log('Found in DB:', product);
  
  if (product) {
    db.prepare('DELETE FROM product_variants WHERE product_id = ?').run(product.id);
    db.prepare('DELETE FROM product_images WHERE product_id = ?').run(product.id);
    const delProducts = db.prepare('DELETE FROM products WHERE id = ?').run(product.id);
    console.log('Deleted product from DB:', delProducts.changes);
  } else {
    console.log('Product not found in DB.');
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
    const filtered = data.filter(item => item.slug !== targetSlug && item.name !== targetName);
    fs.writeFileSync(filePath, JSON.stringify(filtered, null, 2), 'utf8');
    console.log(`  Removed ${initialLen - filtered.length} item(s). New count: ${filtered.length}`);
  } else if (data.products && Array.isArray(data.products)) {
    const initialLen = data.products.length;
    data.products = data.products.filter(item => item.slug !== targetSlug && item.name !== targetName);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    console.log(`  Removed ${initialLen - data.products.length} item(s). New count: ${data.products.length}`);
  }
}

console.log('--- Step 2: Remove from JSON files ---');
filterJsonFile('vinsho-commerce-seed.json');
filterJsonFile('src/data/products/candles.json');
filterJsonFile('vinsho_products.json');
filterJsonFile('vinsho-content.json');

console.log('Done!');
