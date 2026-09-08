import fs from 'fs';
import Database from 'better-sqlite3';

const nameUpdates = {
  'wall-clock': 'Vintage Wall Clock',
  'wall-art': 'Wall Art (Metal Discs)',
  'wall-art-2': 'Wall Art – LED Wall Clock'
};

const duplicateSlugs = [
  'vintage-wall-clock',
  'wall-art-metal-discs',
  'wall-art-led-wall-clock'
];

console.log('--- Step 1: Remove any leftover duplicate product records ---');
try {
  const db = new Database('data/vinsho.db');
  
  const placeholders = duplicateSlugs.map(() => '?').join(',');
  const dupes = db.prepare(`SELECT id, name, slug FROM products WHERE slug IN (${placeholders})`).all(...duplicateSlugs);
  
  if (dupes.length > 0) {
    const ids = dupes.map(p => p.id);
    const idPlaceholders = ids.map(() => '?').join(',');
    db.prepare(`DELETE FROM product_variants WHERE product_id IN (${idPlaceholders})`).run(...ids);
    db.prepare(`DELETE FROM product_images WHERE product_id IN (${idPlaceholders})`).run(...ids);
    db.prepare(`DELETE FROM products WHERE id IN (${idPlaceholders})`).run(...ids);
    console.log(`Deleted ${dupes.length} leftover duplicate product rows from DB.`);
  } else {
    console.log('No leftover duplicate rows found in DB.');
  }

  console.log('--- Step 2: Update product names in SQLite DB ---');
  const updateStmt = db.prepare('UPDATE products SET name = ? WHERE slug = ?');
  for (const [slug, newName] of Object.entries(nameUpdates)) {
    const res = updateStmt.run(newName, slug);
    console.log(`DB Name Update [Slug "${slug}"]: name set to "${newName}" (${res.changes} row updated)`);
  }
} catch (err) {
  console.error('DB Error:', err.message);
}

function updateJsonFiles(filePath) {
  if (!fs.existsSync(filePath)) return;
  console.log(`--- Processing JSON File: ${filePath} ---`);
  const raw = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(raw);

  let list = Array.isArray(data) ? data : (data.products || []);
  const initialLen = list.length;

  // 1. Remove duplicate slugs if present
  list = list.filter(item => !duplicateSlugs.includes(item.slug));
  const removedCount = initialLen - list.length;

  // 2. Update product names for the 3 target products
  let updatedCount = 0;
  list.forEach(item => {
    if (item && item.slug && Object.prototype.hasOwnProperty.call(nameUpdates, item.slug)) {
      item.name = nameUpdates[item.slug];
      updatedCount++;
    }
  });

  const finalOutput = Array.isArray(data) ? list : { ...data, products: list };
  fs.writeFileSync(filePath, JSON.stringify(finalOutput, null, 2), 'utf8');
  console.log(`  Removed ${removedCount} duplicate(s), updated names for ${updatedCount} item(s).`);
}

updateJsonFiles('vinsho-commerce-seed.json');
updateJsonFiles('src/data/products/candles.json');
updateJsonFiles('vinsho_products.json');

console.log('Done updating database and JSON files!');
