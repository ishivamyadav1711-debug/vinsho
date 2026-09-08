import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';

console.log('=== STARTING DEEP COMPREHENSIVE BUG AUDIT ===\n');

const issues = [];

// 1. Check SQLite Database Integrity
try {
  const db = new Database('data/vinsho.db');
  const prodCount = db.prepare('SELECT COUNT(*) as total FROM products').get().total;
  const imgCount = db.prepare('SELECT COUNT(*) as total FROM product_images').get().total;
  const varCount = db.prepare('SELECT COUNT(*) as total FROM product_variants').get().total;

  console.log('1. DATABASE METRICS:');
  console.log(` - Total Products: ${prodCount}`);
  console.log(` - Total Product Images: ${imgCount}`);
  console.log(` - Total Product Variants: ${varCount}`);

  if (prodCount === 0) issues.push('Database has 0 products!');
} catch (err) {
  issues.push(`Database connection error: ${err.message}`);
}

// 2. Check Image File References on Disk
console.log('\n2. CHECKING IMAGE FILE INTEGRITY ON DISK:');
try {
  const db = new Database('data/vinsho.db');
  const images = db.prepare('SELECT url FROM product_images').all();
  let missingImgs = 0;

  images.forEach((img) => {
    if (img.url.startsWith('/images/')) {
      const relPath = img.url.replace(/^\//, '');
      const absPath = path.resolve('public', relPath);
      if (!fs.existsSync(absPath)) {
        missingImgs++;
        console.error(` [MISSING IMAGE FILE]: ${absPath}`);
      }
    }
  });

  if (missingImgs > 0) {
    issues.push(`Found ${missingImgs} missing image files referenced in database!`);
  } else {
    console.log(' ✓ All database product image URLs exist on disk in public/!');
  }
} catch (err) {
  issues.push(`Image integrity check error: ${err.message}`);
}

// 3. Check JSON Data Consistency
console.log('\n3. CHECKING JSON DATA FILES INTEGRITY:');
const jsonFiles = [
  'vinsho-commerce-seed.json',
  'vinsho-content.json',
  'vinsho-taxonomy.json',
  'src/data/products/candles.json'
];

jsonFiles.forEach((file) => {
  if (fs.existsSync(file)) {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      JSON.parse(content);
      console.log(` ✓ ${file} is valid JSON.`);
    } catch (err) {
      issues.push(`Invalid JSON format in ${file}: ${err.message}`);
    }
  } else {
    issues.push(`JSON file missing: ${file}`);
  }
});

// 4. Test Key HTTP Pages & API Endpoints
console.log('\n4. TESTING LIVE HTTP ENDPOINTS:');
const endpoints = [
  '/',
  '/about',
  '/products',
  '/collections',
  '/collections/gifting',
  '/collections/home-decor',
  '/collections/home-furnishings',
  '/blog',
  '/contact',
  '/cart',
  '/checkout',
  '/product/3-shade-flower-jar-candle',
  '/product/combo-20-executive-laptop-set-brown',
  '/api/cart?sessionToken=test-session'
];

async function testEndpoints() {
  for (const route of endpoints) {
    try {
      const res = await fetch(`http://localhost:4321${route}`);
      if (res.ok) {
        console.log(` ✓ GET ${route} -> 200 OK`);
      } else {
        console.error(` ✗ GET ${route} -> Status ${res.status}`);
        issues.push(`GET ${route} returned HTTP ${res.status}`);
      }
    } catch (err) {
      console.error(` ✗ GET ${route} -> Failed: ${err.message}`);
      issues.push(`GET ${route} failed: ${err.message}`);
    }
  }

  console.log('\n=== AUDIT SUMMARY ===');
  if (issues.length === 0) {
    console.log('✓ ALL SYSTEM AUDIT CHECKS PASSED WITH 0 BUGS FOUND!');
  } else {
    console.log(`Found ${issues.length} issue(s):`);
    issues.forEach((iss, idx) => console.log(` ${idx + 1}. ${iss}`));
  }
}

testEndpoints();
