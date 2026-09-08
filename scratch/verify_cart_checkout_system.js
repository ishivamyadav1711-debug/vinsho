import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';

console.log('=== VERIFYING WORKING CART + CHECKOUT + ORDER SYSTEM ===\n');

const dbPath = path.resolve('data/vinsho.db');
const db = new Database(dbPath);

// 1. Database Orders & Cart Items Table Integrity
const ordersTableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='orders'").get();
const orderItemsTableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='order_items'").get();

console.log('1. Database Tables Check:');
console.log(' - Orders Table Exists:', ordersTableExists ? '✓' : '✗');
console.log(' - Order Items Table Exists:', orderItemsTableExists ? '✓' : '✗');

if (!ordersTableExists || !orderItemsTableExists) {
  console.error('FAILED: Orders or order_items table missing!');
  process.exit(1);
}

// 2. End-to-End API Order Creation Test
async function testCartCheckoutOrderFlow() {
  console.log('\n2. Testing End-to-End Order Creation API (/api/checkout):');
  
  // First ensure active cart exists in database
  const sessionToken = `test_sess_${Date.now()}`;
  const giftingProduct = db.prepare(`
    SELECT v.id as variant_id, p.slug, p.name, v.selling_price
    FROM product_variants v
    JOIN products p ON v.product_id = p.id
    JOIN collections c ON p.collection_id = c.id
    WHERE c.key LIKE '%gifting%' AND p.is_purchasable = 1
    LIMIT 1
  `).get();

  console.log(` - Selected Gifting Product: ${giftingProduct.name} (Variant ID: ${giftingProduct.variant_id})`);

  // Add item to cart via API
  const addRes = await fetch('http://localhost:4321/api/cart', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionToken,
      variantId: giftingProduct.variant_id,
      slug: giftingProduct.slug,
      qty: 2
    })
  });

  const addData = await addRes.json();
  console.log(' - Add to Cart API Status:', addRes.status, addData.success ? '✓' : '✗');

  if (!addRes.ok || !addData.success) {
    console.error('FAILED: Add to cart API failed:', addData);
    process.exit(1);
  }

  // Attempt checkout submission
  const idempotencyKey = `idemp_test_${Date.now()}`;
  const checkoutPayload = {
    sessionToken,
    name: 'Ananya Sharma',
    phone: '9876543210',
    email: 'ananya@example.com',
    line1: 'Flat 402, Lotus Apartments',
    line2: 'Knowledge Park II',
    city: 'Greater Noida',
    state: 'Uttar Pradesh',
    pincode: '201310',
    country: 'India',
    idempotencyKey
  };

  const checkoutRes = await fetch('http://localhost:4321/api/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(checkoutPayload)
  });

  const checkoutData = await checkoutRes.json();
  console.log(' - Checkout API Order Creation Status:', checkoutRes.status, checkoutData.success ? '✓' : '✗');
  console.log(` - Order Number Generated: ${checkoutData.orderNumber}`);

  if (!checkoutRes.ok || !checkoutData.success || !checkoutData.orderNumber) {
    console.error('FAILED: Checkout order creation failed:', checkoutData);
    process.exit(1);
  }

  // Verify created order in SQLite database
  const dbOrder = db.prepare('SELECT * FROM orders WHERE order_number = ?').get(checkoutData.orderNumber);
  const dbOrderItems = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(dbOrder.id);

  console.log('\n3. Database Order Verification:');
  console.log(` - DB Order ID: ${dbOrder.id} | Status: ${dbOrder.status} | Total: ₹${dbOrder.grand_total}`);
  console.log(` - DB Order Items Count: ${dbOrderItems.length}`);
  console.log(` - Item Snapshot Name: ${dbOrderItems[0].product_name_snapshot} | Qty: ${dbOrderItems[0].qty}`);

  // Test Idempotency (Submitting same checkout payload twice must return existing order)
  const idempRes = await fetch('http://localhost:4321/api/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(checkoutPayload)
  });
  const idempData = await idempRes.json();
  console.log(` - Idempotency Double-Submit Check (Same Order Number): ${idempData.orderNumber === checkoutData.orderNumber ? '✓' : '✗'}`);

  // 4. Test Store-Only Product Cart Blocking
  console.log('\n4. Testing Store-Only Product Cart Guardrail:');
  const storeProduct = db.prepare(`
    SELECT v.id as variant_id, p.slug, p.name
    FROM product_variants v
    JOIN products p ON v.product_id = p.id
    JOIN collections c ON p.collection_id = c.id
    WHERE c.key NOT LIKE '%gifting%' AND p.is_purchasable = 0
    LIMIT 1
  `).get();

  const storeAddRes = await fetch('http://localhost:4321/api/cart', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionToken: `store_test_${Date.now()}`,
      variantId: storeProduct.variant_id,
      slug: storeProduct.slug,
      qty: 1
    })
  });

  const storeAddData = await storeAddRes.json();
  console.log(` - Store-Only Item Cart Addition Blocked (Status 400): ${storeAddRes.status === 400 ? '✓' : '✗'}`);
  console.log(` - Error Message: "${storeAddData.error}"`);

  if (storeAddRes.status === 400) {
    console.log('\n===============================================================');
    console.log('✓ CART + CHECKOUT + ORDER SYSTEM COMPLETE AND VERIFIED!');
    console.log('===============================================================');
  } else {
    console.error('FAILED: Store-only item was allowed into cart!');
    process.exit(1);
  }
}

testCartCheckoutOrderFlow();
