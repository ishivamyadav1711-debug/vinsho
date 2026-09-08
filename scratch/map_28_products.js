import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';

const db = new Database('data/vinsho.db');
const baseDir = 'public/images/vinsho/products/Corporate-gifting/cork_product_images_mapping';
const baseWebUrl = '/images/vinsho/products/Corporate-gifting/cork_product_images_mapping';

const mappingJson = JSON.parse(fs.readFileSync(path.join(baseDir, 'product-image-mapping.json'), 'utf8'));

// 28 target products mapping configuration
const targetMap = [
  { userTitle: "Cork Tablemat ChocoChip", folder: "cork-tablemat-chocochip", dbSlugs: ["cork-tablemat-chocochip-18-inch"] },
  { userTitle: "Cork Tablemat Abstract", folder: "cork-tablemat-abstract", dbSlugs: ["cork-tablemat-abstract-18-inch"] },
  { userTitle: "Cork Tablemat Oval Red Assiago", folder: "cork-tablemat-oval-red-assiago", dbSlugs: ["cork-tablemat-oval-red-assiago"] },
  { userTitle: "Cork Tablemat Red Assiago", folder: "cork-tablemat-red-assiago", dbSlugs: ["cork-tablemat-red-assiago-18-inch"] },
  { userTitle: "Smoky Black Small Round Tray", folder: "smoky-black-small-round-tray", dbSlugs: ["smoky-black-small-round-tray"] },
  { userTitle: "Box Print Table Top T.T. Planter", folder: "box-print-table-top-t-t-planter", dbSlugs: ["box-print-table-top-tt-planter"] },
  { userTitle: "Box Print Table Top Test Tube Planter Combo-46", folder: "box-print-table-top-test-tube-planter-combo-46", dbSlugs: ["box-print-table-top-test-tube-holder-combo-46"] },
  { userTitle: "CharoChip Square Planter", folder: "charochip-square-planter", dbSlugs: ["chocochip-square-planter-24", "chocochip-square-planter-34"] },
  { userTitle: "Cork Belly Planter", folder: "cork-belly-planter", dbSlugs: ["cork-belly-planter"] },
  { userTitle: "Cork Conical Flask Planter", folder: "cork-conical-flask-planter", dbSlugs: ["cork-conical-flask-planter"] },
  { userTitle: "Diamond Square Planter", folder: "diamond-square-planter", dbSlugs: ["diamond-square-planter"] },
  { userTitle: "Feather Printed Tabletop T.T. Planter", folder: "feather-printed-tabletop-t-t-planter", dbSlugs: ["feather-printed-tabletop-tt-planter"] },
  { userTitle: "Multi Printed Tabletop T.T. Planter", folder: "multi-printed-tabletop-t-t-planter", dbSlugs: ["multi-printed-tabletop-tt-planter"] },
  { userTitle: "Natural Bark Planter", folder: "natural-bark-planter", dbSlugs: ["natural-bark-planter"] },
  { userTitle: "Round Linear Planter", folder: "round-linear-planter", dbSlugs: ["round-linear-planter"] },
  { userTitle: "Rectangular Test Tube Planter", folder: "rectangular-test-tube-planter", dbSlugs: ["rectangular-test-tube-planter"] },
  { userTitle: "Round Fine Grain Planter", folder: "round-fine-grain-planter", dbSlugs: ["round-linear-planter"] },
  { userTitle: "Wall Frame Test Tube Planter", folder: "wall-frame-test-tube-planter", dbSlugs: ["wall-frame-test-tube-planter"] },
  { userTitle: "Ecodesk Diary A5 Combo 10", folder: "ecodesk-diary-a5-combo-10", dbSlugs: ["ecodesk-diary-combo-10"] },
  { userTitle: "Cork Tea Light Holder Assorted C-46", folder: "cork-tea-light-holder-assorted-c-46", dbSlugs: ["cork-tea-light-holder-assorted-combo-46"] },
  { userTitle: "Natural Tray 9x9 Inch Combo-46", folder: "natural-tray-9x9-inch-combo-46", dbSlugs: ["natural-tray-9x9-inch-combo-46"] },
  { userTitle: "Mouse Pad Super Fine Grain C-36", folder: "mouse-pad-super-fine-grain-c-36", dbSlugs: ["mouse-pad-super-fine-grain-combo-36"] },
  { userTitle: "Small Calendar Combo-36", folder: "small-calendar-combo-36", dbSlugs: ["small-calculator-combo-36"] },
  { userTitle: "Passport Holder Granoco Combo-19", folder: "passport-holder-granoco-combo-19", dbSlugs: ["passport-holder-granco-combo-19"] },
  { userTitle: "Cork Bottle Granoco Combo-19", folder: "cork-bottle-granoco-combo-19", dbSlugs: ["cork-bottle-granco-combo-19"] },
  { userTitle: "Jet Case Brown Bag Combo-19", folder: "jet-case-brown-bag-combo-19", dbSlugs: ["jet-case-brown-bag-combo-19"] },
  { userTitle: "Cork Bottle Ocean Mist Combo-18", folder: "cork-bottle-ocean-mist-combo-18", dbSlugs: ["cork-bottle-ocean-mist-combo-18"] },
  { userTitle: "Cork Canvas Sleeve Combo 10", folder: "cork-canvas-sleeve-combo-10", dbSlugs: ["cork-canvas-sleeve-combo-10"] }
];

console.log('=== Checking DB product resolution & file existence ===');
let totalImagesCount = 0;

targetMap.forEach((item, index) => {
  const folderPath = path.join(baseDir, item.folder);
  let files = [];
  if (fs.existsSync(folderPath)) {
    files = fs.readdirSync(folderPath).filter(f => !f.startsWith('.')).sort();
  }
  
  const webUrls = files.map(f => `${baseWebUrl}/${item.folder}/${f}`);
  totalImagesCount += webUrls.length;
  
  const dbProducts = item.dbSlugs.map(slug => db.prepare(`SELECT id, slug, name FROM products WHERE slug = ?`).get(slug)).filter(Boolean);
  
  console.log(`\n${index + 1}. "${item.userTitle}" (folder: ${item.folder})`);
  console.log(`   Files on disk (${files.length}):`, files);
  console.log(`   Web URLs:`, webUrls);
  console.log(`   DB Products found (${dbProducts.length}):`, dbProducts.map(p => `ID=${p.id} (${p.slug})`));
});

console.log(`\nTotal products mapped: ${targetMap.length}`);
console.log(`Total images connected: ${totalImagesCount}`);
