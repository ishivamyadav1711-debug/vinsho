import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';

const baseDir = 'public/images/vinsho/products/Corporate-gifting/cork_product_images_mapping';
const baseWebUrl = '/images/vinsho/products/Corporate-gifting/cork_product_images_mapping';

const targetMap = [
  { folder: "cork-tablemat-chocochip", dbSlugs: ["cork-tablemat-chocochip-18-inch"], title: "Cork Tablemat ChocoChip" },
  { folder: "cork-tablemat-abstract", dbSlugs: ["cork-tablemat-abstract-18-inch"], title: "Cork Tablemat Abstract" },
  { folder: "cork-tablemat-oval-red-assiago", dbSlugs: ["cork-tablemat-oval-red-assiago"], title: "Cork Tablemat Oval Red Assiago" },
  { folder: "cork-tablemat-red-assiago", dbSlugs: ["cork-tablemat-red-assiago-18-inch"], title: "Cork Tablemat Red Assiago" },
  { folder: "smoky-black-small-round-tray", dbSlugs: ["smoky-black-small-round-tray"], title: "Smoky Black Small Round Tray" },
  { folder: "box-print-table-top-t-t-planter", dbSlugs: ["box-print-table-top-tt-planter"], title: "Box Print Table Top T.T. Planter" },
  { folder: "box-print-table-top-test-tube-planter-combo-46", dbSlugs: ["box-print-table-top-test-tube-holder-combo-46"], title: "Box Print Table Top Test Tube Planter Combo-46" },
  { folder: "charochip-square-planter", dbSlugs: ["chocochip-square-planter-24", "chocochip-square-planter-34"], title: "ChocoChip Square Planter" },
  { folder: "cork-belly-planter", dbSlugs: ["cork-belly-planter"], title: "Cork Belly Planter" },
  { folder: "cork-conical-flask-planter", dbSlugs: ["cork-conical-flask-planter"], title: "Cork Conical Flask Planter" },
  { folder: "diamond-square-planter", dbSlugs: ["diamond-square-planter"], title: "Diamond Square Planter" },
  { folder: "feather-printed-tabletop-t-t-planter", dbSlugs: ["feather-printed-tabletop-tt-planter"], title: "Feather Printed Tabletop T.T. Planter" },
  { folder: "multi-printed-tabletop-t-t-planter", dbSlugs: ["multi-printed-tabletop-tt-planter"], title: "Multi Printed Tabletop T.T. Planter" },
  { folder: "natural-bark-planter", dbSlugs: ["natural-bark-planter"], title: "Natural Bark Planter" },
  { folder: "round-linear-planter", dbSlugs: ["round-linear-planter"], title: "Round Linear Planter" },
  { folder: "rectangular-test-tube-planter", dbSlugs: ["rectangular-test-tube-planter"], title: "Rectangular Test Tube Planter" },
  { folder: "round-fine-grain-planter", dbSlugs: ["round-linear-planter"], title: "Round Fine Grain Planter" },
  { folder: "wall-frame-test-tube-planter", dbSlugs: ["wall-frame-test-tube-planter"], title: "Wall Frame Test Tube Planter" },
  { folder: "ecodesk-diary-a5-combo-10", dbSlugs: ["ecodesk-diary-combo-10"], title: "Ecodesk Diary A5 Combo 10" },
  { folder: "cork-tea-light-holder-assorted-c-46", dbSlugs: ["cork-tea-light-holder-assorted-combo-46"], title: "Cork Tea Light Holder Assorted C-46" },
  { folder: "natural-tray-9x9-inch-combo-46", dbSlugs: ["natural-tray-9x9-inch-combo-46"], title: "Natural Tray 9x9 Inch Combo-46" },
  { folder: "mouse-pad-super-fine-grain-c-36", dbSlugs: ["mouse-pad-super-fine-grain-combo-36"], title: "Mouse Pad Super Fine Grain C-36" },
  { folder: "small-calendar-combo-36", dbSlugs: ["small-calculator-combo-36"], title: "Small Calendar Combo-36" },
  { folder: "passport-holder-granoco-combo-19", dbSlugs: ["passport-holder-granco-combo-19"], title: "Passport Holder Granco Combo-19" },
  { folder: "cork-bottle-granoco-combo-19", dbSlugs: ["cork-bottle-granco-combo-19"], title: "Cork Bottle Granco Combo-19" },
  { folder: "jet-case-brown-bag-combo-19", dbSlugs: ["jet-case-brown-bag-combo-19"], title: "Jet Case Brown Bag Combo-19" },
  { folder: "cork-bottle-ocean-mist-combo-18", dbSlugs: ["cork-bottle-ocean-mist-combo-18"], title: "Cork Bottle Ocean Mist Combo-18" },
  { folder: "cork-canvas-sleeve-combo-10", dbSlugs: ["cork-canvas-sleeve-combo-10"], title: "Cork Canvas Sleeve Combo 10" }
];

console.log('--- Step 1: Updating SQLite DB (data/vinsho.db) ---');
const db = new Database('data/vinsho.db');
const now = new Date().toISOString();

let dbProductsUpdated = 0;
let dbImageRowsInserted = 0;

targetMap.forEach(item => {
  const folderPath = path.join(baseDir, item.folder);
  let files = [];
  if (fs.existsSync(folderPath)) {
    files = fs.readdirSync(folderPath).filter(f => !f.startsWith('.')).sort();
  }
  
  const webUrls = files.map(f => `${baseWebUrl}/${item.folder}/${f}`);

  item.dbSlugs.forEach(slug => {
    const product = db.prepare('SELECT id, slug, name FROM products WHERE slug = ?').get(slug);
    if (!product) {
      console.warn(`Product slug "${slug}" not found in DB!`);
      return;
    }
    
    db.prepare('DELETE FROM product_images WHERE product_id = ?').run(product.id);
    dbProductsUpdated++;
    
    webUrls.forEach((url, idx) => {
      const isPrimary = idx === 0 ? 1 : 0;
      const pos = idx + 1;
      db.prepare(`
        INSERT INTO product_images (product_id, url, alt, position, is_primary, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(product.id, url, product.name, pos, isPrimary, now, now);
      dbImageRowsInserted++;
    });
    console.log(`  Updated DB product ID=${product.id} (${product.slug}) with ${webUrls.length} images.`);
  });
});

console.log(`\nDB Update Complete: ${dbProductsUpdated} products updated, ${dbImageRowsInserted} image rows inserted.`);

console.log('\n--- Step 2: Updating vinsho-commerce-seed.json ---');
const seedPath = 'vinsho-commerce-seed.json';
let seedUpdatedCount = 0;

if (fs.existsSync(seedPath)) {
  const rawSeed = fs.readFileSync(seedPath, 'utf8');
  const seedData = JSON.parse(rawSeed);
  let list = Array.isArray(seedData) ? seedData : (seedData.products || []);

  const slugImageMap = {};
  targetMap.forEach(item => {
    const folderPath = path.join(baseDir, item.folder);
    let files = [];
    if (fs.existsSync(folderPath)) {
      files = fs.readdirSync(folderPath).filter(f => !f.startsWith('.')).sort();
    }
    const webUrls = files.map(f => `${baseWebUrl}/${item.folder}/${f}`);
    item.dbSlugs.forEach(slug => {
      slugImageMap[slug] = webUrls;
    });
  });

  list.forEach(item => {
    if (!item || !item.slug) return;
    if (slugImageMap[item.slug]) {
      const urls = slugImageMap[item.slug];
      item.image = urls[0];
      item.images = urls;
      seedUpdatedCount++;
    }
  });

  const output = Array.isArray(seedData) ? list : { ...seedData, products: list };
  fs.writeFileSync(seedPath, JSON.stringify(output, null, 2), 'utf8');
  console.log(`  Updated ${seedUpdatedCount} product entries in ${seedPath}`);
}

console.log('\n--- All 28 products image sync complete! ---');
