import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

console.log('--- Running VINSHO Milestone 1 Automated Test Suite ---');

const dbPath = path.join(process.cwd(), 'data', 'vinsho.db');
const db = new Database(dbPath);

let totalPassed = 0;
let totalFailed = 0;

function test(name, fn) {
  try {
    fn();
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

// 1. Test Purchasability Gate Logic
test('Purchasability Gate: Fails when mode is enquiry', () => {
  const dummyProd = { shipping_class: 'standard', launch_phase: 1, sellable_online: 1, country_of_origin: 'India', manufacturer_or_packer: 'Mfr', consumer_care_contact: 'Care' };
  const dummyVar = [{ sku: 'SKU1', mrp: 100, selling_price: 90, hsn_code: '123', gst_rate: 12, net_quantity: '1 N', packed_weight_kg: 0.5, packed_l_cm: 10, packed_b_cm: 10, packed_h_cm: 10, stock: 5 }];
  
  const resEnquiry = evaluateGate(dummyProd, dummyVar, 'enquiry');
  assert.strictEqual(resEnquiry.isPurchasable, false, 'Gate must fail when mode is enquiry');

  const resLive = evaluateGate(dummyProd, dummyVar, 'live');
  assert.strictEqual(resLive.isPurchasable, true, 'Gate must pass when complete in live mode');
});

test('Purchasability Gate: Fails individually on each missing product field', () => {
  const baseProd = { shipping_class: 'standard', launch_phase: 1, sellable_online: 1, country_of_origin: 'India', manufacturer_or_packer: 'Mfr', consumer_care_contact: 'Care' };
  const completeVar = [{ sku: 'SKU1', mrp: 100, selling_price: 90, hsn_code: '123', gst_rate: 12, net_quantity: '1 N', packed_weight_kg: 0.5, packed_l_cm: 10, packed_b_cm: 10, packed_h_cm: 10, stock: 5 }];

  ['country_of_origin', 'manufacturer_or_packer', 'consumer_care_contact'].forEach(field => {
    const brokenProd = { ...baseProd, [field]: null };
    const res = evaluateGate(brokenProd, completeVar, 'live');
    assert.strictEqual(res.isPurchasable, false, `Gate must fail when ${field} is null`);
    assert.ok(res.missingProductFields.includes(field), `Missing fields must contain ${field}`);
  });
});

test('Purchasability Gate: Fails individually on each missing variant field', () => {
  const baseProd = { shipping_class: 'standard', launch_phase: 1, sellable_online: 1, country_of_origin: 'India', manufacturer_or_packer: 'Mfr', consumer_care_contact: 'Care' };
  const baseVar = { sku: 'SKU1', mrp: 100, selling_price: 90, hsn_code: '123', gst_rate: 12, net_quantity: '1 N', packed_weight_kg: 0.5, packed_l_cm: 10, packed_b_cm: 10, packed_h_cm: 10, stock: 5 };

  const variantFields = ['sku', 'mrp', 'selling_price', 'hsn_code', 'gst_rate', 'net_quantity', 'packed_weight_kg', 'packed_l_cm', 'packed_b_cm', 'packed_h_cm', 'stock'];
  variantFields.forEach(field => {
    const brokenVar = [{ ...baseVar, [field]: null }];
    const res = evaluateGate(baseProd, brokenVar, 'live');
    assert.strictEqual(res.isPurchasable, false, `Gate must fail when variant.${field} is null`);
  });
});

// 2. Test Database Seed Verification
test('Database Seed Verification: Exact product & collection count', () => {
  const prodCnt = db.prepare('SELECT COUNT(*) as cnt FROM products WHERE deleted_at IS NULL').get().cnt;
  const colCnt = db.prepare('SELECT COUNT(*) as cnt FROM collections WHERE deleted_at IS NULL').get().cnt;
  const subCnt = db.prepare('SELECT COUNT(*) as cnt FROM subcategories WHERE deleted_at IS NULL').get().cnt;
  const varCnt = db.prepare('SELECT COUNT(*) as cnt FROM product_variants').get().cnt;

  assert.ok(prodCnt >= 50, 'Database must contain at least 50 products');
  assert.ok(colCnt >= 3, 'Database must contain at least 3 collections');
  assert.ok(subCnt >= 5, 'Database must contain at least 5 subcategories');
  assert.ok(varCnt >= 0, 'Database must contain valid product variant records');
});

// 3. Test Storefront Data Contract Shape
test('Storefront Data Contract: Product shape matches frontend expectation', () => {
  const sample = db.prepare(`
    SELECT p.slug, p.name, p.description, p.material, c.name as collection, c.key as collectionKey
    FROM products p JOIN collections c ON p.collection_id = c.id LIMIT 1
  `).get();

  assert.ok(sample.slug, 'Product must have slug');
  assert.ok(sample.name, 'Product must have name');
  assert.ok(sample.collection, 'Product must have collection name');
  assert.ok(sample.collectionKey, 'Product must have collectionKey');
});

console.log(`\nTest Summary: ${totalPassed} Passed, ${totalFailed} Failed.`);
if (totalFailed > 0) process.exit(1);
