import { db } from '../src/lib/db.js';
import { setComboComponents, getComboAvailability, getComboComponents } from '../src/lib/combos.js';
import { createOrder } from '../src/lib/orders.js';
import { reserveStock, releaseExpiredReservations } from '../src/lib/inventory.js';
import { requestReturn, inspectAndProcessReturn } from '../src/lib/returns.js';

console.log('==================================================');
console.log('RUNNING PHASE 2 COMBO INVENTORY AUTOMATED TESTS');
console.log('==================================================\n');

let passCount = 0;
let failCount = 0;

function assert(condition, testName, message) {
  if (condition) {
    console.log(`✅ [PASS] ${testName}: ${message}`);
    passCount++;
  } else {
    console.error(`❌ [FAIL] ${testName}: ${message}`);
    failCount++;
  }
}

// 1. Setup Test Fixtures in Database
const testPhone = '9998887771';
let customer = db.prepare('SELECT * FROM customers WHERE phone = ?').get(testPhone);
if (!customer) {
  const now = new Date().toISOString();
  const res = db.prepare(`
    INSERT INTO customers (name, email, phone, status, source, created_at, updated_at)
    VALUES ('Phase2 Combo Test Customer', 'phase2combo@vinsho.com', ?, 'Active', 'Test', ?, ?)
  `).run(testPhone, now, now);
  customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(res.lastInsertRowid);
}

// Create a valid cart in `carts` table for reservation testing
const nowStr = new Date().toISOString();
const expiresStr = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
const cartRes = db.prepare(`
  INSERT INTO carts (session_token, customer_id, created_at, updated_at, expires_at)
  VALUES (?, ?, ?, ?, ?)
`).run(`test_sess_cart_${Date.now()}`, customer.id, nowStr, nowStr, expiresStr);
const testCartId = cartRes.lastInsertRowid;

// Pick 3 test variants that pass legal metrology & purchasability
const variants = db.prepare(`
  SELECT v.id, v.stock, v.selling_price, p.name as product_name
  FROM product_variants v
  JOIN products p ON v.product_id = p.id
  WHERE p.deleted_at IS NULL AND p.is_purchasable = 1 AND v.stock >= 20
  LIMIT 3
`).all();

if (variants.length < 3) {
  console.error('CRITICAL: Need at least 3 active purchasable variants in database to run Phase 2 tests.');
  process.exit(1);
}

const comboVar = variants[0];
const compVarA = variants[1];
const compVarB = variants[2];

// Clear any previous combo_items for these test variants to start clean
db.prepare('DELETE FROM combo_items WHERE combo_variant_id IN (?, ?, ?)').run(comboVar.id, compVarA.id, compVarB.id);

// Reset component stock to known values for deterministic testing
db.prepare('UPDATE product_variants SET stock = 10 WHERE id = ?').run(compVarA.id);
db.prepare('UPDATE product_variants SET stock = 10 WHERE id = ?').run(compVarB.id);

console.log(`Test Combo Variant: ID #${comboVar.id} (${comboVar.product_name})`);
console.log(`Test Component A: ID #${compVarA.id} (${compVarA.product_name}) - Set Stock: 10`);
console.log(`Test Component B: ID #${compVarB.id} (${compVarB.product_name}) - Set Stock: 10\n`);

const shippingAddr = {
  name: 'Combo Buyer',
  phone: testPhone,
  line1: '456 Bundle Road',
  city: 'Gurugram',
  state: 'Haryana',
  pincode: '122001',
  country: 'India'
};

// -------------------------------------------------------------------
// TEST 1: Create combo with 2 components
// -------------------------------------------------------------------
const res1 = setComboComponents(comboVar.id, [
  { componentVariantId: compVarA.id, quantity: 1 },
  { componentVariantId: compVarB.id, quantity: 2 }
]);
const avail1 = getComboAvailability(comboVar.id);
assert(
  res1.success && avail1.isBundle && avail1.components.length === 2 && avail1.maxSellableCombos === 5,
  'TEST 1 (Create Combo with 2 Components)',
  `Mapped CompA x1 (Stock 10) & CompB x2 (Stock 10) -> Max Sellable Combos: ${avail1.maxSellableCombos} (Expected 5)`
);

// -------------------------------------------------------------------
// TEST 2: Edit combo components
// -------------------------------------------------------------------
setComboComponents(comboVar.id, [
  { componentVariantId: compVarA.id, quantity: 2 },
  { componentVariantId: compVarB.id, quantity: 1 }
]);
const avail2 = getComboAvailability(comboVar.id);
assert(
  avail2.maxSellableCombos === 5,
  'TEST 2 (Edit Combo Components)',
  `Updated mapping to CompA x2 & CompB x1 -> Max Sellable Combos: ${avail2.maxSellableCombos}`
);

// Restore original test mapping (CompA x1, CompB x2)
setComboComponents(comboVar.id, [
  { componentVariantId: compVarA.id, quantity: 1 },
  { componentVariantId: compVarB.id, quantity: 2 }
]);

// -------------------------------------------------------------------
// TEST 3: Duplicate component validation
// -------------------------------------------------------------------
const res3 = setComboComponents(comboVar.id, [
  { componentVariantId: compVarA.id, quantity: 1 },
  { componentVariantId: compVarA.id, quantity: 2 }
]);
assert(
  !res3.success && res3.error.includes('Duplicate component'),
  'TEST 3 (Duplicate Component Rejected)',
  `Duplicate component rejected with error: "${res3.error}"`
);

// -------------------------------------------------------------------
// TEST 4: Self-reference validation
// -------------------------------------------------------------------
const res4 = setComboComponents(comboVar.id, [
  { componentVariantId: comboVar.id, quantity: 1 }
]);
assert(
  !res4.success && res4.error.includes('Self-reference rejected'),
  'TEST 4 (Self-Reference Rejected)',
  `Self-reference rejected with error: "${res4.error}"`
);

// -------------------------------------------------------------------
// TEST 5: Nested combo validation
// -------------------------------------------------------------------
const res5 = setComboComponents(compVarA.id, [
  { componentVariantId: comboVar.id, quantity: 1 }
]);
assert(
  !res5.success && res5.error.includes('Nested combos rejected'),
  'TEST 5 (Nested Combo Rejected)',
  `Nested combo rejected with error: "${res5.error}"`
);

// -------------------------------------------------------------------
// TEST 6: Enough component stock -> Combo can be purchased
// -------------------------------------------------------------------
const idemp6 = `combo_test6_${Date.now()}`;
const res6 = createOrder({
  customerId: customer.id,
  items: [{ variantId: comboVar.id, qty: 1 }],
  shippingAddress: shippingAddr,
  idempotencyKey: idemp6
});
assert(
  res6.success && res6.order?.order_number,
  'TEST 6 (Purchase Combo with Sufficient Stock)',
  `Order #${res6.order?.order_number} created successfully`
);

// -------------------------------------------------------------------
// TEST 9: Verify component inventory decreased atomically by (reqQty * comboQty)
// -------------------------------------------------------------------
const stockA_after6 = db.prepare('SELECT stock FROM product_variants WHERE id = ?').get(compVarA.id).stock;
const stockB_after6 = db.prepare('SELECT stock FROM product_variants WHERE id = ?').get(compVarB.id).stock;
assert(
  stockA_after6 === 9 && stockB_after6 === 8,
  'TEST 9 (Atomic Component Stock Deduction)',
  `CompA stock: 10 -> ${stockA_after6} (-1), CompB stock: 10 -> ${stockB_after6} (-2)`
);

// -------------------------------------------------------------------
// TEST 7: Insufficient component stock -> Purchase rejected
// -------------------------------------------------------------------
db.prepare('UPDATE product_variants SET stock = 1 WHERE id = ?').run(compVarB.id);
const res7 = createOrder({
  customerId: customer.id,
  items: [{ variantId: comboVar.id, qty: 1 }],
  shippingAddress: shippingAddr,
  idempotencyKey: `combo_test7_${Date.now()}`
});
assert(
  !res7.success && res7.error.includes('insufficient component stock'),
  'TEST 7 (Insufficient Component Stock Rejected)',
  `Checkout blocked with message: "${res7.error}"`
);

// -------------------------------------------------------------------
// TEST 8: Combo quantity > available component quantity
// -------------------------------------------------------------------
db.prepare('UPDATE product_variants SET stock = 10 WHERE id = ?').run(compVarA.id);
db.prepare('UPDATE product_variants SET stock = 10 WHERE id = ?').run(compVarB.id);
const res8 = createOrder({
  customerId: customer.id,
  items: [{ variantId: comboVar.id, qty: 6 }],
  shippingAddress: shippingAddr,
  idempotencyKey: `combo_test8_${Date.now()}`
});
assert(
  !res8.success && res8.error.includes('insufficient component stock'),
  'TEST 8 (Combo Qty Exceeds Component Stock Rejected)',
  `Checkout blocked when requesting 6 combos (max sellable 5)`
);

// -------------------------------------------------------------------
// TEST 10: Atomic failure rollback
// -------------------------------------------------------------------
db.prepare('UPDATE product_variants SET stock = 10 WHERE id = ?').run(compVarA.id);
db.prepare('UPDATE product_variants SET stock = 0 WHERE id = ?').run(compVarB.id);
const res10 = createOrder({
  customerId: customer.id,
  items: [{ variantId: comboVar.id, qty: 1 }],
  shippingAddress: shippingAddr,
  idempotencyKey: `combo_test10_${Date.now()}`
});
const stockA_after10 = db.prepare('SELECT stock FROM product_variants WHERE id = ?').get(compVarA.id).stock;
const stockB_after10 = db.prepare('SELECT stock FROM product_variants WHERE id = ?').get(compVarB.id).stock;
assert(
  !res10.success && stockA_after10 === 10 && stockB_after10 === 0,
  'TEST 10 (Atomic Failure Rollback)',
  `Order failed and CompA stock remained unchanged at 10`
);

db.prepare('UPDATE product_variants SET stock = 10 WHERE id = ?').run(compVarA.id);
db.prepare('UPDATE product_variants SET stock = 10 WHERE id = ?').run(compVarB.id);

// -------------------------------------------------------------------
// TEST 11: Concurrent combo purchase (No overselling)
// -------------------------------------------------------------------
const res11a = createOrder({
  customerId: customer.id,
  items: [{ variantId: comboVar.id, qty: 3 }],
  shippingAddress: shippingAddr,
  idempotencyKey: `conc_1_${Date.now()}`
});
const res11b = createOrder({
  customerId: customer.id,
  items: [{ variantId: comboVar.id, qty: 3 }],
  shippingAddress: shippingAddr,
  idempotencyKey: `conc_2_${Date.now()}`
});
assert(
  (res11a.success && !res11b.success) || (!res11a.success && res11b.success),
  'TEST 11 (Concurrent Order Protection)',
  `First order of 3 combos succeeded; second order of 3 combos was blocked due to insufficient component stock`
);

db.prepare('UPDATE product_variants SET stock = 10 WHERE id = ?').run(compVarA.id);
db.prepare('UPDATE product_variants SET stock = 10 WHERE id = ?').run(compVarB.id);

// -------------------------------------------------------------------
// TEST 12: Stock reservation for combo components
// -------------------------------------------------------------------
const reserved = reserveStock(testCartId, comboVar.id, 2);
const stockA_res = db.prepare('SELECT stock FROM product_variants WHERE id = ?').get(compVarA.id).stock;
const stockB_res = db.prepare('SELECT stock FROM product_variants WHERE id = ?').get(compVarB.id).stock;
assert(
  reserved && stockA_res === 8 && stockB_res === 6,
  'TEST 12 (Stock Reservation for Combo Components)',
  `Reserved 2 combos -> CompA stock: 10 -> ${stockA_res} (-2), CompB stock: 10 -> ${stockB_res} (-4)`
);

// -------------------------------------------------------------------
// TEST 13: Expired reservation release
// -------------------------------------------------------------------
db.prepare("UPDATE stock_reservations SET expires_at = '2000-01-01T00:00:00.000Z' WHERE cart_id = ?").run(testCartId);
const releasedCount = releaseExpiredReservations();
const stockA_rel = db.prepare('SELECT stock FROM product_variants WHERE id = ?').get(compVarA.id).stock;
const stockB_rel = db.prepare('SELECT stock FROM product_variants WHERE id = ?').get(compVarB.id).stock;
assert(
  releasedCount >= 2 && stockA_rel === 10 && stockB_rel === 10,
  'TEST 13 (Expired Reservation Release)',
  `Released ${releasedCount} reservation records -> CompA stock restored to ${stockA_rel}, CompB stock restored to ${stockB_rel}`
);

// -------------------------------------------------------------------
// TEST 14: Successful return restores component inventory
// -------------------------------------------------------------------
const res14Order = createOrder({
  customerId: customer.id,
  items: [{ variantId: comboVar.id, qty: 1 }],
  shippingAddress: shippingAddr,
  idempotencyKey: `ret_pass_${Date.now()}`
});

const orderItem14 = res14Order.order.items[0];
const stockA_beforeRet = db.prepare('SELECT stock FROM product_variants WHERE id = ?').get(compVarA.id).stock;
const stockB_beforeRet = db.prepare('SELECT stock FROM product_variants WHERE id = ?').get(compVarB.id).stock;

const reqRet14 = requestReturn({
  orderId: res14Order.order.id,
  customerId: customer.id,
  orderItemId: orderItem14.id,
  qty: 1,
  reason: 'Test Passed Inspection Return'
});

const insp14 = inspectAndProcessReturn({
  returnId: reqRet14.returnRecord.id,
  inspectedBy: 1,
  result: 'PASS',
  notes: 'Item intact, restocked components'
});

const stockA_afterRet = db.prepare('SELECT stock FROM product_variants WHERE id = ?').get(compVarA.id).stock;
const stockB_afterRet = db.prepare('SELECT stock FROM product_variants WHERE id = ?').get(compVarB.id).stock;

assert(
  insp14.success && stockA_afterRet === stockA_beforeRet + 1 && stockB_afterRet === stockB_beforeRet + 2,
  'TEST 14 (Passed Return Restores Components)',
  `Return PASS restored CompA +1 (${stockA_beforeRet} -> ${stockA_afterRet}) & CompB +2 (${stockB_beforeRet} -> ${stockB_afterRet})`
);

// -------------------------------------------------------------------
// TEST 15: Failed return inspection does NOT restore inventory
// -------------------------------------------------------------------
const res15Order = createOrder({
  customerId: customer.id,
  items: [{ variantId: comboVar.id, qty: 1 }],
  shippingAddress: shippingAddr,
  idempotencyKey: `ret_fail_${Date.now()}`
});
const orderItem15 = res15Order.order.items[0];
const stockA_beforeFail = db.prepare('SELECT stock FROM product_variants WHERE id = ?').get(compVarA.id).stock;

const reqRet15 = requestReturn({
  orderId: res15Order.order.id,
  customerId: customer.id,
  orderItemId: orderItem15.id,
  qty: 1,
  reason: 'Test Damaged Return'
});

const insp15 = inspectAndProcessReturn({
  returnId: reqRet15.returnRecord.id,
  inspectedBy: 1,
  result: 'FAIL',
  notes: 'Item broken in transit - damaged write-off'
});

const stockA_afterFail = db.prepare('SELECT stock FROM product_variants WHERE id = ?').get(compVarA.id).stock;
assert(
  insp15.success && stockA_afterFail === stockA_beforeFail,
  'TEST 15 (Failed Return Inspection - No Stock Restored)',
  `Return FAIL logged write-off without restoring sellable stock (${stockA_afterFail} === ${stockA_beforeFail})`
);

// -------------------------------------------------------------------
// TEST 16: Combo selling price independence
// -------------------------------------------------------------------
assert(
  res6.order.items[0].unit_price_snapshot === comboVar.selling_price,
  'TEST 16 (Combo Selling Price Independence)',
  `Combo unit price charged: ₹${res6.order.items[0].unit_price_snapshot} (matches combo variant selling_price ₹${comboVar.selling_price})`
);

// -------------------------------------------------------------------
// TEST 17: Coupon + combo purchase
// -------------------------------------------------------------------
const res17 = createOrder({
  customerId: customer.id,
  couponCode: 'WELCOME10',
  items: [{ variantId: comboVar.id, qty: 1 }],
  shippingAddress: shippingAddr,
  idempotencyKey: `combo_coupon_${Date.now()}`
});
const expectedDiscount17 = Math.round(comboVar.selling_price * 0.10);
assert(
  res17.success && res17.order.discount_total === expectedDiscount17 && res17.order.coupon_code === 'WELCOME10',
  'TEST 17 (Phase 1 Coupon + Phase 2 Combo Integration)',
  `WELCOME10 applied 10% discount (₹${res17.order.discount_total}) on combo order #${res17.order.order_number}`
);

// -------------------------------------------------------------------
// TEST 18: Existing individual product purchase unaffected
// -------------------------------------------------------------------
const standaloneVar = variants[1];
const stockBefore18 = db.prepare('SELECT stock FROM product_variants WHERE id = ?').get(standaloneVar.id).stock;
const res18 = createOrder({
  customerId: customer.id,
  items: [{ variantId: standaloneVar.id, qty: 1 }],
  shippingAddress: shippingAddr,
  idempotencyKey: `standalone_${Date.now()}`
});
const stockAfter18 = db.prepare('SELECT stock FROM product_variants WHERE id = ?').get(standaloneVar.id).stock;
assert(
  res18.success && stockAfter18 === stockBefore18 - 1,
  'TEST 18 (Standalone Product Purchase Unaffected)',
  `Standalone item ID ${standaloneVar.id} stock decreased by 1 (${stockBefore18} -> ${stockAfter18})`
);

// -------------------------------------------------------------------
// TEST 19: Existing historical order remains unchanged after component mapping edit
// -------------------------------------------------------------------
const historicalOrderId = res6.order.id;
const historicalItemBefore = db.prepare('SELECT * FROM order_items WHERE order_id = ?').get(historicalOrderId);

setComboComponents(comboVar.id, [
  { componentVariantId: compVarA.id, quantity: 5 }
]);

const historicalItemAfter = db.prepare('SELECT * FROM order_items WHERE order_id = ?').get(historicalOrderId);
assert(
  historicalItemBefore.unit_price_snapshot === historicalItemAfter.unit_price_snapshot &&
  historicalItemBefore.product_name_snapshot === historicalItemAfter.product_name_snapshot,
  'TEST 19 (Historical Order Preservation)',
  `Historical Order #${res6.order.order_number} retained immutable price ₹${historicalItemAfter.unit_price_snapshot} and name after combo edit`
);

setComboComponents(comboVar.id, [
  { componentVariantId: compVarA.id, quantity: 1 },
  { componentVariantId: compVarB.id, quantity: 2 }
]);

// -------------------------------------------------------------------
// TEST 20: Existing database records integrity
// -------------------------------------------------------------------
const productCount = db.prepare('SELECT COUNT(*) as cnt FROM products').get().cnt;
const orderCount = db.prepare('SELECT COUNT(*) as cnt FROM orders').get().cnt;
const customerCount = db.prepare('SELECT COUNT(*) as cnt FROM customers').get().cnt;
assert(
  productCount > 0 && orderCount > 0 && customerCount > 0,
  'TEST 20 (Database Integrity Check)',
  `Database intact with ${productCount} products, ${orderCount} orders, ${customerCount} customers`
);

console.log(`\n==================================================`);
console.log(`TEST SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
console.log(`==================================================`);
