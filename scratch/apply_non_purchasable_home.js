import Database from 'better-sqlite3';
import fs from 'fs';

const db = new Database('data/vinsho.db');

// 1. Update Database vinsho.db
console.log('Updating database vinsho.db...');
const stmt = db.prepare(`
  UPDATE products 
  SET is_purchasable = 0 
  WHERE collection_id IN (
    SELECT id FROM collections WHERE key IN ('home-decor', 'home-furnishing')
  )
`);
const result = stmt.run();
console.log(`Updated ${result.changes} product records in DB to is_purchasable = 0`);

// 2. Update vinsho-commerce-seed.json
console.log('\nUpdating vinsho-commerce-seed.json...');
const seedData = JSON.parse(fs.readFileSync('vinsho-commerce-seed.json', 'utf8'));
let seedUpdated = 0;
if (seedData.products) {
  seedData.products.forEach(p => {
    const col = (p.collectionKey || p.collection || '').toLowerCase();
    if (col.includes('decor') || col.includes('furnish')) {
      p.isPurchasable = false;
      seedUpdated++;
    }
  });
  fs.writeFileSync('vinsho-commerce-seed.json', JSON.stringify(seedData, null, 2), 'utf8');
}
console.log(`Updated ${seedUpdated} products in vinsho-commerce-seed.json`);

// 3. Update vinsho-taxonomy.json if needed
console.log('\nUpdating vinsho-taxonomy.json...');
const taxData = JSON.parse(fs.readFileSync('vinsho-taxonomy.json', 'utf8'));
let taxUpdated = 0;
if (taxData.products) {
  taxData.products.forEach(p => {
    const col = (p.collectionKey || p.collection || '').toLowerCase();
    if (col.includes('decor') || col.includes('furnish')) {
      p.isPurchasable = false;
      taxUpdated++;
    }
  });
  fs.writeFileSync('vinsho-taxonomy.json', JSON.stringify(taxData, null, 2), 'utf8');
}
console.log(`Updated ${taxUpdated} products in vinsho-taxonomy.json`);

// 4. Verify count in DB
const remainingPurchasableHome = db.prepare(`
  SELECT COUNT(*) as count 
  FROM products p
  JOIN collections c ON p.collection_id = c.id
  WHERE c.key IN ('home-decor', 'home-furnishing') AND p.is_purchasable = 1
`).get();

console.log(`\nRemaining purchasable products in Home Decor or Home Furnishing: ${remainingPurchasableHome.count}`);
