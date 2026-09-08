import fs from 'fs';
import Database from 'better-sqlite3';

const targetSlugs = [
  'jaguar-new-arrival-teaser',
  'botanical-printed-blinds',
  'elegant-runners',
  'elegant-doormat',
  'jaguar-showpiece',
  'mattress',
  'show-piece-vintage-wall-d-cor'
];

const targetNames = [
  'elegent runners',
  'Elegant Runners',
  'Jaguar (New Arrival teaser)',
  'Jaguar Showpiece',
  'Botanical Printed Blinds',
  'Elegant Doormat',
  'Show Piece (Vintage Wall Décor)',
  'Mattress'
];

console.log('--- Step 1: Remove 7 products from SQLite database ---');
try {
  const db = new Database('data/vinsho.db');
  
  const placeholders = targetSlugs.map(() => '?').join(',');
  const queryStr = `SELECT id, name, slug FROM products WHERE slug IN (${placeholders})`;
  const products = db.prepare(queryStr).all(...targetSlugs);
  
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

  const lowerNames = targetNames.map(n => n.toLowerCase());
  
  if (Array.isArray(data)) {
    const initialLen = data.length;
    const filtered = data.filter(item => !targetSlugs.includes(item.slug) && (!item.name || !lowerNames.includes(item.name.toLowerCase())));
    fs.writeFileSync(filePath, JSON.stringify(filtered, null, 2), 'utf8');
    console.log(`  Removed ${initialLen - filtered.length} item(s). New count: ${filtered.length}`);
  } else if (data.products && Array.isArray(data.products)) {
    const initialLen = data.products.length;
    data.products = data.products.filter(item => !targetSlugs.includes(item.slug) && (!item.name || !lowerNames.includes(item.name.toLowerCase())));
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
