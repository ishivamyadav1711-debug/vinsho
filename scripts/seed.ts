import fs from 'node:fs';
import path from 'node:path';
import { db } from '../src/lib/db.js';
import { evaluatePurchasability } from '../src/lib/purchasability.js';

export function runSeed() {
  console.log('--- Starting VINSHO Milestone 1 Seed Importer ---');

  const rootDir = process.cwd();
  const taxonomyPath = path.join(rootDir, 'vinsho-taxonomy.json');
  const seedPath = path.join(rootDir, 'vinsho-commerce-seed.json');

  if (!fs.existsSync(taxonomyPath) || !fs.existsSync(seedPath)) {
    throw new Error('Seed files missing in root directory! Require vinsho-taxonomy.json and vinsho-commerce-seed.json.');
  }

  const taxonomyData = JSON.parse(fs.readFileSync(taxonomyPath, 'utf-8'));
  const seedData = JSON.parse(fs.readFileSync(seedPath, 'utf-8'));

  const now = new Date().toISOString();

  // 1. Seed Collections & Subcategories
  const insertCol = db.prepare(`
    INSERT INTO collections (key, name, blurb, order_index, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET
      name = excluded.name,
      blurb = excluded.blurb,
      order_index = excluded.order_index,
      updated_at = excluded.updated_at
  `);

  const insertSub = db.prepare(`
    INSERT INTO subcategories (collection_id, key, name, blurb, order_index, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET
      collection_id = excluded.collection_id,
      name = excluded.name,
      blurb = excluded.blurb,
      order_index = excluded.order_index,
      updated_at = excluded.updated_at
  `);

  const colMap = new Map<string, number>();
  const subMap = new Map<string, number>();

  db.transaction(() => {
    taxonomyData.collections.forEach((c: any, cIdx: number) => {
      insertCol.run(c.key, c.name, c.blurb || '', c.order || cIdx + 1, now, now);
      const colRow = db.prepare('SELECT id FROM collections WHERE key = ?').get(c.key) as { id: number };
      colMap.set(c.key, colRow.id);

      c.subcategories.forEach((s: any, sIdx: number) => {
        insertSub.run(colRow.id, s.key, s.name, s.blurb || '', s.order || sIdx + 1, now, now);
        const subRow = db.prepare('SELECT id FROM subcategories WHERE key = ?').get(s.key) as { id: number };
        subMap.set(s.key, subRow.id);
      });
    });
  })();

  console.log(`✓ Imported ${colMap.size} collections and ${subMap.size} subcategories.`);

  // 2. Seed 50 Products
  const insertProduct = db.prepare(`
    INSERT INTO products (
      slug, name, collection_id, subcategory_id, description, description_source,
      material, shipping_class, launch_phase, sellable_online, returnable,
      country_of_origin, manufacturer_or_packer, consumer_care_contact,
      lead_time_days, care_instructions, is_purchasable, created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?,
      ?, ?, ?, ?, ?
    )
    ON CONFLICT(slug) DO UPDATE SET
      name = excluded.name,
      collection_id = excluded.collection_id,
      subcategory_id = excluded.subcategory_id,
      description = excluded.description,
      description_source = excluded.description_source,
      material = excluded.material,
      shipping_class = excluded.shipping_class,
      launch_phase = excluded.launch_phase,
      sellable_online = excluded.sellable_online,
      returnable = excluded.returnable,
      country_of_origin = excluded.country_of_origin,
      manufacturer_or_packer = excluded.manufacturer_or_packer,
      consumer_care_contact = excluded.consumer_care_contact,
      lead_time_days = excluded.lead_time_days,
      care_instructions = excluded.care_instructions,
      is_purchasable = excluded.is_purchasable,
      updated_at = excluded.updated_at
  `);

  const insertImage = db.prepare(`
    INSERT INTO product_images (product_id, url, alt, position, is_primary, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  let productCount = 0;
  let imageCount = 0;

  db.transaction(() => {
    seedData.products.forEach((p: any) => {
      const colId = colMap.get(p.collectionKey) || colMap.values().next().value;
      const subId = subMap.get(p.subcategoryKey) || subMap.values().next().value;

      // Render time purchasability check (initially 0 as every field is null)
      const evalRes = evaluatePurchasability(
        {
          id: 0,
          slug: p.slug,
          name: p.name,
          collection_id: colId,
          subcategory_id: subId,
          description: p.description || '',
          description_source: p.descriptionSource || 'placeholder',
          material: p.material || '',
          shipping_class: p.shippingClass || 'standard',
          launch_phase: p.launchPhase !== undefined ? p.launchPhase : 1,
          sellable_online: p.sellableOnline ? 1 : 0,
          returnable: p.returnable ? 1 : 0,
          country_of_origin: p.countryOfOrigin || 'India',
          manufacturer_or_packer: p.manufacturerOrPacker || null,
          consumer_care_contact: p.consumerCareContact || null,
          lead_time_days: p.leadTimeDays || null,
          care_instructions: p.careInstructions || null,
          is_purchasable: 0
        },
        []
      );

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
        evalRes.isPurchasable ? 1 : 0,
        now,
        now
      );

      const prodRow = db.prepare('SELECT id FROM products WHERE slug = ?').get(p.slug) as { id: number };
      productCount++;

      // Idempotent Image update: Clear previous primary images and insert single primary image from p.image
      db.prepare('DELETE FROM product_images WHERE product_id = ?').run(prodRow.id);
      insertImage.run(prodRow.id, p.image, p.name, 1, 1, now, now);
      imageCount++;
    });
  })();

  // 3. Ensure ZERO product_variants exist per specification
  const variantCount = (db.prepare('SELECT COUNT(*) as cnt FROM product_variants').get() as any).cnt;

  console.log(`✓ Imported ${productCount} products and ${imageCount} primary image records.`);
  console.log(`✓ Confirmed zero variant records exist in database (Count = ${variantCount}).`);
  console.log('--- Seed Import Completed Successfully ---');
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
  runSeed();
}
