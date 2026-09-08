import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';

const targetList = [
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

console.log('--- Step 1: Updating SQLite DB (data/vinsho.db) ---');
const db = new Database('data/vinsho.db');
const now = new Date().toISOString();

// 1. Ensure subcategory 424 (Corporate Gifting) contains ONLY IDs 3864..3913
const cgSubcategoryId = 424;
const cgCollectionId = 111;

// Get all products currently with subcategory_id = 424
const cgProducts = db.prepare('SELECT id, slug, name FROM products WHERE subcategory_id = ? ORDER BY id ASC').all(cgSubcategoryId);
console.log(`Found ${cgProducts.length} corporate gifting products in DB.`);

if (cgProducts.length === 50) {
  cgProducts.forEach((p, idx) => {
    const expectedName = targetList[idx];
    if (p.name !== expectedName) {
      console.log(`Renaming DB product id=${p.id}: "${p.name}" -> "${expectedName}"`);
      db.prepare('UPDATE products SET name = ?, updated_at = ? WHERE id = ?').run(expectedName, now, p.id);
    } else {
      console.log(`Product id=${p.id} name matches: "${expectedName}"`);
    }
    
    // Update product_images alt text
    db.prepare('UPDATE product_images SET alt = ?, updated_at = ? WHERE product_id = ?').run(expectedName, now, p.id);
  });
} else {
  console.warn(`Warning: Expected 50 CG products, found ${cgProducts.length}`);
}

console.log('\n--- Step 2: Updating vinsho-commerce-seed.json ---');
const seedPath = 'vinsho-commerce-seed.json';
if (fs.existsSync(seedPath)) {
  const rawSeed = fs.readFileSync(seedPath, 'utf8');
  const seedData = JSON.parse(rawSeed);
  let list = Array.isArray(seedData) ? seedData : (seedData.products || []);

  let updatedCount = 0;
  list.forEach(item => {
    if (item.id && String(item.id).startsWith('cg-')) {
      const index = parseInt(String(item.id).replace('cg-', ''), 10) - 1;
      if (index >= 0 && index < targetList.length) {
        const expectedName = targetList[index];
        item.title = expectedName;
        item.name = expectedName;
        updatedCount++;
      }
    }
  });

  const output = Array.isArray(seedData) ? list : { ...seedData, products: list };
  fs.writeFileSync(seedPath, JSON.stringify(output, null, 2), 'utf8');
  console.log(`  Successfully updated ${updatedCount} products in ${seedPath}`);
}

console.log('\n--- Corporate Gifting product alignment complete! ---');
