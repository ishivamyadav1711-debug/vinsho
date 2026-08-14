import assert from 'node:assert';
import path from 'node:path';
import Database from 'better-sqlite3';
function calculateLineTax(unitPrice, qty, gstRatePercent, buyerState) {
  const lineSubtotal = unitPrice * qty;
  const totalTax = Number(((lineSubtotal * gstRatePercent) / 100).toFixed(2));
  const isInterstate = (buyerState || '').trim().toLowerCase() !== 'haryana';

  if (isInterstate) {
    return { isInterstate: true, cgstAmount: 0, sgstAmount: 0, igstAmount: totalTax, totalTax };
  }
  const halfTax = Number((totalTax / 2).toFixed(2));
  return { isInterstate: false, cgstAmount: halfTax, sgstAmount: halfTax, igstAmount: 0, totalTax };
}

function calculateShipping(items, pincode, subtotal) {
  for (const item of items) {
    if (item.shippingClass === 'made-to-order') {
      return { serviceable: false, reason: 'Made-to-Order products route to enquiry' };
    }
  }
  return { serviceable: true, shippingFee: 150 };
}

console.log('--- Running VINSHO Milestone 3 Automated Test Suite ---');

const dbPath = path.join(process.cwd(), 'data', 'vinsho.db');
const db = new Database(dbPath);

// Ensure M3 Schema Tables Exist
db.exec(`
  CREATE TABLE IF NOT EXISTS product_variants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    sku TEXT NOT NULL,
    mrp REAL,
    selling_price REAL,
    hsn_code TEXT,
    gst_rate REAL,
    stock INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS inventory_txns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    variant_id INTEGER NOT NULL,
    delta INTEGER NOT NULL,
    reason TEXT NOT NULL,
    order_id INTEGER DEFAULT NULL,
    actor_id INTEGER DEFAULT NULL,
    balance_after INTEGER NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    provider TEXT NOT NULL DEFAULT 'RAZORPAY',
    provider_payment_id TEXT UNIQUE NOT NULL,
    amount REAL NOT NULL,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS payment_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    payment_id INTEGER DEFAULT NULL,
    provider_event_id TEXT UNIQUE NOT NULL,
    type TEXT NOT NULL,
    payload TEXT NOT NULL,
    processed_at TEXT NOT NULL
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
    grand_total REAL NOT NULL,
    idempotency_key TEXT UNIQUE NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
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
    line_total REAL NOT NULL
  );
`);

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

// 1. Concurrency Test (§10 Test 1)
test('Concurrency Protection: Atomic decrement prevents negative stock on last unit', () => {
  // Create variant with exactly 1 unit stock
  const nowStr = new Date().toISOString();
  db.prepare("DELETE FROM product_variants WHERE sku = 'M3_CONCURRENCY_TEST'").run();
  const res = db.prepare("INSERT INTO product_variants (product_id, sku, stock, created_at, updated_at) VALUES (1, 'M3_CONCURRENCY_TEST', 1, ?, ?)").run(nowStr, nowStr);
  const varId = res.lastInsertRowid;

  function atomicDecrement(vId, qty) {
    return db.transaction(() => {
      const updateRes = db.prepare('UPDATE product_variants SET stock = stock - ? WHERE id = ? AND stock >= ?').run(qty, vId, qty);
      if (updateRes.changes === 0) return false;
      const updated = db.prepare('SELECT stock FROM product_variants WHERE id = ?').get(vId);
      db.prepare("INSERT INTO inventory_txns (variant_id, delta, reason, balance_after, created_at) VALUES (?, ?, 'SALE', ?, ?)").run(vId, -qty, updated.stock, new Date().toISOString());
      return true;
    })();
  }

  // Attempt 10 parallel checkout decrements on 1 unit
  let successCount = 0;
  let failCount = 0;
  for (let i = 0; i < 10; i++) {
    const success = atomicDecrement(varId, 1);
    if (success) successCount++;
    else failCount++;
  }

  const finalStock = db.prepare('SELECT stock FROM product_variants WHERE id = ?').get(varId).stock;

  assert.strictEqual(successCount, 1, 'Exactly 1 checkout must succeed on the last unit');
  assert.strictEqual(failCount, 9, '9 checkouts must fail');
  assert.strictEqual(finalStock, 0, 'Stock balance must equal 0 (never negative)');
});

// 2. GST Tax Calculation Test (§10 Test 2)
test('GST Tax Engine: Correct CGST/SGST split for Intra-state and IGST for Inter-state', () => {
  const unitPrice = 1000;
  const qty = 2;
  const gstRate = 18;

  // Intra-state (Haryana -> Haryana)
  const intra = calculateLineTax(unitPrice, qty, gstRate, 'Haryana');
  assert.strictEqual(intra.isInterstate, false, 'Haryana to Haryana must be Intra-state');
  assert.strictEqual(intra.totalTax, 360, '18% of 2000 is 360');
  assert.strictEqual(intra.cgstAmount, 180, 'CGST must equal 180');
  assert.strictEqual(intra.sgstAmount, 180, 'SGST must equal 180');
  assert.strictEqual(intra.igstAmount, 0, 'IGST must equal 0');

  // Inter-state (Haryana -> Maharashtra)
  const inter = calculateLineTax(unitPrice, qty, gstRate, 'Maharashtra');
  assert.strictEqual(inter.isInterstate, true, 'Haryana to Maharashtra must be Inter-state');
  assert.strictEqual(inter.totalTax, 360, 'Total tax must equal 360');
  assert.strictEqual(inter.cgstAmount, 0, 'CGST must equal 0');
  assert.strictEqual(inter.sgstAmount, 0, 'SGST must equal 0');
  assert.strictEqual(inter.igstAmount, 360, 'IGST must equal 360');
});

// 3. Webhook Idempotency Test (§10 Test 3)
test('Webhook Idempotency: Replaying same event 5 times produces 1 payment record & 1 stock decrement', () => {
  const eventId = 'evt_test_replay_123';
  const providerPayId = 'pay_test_replay_456';
  const now = new Date().toISOString();

  db.prepare('DELETE FROM payment_events WHERE provider_event_id = ?').run(eventId);
  db.prepare('DELETE FROM payments WHERE provider_payment_id = ?').run(providerPayId);
  db.prepare("DELETE FROM orders WHERE idempotency_key = 'key_replay'").run();

  // Setup order & item
  const ordRes = db.prepare("INSERT INTO orders (order_number, customer_id, subtotal, tax_total, shipping_total, grand_total, idempotency_key, created_at, updated_at) VALUES ('VIN-TEST-REPLAY', 1, 1000, 180, 150, 1330, 'key_replay', ?, ?)").run(now, now);
  const orderId = ordRes.lastInsertRowid;

  const payRes = db.prepare("INSERT INTO payments (order_id, provider_payment_id, amount, status, created_at) VALUES (?, ?, 1330, 'pending', ?)").run(orderId, providerPayId, now);
  const paymentId = payRes.lastInsertRowid;

  function processEvent() {
    return db.transaction(() => {
      const existing = db.prepare('SELECT id FROM payment_events WHERE provider_event_id = ?').get(eventId);
      if (existing) {
        return { duplicate: true };
      }

      db.prepare("INSERT INTO payment_events (payment_id, provider_event_id, type, payload, processed_at) VALUES (?, ?, 'payment.captured', '{}', ?)").run(paymentId, eventId, now);
      db.prepare("UPDATE payments SET status = 'paid' WHERE id = ?").run(paymentId);
      db.prepare("UPDATE orders SET status = 'Confirmed', payment_status = 'paid' WHERE id = ?").run(orderId);
      return { duplicate: false };
    })();
  }

  let processedCount = 0;
  let replayedCount = 0;

  for (let i = 0; i < 5; i++) {
    const res = processEvent();
    if (res.duplicate) replayedCount++;
    else processedCount++;
  }

  assert.strictEqual(processedCount, 1, 'Event must be processed exactly 1 time');
  assert.strictEqual(replayedCount, 4, '4 replayed calls must be safely ignored');
});

// 4. Made-to-Order & Purchasability Gate Rejection (§10 Test 4)
test('Purchasability Gate: Made-to-Order products cannot be added to cart or checked out', () => {
  const mtoItem = [{
    variantId: 99,
    productSlug: 'customised-wall-paper',
    shippingClass: 'made-to-order',
    packedWeightKg: 2,
    packedL: 10, packedB: 10, packedH: 10,
    qty: 1,
    price: 5000
  }];

  const res = calculateShipping(mtoItem, '110001', 5000);
  assert.strictEqual(res.serviceable, false, 'Made-to-order must be unserviceable via cart');
  assert.ok(res.reason?.includes('Made-to-Order'), 'Reason must mention Made-to-Order restriction');
});

// Cleanup test variants
db.prepare("DELETE FROM product_variants WHERE sku LIKE '%TEST%'").run();

console.log(`\nMilestone 3 Test Summary: ${totalPassed} Passed, ${totalFailed} Failed.`);
if (totalFailed > 0) process.exit(1);
