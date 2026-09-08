const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const officialList = [
  { id: 1, name: "Cork Diary A5 Fab India Combo 30", slug: "cork-diary-as-fab-india-combo-30", price: 750 },
  { id: 2, name: "Cork Metal Pen Combo 30", slug: "cork-metal-pen-combo-30", price: 135 },
  { id: 3, name: "Ecodesk Diary A5 Combo 10", slug: "ecodesk-diary-combo-10", price: 405 },
  { id: 4, name: "Card Stacker Combo 10", slug: "cork-card-stacker-combo-10", price: 480 },
  { id: 5, name: "Key Chain Combo 10", slug: "key-chain-combo-10", price: 195 },
  { id: 6, name: "Cork Metal Pen Combo 10", slug: "cork-metal-pen-combo-10", price: 135 },
  { id: 7, name: "Cork Canvas Sleeve Combo 10", slug: "cork-canvas-sleeve-combo-10", price: 550 },
  { id: 8, name: "Ocean Mist Bag Combo 18", slug: "ocean-mist-bag-combo-18", price: 4900 },
  { id: 9, name: "Passport Holder OC Whisky C-18", slug: "passport-holder-ocean-mist-combo-18", price: 1350 },
  { id: 10, name: "Cork Bottle Ocean Mist Combo 18", slug: "cork-bottle-ocean-mist-combo-18", price: 1540 },
  { id: 11, name: "Jet Case Brown Bag Combo 19", slug: "jet-case-brown-bag-combo-19", price: 4900 },
  { id: 12, name: "Cork Bottle Granco Combo 19", slug: "cork-bottle-granco-combo-19", price: 1500 },
  { id: 13, name: "Passport Holder Granco Combo 19", slug: "passport-holder-granco-combo-19", price: 1200 },
  { id: 14, name: "Ecodesk Diary A5 Combo 36", slug: "ecodesk-diary-combo-36", price: 405 },
  { id: 15, name: "Small Calculator Combo 36", slug: "small-calculator-combo-36", price: 750 },
  { id: 16, name: "Pen Holder Combo 36", slug: "pen-holder-combo-36", price: 495 },
  { id: 17, name: "Mouse Pad Super Fine Grain C-36", slug: "mouse-pad-super-fine-grain-combo-36", price: 350 },
  { id: 18, name: "Cork Metal Pen Combo 36", slug: "cork-metal-pen-combo-36", price: 135 },
  { id: 19, name: "Natural Tray 9x9 Inch Combo 46", slug: "natural-tray-9x9-inch-combo-46", price: 1800 },
  { id: 20, name: "Box UV Printed Coaster Combo 46", slug: "box-uv-printed-coaster-combo-46", price: 600 },
  { id: 21, name: "Box Print Table Top Test Tube Planter Combo 46", slug: "box-print-table-top-test-tube-holder-combo-46", price: 900 },
  { id: 22, name: "Cork Tea Light Holder Assorted C-46", slug: "cork-tea-light-holder-assorted-combo-46", price: 350 },
  { id: 23, name: "Round Line Planter", slug: "round-linear-planter", price: 1250 },
  { id: 24, name: "Chocolate Square Planter", slug: "chocochip-square-planter-24", price: 1250 },
  { id: 25, name: "Natural Bark Planter", slug: "natural-bark-planter", price: 800 },
  { id: 26, name: "Cork Belly Planter", slug: "cork-belly-planter", price: 750 },
  { id: 27, name: "Rectangular Test Tube Planter", slug: "rectangular-test-tube-planter", price: 1050 },
  { id: 28, name: "Box Print Table Top T.T. Planter", slug: "box-print-table-top-tt-planter", price: 1250 },
  { id: 29, name: "Feather Printed Tabletop T.T. Planter", slug: "feather-printed-tabletop-tt-planter", price: 1250 },
  { id: 30, name: "Multi Printed Tabletop T.T. Planter", slug: "multi-printed-tabletop-tt-planter", price: 800 },
  { id: 31, name: "Cork Conical Flask Planter", slug: "cork-conical-flask-planter", price: 800 },
  { id: 32, name: "Wall Frame Test Tube Planter", slug: "wall-frame-test-tube-planter", price: 2300 },
  { id: 33, name: "Diamond Square Planter", slug: "diamond-square-planter", price: 1250 },
  { id: 34, name: "Chocolate Chip Square Planter", slug: "chocochip-square-planter-34", price: 1250 },
  { id: 35, name: "Cork Belly Coaster Set", slug: "cork-belly-coaster-set", price: 720 },
  { id: 36, name: "Leaf Shape Coaster Set", slug: "leaf-shape-coaster-set", price: 575 },
  { id: 37, name: "Box UV Printed Coaster Set", slug: "box-uv-printed-coaster-set", price: 650 },
  { id: 38, name: "Cork Pine Natural Trivet", slug: "cork-fine-natural-trivet-set", price: 1260 },
  { id: 39, name: "Chocolate Chip Trivet", slug: "chocochip-trivet-set", price: 1260 },
  { id: 40, name: "Red Asiago Trivet", slug: "red-assiago-trivet-set", price: 1260 },
  { id: 41, name: "Striped Trivet", slug: "striped-trivet-set", price: 1260 },
  { id: 42, name: "Web Printed Trivet", slug: "web-printed-trivet", price: 945 },
  { id: 43, name: "Smoky Black Small Round Tray", slug: "smoky-black-small-round-tray", price: 1550 },
  { id: 44, name: "Cork Tablemat Chocolate Chip", slug: "cork-tablemat-chocochip-18-inch", price: 1015 },
  { id: 45, name: "Cork Tablemat Red Asiago", slug: "cork-tablemat-red-assiago-18-inch", price: 1015 },
  { id: 46, name: "Cork Tablemat Abstract", slug: "cork-tablemat-abstract-18-inch", price: 1015 },
  { id: 47, name: "Cork Tablemat Oval Red Asiago", slug: "cork-tablemat-oval-red-assiago", price: 1015 },
  { id: 48, name: "Chocolate Chip Napkin Ring", slug: "chocochip-napkin-ring", price: 360 },
  { id: 49, name: "Round Napkin Ring", slug: "round-napkin-ring", price: 360 },
  { id: 50, name: "Fine Grain Napkin Ring", slug: "fine-grain-napkin-ring", price: 360 }
];

const seedFilePath = path.join(process.cwd(), 'vinsho-commerce-seed.json');
const seedData = JSON.parse(fs.readFileSync(seedFilePath, 'utf8'));

const dbPath = path.join(process.cwd(), 'data', 'vinsho.db');
const db = new Database(dbPath);

console.log('--- 50 PRODUCT PRICE UPDATE VERIFICATION ---');
console.log(`Total seed JSON products: ${seedData.products.length}`);
const dbProdCount = db.prepare('SELECT COUNT(*) as cnt FROM products').get().cnt;
console.log(`Total SQLite database products: ${dbProdCount}`);

let passCount = 0;
const reportRows = [];

officialList.forEach((item) => {
  const seedProd = seedData.products.find(p => p.slug === item.slug);
  const dbProd = db.prepare('SELECT p.id, p.slug, p.name, v.selling_price, v.mrp FROM products p JOIN product_variants v ON v.product_id = p.id WHERE p.slug = ?').get(item.slug);

  const seedMatch = seedProd && seedProd.sellingPrice === item.price;
  const dbMatch = dbProd && dbProd.selling_price === item.price;

  let status = '✓ Updated correctly';
  if (!seedMatch || !dbMatch) {
    status = '⚠ Needs manual review';
  } else {
    passCount++;
  }

  const existingName = seedProd ? seedProd.name : (dbProd ? dbProd.name : 'N/A');
  reportRows.push({
    id: item.id,
    officialName: item.name,
    existingProduct: `${existingName} (\`${item.slug}\`)`,
    updatedPrice: `₹${item.price}`,
    status
  });
});

console.log(`\nVerification Passed: ${passCount} / ${officialList.length}`);

if (passCount === 50 && seedData.products.length === 158 && dbProdCount === 158) {
  console.log('ALL VERIFICATIONS PASSED 100%!');
} else {
  console.error('VERIFICATION FAILED!');
}

console.log('\n--- GENERATED REPORT TABLE ---');
console.log('| Product # | Official Name | Existing Product Record | Updated Price | Status |');
console.log('|---|---|---|---|---|');
reportRows.forEach(r => {
  console.log(`| ${r.id} | ${r.officialName} | ${r.existingProduct} | ${r.updatedPrice} | ${r.status} |`);
});
