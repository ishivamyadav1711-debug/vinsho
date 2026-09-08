import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const artifactsDir = 'C:\\Users\\udayb\\.gemini\\antigravity-ide\\brain\\b2d132e4-5985-4719-95f7-509195ce6419';
const targetDir = path.resolve('public/images/vinsho/products/Corporate-gifting');

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

// 1st image -> Box UV Printed Coaster Combo-46
// 2nd image -> Cork Diary A5 Fab India Combo 30
// 3rd image -> Cork Metal Pen Combo 10
// 4th and 5th image -> Pen Holder Combo-36

const fileMap = [
  { src: 'media__1788783957839.jpg', dest: '20_box_uv_printed_coaster_combo_46.jpg' },
  { src: 'media__1788784151120.jpg', dest: '01_cork_diary_as_fab_india_combo_30.jpg' },
  { src: 'media__1788784257563.jpg', dest: '06_cork_metal_pen_combo_10.jpg' },
  { src: 'media__1788784337459.jpg', dest: '16_pen_holder_combo_36_01.jpg' },
  { src: 'media__1788784347640.jpg', dest: '16_pen_holder_combo_36_02.jpg' }
];

console.log('--- Step 1: Copying media files ---');
for (const item of fileMap) {
  const srcPath = path.join(artifactsDir, item.src);
  const destPath = path.join(targetDir, item.dest);
  fs.copyFileSync(srcPath, destPath);
  console.log(`Copied ${item.src} -> ${item.dest}`);
}

console.log('\n--- Step 2: Updating SQLite DB (data/vinsho.db) ---');
const dbPath = path.resolve('data/vinsho.db');
const db = new Database(dbPath);

const updates = [
  {
    dbId: 3883,
    slug: 'box-uv-printed-coaster-combo-46',
    images: ['/images/vinsho/products/Corporate-gifting/20_box_uv_printed_coaster_combo_46.jpg']
  },
  {
    dbId: 3864,
    slug: 'cork-diary-as-fab-india-combo-30',
    images: ['/images/vinsho/products/Corporate-gifting/01_cork_diary_as_fab_india_combo_30.jpg']
  },
  {
    dbId: 3869,
    slug: 'cork-metal-pen-combo-10',
    images: ['/images/vinsho/products/Corporate-gifting/06_cork_metal_pen_combo_10.jpg']
  },
  {
    dbId: 3879,
    slug: 'pen-holder-combo-36',
    images: [
      '/images/vinsho/products/Corporate-gifting/16_pen_holder_combo_36_01.jpg',
      '/images/vinsho/products/Corporate-gifting/16_pen_holder_combo_36_02.jpg'
    ]
  }
];

for (const item of updates) {
  // Delete existing images for this product
  db.prepare(`DELETE FROM product_images WHERE product_id = ?`).run(item.dbId);
  
  // Insert new images
  item.images.forEach((imgUrl, idx) => {
    db.prepare(`
      INSERT INTO product_images (product_id, url, position, is_primary, created_at, updated_at)
      VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(item.dbId, imgUrl, idx + 1, idx === 0 ? 1 : 0);
  });
  console.log(`Updated DB product ID ${item.dbId} (${item.slug}) with ${item.images.length} images.`);
}

db.close();

console.log('\n--- Step 3: Updating vinsho-commerce-seed.json ---');
const seedPath = path.resolve('vinsho-commerce-seed.json');
const seedData = JSON.parse(fs.readFileSync(seedPath, 'utf8'));

for (const item of updates) {
  const prod = seedData.products.find(p => p.slug === item.slug || (p.id && String(p.id) === String(item.dbId)));
  if (prod) {
    prod.image = item.images[0];
    prod.images = item.images;
    console.log(`Updated seed JSON for product: ${prod.title || prod.name} (${prod.slug})`);
  } else {
    console.error(`Product not found in seed JSON: ${item.slug}`);
  }
}

fs.writeFileSync(seedPath, JSON.stringify(seedData, null, 2), 'utf8');

console.log('\n--- Image Update Complete ---');
