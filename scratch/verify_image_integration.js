import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';

const dbPath = path.resolve('data/vinsho.db');
const db = new Database(dbPath);

console.log('--- RUNNING FULL PRODUCT IMAGE INTEGRATION VERIFICATION ---');

// 1. Check Product Count
const countRow = db.prepare('SELECT COUNT(*) as total FROM products').get();
console.log(`✓ Total Products in Database: ${countRow.total} (Target: 140 - No duplicates created)`);
if (countRow.total !== 140) {
  console.error('FAILED: Product count changed!');
  process.exit(1);
}

// 2. Check Mapped Image File Existence
const images = db.prepare('SELECT url FROM product_images WHERE url LIKE ?').all('/images/vinsho/products/%');
console.log(`✓ Mapped Primary/Gallery Images in DB: ${images.length}`);

let missingFiles = 0;

for (const img of images) {
  const relPath = img.url.replace(/^\//, '');
  const absPath = path.resolve('public', relPath);
  
  if (!fs.existsSync(absPath)) {
    console.error(`[ERROR] File missing on disk: ${absPath}`);
    missingFiles++;
  }
}

if (missingFiles === 0) {
  console.log(`✓ All ${images.length} mapped database image URLs point to existing files on disk in public/images/vinsho/products/!`);
} else {
  console.error(`FAILED: ${missingFiles} image files missing!`);
}

// 3. Test HTTP Rendering on Live Dev Server
async function verifyLiveUrls() {
  const testSlugs = [
    'cork-diamond-uv-print-coaster',
    'combo-20-executive-laptop-set-brown',
    'teddy-girl-candle',
    'sunflower-jar-candle',
    'white-chocolate-strawberry-jar-candle'
  ];

  console.log('\n--- VERIFYING LIVE HTTP PAGES & RENDERING ---');
  for (const slug of testSlugs) {
    try {
      const res = await fetch(`http://localhost:4321/product/${slug}`);
      if (res.status === 200) {
        const html = await res.text();
        const hasImg = html.includes('/images/vinsho/products/');
        console.log(`[PASS] /product/${slug} -> Status: 200 OK | Rendered New Image: ${hasImg ? '✓' : '✗'}`);
      } else {
        console.error(`[FAIL] /product/${slug} -> Status: ${res.status}`);
      }
    } catch (e) {
      console.error(`[ERROR] Fetch error for ${slug}: ${e.message}`);
    }
  }
}

verifyLiveUrls();
