import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = path.join(process.cwd(), 'data', 'vinsho.db');
const db = new Database(dbPath);

// Keywords of products that are NOT suitable for hampers (bulky / oversized furniture / heavy drapes)
const bulkyKeywords = [
  'mattress',
  'mattresses',
  'curtains',
  'shower curtains',
  'blinds',
  'fountain',
  'fountains',
  'large rug',
  'heavy carpet'
];

const products = db.prepare('SELECT id, slug, name, subcategory_id FROM products').all();

let eligibleCount = 0;
let excludedCount = 0;

const updateStmt = db.prepare('UPDATE products SET gift_eligible = ? WHERE id = ?');

for (const p of products) {
  const nameLower = p.name.toLowerCase();
  const slugLower = p.slug.toLowerCase();
  
  const isBulky = bulkyKeywords.some(kw => nameLower.includes(kw) || slugLower.includes(kw));
  
  const isEligible = isBulky ? 0 : 1;
  updateStmt.run(isEligible, p.id);
  
  if (isEligible === 1) {
    eligibleCount++;
  } else {
    excludedCount++;
    console.log(`Excluded from hamper (Bulky): ${p.name}`);
  }
}

console.log(`\nUpdated Database: ${eligibleCount} products are now GIFT ELIGIBLE, ${excludedCount} bulky products excluded.`);

// Also update vinsho_products.json if present
const jsonPath = path.join(process.cwd(), 'vinsho_products.json');
if (fs.existsSync(jsonPath)) {
  const jsonProducts = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  let jsonUpdated = 0;
  jsonProducts.forEach(p => {
    const nameLower = (p.name || '').toLowerCase();
    const slugLower = (p.slug || '').toLowerCase();
    const isBulky = bulkyKeywords.some(kw => nameLower.includes(kw) || slugLower.includes(kw));
    p.giftEligible = !isBulky;
    jsonUpdated++;
  });
  fs.writeFileSync(jsonPath, JSON.stringify(jsonProducts, null, 2), 'utf8');
  console.log(`Updated vinsho_products.json (${jsonUpdated} items).`);
}
