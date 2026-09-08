import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';

console.log('--- Step 1: Copy uploaded images ---');
const baseArtifactDir = `C:\\Users\\udayb\\.gemini\\antigravity-ide\\brain\\1d514bfd-502f-4210-a3af-9083b8b92d8e`;

const fountainSrc = path.join(baseArtifactDir, 'media__1788167140439.png');
const fountainDestRel = '/images/vinsho/products/fountains.jpg';
const fountainDestPath = path.join(process.cwd(), 'public', fountainDestRel);

const turtleSrc = path.join(baseArtifactDir, 'media__1788167196312.jpg');
const turtleDestRel = '/images/vinsho/products/feng-shui-turtle.jpg';
const turtleDestPath = path.join(process.cwd(), 'public', turtleDestRel);

if (fs.existsSync(fountainSrc)) {
  fs.copyFileSync(fountainSrc, fountainDestPath);
  console.log(`Copied fountain image to ${fountainDestPath}`);
} else {
  console.error(`Fountain source image not found: ${fountainSrc}`);
}

if (fs.existsSync(turtleSrc)) {
  fs.copyFileSync(turtleSrc, turtleDestPath);
  console.log(`Copied turtle image to ${turtleDestPath}`);
} else {
  console.error(`Turtle source image not found: ${turtleSrc}`);
}

console.log('--- Step 2: Update SQLite Database ---');
const db = new Database('data/vinsho.db');

function updateDbImage(slug, newUrl, title) {
  const product = db.prepare('SELECT id FROM products WHERE slug = ?').get(slug);
  if (product) {
    const existingImg = db.prepare('SELECT id FROM product_images WHERE product_id = ? AND is_primary = 1').get(product.id);
    if (existingImg) {
      db.prepare('UPDATE product_images SET url = ? WHERE id = ?').run(newUrl, existingImg.id);
    } else {
      db.prepare('INSERT INTO product_images (product_id, url, alt_text, is_primary, position) VALUES (?, ?, ?, 1, 1)').run(product.id, newUrl, title);
    }
    console.log(`Updated DB image for "${title}" (${slug}) -> ${newUrl}`);
  } else {
    console.warn(`Product slug "${slug}" not found in DB.`);
  }
}

updateDbImage('fountains', fountainDestRel, 'Fountains');
updateDbImage('feng-shui-turtle', turtleDestRel, 'Feng Shui Turtle');

console.log('--- Step 3: Update JSON Files ---');

function updateJsonImages(filePath) {
  if (!fs.existsSync(filePath)) return;
  console.log(`Updating JSON file: ${filePath}`);
  const raw = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(raw);

  let list = Array.isArray(data) ? data : (data.products || []);
  let updatedCount = 0;

  list.forEach(item => {
    if (!item || !item.slug) return;

    if (item.slug === 'fountains') {
      item.image = fountainDestRel;
      item.images = [fountainDestRel];
      updatedCount++;
    } else if (item.slug === 'feng-shui-turtle') {
      item.image = turtleDestRel;
      item.images = [turtleDestRel];
      updatedCount++;
    }
  });

  const finalOutput = Array.isArray(data) ? list : { ...data, products: list };
  fs.writeFileSync(filePath, JSON.stringify(finalOutput, null, 2), 'utf8');
  console.log(`  Updated ${updatedCount} image references in ${filePath}`);
}

updateJsonImages('vinsho-commerce-seed.json');
updateJsonImages('src/data/products/candles.json');
updateJsonImages('vinsho_products.json');
updateJsonImages('vinsho-content.json');

console.log('All image updates complete!');
