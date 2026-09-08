import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';

const base = 'public/images/vinsho/products/Corporate-gifting/cork_product_images_mapping';
const mappingJson = JSON.parse(fs.readFileSync(path.join(base, 'product-image-mapping.json'), 'utf8'));

console.log('--- Inspecting all 28 folders ---');
const folderKeys = Object.keys(mappingJson);
console.log(`Total items in mapping JSON: ${folderKeys.length}`);

const db = new Database('data/vinsho.db');

folderKeys.forEach(key => {
  const item = mappingJson[key];
  const folderPath = path.join(base, key);
  let filesOnDisk = [];
  if (fs.existsSync(folderPath)) {
    filesOnDisk = fs.readdirSync(folderPath).filter(f => !f.startsWith('.'));
  }
  
  // Find matching product in SQLite DB
  const prod = db.prepare(`SELECT id, slug, name FROM products WHERE name LIKE ? OR slug LIKE ?`).get(`%${item.product_name}%`, `%${key}%`);
  
  console.log(`\nKey: "${key}"`);
  console.log(`  Product Name in JSON: "${item.product_name}"`);
  console.log(`  DB Match:`, prod ? `ID=${prod.id}, slug="${prod.slug}", name="${prod.name}"` : 'NOT FOUND IN DB');
  console.log(`  Files in mapping JSON:`, item.images.map(img => img.file));
  console.log(`  Files on disk:`, filesOnDisk);
});
