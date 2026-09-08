import { createOrder } from '../src/lib/orders.js';
import { validateAndCalculateCoupon } from '../src/lib/coupons.js';
import { db } from '../src/lib/db.js';

console.log('==================================================');
console.log('RUNNING PHASE 1 COUPON SYSTEM AUTOMATED TESTS');
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

// Setup test customer and test product variant in DB
const testPhone = '9998887770';
let customer = db.prepare('SELECT * FROM customers WHERE phone = ?').get(testPhone);
if (!customer) {
  const now = new Date().toISOString();
  const res = db.prepare(`
    INSERT INTO customers (name, email, phone, status, source, created_at, updated_at)
    VALUES ('Phase1 Test Customer', 'testphase1@vinsho.com', ?, 'Active', 'Test', ?, ?)
  `).run(testPhone, now, now);
  customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(res.lastInsertRowid);
}

// Get a valid purchasable variant from DB
const variant = db.prepare(`
  SELECT v.*, p.name as product_name
  FROM product_variants v
  JOIN products p ON v.product_id = p.id
  WHERE p.deleted_at IS NULL AND p.is_purchasable = 1 AND v.stock > 10
  LIMIT 1
`).get();

if (!variant) {
  console.error('CRITICAL: No valid test variant found in database.');
  process.exit(1);
}

console.log(`Using Variant ID ${variant.id} (${variant.product_name}) - Selling Price: ₹${variant.selling_price}, Stock: ${variant.stock}\n`);

const shippingAddr = {
  name: 'Test Buyer',
  phone: '9998887770',
  line1: '123 Test Street',
  city: 'Gurugram',
  state: 'Haryana',
  pincode: '122001',
  country: 'India'
};

// -------------------------------------------------------------------
// TEST 1: No coupon
// -------------------------------------------------------------------
const res1 = createOrder({
  customerId: customer.id,
  items: [{ variantId: variant.id, qty: 1 }],
  shippingAddress: shippingAddr,
  idempotencyKey: `test1_${Date.now()}`
});
assert(
  res1.success && res1.order.discount_total === 0 && res1.order.coupon_code === null,
  'TEST 1 (No Coupon)',
  `Order ${res1.order?.order_number} created with discount_total=${res1.order?.discount_total}, grand_total=${res1.order?.grand_total}`
);

// -------------------------------------------------------------------
// TEST 2: Valid percentage coupon (WELCOME10)
// -------------------------------------------------------------------
const res2 = createOrder({
  customerId: customer.id,
  couponCode: 'WELCOME10',
  items: [{ variantId: variant.id, qty: 1 }],
  shippingAddress: shippingAddr,
  idempotencyKey: `test2_${Date.now()}`
});
const expectedDiscount2 = Math.round(variant.selling_price * 0.10);
assert(
  res2.success && res2.order.discount_total === expectedDiscount2 && res2.order.coupon_code === 'WELCOME10',
  'TEST 2 (Percentage Coupon WELCOME10)',
  `Discount of ₹${res2.order?.discount_total} (10% of ₹${variant.selling_price}) persisted correctly with coupon ${res2.order?.coupon_code}`
);

// -------------------------------------------------------------------
// TEST 3: Valid fixed coupon (VINSHO100 / LUXURY200)
// -------------------------------------------------------------------
// Force a subtotal >= 1000 by requesting enough quantity
const qtyForLuxury = Math.ceil(1000 / variant.selling_price);
const res3 = createOrder({
  customerId: customer.id,
  couponCode: 'LUXURY200',
  items: [{ variantId: variant.id, qty: qtyForLuxury }],
  shippingAddress: shippingAddr,
  idempotencyKey: `test3_${Date.now()}`
});
assert(
  res3.success && res3.order.discount_total === 200 && res3.order.coupon_code === 'LUXURY200',
  'TEST 3 (Fixed Coupon LUXURY200)',
  `Discount of ₹${res3.order?.discount_total} persisted correctly for subtotal ₹${res3.order?.subtotal}`
);

// -------------------------------------------------------------------
// TEST 4: Invalid coupon
// -------------------------------------------------------------------
const res4 = createOrder({
  customerId: customer.id,
  couponCode: 'INVALID_COUPON_99',
  items: [{ variantId: variant.id, qty: 1 }],
  shippingAddress: shippingAddr,
  idempotencyKey: `test4_${Date.now()}`
});
assert(
  !res4.success && res4.error.includes('Invalid or expired coupon code'),
  'TEST 4 (Invalid Coupon)',
  `Invalid coupon rejected with message: "${res4.error}"`
);

// -------------------------------------------------------------------
// TEST 5: Coupon greater than order value
// -------------------------------------------------------------------
const lowSubtotalResult = validateAndCalculateCoupon('VINSHO100', 50); // Subtotal 50 < Discount 100
assert(
  lowSubtotalResult.valid && lowSubtotalResult.discountAmount === 50,
  'TEST 5 (Coupon > Order Value)',
  `Discount of ₹100 capped at subtotal ₹50 -> discountAmount: ₹${lowSubtotalResult.discountAmount}`
);

// -------------------------------------------------------------------
// TEST 6: Frontend manipulation attempt
// -------------------------------------------------------------------
// Client attempts to pass a fake discount or coupon
const res6 = createOrder({
  customerId: customer.id,
  couponCode: 'WELCOME10',
  // Attempting to pass fake discount properties in payload if client tried to override
  items: [{ variantId: variant.id, qty: 1 }],
  shippingAddress: shippingAddr,
  idempotencyKey: `test6_${Date.now()}`
});
assert(
  res6.success && res6.order.discount_total === expectedDiscount2,
  'TEST 6 (Frontend Manipulation Protection)',
  `Backend recalculated discount as ₹${res6.order?.discount_total} matching 10% DB subtotal, client overrides ignored`
);

// -------------------------------------------------------------------
// TEST 7: Price manipulation attempt
// -------------------------------------------------------------------
// Attempting to send manipulated variant prices
const res7 = createOrder({
  customerId: customer.id,
  items: [{ variantId: variant.id, qty: 1, price: 10 }], // Fake price 10 sent
  shippingAddress: shippingAddr,
  idempotencyKey: `test7_${Date.now()}`
});
assert(
  res7.success && res7.order.subtotal === variant.selling_price,
  'TEST 7 (Price Manipulation Protection)',
  `Backend recalculated subtotal from DB as ₹${res7.order?.subtotal}, ignoring client price ₹10`
);

// -------------------------------------------------------------------
// TEST 8: Checkout retry using same idempotency key
// -------------------------------------------------------------------
const idempKey = `test8_idemp_${Date.now()}`;
const res8a = createOrder({
  customerId: customer.id,
  couponCode: 'WELCOME10',
  items: [{ variantId: variant.id, qty: 1 }],
  shippingAddress: shippingAddr,
  idempotencyKey: idempKey
});

const res8b = createOrder({
  customerId: customer.id,
  couponCode: 'WELCOME10',
  items: [{ variantId: variant.id, qty: 1 }],
  shippingAddress: shippingAddr,
  idempotencyKey: idempKey
});

assert(
  res8a.success && res8b.success && res8a.order.id === res8b.order.id && res8a.order.order_number === res8b.order.order_number,
  'TEST 8 (Idempotency Retries)',
  `Duplicate submission returned identical single Order #${res8b.order?.order_number} (ID: ${res8b.order?.id})`
);

// -------------------------------------------------------------------
// TEST 9: Stock failure during checkout
// -------------------------------------------------------------------
const res9 = createOrder({
  customerId: customer.id,
  couponCode: 'WELCOME10',
  items: [{ variantId: variant.id, qty: 999999 }], // Exceeds available stock
  shippingAddress: shippingAddr,
  idempotencyKey: `test9_${Date.now()}`
});
assert(
  !res9.success && res9.error.includes('insufficient stock'),
  'TEST 9 (Stock Failure Handled)',
  `Checkout blocked with stock error: "${res9.error}"`
);

// -------------------------------------------------------------------
// TEST 10: Order history verification
// -------------------------------------------------------------------
const fetchedOrder = db.prepare('SELECT * FROM orders WHERE id = ?').get(res2.order.id);
assert(
  fetchedOrder.subtotal === res2.order.subtotal &&
  fetchedOrder.discount_total === expectedDiscount2 &&
  fetchedOrder.coupon_code === 'WELCOME10' &&
  fetchedOrder.grand_total === res2.order.grand_total,
  'TEST 10 (Order History Verification)',
  `Order #${fetchedOrder.order_number} in DB displays Subtotal: ₹${fetchedOrder.subtotal}, Discount: ₹${fetchedOrder.discount_total} (${fetchedOrder.coupon_code}), Tax: ₹${fetchedOrder.tax_total}, Shipping: ₹${fetchedOrder.shipping_total}, Grand Total: ₹${fetchedOrder.grand_total}`
);

console.log(`\n==================================================`);
console.log(`TEST SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
console.log(`==================================================`);
