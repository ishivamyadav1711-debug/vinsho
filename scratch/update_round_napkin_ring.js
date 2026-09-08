import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';

const brainDir = `C:\\Users\\udayb\\.gemini\\antigravity-ide\\brain\\b2d132e4-5985-4719-95f7-509195ce6419`;
const targetDir = path.join(process.cwd(), 'public', 'images', 'vinsho', 'products', 'Corporate-gifting');

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

const imagesToUpdate = [
  {
    src: path.join(brainDir, 'media__1788765593407.jpg'),
    destName: '49_round_napkin_ring.jpg',
    position: 1,
    isPrimary: true
  },
  {
    src: path.join(brainDir, 'media__1788765607319.jpg'),
    destName: '49_round_napkin_ring_2.jpg',
    position: 2,
    isPrimary: false
  },
  {
    src: path.join(brainDir, 'media__1788765612012.jpg'),
    destName: '49_round_napkin_ring_3.jpg',
    position: 3,
    isPrimary: false
  },
  {
    src: path.join(brainDir, 'media__1788765618068.jpg'),
    destName: '49_round_napkin_ring_4.jpg',
    position: 4,
    isPrimary: false
  }
];

console.log('--- Step 1: Copying images to public folder ---');
imagesToUpdate.forEach(img => {
  const destPath = path.join(targetDir, img.destName);
  if (fs.existsSync(img.src)) {
    fs.copyFileSync(img.src, destPath);
    console.log(`Copied ${path.basename(img.src)} -> ${destPath}`);
  } else {
    console.error(`Source image missing: ${img.src}`);
  }
});

console.log('\n--- Step 2: Updating SQLite DB (data/vinsho.db) ---');
const dbPath = path.join(process.cwd(), 'data', 'vinsho.db');
const db = new Database(dbPath);
const now = new Date().toISOString();

const product = db.prepare('SELECT id, name FROM products WHERE slug = ?').get('round-napkin-ring');
if (!product) {
  console.error('Product slug "round-napkin-ring" not found in DB!');
} else {
  console.log(`Updating DB product id=${product.id} name="${product.name}"`);
  
  db.prepare('DELETE FROM product_images WHERE product_id = ?').run(product.id);
  
  imagesToUpdate.forEach(img => {
    const relUrl = `/images/vinsho/products/Corporate-gifting/${img.destName}`;
    db.prepare(`
      INSERT INTO product_images (product_id, url, alt, position, is_primary, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(product.id, relUrl, 'Round Napkin Ring', img.position, img.isPrimary ? 1 : 0, now, now);
    console.log(`  Inserted image row pos=${img.position}: ${relUrl}`);
  });
}

console.log('\n--- Step 3: Updating vinsho-commerce-seed.json ---');
const seedPath = 'vinsho-commerce-seed.json';
if (fs.existsSync(seedPath)) {
  const rawSeed = fs.readFileSync(seedPath, 'utf8');
  const seedData = JSON.parse(rawSeed);
  let list = Array.isArray(seedData) ? seedData : (seedData.products || []);

  let updatedCount = 0;
  list.forEach(item => {
    if (item && (item.slug === 'round-napkin-ring' || item.id === 'cg-49')) {
      item.image = '/images/vinsho/products/Corporate-gifting/49_round_napkin_ring.jpg';
      item.images = imagesToUpdate.map(img => `/images/vinsho/products/Corporate-gifting/${img.destName}`);
      updatedCount++;
    }
  });

  const output = Array.isArray(seedData) ? list : { ...seedData, products: list };
  fs.writeFileSync(seedPath, JSON.stringify(output, null, 2), 'utf8');
  console.log(`  Updated ${updatedCount} entries in ${seedPath}`);
}

console.log('\n--- Round Napkin Ring image updates complete! ---');
