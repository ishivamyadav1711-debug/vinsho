import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';

const assetsDir = path.join(process.cwd(), 'public', 'images', 'vinsho', 'products', 'Corporate-gifting', 'trivet_website_assets');
const targetPublicDir = path.join(process.cwd(), 'public', 'images', 'products');

if (!fs.existsSync(targetPublicDir)) {
  fs.mkdirSync(targetPublicDir, { recursive: true });
}

// Copy directories to public/images/products/
const folders = [
  'striped-trivet-set',
  'red-assiago-trivet-set',
  'chocochip-trivet-set',
  'cork-fine-natural-trivet-set'
];

console.log('--- Step 1: Copying trivet image assets to public/images/products/ ---');
folders.forEach(folder => {
  const srcFolder = path.join(assetsDir, folder);
  const destFolder = path.join(targetPublicDir, folder);
  if (!fs.existsSync(destFolder)) {
    fs.mkdirSync(destFolder, { recursive: true });
  }
  if (fs.existsSync(srcFolder)) {
    const files = fs.readdirSync(srcFolder);
    files.forEach(f => {
      fs.copyFileSync(path.join(srcFolder, f), path.join(destFolder, f));
      console.log(`Copied ${folder}/${f} -> public/images/products/${folder}/${f}`);
    });
  } else {
    console.error(`Source folder missing: ${srcFolder}`);
  }
});

console.log('\n--- Step 2: Updating SQLite Database (data/vinsho.db) ---');
const dbPath = path.join(process.cwd(), 'data', 'vinsho.db');
const db = new Database(dbPath);
const now = new Date().toISOString();

const mappings = {
  'striped-trivet-set': {
    title: 'Striped Trivet — Set',
    images: [
      '/images/products/striped-trivet-set/striped-trivet-set-01.jpg',
      '/images/products/striped-trivet-set/striped-trivet-set-02.jpg',
      '/images/products/striped-trivet-set/striped-trivet-set-03.jpg'
    ]
  },
  'red-assiago-trivet-set': {
    title: 'Red Assiago Trivet — Set',
    images: [
      '/images/products/red-assiago-trivet-set/red-assiago-trivet-set-01.jpg',
      '/images/products/red-assiago-trivet-set/red-assiago-trivet-set-02.jpg',
      '/images/products/red-assiago-trivet-set/red-assiago-trivet-set-03.jpg'
    ]
  },
  'chocochip-trivet-set': {
    title: 'ChocoChip Trivet — Set',
    images: [
      '/images/products/chocochip-trivet-set/chocochip-trivet-set-01.jpg'
    ]
  },
  'cork-fine-natural-trivet-set': {
    title: 'Cork Fine Natural Trivet — Set',
    images: [
      '/images/products/cork-fine-natural-trivet-set/cork-fine-natural-trivet-set-01.jpg',
      '/images/products/cork-fine-natural-trivet-set/cork-fine-natural-trivet-set-02.jpg',
      '/images/products/cork-fine-natural-trivet-set/cork-fine-natural-trivet-set-03.jpg'
    ]
  }
};

Object.keys(mappings).forEach(slug => {
  const product = db.prepare('SELECT id, name FROM products WHERE slug = ?').get(slug);
  if (!product) {
    console.error(`Product slug "${slug}" not found in DB!`);
    return;
  }
  console.log(`Updating DB product id=${product.id} name="${product.name}"`);
  
  db.prepare('DELETE FROM product_images WHERE product_id = ?').run(product.id);
  
  const imgList = mappings[slug].images;
  imgList.forEach((url, idx) => {
    const isPrimary = idx === 0 ? 1 : 0;
    const pos = idx + 1;
    db.prepare(`
      INSERT INTO product_images (product_id, url, alt, position, is_primary, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(product.id, url, mappings[slug].title, pos, isPrimary, now, now);
    console.log(`  Inserted DB image pos=${pos}: ${url}`);
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
    if (mappings[item.slug]) {
      const data = mappings[item.slug];
      item.image = data.images[0];
      item.images = data.images;
      updatedCount++;
    }
  });

  const output = Array.isArray(seedData) ? list : { ...seedData, products: list };
  fs.writeFileSync(seedPath, JSON.stringify(output, null, 2), 'utf8');
  console.log(`  Updated ${updatedCount} entries in ${seedPath}`);
}

console.log('\n--- 4 Trivets update complete! ---');
