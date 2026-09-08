import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const dbPath = path.resolve('data/vinsho.db');
const db = new Database(dbPath);

const targetIds = [3865, 3877, 3881];
const targetSlugs = ['cork-metal-pen-combo-30', 'cork-metal-pen-combo-36', 'ecodesk-diary-combo-36'];
const targetSeedIds = ['cg-02', 'cg-14', 'cg-18'];

console.log('--- Step 1: Deleting from SQLite DB (data/vinsho.db) ---');

const deleteImagesStmt = db.prepare(`DELETE FROM product_images WHERE product_id = ?`);
const deleteProductStmt = db.prepare(`DELETE FROM products WHERE id = ?`);

for (const id of targetIds) {
  const imgRes = deleteImagesStmt.run(id);
  const prodRes = deleteProductStmt.run(id);
  console.log(`Deleted DB Product ID=${id}: ${prodRes.changes} product row(s), ${imgRes.changes} image row(s) removed.`);
}

console.log('\n--- Step 2: Deleting from vinsho-commerce-seed.json ---');

const seedPath = path.resolve('vinsho-commerce-seed.json');
const seedData = JSON.parse(fs.readFileSync(seedPath, 'utf8'));

const initialCount = seedData.products.length;
seedData.products = seedData.products.filter(p => {
  if (targetSeedIds.includes(p.id)) return false;
  if (targetSlugs.includes(p.slug)) return false;
  const title = (p.title || p.name || '').toLowerCase();
  if (title === 'cork metal pen combo 30' || title === 'cork metal pen combo 36' || title === 'ecodesk diary as combo-36' || title === 'ecodesk diary a5 combo-36') return false;
  return true;
});

const finalCount = seedData.products.length;
console.log(`Seed JSON: Removed ${initialCount - finalCount} product entry/entries. Total products remaining: ${finalCount}`);

fs.writeFileSync(seedPath, JSON.stringify(seedData, null, 2), 'utf8');

db.close();
console.log('\n--- Product Removal Complete ---');
