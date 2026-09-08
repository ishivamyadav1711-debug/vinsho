import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

const rootDir = process.cwd();
const productsJsonPath = path.join(rootDir, 'vinsho_products.json');
const seedJsonPath = path.join(rootDir, 'vinsho-commerce-seed.json');
const dbPath = path.join(rootDir, 'data', 'vinsho.db');

if (!fs.existsSync(productsJsonPath)) {
  throw new Error('vinsho_products.json not found!');
}

const datasetProducts = JSON.parse(fs.readFileSync(productsJsonPath, 'utf8'));
const seedData = JSON.parse(fs.readFileSync(seedJsonPath, 'utf8'));
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Auto-migrate missing columns on products table
const cols = db.prepare("PRAGMA table_info(products)").all();
const colNames = new Set(cols.map((c) => c.name));
if (!colNames.has('tagline')) {
  db.exec("ALTER TABLE products ADD COLUMN tagline TEXT DEFAULT ''");
}
if (!colNames.has('features')) {
  db.exec("ALTER TABLE products ADD COLUMN features TEXT DEFAULT '[]'");
}
if (!colNames.has('closing_line')) {
  db.exec("ALTER TABLE products ADD COLUMN closing_line TEXT DEFAULT ''");
}

// Category mapping helper to collectionKey & subcategoryKey
function mapCategoryToTaxonomy(categoryStr) {
  const catUpper = (categoryStr || '').toUpperCase();
  if (catUpper.includes('HOME DECOR') || catUpper.includes('WALL DECOR')) {
    return { collectionKey: 'home-decor', subcategoryKey: 'wall-art' };
  }
  if (catUpper.includes('TABLE & LIVING')) {
    return { collectionKey: 'home-decor', subcategoryKey: 'showpiece' };
  }
  if (catUpper.includes('BEDDING') || catUpper.includes('HOME FURNISHING')) {
    return { collectionKey: 'home-furnishing', subcategoryKey: 'bedsheet' };
  }
  if (catUpper.includes('GIFTING') || catUpper.includes('STATIONERY')) {
    return { collectionKey: 'gifting-collection', subcategoryKey: 'gift-items' };
  }
  return { collectionKey: 'home-decor', subcategoryKey: 'showpiece' };
}

// Fetch collection & subcategory maps from DB
const colRows = db.prepare('SELECT id, key FROM collections').all();
const subRows = db.prepare('SELECT id, key FROM subcategories').all();

const colMap = new Map(colRows.map(c => [c.key, c.id]));
if (colMap.has('gifting-collection')) colMap.set('gifting', colMap.get('gifting-collection'));
if (colMap.has('home-furnishing')) colMap.set('home-furnishings', colMap.get('home-furnishing'));

const subMap = new Map(subRows.map(s => [s.key, s.id]));

const now = new Date().toISOString();

// Prepare statements
const updateProductStmt = db.prepare(`
  UPDATE products
  SET name = ?,
      tagline = ?,
      description = ?,
      features = ?,
      closing_line = ?,
      description_source = ?,
      updated_at = ?
  WHERE slug = ?
`);

const insertDraftProductStmt = db.prepare(`
  INSERT INTO products (
    slug, name, collection_id, subcategory_id, description, description_source,
    tagline, features, closing_line, material, shipping_class, launch_phase,
    sellable_online, returnable, country_of_origin, is_purchasable, created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '', 'standard', 0, 0, 1, 'India', 0, ?, ?)
`);

const insertImageStmt = db.prepare(`
  INSERT INTO product_images (product_id, url, alt, position, is_primary, created_at, updated_at)
  VALUES (?, ?, ?, 1, 1, ?, ?)
`);

let matchedCount = 0;
let createdCount = 0;
let emptyDescCount = 0;
let emptyFeaturesCount = 0;

const seedProductsMap = new Map(seedData.products.map((p, idx) => [p.slug, { item: p, idx }]));

db.transaction(() => {
  for (const dp of datasetProducts) {
    const featuresJsonStr = JSON.stringify(dp.features || []);
    if (!dp.description || dp.description.trim() === '') {
      emptyDescCount++;
    }
    if (!dp.features || dp.features.length === 0) {
      emptyFeaturesCount++;
    }

    const existingDbProd = db.prepare('SELECT id, slug FROM products WHERE slug = ?').get(dp.slug);

    if (existingDbProd) {
      // 1. UPDATE existing product in DB (ONLY text content fields)
      updateProductStmt.run(
        dp.name,
        dp.tagline || '',
        dp.description || '',
        featuresJsonStr,
        dp.closing_line || '',
        dp.source || 'dataset',
        now,
        dp.slug
      );
      matchedCount++;

      // Update seedData json
      if (seedProductsMap.has(dp.slug)) {
        const target = seedProductsMap.get(dp.slug).item;
        target.name = dp.name;
        target.tagline = dp.tagline || '';
        target.description = dp.description || '';
        target.features = dp.features || [];
        target.closing_line = dp.closing_line || '';
        target.closingLine = dp.closing_line || '';
        target.descriptionSource = dp.source || 'dataset';
      }
    } else {
      // 2. CREATE new draft product in DB
      const taxMapping = mapCategoryToTaxonomy(dp.category);
      const colId = colMap.get(taxMapping.collectionKey) || Array.from(colMap.values())[0];
      const subId = subMap.get(taxMapping.subcategoryKey) || Array.from(subMap.values())[0];

      const res = insertDraftProductStmt.run(
        dp.slug,
        dp.name,
        colId,
        subId,
        dp.description || '',
        dp.source || 'dataset',
        dp.tagline || '',
        featuresJsonStr,
        dp.closing_line || '',
        now,
        now
      );

      const newId = res.lastInsertRowid;
      // Add primary placeholder image
      const placeholderImg = `https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&q=80&w=1000`;
      insertImageStmt.run(newId, placeholderImg, dp.name, now, now);

      createdCount++;

      // Append draft product to seedData
      seedData.products.push({
        slug: dp.slug,
        name: dp.name,
        collection: 'Home Décor',
        collectionKey: taxMapping.collectionKey,
        subcategory: 'Accent Decor',
        subcategoryKey: taxMapping.subcategoryKey,
        image: placeholderImg,
        material: 'Premium',
        description: dp.description || '',
        descriptionSource: dp.source || 'dataset',
        tagline: dp.tagline || '',
        features: dp.features || [],
        closing_line: dp.closing_line || '',
        closingLine: dp.closing_line || '',
        shippingClass: 'standard',
        launchPhase: 0,
        sellableOnline: false,
        returnable: true,
        isPurchasable: false,
        sku: null,
        mrp: null,
        sellingPrice: null,
        currency: 'INR',
        hsnCode: null,
        gstRate: null,
        netQuantity: null,
        packedWeightKg: null,
        packedDimensionsCm: { l: null, b: null, h: null },
        stock: null,
        variants: [],
        countryOfOrigin: 'India',
        manufacturerOrPacker: null,
        consumerCareContact: null,
        leadTimeDays: null,
        careInstructions: null
      });
    }
  }
})();

// Write updated seed JSON
fs.writeFileSync(seedJsonPath, JSON.stringify(seedData, null, 2), 'utf8');

console.log('Import completed successfully!');
console.log(`Matched: ${matchedCount}, Created: ${createdCount}, Empty Desc: ${emptyDescCount}, Empty Features: ${emptyFeaturesCount}`);
