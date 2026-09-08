import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';

const brainDir = `C:\\Users\\udayb\\.gemini\\antigravity-ide\\brain\\b2d132e4-5985-4719-95f7-509195ce6419`;
const targetDir = path.join(process.cwd(), 'public', 'images', 'vinsho', 'products', 'Corporate-gifting');

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

const mappings = [
  {
    src: path.join(brainDir, 'media__1788763429787.jpg'),
    destName: '48_chocochip_napkin_ring.jpg',
    productSlug: 'chocochip-napkin-ring',
    title: 'Chocochip Napkin Ring',
    isPrimary: true,
    position: 1
  },
  {
    src: path.join(brainDir, 'media__1788763484589.jpg'),
    destName: '48_chocochip_napkin_ring_2.jpg',
    productSlug: 'chocochip-napkin-ring',
    title: 'Chocochip Napkin Ring',
    isPrimary: false,
    position: 2
  },
  {
    src: path.join(brainDir, 'media__1788763910948.png'),
    destName: '50_fine_grain_napkin_ring.png',
    productSlug: 'fine-grain-napkin-ring',
    title: 'Fine Grain Napkin Ring',
    isPrimary: true,
    position: 1
  },
  {
    src: path.join(brainDir, 'media__1788763916794.jpg'),
    destName: '50_fine_grain_napkin_ring_2.jpg',
    productSlug: 'fine-grain-napkin-ring',
    title: 'Fine Grain Napkin Ring',
    isPrimary: false,
    position: 2
  }
];

console.log('--- Step 1: Copying images to public directory ---');
mappings.forEach(m => {
  const destPath = path.join(targetDir, m.destName);
  if (fs.existsSync(m.src)) {
    fs.copyFileSync(m.src, destPath);
    console.log(`Copied ${path.basename(m.src)} -> ${destPath}`);
  } else {
    console.error(`Source file not found: ${m.src}`);
  }
});

console.log('\n--- Step 2: Updating SQLite database (data/vinsho.db) ---');
const dbPath = path.join(process.cwd(), 'data', 'vinsho.db');
const db = new Database(dbPath);
const now = new Date().toISOString();

const productSlugMap = {};
mappings.forEach(m => {
  if (!productSlugMap[m.productSlug]) {
    productSlugMap[m.productSlug] = [];
  }
  productSlugMap[m.productSlug].push({
    url: `/images/vinsho/products/Corporate-gifting/${m.destName}`,
    title: m.title,
    isPrimary: m.isPrimary,
    position: m.position
  });
});

Object.keys(productSlugMap).forEach(slug => {
  const product = db.prepare('SELECT id, name FROM products WHERE slug = ?').get(slug);
  if (!product) {
    console.error(`Product with slug "${slug}" not found in DB!`);
    return;
  }
  console.log(`Updating product DB images for id=${product.id} slug=${slug} name="${product.name}"`);
  
  db.prepare('DELETE FROM product_images WHERE product_id = ?').run(product.id);
  
  const images = productSlugMap[slug];
  images.forEach(img => {
    db.prepare(`
      INSERT INTO product_images (product_id, url, alt, position, is_primary, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(product.id, img.url, img.title, img.position, img.isPrimary ? 1 : 0, now, now);
    console.log(`  Inserted image row: url=${img.url}, pos=${img.position}, primary=${img.isPrimary}`);
  });
});

console.log('\n--- Step 3: Updating JSON Files ---');

function updateJsonSeed(filePath) {
  if (!fs.existsSync(filePath)) return;
  console.log(`Updating ${filePath}...`);
  const raw = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(raw);
  
  let list = Array.isArray(data) ? data : (data.products || []);
  let updatedCount = 0;
  
  list.forEach(item => {
    if (!item || !item.slug) return;
    
    if (item.slug === 'chocochip-napkin-ring') {
      item.image = '/images/vinsho/products/Corporate-gifting/48_chocochip_napkin_ring.jpg';
      item.images = [
        '/images/vinsho/products/Corporate-gifting/48_chocochip_napkin_ring.jpg',
        '/images/vinsho/products/Corporate-gifting/48_chocochip_napkin_ring_2.jpg'
      ];
      updatedCount++;
    } else if (item.slug === 'fine-grain-napkin-ring') {
      item.image = '/images/vinsho/products/Corporate-gifting/50_fine_grain_napkin_ring.png';
      item.images = [
        '/images/vinsho/products/Corporate-gifting/50_fine_grain_napkin_ring.png',
        '/images/vinsho/products/Corporate-gifting/50_fine_grain_napkin_ring_2.jpg'
      ];
      updatedCount++;
    }
  });

  const output = Array.isArray(data) ? list : { ...data, products: list };
  fs.writeFileSync(filePath, JSON.stringify(output, null, 2), 'utf8');
  console.log(`  Updated ${updatedCount} product entries in ${filePath}`);
}

updateJsonSeed('vinsho-commerce-seed.json');
updateJsonSeed('vinsho_products.json');
updateJsonSeed('vinsho-content.json');

console.log('\n--- All napkin ring image updates complete successfully! ---');
