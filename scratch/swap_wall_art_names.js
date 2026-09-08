import fs from 'fs';
import Database from 'better-sqlite3';

console.log('--- Step 1: Swapping names for wall-art and wall-art-2 ---');
const db = new Database('data/vinsho.db');

// Currently:
// slug 'wall-art' -> 'Wall Art (Metal Discs)'
// slug 'wall-art-2' -> 'Wall Art – LED Wall Clock'

// Swap them:
// slug 'wall-art' -> 'Wall Art – LED Wall Clock'
// slug 'wall-art-2' -> 'Wall Art (Metal Discs)'

const newNames = {
  'wall-art': 'Wall Art – LED Wall Clock',
  'wall-art-2': 'Wall Art (Metal Discs)'
};

const stmt = db.prepare('UPDATE products SET name = ? WHERE slug = ?');
for (const [slug, newName] of Object.entries(newNames)) {
  const res = stmt.run(newName, slug);
  console.log(`DB Swapped [Slug "${slug}"]: set name to "${newName}" (${res.changes} row updated)`);
}

function swapJson(filePath) {
  if (!fs.existsSync(filePath)) return;
  console.log(`Updating JSON file: ${filePath}`);
  const raw = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(raw);

  const items = Array.isArray(data) ? data : (data.products || []);
  let count = 0;
  items.forEach(item => {
    if (item && item.slug && Object.prototype.hasOwnProperty.call(newNames, item.slug)) {
      item.name = newNames[item.slug];
      count++;
    }
  });

  const finalOutput = Array.isArray(data) ? items : { ...data, products: items };
  fs.writeFileSync(filePath, JSON.stringify(finalOutput, null, 2), 'utf8');
  console.log(`  Updated ${count} items in ${filePath}`);
}

swapJson('vinsho-commerce-seed.json');
swapJson('src/data/products/candles.json');
swapJson('vinsho_products.json');

console.log('Swap operation complete!');
