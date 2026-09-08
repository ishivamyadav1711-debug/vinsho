import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';

const brainDir = `C:\\Users\\udayb\\.gemini\\antigravity-ide\\brain\\b2d132e4-5985-4719-95f7-509195ce6419`;
const targetDir = path.join(process.cwd(), 'public', 'images', 'vinsho', 'products', 'Corporate-gifting');

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

// 1. Ocean Mist Bag Combo 18 -> 1st image (media__1788776570207.jpg)
// 2. Web Printed Trivet -> 2nd (media__1788777387878.jpg), 3rd (media__1788777394068.jpg), 4th (media__1788777400484.jpg)

const mappings = [
  {
    src: path.join(brainDir, 'media__1788776570207.jpg'),
    destName: '08_ocean_mist_bag_combo_18.jpg',
    productSlug: 'ocean-mist-bag-combo-18',
    title: 'Ocean Mist Bag Combo 18',
    position: 1,
    isPrimary: true
  },
  {
    src: path.join(brainDir, 'media__1788777387878.jpg'),
    destName: '42_web_printed_trivet.jpg',
    productSlug: 'web-printed-trivet',
    title: 'Web Printed Trivet',
    position: 1,
    isPrimary: true
  },
  {
    src: path.join(brainDir, 'media__1788777394068.jpg'),
    destName: '42_web_printed_trivet_2.jpg',
    productSlug: 'web-printed-trivet',
    title: 'Web Printed Trivet',
    position: 2,
    isPrimary: false
  },
  {
    src: path.join(brainDir, 'media__1788777400484.jpg'),
    destName: '42_web_printed_trivet_3.jpg',
    productSlug: 'web-printed-trivet',
    title: 'Web Printed Trivet',
    position: 3,
    isPrimary: false
  }
];

console.log('--- Step 1: Copying images to public directory ---');
mappings.forEach(m => {
  const destPath = path.join(targetDir, m.destName);
  if (fs.existsSync(m.src)) {
    fs.copyFileSync(m.src, destPath);
    console.log(`Copied ${path.basename(m.src)} -> ${destPath}`);
  } else {
    console.error(`Source image missing: ${m.src}`);
  }
});

console.log('\n--- Step 2: Updating SQLite DB (data/vinsho.db) ---');
const dbPath = path.join(process.cwd(), 'data', 'vinsho.db');
const db = new Database(dbPath);
const now = new Date().toISOString();

const slugMap = {};
mappings.forEach(m => {
  if (!slugMap[m.productSlug]) slugMap[m.productSlug] = [];
  slugMap[m.productSlug].push(m);
});

Object.keys(slugMap).forEach(slug => {
  const product = db.prepare('SELECT id, name FROM products WHERE slug = ?').get(slug);
  if (!product) {
    console.error(`Product slug "${slug}" not found in DB!`);
    return;
  }
  console.log(`Updating DB product id=${product.id} name="${product.name}"`);
  
  db.prepare('DELETE FROM product_images WHERE product_id = ?').run(product.id);
  
  slugMap[slug].forEach(img => {
    const relUrl = `/images/vinsho/products/Corporate-gifting/${img.destName}`;
    db.prepare(`
      INSERT INTO product_images (product_id, url, alt, position, is_primary, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(product.id, relUrl, img.title, img.position, img.isPrimary ? 1 : 0, now, now);
    console.log(`  Inserted image row pos=${img.position}: ${relUrl}`);
  });
});

console.log('\n--- Step 3: Updating vinsho-commerce-seed.json ---');
const seedPath = 'vinsho-commerce-seed.json';
if (fs.existsSync(seedPath)) {
  const rawSeed = fs.readFileSync(seedPath, 'utf8');
  const seedData = JSON.parse(rawSeed);
  let list = Array.isArray(seedData) ? seedData : (seedData.products || []);

  let updatedCount = 0;
  list.forEach(item => {
    if (!item || !item.slug) return;
    if (slugMap[item.slug]) {
      const itemsForSlug = slugMap[item.slug];
      const primaryItem = itemsForSlug.find(x => x.isPrimary) || itemsForSlug[0];
      item.image = `/images/vinsho/products/Corporate-gifting/${primaryItem.destName}`;
      item.images = itemsForSlug.map(x => `/images/vinsho/products/Corporate-gifting/${x.destName}`);
      updatedCount++;
    }
  });

  const output = Array.isArray(seedData) ? list : { ...seedData, products: list };
  fs.writeFileSync(seedPath, JSON.stringify(output, null, 2), 'utf8');
  console.log(`  Updated ${updatedCount} entries in ${seedPath}`);
}

console.log('\n--- Image update script completed successfully! ---');
