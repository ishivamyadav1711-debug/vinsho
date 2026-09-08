import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

const dbDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const dbPath = path.join(dbDir, 'vinsho.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

console.log('--- Executing VINSHO Schema Setup & Seed Importer ---');

db.exec(`
  CREATE TABLE IF NOT EXISTS collections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    blurb TEXT DEFAULT '',
    order_index INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT DEFAULT NULL
  );

  CREATE TABLE IF NOT EXISTS subcategories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    collection_id INTEGER NOT NULL,
    key TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    blurb TEXT DEFAULT '',
    order_index INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT DEFAULT NULL,
    FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    collection_id INTEGER NOT NULL,
    subcategory_id INTEGER NOT NULL,
    description TEXT DEFAULT '',
    description_source TEXT DEFAULT 'placeholder',
    tagline TEXT DEFAULT '',
    features TEXT DEFAULT '[]',
    closing_line TEXT DEFAULT '',
    material TEXT DEFAULT '',
    shipping_class TEXT NOT NULL DEFAULT 'standard',
    launch_phase INTEGER NOT NULL DEFAULT 1,
    sellable_online INTEGER NOT NULL DEFAULT 1,
    returnable INTEGER NOT NULL DEFAULT 1,
    country_of_origin TEXT DEFAULT 'India',
    manufacturer_or_packer TEXT DEFAULT NULL,
    consumer_care_contact TEXT DEFAULT NULL,
    lead_time_days INTEGER DEFAULT NULL,
    care_instructions TEXT DEFAULT NULL,
    is_purchasable INTEGER NOT NULL DEFAULT 0,
    gift_eligible INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT DEFAULT NULL,
    FOREIGN KEY (collection_id) REFERENCES collections(id),
    FOREIGN KEY (subcategory_id) REFERENCES subcategories(id)
  );

  CREATE TABLE IF NOT EXISTS product_images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    url TEXT NOT NULL,
    alt TEXT DEFAULT '',
    position INTEGER DEFAULT 0,
    is_primary INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS product_variants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    sku TEXT UNIQUE DEFAULT NULL,
    size TEXT DEFAULT NULL,
    colour TEXT DEFAULT NULL,
    mrp REAL DEFAULT NULL,
    selling_price REAL DEFAULT NULL,
    currency TEXT DEFAULT 'INR',
    hsn_code TEXT DEFAULT NULL,
    gst_rate REAL DEFAULT NULL,
    net_quantity TEXT DEFAULT NULL,
    packed_weight_kg REAL DEFAULT NULL,
    packed_l_cm REAL DEFAULT NULL,
    packed_b_cm REAL DEFAULT NULL,
    packed_h_cm REAL DEFAULT NULL,
    stock INTEGER DEFAULT NULL,
    position INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS admin_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'SUPER_ADMIN',
    is_active INTEGER NOT NULL DEFAULT 1,
    last_login_at TEXT DEFAULT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    actor_id INTEGER NOT NULL,
    action TEXT NOT NULL,
    entity TEXT NOT NULL,
    entity_id INTEGER NOT NULL,
    before TEXT DEFAULT NULL,
    after TEXT DEFAULT NULL,
    ip TEXT DEFAULT '',
    user_agent TEXT DEFAULT '',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS admin_sessions (
    token TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    ip TEXT DEFAULT '',
    user_agent TEXT DEFAULT '',
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES admin_users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS login_rate_limits (
    ip TEXT PRIMARY KEY,
    attempts INTEGER DEFAULT 1,
    first_failed_at INTEGER NOT NULL,
    blocked_until INTEGER DEFAULT 0
  );

    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT DEFAULT NULL,
      phone TEXT NOT NULL,
      city TEXT DEFAULT '',
      state TEXT DEFAULT '',
      pincode TEXT DEFAULT '',
      country TEXT DEFAULT 'India',
      status TEXT NOT NULL DEFAULT 'Lead',
      source TEXT DEFAULT 'Website Enquiry',
      first_order_at TEXT DEFAULT NULL,
      last_order_at TEXT DEFAULT NULL,
      total_orders INTEGER DEFAULT 0,
      total_spend REAL DEFAULT 0,
      consent_at TEXT DEFAULT NULL,
      consent_purpose TEXT DEFAULT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT DEFAULT NULL
    );

    CREATE TABLE IF NOT EXISTS addresses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL,
      type TEXT NOT NULL DEFAULT 'SHIPPING',
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      line1 TEXT NOT NULL,
      line2 TEXT DEFAULT '',
      city TEXT NOT NULL,
      state TEXT NOT NULL,
      pincode TEXT NOT NULL,
      country TEXT NOT NULL DEFAULT 'India',
      is_default INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT UNIQUE NOT NULL,
      customer_id INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'Pending',
      payment_status TEXT NOT NULL DEFAULT 'pending',
      subtotal REAL NOT NULL,
      tax_total REAL NOT NULL,
      shipping_total REAL NOT NULL,
      discount_total REAL DEFAULT 0,
      grand_total REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'INR',
      shipping_address_id INTEGER NOT NULL,
      billing_address_id INTEGER NOT NULL,
      is_interstate INTEGER NOT NULL DEFAULT 0,
      placed_at TEXT NOT NULL,
      idempotency_key TEXT UNIQUE NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (customer_id) REFERENCES customers(id),
      FOREIGN KEY (shipping_address_id) REFERENCES addresses(id),
      FOREIGN KEY (billing_address_id) REFERENCES addresses(id)
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      variant_id INTEGER NOT NULL,
      product_name_snapshot TEXT NOT NULL,
      variant_label_snapshot TEXT NOT NULL,
      sku_snapshot TEXT NOT NULL,
      hsn_snapshot TEXT NOT NULL,
      gst_rate_snapshot REAL NOT NULL,
      unit_price_snapshot REAL NOT NULL,
      qty INTEGER NOT NULL,
      tax_amount REAL NOT NULL,
      line_total REAL NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (variant_id) REFERENCES product_variants(id)
    );

    CREATE TABLE IF NOT EXISTS gapless_sequences (
      sequence_name TEXT PRIMARY KEY,
      current_val INTEGER DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
    CREATE INDEX IF NOT EXISTS idx_products_collection ON products(collection_id);
    CREATE INDEX IF NOT EXISTS idx_products_subcategory ON products(subcategory_id);
    CREATE INDEX IF NOT EXISTS idx_variants_product ON product_variants(product_id);
    CREATE INDEX IF NOT EXISTS idx_images_product ON product_images(product_id);
    CREATE INDEX IF NOT EXISTS idx_orders_number ON orders(order_number);
    CREATE INDEX IF NOT EXISTS idx_orders_idempotency ON orders(idempotency_key);
  `);

console.log('✓ Database schema tables & indexes initialized.');

const taxonomyData = JSON.parse(fs.readFileSync('vinsho-taxonomy.json', 'utf-8'));
const seedData = JSON.parse(fs.readFileSync('vinsho-commerce-seed.json', 'utf-8'));
const now = new Date().toISOString();

const insertCol = db.prepare(`
  INSERT INTO collections (key, name, blurb, order_index, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?)
  ON CONFLICT(key) DO UPDATE SET name=excluded.name, blurb=excluded.blurb, order_index=excluded.order_index, updated_at=excluded.updated_at
`);

const insertSub = db.prepare(`
  INSERT INTO subcategories (collection_id, key, name, blurb, order_index, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(key) DO UPDATE SET collection_id=excluded.collection_id, name=excluded.name, blurb=excluded.blurb, order_index=excluded.order_index, updated_at=excluded.updated_at
`);

const colMap = new Map();
const subMap = new Map();

db.pragma('foreign_keys = OFF');

db.transaction(() => {
  db.prepare('DELETE FROM product_variants').run();
  db.prepare('DELETE FROM product_images').run();
  db.prepare('DELETE FROM products').run();
  db.prepare('DELETE FROM subcategories').run();
  db.prepare('DELETE FROM collections').run();

  taxonomyData.collections.forEach((c, cIdx) => {
    insertCol.run(c.key, c.name, c.blurb || '', c.order || cIdx + 1, now, now);
    const colRow = db.prepare('SELECT id FROM collections WHERE key = ?').get(c.key);
    colMap.set(c.key, colRow.id);
    if (c.key === 'gifting-collection') colMap.set('gifting', colRow.id);
    if (c.key === 'home-furnishing') colMap.set('home-furnishings', colRow.id);

    c.subcategories.forEach((s, sIdx) => {
      insertSub.run(colRow.id, s.key, s.name, s.blurb || '', s.order || sIdx + 1, now, now);
      const subRow = db.prepare('SELECT id FROM subcategories WHERE key = ?').get(s.key);
      subMap.set(s.key, subRow.id);
    });
  });
})();

console.log(`✓ Imported ${colMap.size} collections and ${subMap.size} subcategories.`);

const insertProduct = db.prepare(`
  INSERT INTO products (
    slug, name, collection_id, subcategory_id, description, description_source,
    tagline, features, closing_line, material, shipping_class, launch_phase, sellable_online, returnable,
    country_of_origin, manufacturer_or_packer, consumer_care_contact,
    lead_time_days, care_instructions, is_purchasable, gift_eligible, created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(slug) DO UPDATE SET
    name=excluded.name, collection_id=excluded.collection_id, subcategory_id=excluded.subcategory_id,
    description=excluded.description, description_source=excluded.description_source,
    tagline=excluded.tagline, features=excluded.features, closing_line=excluded.closing_line,
    material=excluded.material, shipping_class=excluded.shipping_class, launch_phase=excluded.launch_phase,
    sellable_online=excluded.sellable_online, returnable=excluded.returnable, country_of_origin=excluded.country_of_origin,
    manufacturer_or_packer=excluded.manufacturer_or_packer, consumer_care_contact=excluded.consumer_care_contact,
    lead_time_days=excluded.lead_time_days, care_instructions=excluded.care_instructions,
    is_purchasable=excluded.is_purchasable, gift_eligible=excluded.gift_eligible, updated_at=excluded.updated_at
`);

const insertImage = db.prepare(`
  INSERT INTO product_images (product_id, url, alt, position, is_primary, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const insertVariant = db.prepare(`
  INSERT INTO product_variants (
    product_id, sku, size, colour, mrp, selling_price, currency, hsn_code, gst_rate,
    net_quantity, packed_weight_kg, packed_l_cm, packed_b_cm, packed_h_cm, stock, position, created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

let productCount = 0;
let imageCount = 0;
let variantInsertCount = 0;

db.transaction(() => {
  seedData.products.forEach((p) => {
    const colId = colMap.get(p.collectionKey) || Array.from(colMap.values())[0];
    const subId = subMap.get(p.subcategoryKey) || Array.from(subMap.values())[0];

    const colKey = (p.collectionKey || p.collection || '').toLowerCase();
    const isGifting = colKey.includes('gifting') || colKey.includes('gift');
    const isPurchasable = isGifting ? 1 : 0;
    const sellingPrice = p.sellingPrice || p.price || 499;
    const mrp = p.mrp || Math.round(sellingPrice * 1.3);

    insertProduct.run(
      p.slug,
      p.name,
      colId,
      subId,
      p.description || '',
      p.descriptionSource || 'placeholder',
      p.tagline || '',
      JSON.stringify(p.features || []),
      p.closing_line || p.closingLine || '',
      p.material || '',
      p.shippingClass || 'standard',
      p.launchPhase !== undefined ? p.launchPhase : 1,
      1, // sellableOnline
      p.returnable !== undefined ? (p.returnable ? 1 : 0) : 1,
      p.countryOfOrigin || 'India',
      p.manufacturerOrPacker || 'VINSHO Studio, Greater Noida, UP',
      p.consumerCareContact || 'vinvks@gmail.com | +91 9625515351',
      p.leadTimeDays || null,
      p.careInstructions || null,
      isPurchasable,
      p.giftEligible ? 1 : 0,
      now,
      now
    );

    const prodRow = db.prepare('SELECT id FROM products WHERE slug = ?').get(p.slug);
    productCount++;

    db.prepare('DELETE FROM product_images WHERE product_id = ?').run(prodRow.id);
    insertImage.run(prodRow.id, p.image, p.name, 1, 1, now, now);
    imageCount++;

    db.prepare('DELETE FROM product_variants WHERE product_id = ?').run(prodRow.id);
    insertVariant.run(
      prodRow.id,
      p.sku || `VIN-SKU-${prodRow.id}`,
      null, // size
      null, // colour
      mrp,
      sellingPrice,
      p.currency || 'INR',
      p.hsnCode || null,
      p.gstRate || 18.0,
      p.netQuantity || '1 Unit',
      p.packedWeightKg || 0.5,
      p.packedDimensionsCm?.l || 15,
      p.packedDimensionsCm?.b || 15,
      p.packedDimensionsCm?.h || 15,
      p.stock !== null && p.stock !== undefined ? p.stock : 100,
      1, // position
      now,
      now
    );
    variantInsertCount++;
  });
})();

db.pragma('foreign_keys = ON');

const variantCount = db.prepare('SELECT COUNT(*) as cnt FROM product_variants').get().cnt;

console.log(`✓ Imported ${productCount} products and ${imageCount} primary image records.`);
console.log(`✓ Created ${variantCount} variant records for products.`);
console.log('--- Seed Import Completed Successfully ---');

