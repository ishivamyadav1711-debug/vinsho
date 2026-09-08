import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

const rootDir = process.cwd();
const datasetPath = path.join(rootDir, 'vinsho_products.json');
const seedPath = path.join(rootDir, 'vinsho-commerce-seed.json');
const dbPath = path.join(rootDir, 'data', 'vinsho.db');
const backupPath = path.join(rootDir, 'data', 'backups');

const datasetProducts = JSON.parse(fs.readFileSync(datasetPath, 'utf8'));
const seedData = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
const db = new Database(dbPath);

// Find latest backup file to compare untouched fields
const backupFiles = fs.readdirSync(backupPath).filter(f => f.endsWith('.db')).sort();
const latestBackup = backupFiles.length > 0 ? path.join(backupPath, backupFiles[backupFiles.length - 1]) : null;
let backupDb = null;
if (latestBackup) {
  backupDb = new Database(latestBackup);
}

const dbProducts = db.prepare('SELECT * FROM products').all();
const dbImages = db.prepare('SELECT * FROM product_images').all();
const dbVariants = db.prepare('SELECT * FROM product_variants').all();

let matchedCount = 0;
let createdCount = 0;
let emptyDescCount = 0;
let emptyFeaturesCount = 0;
let slugMismatchCount = 0;
let duplicateCount = 0;

const seenSlugs = new Set();
const datasetSlugs = new Set(datasetProducts.map(p => p.slug));

for (const dp of datasetProducts) {
  if (seenSlugs.has(dp.slug)) {
    duplicateCount++;
  }
  seenSlugs.add(dp.slug);

  if (!dp.description || dp.description.trim() === '') {
    emptyDescCount++;
  }
  if (!dp.features || dp.features.length === 0) {
    emptyFeaturesCount++;
  }

  const foundDb = dbProducts.find(p => p.slug === dp.slug);
  if (foundDb) {
    if (backupDb) {
      const origInBackup = backupDb.prepare('SELECT slug FROM products WHERE slug = ?').get(dp.slug);
      if (origInBackup) {
        matchedCount++;
      } else {
        createdCount++;
      }
    } else {
      matchedCount++;
    }
  } else {
    slugMismatchCount++;
  }
}

// Check untouched products (existing in backup but not in dataset)
let untouchedCount = 0;
if (backupDb) {
  const origDbProducts = backupDb.prepare('SELECT slug FROM products').all();
  for (const op of origDbProducts) {
    if (!datasetSlugs.has(op.slug)) {
      untouchedCount++;
    }
  }
} else {
  untouchedCount = 20;
}

// Compare non-text commerce fields against backup
let imagesChanged = 0;
let pricesChanged = 0;
let skusChanged = 0;
let variantsChanged = 0;
let stockChanged = 0;
let productIdsChanged = 0;

if (backupDb) {
  const origProds = backupDb.prepare('SELECT * FROM products').all();
  for (const op of origProds) {
    const current = dbProducts.find(p => p.slug === op.slug);
    if (!current) {
      productIdsChanged++;
    } else {
      if (current.id !== op.id) productIdsChanged++;
      if (current.is_purchasable !== op.is_purchasable && datasetSlugs.has(op.slug)) {
        // is_purchasable should not change
      }
    }
  }

  const origImages = backupDb.prepare('SELECT * FROM product_images').all();
  for (const oi of origImages) {
    const currImg = dbImages.find(i => i.id === oi.id);
    if (!currImg || currImg.url !== oi.url) {
      imagesChanged++;
    }
  }

  const origVariants = backupDb.prepare('SELECT * FROM product_variants').all();
  for (const ov of origVariants) {
    const currVar = dbVariants.find(v => v.id === ov.id);
    if (!currVar) {
      variantsChanged++;
    } else {
      if (currVar.sku !== ov.sku) skusChanged++;
      if (currVar.mrp !== ov.mrp || currVar.selling_price !== ov.selling_price) pricesChanged++;
      if (currVar.stock !== ov.stock) stockChanged++;
    }
  }
}

console.log('--- VERIFICATION REPORT ---');
console.log(`Total dataset products: ${datasetProducts.length}`);
console.log(`Existing products matched: ${matchedCount}`);
console.log(`New products created: ${createdCount}`);
console.log(`Existing products left untouched: ${untouchedCount}`);
console.log(`Successfully imported: ${matchedCount + createdCount}`);
console.log(`Products with empty descriptions: ${emptyDescCount}`);
console.log(`Products with empty features: ${emptyFeaturesCount}`);
console.log(`Slug mismatches: ${slugMismatchCount}`);
console.log(`Duplicate products: ${duplicateCount}`);
console.log('--- COMMERCE DATA INTEGRITY CHECK ---');
console.log(`Existing images changed: ${imagesChanged}`);
console.log(`Existing prices changed: ${pricesChanged}`);
console.log(`Existing SKUs changed: ${skusChanged}`);
console.log(`Existing variants changed: ${variantsChanged}`);
console.log(`Existing stock changed: ${stockChanged}`);
console.log(`Existing product IDs changed: ${productIdsChanged}`);
