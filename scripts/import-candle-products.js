import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

const rootDir = process.cwd();
const candleDataPath = path.join(rootDir, 'src', 'data', 'products', 'candles.json');
const productsJsonPath = path.join(rootDir, 'vinsho_products.json');
const seedJsonPath = path.join(rootDir, 'vinsho-commerce-seed.json');
const taxonomyJsonPath = path.join(rootDir, 'vinsho-taxonomy.json');
const dbPath = path.join(rootDir, 'data', 'vinsho.db');

const candlesDataset = JSON.parse(fs.readFileSync(candleDataPath, 'utf8'));
const existingProductsJson = JSON.parse(fs.readFileSync(productsJsonPath, 'utf8'));
const seedData = JSON.parse(fs.readFileSync(seedJsonPath, 'utf8'));
const taxonomyData = JSON.parse(fs.readFileSync(taxonomyJsonPath, 'utf8'));

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

console.log('--- Executing VINSHO Candle Collection Importer ---');

// Ensure missing columns exist in DB
const cols = db.prepare("PRAGMA table_info(products)").all();
const colNames = new Set(cols.map((c) => c.name));
if (!colNames.has('sku_ref')) db.exec("ALTER TABLE products ADD COLUMN sku_ref TEXT;");
if (!colNames.has('status')) db.exec("ALTER TABLE products ADD COLUMN status TEXT DEFAULT 'draft';");

// Fetch collection & subcategory IDs
const colRows = db.prepare('SELECT id, key FROM collections').all();
const subRows = db.prepare('SELECT id, key FROM subcategories').all();

const colMap = new Map(colRows.map(c => [c.key, c.id]));
const subMap = new Map(subRows.map(s => [s.key, s.id]));

const giftingColId = colMap.get('gifting-collection') || colMap.get('gifting') || colRows[0].id;
const candlesSubId = subMap.get('candles') || subRows[0].id;

const now = new Date().toISOString();

const updateProductStmt = db.prepare(`
  UPDATE products
  SET name = ?,
      description = ?,
      material = ?,
      sku_ref = ?,
      status = ?,
      collection_id = ?,
      subcategory_id = ?,
      is_purchasable = 0,
      sellable_online = 0,
      launch_phase = 0,
      updated_at = ?
  WHERE slug = ?
`);

const insertDraftProductStmt = db.prepare(`
  INSERT INTO products (
    slug, name, collection_id, subcategory_id, description, description_source,
    material, shipping_class, launch_phase, sellable_online, returnable,
    country_of_origin, is_purchasable, sku_ref, status, created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, 'Candle Catalogue', 'Poured wax', 'standard', 0, 0, 1, 'India', 0, ?, ?, ?, ?)
`);

const insertImageStmt = db.prepare(`
  INSERT INTO product_images (product_id, url, alt, position, is_primary, created_at, updated_at)
  VALUES (?, ?, ?, 1, 1, ?, ?)
`);

let matchedCount = 0;
let createdCount = 0;

db.transaction(() => {
  for (const item of candlesDataset) {
    // 1. Update/insert in vinsho_products.json
    const pIdx = existingProductsJson.findIndex(p => p.slug === item.slug);
    if (pIdx > -1) {
      existingProductsJson[pIdx] = {
        ...existingProductsJson[pIdx],
        name: item.name,
        description: item.description,
        collection: "Gifting Collection",
        subcategory: "Candles",
        category: item.category,
        sku_ref: item.sku_ref,
        status: item.status,
        price: null,
        image: item.image
      };
    } else {
      existingProductsJson.push({
        id: existingProductsJson.length + 1,
        slug: item.slug,
        name: item.name,
        collection: "Gifting Collection",
        subcategory: "Candles",
        category: item.category,
        description: item.description,
        sku_ref: item.sku_ref,
        status: item.status,
        price: null,
        image: item.image,
        material: "Poured wax"
      });
    }

    // 2. Upsert in SQLite DB
    const existingDbProd = db.prepare('SELECT id FROM products WHERE slug = ?').get(item.slug);

    if (existingDbProd) {
      updateProductStmt.run(
        item.name,
        item.description,
        "Poured wax",
        item.sku_ref,
        item.status || "draft",
        giftingColId,
        candlesSubId,
        now,
        item.slug
      );

      // Update image
      db.prepare('DELETE FROM product_images WHERE product_id = ?').run(existingDbProd.id);
      insertImageStmt.run(existingDbProd.id, item.image, item.name, now, now);
      matchedCount++;
    } else {
      const res = insertDraftProductStmt.run(
        item.slug,
        item.name,
        giftingColId,
        candlesSubId,
        item.description,
        item.sku_ref,
        item.status || "draft",
        now,
        now
      );

      const newId = res.lastInsertRowid;
      insertImageStmt.run(newId, item.image, item.name, now, now);
      createdCount++;
    }

    // 3. Upsert into vinsho-commerce-seed.json
    const seedIdx = seedData.products.findIndex(p => p.slug === item.slug);
    
    if (seedIdx > -1) {
      const target = seedData.products[seedIdx];
      target.name = item.name;
      target.description = item.description;
      target.collection = 'Gifting Collection';
      target.collectionKey = 'gifting-collection';
      target.subcategory = 'Candles';
      target.subcategoryKey = 'candles';
      target.sku_ref = item.sku_ref;
      target.status = item.status || "draft";
      target.price = null;
      target.mrp = null;
      target.sellingPrice = null;
      target.isPurchasable = false;
      target.sellableOnline = false;
      target.image = item.image;
    } else {
      seedData.products.push({
        slug: item.slug,
        sku_ref: item.sku_ref,
        status: item.status || "draft",
        name: item.name,
        collection: 'Gifting Collection',
        collectionKey: 'gifting-collection',
        subcategory: 'Candles',
        subcategoryKey: 'candles',
        category: item.category,
        image: item.image,
        material: 'Poured wax',
        description: item.description,
        descriptionSource: 'Candle Catalogue',
        shippingClass: 'standard',
        launchPhase: 0,
        sellableOnline: false,
        returnable: true,
        isPurchasable: false,
        mrp: null,
        sellingPrice: null,
        price: null,
        currency: 'INR',
        stock: null,
        variants: [],
        countryOfOrigin: 'India'
      });
    }
  }

  // 4. Update taxonomy
  const giftingCol = taxonomyData.collections.find(c => c.key === 'gifting-collection' || c.key === 'gifting');
  if (giftingCol) {
    let candlesSubcat = giftingCol.subcategories.find(s => s.key === 'candles');
    if (!candlesSubcat) {
      candlesSubcat = {
        key: 'candles',
        name: 'Candles',
        blurb: 'Thoughtfully selected candles to bring warmth, character, and atmosphere to your space.',
        products: [],
        count: 0
      };
      giftingCol.subcategories.push(candlesSubcat);
    }
    const existingProductSlugs = new Set(candlesSubcat.products || []);
    candlesDataset.forEach(item => existingProductSlugs.add(item.slug));
    candlesSubcat.products = Array.from(existingProductSlugs);
    candlesSubcat.count = candlesSubcat.products.length;
  }

  // Add to taxonomyData.products list if missing
  if (!taxonomyData.products) taxonomyData.products = [];
  candlesDataset.forEach(item => {
    const taxIdx = taxonomyData.products.findIndex(p => p.slug === item.slug);
    if (taxIdx > -1) {
      taxonomyData.products[taxIdx].name = item.name;
      taxonomyData.products[taxIdx].description = item.description;
      taxonomyData.products[taxIdx].collection = "Gifting Collection";
      taxonomyData.products[taxIdx].collectionKey = "gifting-collection";
      taxonomyData.products[taxIdx].subcategory = "Candles";
      taxonomyData.products[taxIdx].subcategoryKey = "candles";
      taxonomyData.products[taxIdx].sku_ref = item.sku_ref;
      taxonomyData.products[taxIdx].status = item.status || 'draft';
      taxonomyData.products[taxIdx].image = item.image;
    } else {
      taxonomyData.products.push({
        slug: item.slug,
        name: item.name,
        collection: "Gifting Collection",
        collectionKey: "gifting-collection",
        subcategory: "Candles",
        subcategoryKey: "candles",
        sku_ref: item.sku_ref,
        status: item.status || "draft",
        image: item.image,
        material: "Poured wax",
        description: item.description
      });
    }
  });

})();

// Save updated files
fs.writeFileSync(productsJsonPath, JSON.stringify(existingProductsJson, null, 2), 'utf8');
fs.writeFileSync(seedJsonPath, JSON.stringify(seedData, null, 2), 'utf8');
fs.writeFileSync(taxonomyJsonPath, JSON.stringify(taxonomyData, null, 2), 'utf8');

console.log('Candle Collection import completed successfully!');
console.log(`Matched Existing: ${matchedCount}, Created New Drafts: ${createdCount}`);
