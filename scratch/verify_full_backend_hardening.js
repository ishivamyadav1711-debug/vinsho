import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';

console.log('=== FULL BACKEND SECURITY & FUNCTIONALITY HARDENING SUITE ===\n');

const dbPath = path.resolve('data/vinsho.db');
const db = new Database(dbPath);

let passedCount = 0;
let failedCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(` ✓ ${message}`);
    passedCount++;
  } else {
    console.error(` ✗ FAILED: ${message}`);
    failedCount++;
  }
}

async function runHardeningTests() {
  // TEST 1: Price Manipulation Protection
  console.log('TEST 1: Price Manipulation Protection (Client sends price = ₹1)');
  const sessionToken1 = `test_price_manip_${Date.now()}`;
  const giftingProd = db.prepare(`
    SELECT v.id as variant_id, p.slug, p.name, v.selling_price
    FROM product_variants v
    JOIN products p ON v.product_id = p.id
    JOIN collections c ON p.collection_id = c.id
    WHERE c.key LIKE '%gifting%' AND p.is_purchasable = 1
    LIMIT 1
  `).get();

  // Add to cart with client price = 1
  const addRes1 = await fetch('http://localhost:4321/api/cart', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionToken: sessionToken1,
      variantId: giftingProd.variant_id,
      slug: giftingProd.slug,
      qty: 2,
      price: 1 // Malicious client price
    })
  });
  const addData1 = await addRes1.json();
  const serverCartPrice = addData1.items[0].sellingPrice;
  assert(serverCartPrice === giftingProd.selling_price, `Server ignored client price ₹1 and used real DB price ₹${giftingProd.selling_price}`);

  // Submit checkout and check order subtotal calculation
  const checkoutPayload1 = {
    sessionToken: sessionToken1,
    name: 'Security Tester',
    phone: '9876543210',
    email: 'tester@example.com',
    line1: '123 Security Way',
    city: 'Greater Noida',
    state: 'Uttar Pradesh',
    pincode: '201310',
    country: 'India',
    idempotencyKey: `idemp_sec_${Date.now()}`
  };

  const checkoutRes1 = await fetch('http://localhost:4321/api/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(checkoutPayload1)
  });
  const checkoutData1 = await checkoutRes1.json();
  const dbOrder1 = db.prepare('SELECT * FROM orders WHERE order_number = ?').get(checkoutData1.orderNumber);
  const expectedSubtotal = giftingProd.selling_price * 2;
  assert(dbOrder1.subtotal === expectedSubtotal, `Server-calculated subtotal ₹${dbOrder1.subtotal} matches DB price calculation (₹${expectedSubtotal})`);

  // TEST 2: Quantity Validation Protection
  console.log('\nTEST 2: Quantity Validation Protection');
  const sessionToken2 = `test_qty_${Date.now()}`;
  
  const negQtyRes = await fetch('http://localhost:4321/api/cart', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionToken: sessionToken2, variantId: giftingProd.variant_id, qty: -5 })
  });
  assert(negQtyRes.status === 400, 'Negative quantity request (-5) rejected with 400 Bad Request');

  const zeroQtyRes = await fetch('http://localhost:4321/api/cart', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionToken: sessionToken2, variantId: giftingProd.variant_id, qty: 0 })
  });
  assert(zeroQtyRes.status === 400, 'Zero quantity request (0) rejected with 400 Bad Request');

  const hugeQtyRes = await fetch('http://localhost:4321/api/cart', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionToken: sessionToken2, variantId: giftingProd.variant_id, qty: 999999 })
  });
  assert(hugeQtyRes.status === 400, 'Excessive quantity request (999999) rejected with 400 Bad Request');

  // TEST 3: Store-Only Direct Checkout Protection
  console.log('\nTEST 3: Store-Only Direct API Checkout Protection');
  const storeProd = db.prepare(`
    SELECT v.id as variant_id, p.slug, p.name
    FROM product_variants v
    JOIN products p ON v.product_id = p.id
    JOIN collections c ON p.collection_id = c.id
    WHERE c.key NOT LIKE '%gifting%' AND p.is_purchasable = 0
    LIMIT 1
  `).get();

  const sessionToken3 = `test_store_bypass_${Date.now()}`;
  // Manually force item into db cart_items table bypassing API
  const cartRes = db.prepare(`
    INSERT INTO carts (session_token, status, expires_at, created_at, updated_at)
    VALUES (?, 'ACTIVE', datetime('now', '+30 days'), datetime('now'), datetime('now'))
  `).run(sessionToken3);
  db.prepare(`
    INSERT INTO cart_items (cart_id, variant_id, qty, unit_price_snapshot, created_at)
    VALUES (?, ?, 1, 499, datetime('now'))
  `).run(cartRes.lastInsertRowid, storeProd.variant_id);

  const bypassRes = await fetch('http://localhost:4321/api/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionToken: sessionToken3,
      name: 'Bypass Attacker',
      phone: '9876543210',
      email: 'attacker@example.com',
      line1: '123 Bypass St',
      city: 'Greater Noida',
      state: 'Uttar Pradesh',
      pincode: '201310',
      country: 'India',
      idempotencyKey: `idemp_bypass_${Date.now()}`
    })
  });
  const bypassData = await bypassRes.json();
  const errStr = String(bypassData.error || bypassData.message || '');
  assert(bypassRes.status === 400 && (errStr.includes('fails Legal Metrology') || errStr.includes('Store-Only') || errStr.includes('cannot be purchased') || errStr.includes('quote-only')), 'Direct API checkout for Store-Only product blocked with 400 Bad Request');

  // TEST 4: Price Snapshot Verification in Database Order Items
  console.log('\nTEST 4: Price Snapshot Verification in Database Order Items');
  const dbOrderItem = db.prepare('SELECT * FROM order_items WHERE order_id = ?').get(dbOrder1.id);
  assert(dbOrderItem.unit_price_snapshot === giftingProd.selling_price, `Order item snapshotted unit price (₹${dbOrderItem.unit_price_snapshot}) matches selling price at purchase time`);
  assert(Boolean(dbOrderItem.product_name_snapshot), `Order item snapshotted product name exists: "${dbOrderItem.product_name_snapshot}"`);

  // TEST 5: Idempotency Protection
  console.log('\nTEST 5: Idempotency Double-Submit Protection');
  const idempRes = await fetch('http://localhost:4321/api/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(checkoutPayload1)
  });
  const idempData = await idempRes.json();
  const totalOrdersWithKey = db.prepare('SELECT COUNT(*) as cnt FROM orders WHERE idempotency_key = ?').get(checkoutPayload1.idempotencyKey).cnt;
  assert(idempData.orderNumber === checkoutData1.orderNumber, 'Re-submitting checkout payload returned identical order number');
  assert(totalOrdersWithKey === 1, 'Exactly 1 order record exists in database for idempotency key');

  // TEST 6: Checkout Form Field Validation Protection
  console.log('\nTEST 6: Checkout Form Field Validation Protection');
  const badPhoneRes = await fetch('http://localhost:4321/api/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...checkoutPayload1, phone: '123', idempotencyKey: `bad_phone_${Date.now()}` })
  });
  assert(badPhoneRes.status === 400, 'Invalid phone number ("123") rejected with 400 Bad Request');

  const badPinRes = await fetch('http://localhost:4321/api/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...checkoutPayload1, pincode: '999', idempotencyKey: `bad_pin_${Date.now()}` })
  });
  assert(badPinRes.status === 400, 'Invalid PIN code ("999") rejected with 400 Bad Request');

  // TEST 7: Cart Ownership & Session Token Isolation
  console.log('\nTEST 7: Cart Ownership & Session Token Isolation');
  const cartA = await (await fetch(`http://localhost:4321/api/cart?sessionToken=${sessionToken1}`)).json();
  const cartB = await (await fetch(`http://localhost:4321/api/cart?sessionToken=session_user_B_${Date.now()}`)).json();
  assert(cartA.items.length > 0 && cartB.items.length === 0, 'Session tokens isolate user carts correctly');

  console.log(`\n===============================================================`);
  console.log(`SUMMARY: ${passedCount} PASSED | ${failedCount} FAILED`);
  console.log(`===============================================================`);

  if (failedCount > 0) {
    process.exit(1);
  }
}

runHardeningTests();
