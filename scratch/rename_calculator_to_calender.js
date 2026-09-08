import fs from 'fs';
import Database from 'better-sqlite3';

console.log('--- Step 1: Updating SQLite DB (data/vinsho.db) ---');
const db = new Database('data/vinsho.db');
const now = new Date().toISOString();

const matchingProducts = db.prepare(`SELECT id, slug, name FROM products WHERE name LIKE '%Small Calculator Combo-36%'`).all();
console.log('Products matching in DB:', matchingProducts);

matchingProducts.forEach(p => {
  const newName = 'Small Calender Combo-36';
  console.log(`Renaming DB product id=${p.id}: "${p.name}" -> "${newName}"`);
  db.prepare(`UPDATE products SET name = ?, updated_at = ? WHERE id = ?`).run(newName, now, p.id);
  db.prepare(`UPDATE product_images SET alt = ?, updated_at = ? WHERE product_id = ?`).run(newName, now, p.id);
});

console.log('\n--- Step 2: Updating vinsho-commerce-seed.json ---');
const seedPath = 'vinsho-commerce-seed.json';
if (fs.existsSync(seedPath)) {
  let raw = fs.readFileSync(seedPath, 'utf8');
  if (raw.includes('Small Calculator Combo-36')) {
    raw = raw.replace(/Small Calculator Combo-36/g, 'Small Calender Combo-36');
    fs.writeFileSync(seedPath, raw, 'utf8');
    console.log('Replaced all occurrences of "Small Calculator Combo-36" with "Small Calender Combo-36" in vinsho-commerce-seed.json');
  } else {
    console.log('No "Small Calculator Combo-36" found in vinsho-commerce-seed.json');
  }
}

console.log('\n--- Rename complete! ---');
