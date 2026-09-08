import fs from 'fs';
import Database from 'better-sqlite3';

const db = new Database('data/vinsho.db');

const targetNames = [
  "Cork Diary A5 Fab India Combo 30",
  "Cork Metal Pen Combo 30",
  "Ecodesk Diary A5 Combo 10",
  "Card Stacker Combo 10",
  "Key Chain Combo 10",
  "Cork Metal Pen Combo 10",
  "Cork Canvas Sleeve Combo 10",
  "Ocean Mist Bag Combo 18",
  "Passport Holder Cork Wrist-C-18",
  "Cork Bottle Ocean Mist Combo-18",
  "Jet Case Brown Bag Combo-19",
  "Cork Bottle Granoco Combo-19",
  "Passport Holder Granoco Combo-19",
  "Ecodesk Diary AS Combo-36",
  "Small Calculator Combo-36",
  "Pen Holder Combo-36",
  "Mouse Pad Super Fine Grain C-36",
  "Cork Metal Pen Combo 36",
  "Natural Tray 9×9 Inch Combo-46",
  "Box UV Printed Coaster Combo-46",
  "Box Print Table Top Test Tube Planter Combo-46",
  "Cork Tea Light Holder Assorted C-46",
  "Round Fine Grain Planter",
  "CharoChip Square Planter",
  "Natural Bark Planter",
  "Cork Belly Planter",
  "Rectangular Test Tube Planter",
  "Box Print Table Top T.T. Planter",
  "Feather Printed Tabletop T.T. Planter",
  "Multi Printed Tabletop T.T. Planter",
  "Cork Conical Flask Planter",
  "Wall Frame Test Tube Planter",
  "Diamond Square Planter",
  "CharoChip Square Planter",
  "Cork Belly Coaster — Set",
  "Leaf Shape Coaster — Set",
  "Box UV Printed Coaster — Set",
  "Cork Fine Natural Trivet — Set",
  "ChocoChip Trivet — Set",
  "Red Assiago Trivet — Set",
  "Striped Trivet — Set",
  "Web Printed Trivet",
  "Smoky Black Small Round Tray",
  "Cork Tablemat ChocoChip 9\"",
  "Cork Tablemat Red Assiago",
  "Cork Tablemat Abstract",
  "Cork Tablemat Oval Red Assiago",
  "ChocoChip Napkin Ring",
  "Round Napkin Ring",
  "Fine Grain Napkin Ring"
];

// Get collection_id for gifting
const giftingCol = db.prepare(`SELECT id FROM collections WHERE key = 'gifting'`).get();
const giftingId = giftingCol ? giftingCol.id : 111;

console.log(`Gifting collection ID: ${giftingId}`);

const allGiftingProducts = db.prepare(`SELECT id, slug, name, collection_id, subcategory_id FROM products WHERE collection_id = ?`).all(giftingId);
console.log(`Total products in Gifting collection: ${allGiftingProducts.length}`);

// Check if any product in Gifting collection is NOT in targetNames
const extraInDb = [];
const matchedInDb = [];

allGiftingProducts.forEach(p => {
  // Check exact or close match
  const isTarget = targetNames.some(t => t.toLowerCase() === p.name.toLowerCase()) || 
                   (p.name === "Ecodesk Diary AS Combo 10" && targetNames.includes("Ecodesk Diary A5 Combo 10"));
  if (isTarget) {
    matchedInDb.push(p);
  } else {
    extraInDb.push(p);
  }
});

console.log(`Matched products count: ${matchedInDb.length}`);
console.log(`Extra products in DB under Gifting collection: ${extraInDb.length}`);
if (extraInDb.length > 0) {
  console.log('Extra DB products:', extraInDb);
}

// Check in vinsho-commerce-seed.json
const rawSeed = fs.readFileSync('vinsho-commerce-seed.json', 'utf8');
const seedData = JSON.parse(rawSeed);
const seedProducts = Array.isArray(seedData) ? seedData : (seedData.products || []);
const seedCgProducts = seedProducts.filter(p => p.id && String(p.id).startsWith('cg-'));

console.log(`\nTotal seed CG products: ${seedCgProducts.length}`);
const extraInSeed = [];
seedCgProducts.forEach(p => {
  const isTarget = targetNames.some(t => t.toLowerCase() === (p.name || p.title || '').toLowerCase()) ||
                   (p.slug && p.slug.startsWith('cg-'));
  // Let's check slugs cg-01 to cg-50
  const num = parseInt(String(p.id).replace('cg-', ''), 10);
  if (num < 1 || num > 50) {
    extraInSeed.push(p);
  }
});
console.log(`Extra seed CG products (outside cg-01..cg-50): ${extraInSeed.length}`);
