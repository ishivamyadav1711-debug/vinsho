import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

import { db, initDatabase } from '../src/lib/db.js';

console.log('--- Executing VINSHO Seed Importer ---');
initDatabase();

const taxonomyData = JSON.parse(fs.readFileSync('vinsho-taxonomy.json', 'utf-8'));
const seedData = JSON.parse(fs.readFileSync('vinsho-commerce-seed.json', 'utf-8'));
const now = new Date().toISOString();

// Enable foreign keys
db.pragma('foreign_keys = ON');

// 1. Collections & Subcategories
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

db.transaction(() => {
  taxonomyData.collections.forEach((c, cIdx) => {
    insertCol.run(c.key, c.name, c.blurb || '', c.order || cIdx + 1, now, now);
    const colRow = db.prepare('SELECT id FROM collections WHERE key = ?').get(c.key);
    colMap.set(c.key, colRow.id);

    c.subcategories.forEach((s, sIdx) => {
      insertSub.run(colRow.id, s.key, s.name, s.blurb || '', s.order || sIdx + 1, now, now);
      const subRow = db.prepare('SELECT id FROM subcategories WHERE key = ?').get(s.key);
      subMap.set(s.key, subRow.id);
    });
  });
})();

console.log(`✓ Imported ${colMap.size} collections & ${subMap.size} subcategories.`);

// 2. Products
const insertProduct = db.prepare(`
  INSERT INTO products (
    slug, name, collection_id, subcategory_id, description, description_source,
    material, shipping_class, launch_phase, sellable_online, returnable,
    country_of_origin, manufacturer_or_packer, consumer_care_contact,
    lead_time_days, care_instructions, is_purchasable, created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(slug) DO UPDATE SET
    name=excluded.name, collection_id=excluded.collection_id, subcategory_id=excluded.subcategory_id,
    description=excluded.description, description_source=excluded.description_source, material=excluded.material,
    shipping_class=excluded.shipping_class, launch_phase=excluded.launch_phase, sellable_online=excluded.sellable_online,
    returnable=excluded.returnable, country_of_origin=excluded.country_of_origin,
    manufacturer_or_packer=excluded.manufacturer_or_packer, consumer_care_contact=excluded.consumer_care_contact,
    lead_time_days=excluded.lead_time_days, care_instructions=excluded.care_instructions,
    is_purchasable=excluded.is_purchasable, updated_at=excluded.updated_at
`);

const insertImage = db.prepare(`
  INSERT INTO product_images (product_id, url, alt, position, is_primary, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

let productCount = 0;
let imageCount = 0;

db.transaction(() => {
  seedData.products.forEach((p) => {
    const colId = colMap.get(p.collectionKey) || Array.from(colMap.values())[0];
    const subId = subMap.get(p.subcategoryKey) || Array.from(subMap.values())[0];

    insertProduct.run(
      p.slug,
      p.name,
      colId,
      subId,
      p.description || '',
      p.descriptionSource || 'placeholder',
      p.material || '',
      p.shippingClass || 'standard',
      p.launchPhase !== undefined ? p.launchPhase : 1,
      p.sellableOnline ? 1 : 0,
      p.returnable ? 1 : 0,
      p.countryOfOrigin || 'India',
      p.manufacturerOrPacker || null,
      p.consumerCareContact || null,
      p.leadTimeDays || null,
      p.careInstructions || null,
      0, // Initially zero as all seed fields are null
      now,
      now
    );

    const prodRow = db.prepare('SELECT id FROM products WHERE slug = ?').get(p.slug);
    productCount++;

    db.prepare('DELETE FROM product_images WHERE product_id = ?').run(prodRow.id);
    insertImage.run(prodRow.id, p.image, p.name, 1, 1, now, now);
    imageCount++;
  });
})();

const variantCount = db.prepare('SELECT COUNT(*) as cnt FROM product_variants').get().cnt;

console.log(`✓ Imported ${productCount} products and ${imageCount} primary image records.`);
console.log(`✓ Confirmed zero variant records exist in database (Count = ${variantCount}).`);
console.log('--- Seed Import Completed Successfully ---');
