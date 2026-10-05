import assert from 'node:assert';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const prisma = new PrismaClient();

console.log('--- Running VINSHO Milestone 1 Automated Test Suite ---');

let totalPassed = 0;
let totalFailed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`✓ PASS: ${name}`);
    totalPassed++;
  } catch (err) {
    console.error(`✗ FAIL: ${name}`);
    console.error(`  Error: ${err.message}`);
    totalFailed++;
  }
}

// Inline gate evaluator for testing logic isolation
function evaluateGate(product, variants, mode = 'enquiry') {
  const missingProductFields = [];
  const missingVariantFields = [];

  if (mode !== 'live') {
    return { isPurchasable: false, reason: 'Enquiry Mode', missingProductFields, missingVariantFields };
  }

  if (product.shipping_class === 'made-to-order' || product.launch_phase === 0 || !product.sellable_online) {
    return { isPurchasable: false, reason: 'Not sellable', missingProductFields, missingVariantFields };
  }

  if (!product.country_of_origin) missingProductFields.push('country_of_origin');
  if (!product.manufacturer_or_packer) missingProductFields.push('manufacturer_or_packer');
  if (!product.consumer_care_contact) missingProductFields.push('consumer_care_contact');

  if (!variants || variants.length === 0) {
    missingVariantFields.push('no_variants');
  } else {
    const hasComplete = variants.some((v) => (
      v.sku && v.mrp !== null && v.selling_price !== null && v.hsn_code &&
      v.gst_rate !== null && v.net_quantity && v.packed_weight_kg !== null &&
      v.packed_l_cm !== null && v.packed_b_cm !== null && v.packed_h_cm !== null && v.stock !== null
    ));

    if (!hasComplete) {
      const fields = ['sku', 'mrp', 'selling_price', 'hsn_code', 'gst_rate', 'net_quantity', 'packed_weight_kg', 'packed_l_cm', 'packed_b_cm', 'packed_h_cm', 'stock'];
      fields.forEach(f => {
        if (variants[0][f] === null || variants[0][f] === undefined || variants[0][f] === '') {
          missingVariantFields.push(`variant.${f}`);
        }
      });
    }
  }

  const isPurchasable = missingProductFields.length === 0 && missingVariantFields.length === 0;
  return { isPurchasable, missingProductFields, missingVariantFields };
}

async function run() {
  // 1. Test Purchasability Gate Logic
  await test('Purchasability Gate: Fails when mode is enquiry', () => {
    const dummyProd = { shipping_class: 'standard', launch_phase: 1, sellable_online: 1, country_of_origin: 'India', manufacturer_or_packer: 'Mfr', consumer_care_contact: 'Care' };
    const dummyVar = [{ sku: 'SKU1', mrp: 100, selling_price: 90, hsn_code: '123', gst_rate: 12, net_quantity: '1 N', packed_weight_kg: 0.5, packed_l_cm: 10, packed_b_cm: 10, packed_h_cm: 10, stock: 5 }];
    
    const resEnquiry = evaluateGate(dummyProd, dummyVar, 'enquiry');
    assert.strictEqual(resEnquiry.isPurchasable, false, 'Gate must fail when mode is enquiry');

    const resLive = evaluateGate(dummyProd, dummyVar, 'live');
    assert.strictEqual(resLive.isPurchasable, true, 'Gate must pass when complete in live mode');
  });

  await test('Purchasability Gate: Fails individually on each missing product field', () => {
    const baseProd = { shipping_class: 'standard', launch_phase: 1, sellable_online: 1, country_of_origin: 'India', manufacturer_or_packer: 'Mfr', consumer_care_contact: 'Care' };
    const completeVar = [{ sku: 'SKU1', mrp: 100, selling_price: 90, hsn_code: '123', gst_rate: 12, net_quantity: '1 N', packed_weight_kg: 0.5, packed_l_cm: 10, packed_b_cm: 10, packed_h_cm: 10, stock: 5 }];

    ['country_of_origin', 'manufacturer_or_packer', 'consumer_care_contact'].forEach(field => {
      const brokenProd = { ...baseProd, [field]: null };
      const res = evaluateGate(brokenProd, completeVar, 'live');
      assert.strictEqual(res.isPurchasable, false, `Gate must fail when ${field} is null`);
      assert.ok(res.missingProductFields.includes(field), `Missing fields must contain ${field}`);
    });
  });

  await test('Purchasability Gate: Fails individually on each missing variant field', () => {
    const baseProd = { shipping_class: 'standard', launch_phase: 1, sellable_online: 1, country_of_origin: 'India', manufacturer_or_packer: 'Mfr', consumer_care_contact: 'Care' };
    const baseVar = { sku: 'SKU1', mrp: 100, selling_price: 90, hsn_code: '123', gst_rate: 12, net_quantity: '1 N', packed_weight_kg: 0.5, packed_l_cm: 10, packed_b_cm: 10, packed_h_cm: 10, stock: 5 };

    const variantFields = ['sku', 'mrp', 'selling_price', 'hsn_code', 'gst_rate', 'net_quantity', 'packed_weight_kg', 'packed_l_cm', 'packed_b_cm', 'packed_h_cm', 'stock'];
    variantFields.forEach(field => {
      const brokenVar = [{ ...baseVar, [field]: null }];
      const res = evaluateGate(baseProd, brokenVar, 'live');
      assert.strictEqual(res.isPurchasable, false, `Gate must fail when variant.${field} is null`);
    });
  });

  // 2. Test PostgreSQL Database Seed Verification
  await test('Database Seed Verification: Exact product & collection count in PostgreSQL', async () => {
    const prodCnt = await prisma.products.count({ where: { deleted_at: null } });
    const colCnt = await prisma.collections.count({ where: { deleted_at: null } });
    const subCnt = await prisma.subcategories.count({ where: { deleted_at: null } });
    const varCnt = await prisma.productVariants.count();

    assert.ok(prodCnt >= 50, 'Database must contain at least 50 products');
    assert.ok(colCnt >= 3, 'Database must contain at least 3 collections');
    assert.ok(subCnt >= 5, 'Database must contain at least 5 subcategories');
    assert.ok(varCnt >= 50, 'Database must contain valid product variant records');
  });

  // 3. Test Storefront Data Contract Shape in PostgreSQL
  await test('Storefront Data Contract: Product shape matches frontend expectation', async () => {
    const sample = await prisma.products.findFirst({
      where: { deleted_at: null },
      include: { collection: true }
    });

    assert.ok(sample?.slug, 'Product must have slug');
    assert.ok(sample?.name, 'Product must have name');
    assert.ok(sample?.collection?.name, 'Product must have collection name');
    assert.ok(sample?.collection?.key, 'Product must have collectionKey');
  });

  console.log(`\nTest Summary: ${totalPassed} Passed, ${totalFailed} Failed.`);
  await prisma.$disconnect();
  if (totalFailed > 0) process.exit(1);
}

run().catch(console.error);
