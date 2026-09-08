import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

const rootDir = process.cwd();
const taxonomyJsonPath = path.join(rootDir, 'vinsho-taxonomy.json');
const seedJsonPath = path.join(rootDir, 'vinsho-commerce-seed.json');
const productsJsonPath = path.join(rootDir, 'vinsho_products.json');
const dbPath = path.join(rootDir, 'data', 'vinsho.db');

const taxonomyData = JSON.parse(fs.readFileSync(taxonomyJsonPath, 'utf8'));
const seedData = JSON.parse(fs.readFileSync(seedJsonPath, 'utf8'));
const productsJsonData = JSON.parse(fs.readFileSync(productsJsonPath, 'utf8'));

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

console.log('--- Executing Candle Taxonomy Migration to Gifting Collection ---');

// 1. Fetch collection IDs
const giftingCol = db.prepare("SELECT id, key FROM collections WHERE key = 'gifting-collection' OR key = 'gifting'").get();
const homeDecorCol = db.prepare("SELECT id, key FROM collections WHERE key = 'home-decor'").get();

if (!giftingCol) {
  throw new Error("Gifting collection ('gifting-collection') not found in database!");
}

// 2. Fetch candles subcategory
const candlesSub = db.prepare("SELECT id, key, collection_id FROM subcategories WHERE key = 'candles'").get();

if (!candlesSub) {
  throw new Error("Candles subcategory ('candles') not found in database!");
}

const candlesSubId = candlesSub.id;
const giftingColId = giftingCol.id;

// 3. DB Migration Transaction
db.transaction(() => {
  // Move candles subcategory under Gifting Collection
  db.prepare("UPDATE subcategories SET collection_id = ?, updated_at = ? WHERE id = ?").run(giftingColId, new Date().toISOString(), candlesSubId);

  // Update all products under candles subcategory to have Gifting Collection ID
  const res = db.prepare("UPDATE products SET collection_id = ?, updated_at = ? WHERE subcategory_id = ?").run(giftingColId, new Date().toISOString(), candlesSubId);
  console.log(`✓ DB updated ${res.changes} product rows to Gifting Collection (ID ${giftingColId}).`);
})();

// 4. Update vinsho-taxonomy.json
const homeDecorTaxCol = taxonomyData.collections.find(c => c.key === 'home-decor');
const giftingTaxCol = taxonomyData.collections.find(c => c.key === 'gifting-collection' || c.key === 'gifting');

let candleSubObj = null;

if (homeDecorTaxCol) {
  const cIdx = homeDecorTaxCol.subcategories.findIndex(s => s.key === 'candles');
  if (cIdx > -1) {
    candleSubObj = homeDecorTaxCol.subcategories.splice(cIdx, 1)[0];
  }
}

if (giftingTaxCol) {
  let existingCandleSub = giftingTaxCol.subcategories.find(s => s.key === 'candles');
  if (!existingCandleSub) {
    existingCandleSub = candleSubObj || {
      key: 'candles',
      name: 'Candles',
      blurb: 'Thoughtfully selected candles to bring warmth, character, and atmosphere to your space.',
      products: [],
      count: 0
    };
    giftingTaxCol.subcategories.push(existingCandleSub);
  }

  // Get all candle products (excluding accessories)
  const candleSlugs = db.prepare("SELECT slug FROM products WHERE subcategory_id = ? AND deleted_at IS NULL").all(candlesSubId).map(p => p.slug);
  existingCandleSub.products = Array.from(new Set([...(existingCandleSub.products || []), ...candleSlugs]));
  existingCandleSub.count = existingCandleSub.products.length;
  existingCandleSub.blurb = 'Thoughtfully selected candles to bring warmth, character, and atmosphere to your space.';

  giftingTaxCol.count = giftingTaxCol.subcategories.reduce((acc, sub) => acc + (sub.count || (sub.products ? sub.products.length : 0)), 0);
}

if (homeDecorTaxCol) {
  homeDecorTaxCol.count = homeDecorTaxCol.subcategories.reduce((acc, sub) => acc + (sub.count || (sub.products ? sub.products.length : 0)), 0);
}

// Update taxonomyData.products list
if (taxonomyData.products) {
  taxonomyData.products.forEach(p => {
    if (p.subcategoryKey === 'candles' || p.subcategory === 'Candles') {
      p.collection = 'Gifting Collection';
      p.collectionKey = 'gifting-collection';
      p.subcategory = 'Candles';
      p.subcategoryKey = 'candles';
    }
  });
}

// 5. Update vinsho-commerce-seed.json
if (seedData.products) {
  seedData.products.forEach(p => {
    if (p.subcategoryKey === 'candles' || p.subcategory === 'Candles') {
      p.collection = 'Gifting Collection';
      p.collectionKey = 'gifting-collection';
      p.subcategory = 'Candles';
      p.subcategoryKey = 'candles';
    }
  });
}

// 6. Update vinsho_products.json
productsJsonData.forEach(p => {
  if (p.subcategory === 'Candles' || p.subcategoryKey === 'candles' || (p.slug && p.slug.includes('candle') && !p.slug.includes('holder'))) {
    p.collection = 'Gifting Collection';
    p.subcategory = 'Candles';
  }
});

// Save updated files
fs.writeFileSync(taxonomyJsonPath, JSON.stringify(taxonomyData, null, 2), 'utf8');
fs.writeFileSync(seedJsonPath, JSON.stringify(seedData, null, 2), 'utf8');
fs.writeFileSync(productsJsonPath, JSON.stringify(productsJsonData, null, 2), 'utf8');

console.log('✓ Updated vinsho-taxonomy.json, vinsho-commerce-seed.json, and vinsho_products.json');
console.log('--- Candle Taxonomy Migration Completed Successfully ---');
