import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';

const brainDir = `C:\\Users\\udayb\\.gemini\\antigravity-ide\\brain\\b2d132e4-5985-4719-95f7-509195ce6419`;
const targetDir = path.join(process.cwd(), 'public', 'images', 'vinsho', 'products', 'Corporate-gifting');

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

// Image definitions:
// 1st image -> Leaf Shape Coaster — Set
// 2nd image -> Box UV Printed Coaster — Set (1st image)
// 3rd image -> Cork Belly Coaster — Set
// 4th image -> Box UV Printed Coaster — Set (2nd image)

const mappings = [
  {
    src: path.join(brainDir, 'media__1788762125086.jpg'),
    destName: '36_leaf_shape_coaster_set.jpg',
    productSlug: 'leaf-shape-coaster-set',
    title: 'Leaf Shape Coaster — Set'
  },
  {
    src: path.join(brainDir, 'media__1788762167589.jpg'),
    destName: '37_box_uv_printed_coaster_set.jpg',
    productSlug: 'box-uv-printed-coaster-set',
    title: 'Box UV Printed Coaster — Set',
    isPrimary: true,
    position: 1
  },
  {
    src: path.join(brainDir, 'media__1788762218215.jpg'),
    destName: '35_cork_belly_coaster_set.jpg',
    productSlug: 'cork-belly-coaster-set',
    title: 'Cork Belly Coaster — Set',
    isPrimary: true,
    position: 1
  },
  {
    src: path.join(brainDir, 'media__1788762468139.jpg'),
    destName: '37_box_uv_printed_coaster_set_2.jpg',
    productSlug: 'box-uv-printed-coaster-set',
    title: 'Box UV Printed Coaster — Set',
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

// Group images by product slug
const productSlugMap = {};
mappings.forEach(m => {
  if (!productSlugMap[m.productSlug]) {
    productSlugMap[m.productSlug] = [];
  }
  productSlugMap[m.productSlug].push({
    url: `/images/vinsho/products/Corporate-gifting/${m.destName}`,
    title: m.title,
    isPrimary: m.isPrimary !== undefined ? m.isPrimary : true,
    position: m.position || 1
  });
});

Object.keys(productSlugMap).forEach(slug => {
  const product = db.prepare('SELECT id, name FROM products WHERE slug = ?').get(slug);
  if (!product) {
    console.error(`Product with slug "${slug}" not found in DB!`);
    return;
  }
  console.log(`Updating product DB images for id=${product.id} slug=${slug} name="${product.name}"`);
  
  // Clear old images for this product
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
    
    if (item.slug === 'leaf-shape-coaster-set') {
      item.image = '/images/vinsho/products/Corporate-gifting/36_leaf_shape_coaster_set.jpg';
      item.images = ['/images/vinsho/products/Corporate-gifting/36_leaf_shape_coaster_set.jpg'];
      updatedCount++;
    } else if (item.slug === 'cork-belly-coaster-set') {
      item.image = '/images/vinsho/products/Corporate-gifting/35_cork_belly_coaster_set.jpg';
      item.images = ['/images/vinsho/products/Corporate-gifting/35_cork_belly_coaster_set.jpg'];
      updatedCount++;
    } else if (item.slug === 'box-uv-printed-coaster-set') {
      item.image = '/images/vinsho/products/Corporate-gifting/37_box_uv_printed_coaster_set.jpg';
      item.images = [
        '/images/vinsho/products/Corporate-gifting/37_box_uv_printed_coaster_set.jpg',
        '/images/vinsho/products/Corporate-gifting/37_box_uv_printed_coaster_set_2.jpg'
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

console.log('\n--- All coaster image updates complete successfully! ---');
