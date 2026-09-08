import fs from 'fs';
import Database from 'better-sqlite3';

console.log('--- Step 1: Updating SQLite DB (data/vinsho.db) ---');
const db = new Database('data/vinsho.db');
const now = new Date().toISOString();

const matchingProducts = db.prepare(`SELECT id, slug, name FROM products WHERE name LIKE '%CharoChip%'`).all();
console.log('Products matching "CharoChip" in DB:', matchingProducts);

matchingProducts.forEach(p => {
  const newName = p.name.replace(/CharoChip/g, 'ChocoChip');
  console.log(`Renaming DB product id=${p.id}: "${p.name}" -> "${newName}"`);
  db.prepare(`UPDATE products SET name = ?, updated_at = ? WHERE id = ?`).run(newName, now, p.id);
  db.prepare(`UPDATE product_images SET alt = ?, updated_at = ? WHERE product_id = ?`).run(newName, now, p.id);
});

console.log('\n--- Step 2: Updating vinsho-commerce-seed.json ---');
const seedPath = 'vinsho-commerce-seed.json';
if (fs.existsSync(seedPath)) {
  let raw = fs.readFileSync(seedPath, 'utf8');
  if (raw.includes('CharoChip')) {
    raw = raw.replace(/CharoChip/g, 'ChocoChip');
    fs.writeFileSync(seedPath, raw, 'utf8');
    console.log('Replaced all occurrences of "CharoChip" with "ChocoChip" in vinsho-commerce-seed.json');
  } else {
    console.log('No "CharoChip" found in vinsho-commerce-seed.json');
  }
}

console.log('\n--- Rename complete! ---');
