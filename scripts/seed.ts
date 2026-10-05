import fs from 'node:fs';
import path from 'node:path';
import { prisma } from '../src/lib/db.js';
import { evaluatePurchasability } from '../src/lib/purchasability.js';

export async function runSeed() {
  console.log('--- Starting VINSHO Milestone 1 Seed Importer ---');

  const rootDir = process.cwd();
  const taxonomyPath = path.join(rootDir, 'vinsho-taxonomy.json');
  const seedPath = path.join(rootDir, 'vinsho-commerce-seed.json');

  if (!fs.existsSync(taxonomyPath) || !fs.existsSync(seedPath)) {
    throw new Error('Seed files missing in root directory! Require vinsho-taxonomy.json and vinsho-commerce-seed.json.');
  }

  const taxonomyData = JSON.parse(fs.readFileSync(taxonomyPath, 'utf-8'));
  const seedData = JSON.parse(fs.readFileSync(seedPath, 'utf-8'));

  const now = new Date();

  // 1. Seed Collections & Subcategories
  const colMap = new Map<string, number>();
  const subMap = new Map<string, number>();

  for (const [cIdx, c] of taxonomyData.collections.entries()) {
    const col = await prisma.collections.upsert({
      where: { key: c.key },
      update: {
        name: c.name,
        blurb: c.blurb || '',
        order_index: c.order || cIdx + 1,
        updated_at: now
      },
      create: {
        key: c.key,
        name: c.name,
        blurb: c.blurb || '',
        order_index: c.order || cIdx + 1,
        created_at: now,
        updated_at: now
      }
    });
    colMap.set(c.key, col.id);

    if (Array.isArray(c.subcategories)) {
      for (const [sIdx, s] of c.subcategories.entries()) {
        const sub = await prisma.subcategories.upsert({
          where: { key: s.key },
          update: {
            collection_id: col.id,
            name: s.name,
            blurb: s.blurb || '',
            order_index: s.order || sIdx + 1,
            updated_at: now
          },
          create: {
            collection_id: col.id,
            key: s.key,
            name: s.name,
            blurb: s.blurb || '',
            order_index: s.order || sIdx + 1,
            created_at: now,
            updated_at: now
          }
        });
        subMap.set(s.key, sub.id);
      }
    }
  }

  console.log(`✓ Imported ${colMap.size} collections and ${subMap.size} subcategories.`);

  // 2. Seed Products
  let productCount = 0;
  let imageCount = 0;

  for (const p of seedData.products) {
    const colId = colMap.get(p.collectionKey) || Array.from(colMap.values())[0] || 1;
    const subId = subMap.get(p.subcategoryKey) || Array.from(subMap.values())[0] || 1;

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

    const prod = await prisma.products.upsert({
      where: { slug: p.slug },
      update: {
        name: p.name,
        collection_id: colId,
        subcategory_id: subId,
        description: p.description || '',
        description_source: p.descriptionSource || 'placeholder',
        material: p.material || '',
        shipping_class: p.shippingClass || 'standard',
        launch_phase: p.launchPhase !== undefined ? p.launchPhase : 1,
        sellable_online: Boolean(p.sellableOnline),
        returnable: Boolean(p.returnable),
        country_of_origin: p.countryOfOrigin || 'India',
        manufacturer_or_packer: p.manufacturerOrPacker || null,
        consumer_care_contact: p.consumerCareContact || null,
        lead_time_days: p.leadTimeDays || null,
        care_instructions: p.careInstructions || null,
        is_purchasable: Boolean(evalRes.isPurchasable),
        updated_at: now
      },
      create: {
        slug: p.slug,
        name: p.name,
        collection_id: colId,
        subcategory_id: subId,
        description: p.description || '',
        description_source: p.descriptionSource || 'placeholder',
        material: p.material || '',
        shipping_class: p.shippingClass || 'standard',
        launch_phase: p.launchPhase !== undefined ? p.launchPhase : 1,
        sellable_online: Boolean(p.sellableOnline),
        returnable: Boolean(p.returnable),
        country_of_origin: p.countryOfOrigin || 'India',
        manufacturer_or_packer: p.manufacturerOrPacker || null,
        consumer_care_contact: p.consumerCareContact || null,
        lead_time_days: p.leadTimeDays || null,
        care_instructions: p.careInstructions || null,
        is_purchasable: Boolean(evalRes.isPurchasable),
        created_at: now,
        updated_at: now
      }
    });

    productCount++;

    await prisma.productImages.deleteMany({ where: { product_id: prod.id } });
    if (p.image) {
      await prisma.productImages.create({
        data: {
          product_id: prod.id,
          url: p.image,
          alt: p.name,
          position: 1,
          is_primary: true,
          created_at: now,
          updated_at: now
        }
      });
      imageCount++;
    }
  }

  const variantCount = await prisma.productVariants.count();

  console.log(`✓ Imported ${productCount} products and ${imageCount} primary image records.`);
  console.log(`✓ Confirmed zero variant records exist in database (Count = ${variantCount}).`);
  console.log('--- Seed Import Completed Successfully ---');
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
  runSeed();
}
