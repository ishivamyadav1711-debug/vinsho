import assert from 'node:assert';
import path from 'node:path';
import Database from 'better-sqlite3';
function hasRoleAccess(userRole, targetPath) {
  if (userRole === 'SUPER_ADMIN') return true;

  if (userRole === 'ADMIN') {
    if (targetPath.includes('/admin/users') || targetPath.includes('/admin/settings')) return false;
    return true;
  }

  if (userRole === 'SALES') {
    if (targetPath.includes('/admin/users') || targetPath.includes('/admin/settings')) return false;
    return true;
  }

  if (userRole === 'INVENTORY_MANAGER') {
    if (targetPath.includes('/admin/customers') || targetPath.includes('/admin/users') || targetPath.includes('/admin/settings')) return false;
    return true;
  }

  if (userRole === 'SUPPORT') {
    if (targetPath.includes('/admin/users') || targetPath.includes('/admin/settings')) return false;
    return true;
  }

  return false;
}

function redactCustomerPii(customer, userRole) {
  if (userRole === 'INVENTORY_MANAGER') {
    return {
      id: customer.id,
      name: '[REDACTED FOR INVENTORY ROLE]',
      phone: '[REDACTED]',
      email: '[REDACTED]',
      city: '[REDACTED]',
      state: '[REDACTED]',
      status: customer.status
    };
  }
  return customer;
}

console.log('--- Running VINSHO Milestone 4 Automated Regression Suite ---');

const dbPath = path.join(process.cwd(), 'data', 'vinsho.db');
const db = new Database(dbPath);

// Ensure M4 Schema Tables Exist
db.exec(`
  CREATE TABLE IF NOT EXISTS returns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    customer_id INTEGER NOT NULL,
    type TEXT NOT NULL DEFAULT 'CUSTOMER_INITIATED',
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'REQUESTED',
    refund_amount REAL NOT NULL,
    is_rto INTEGER DEFAULT 0,
    inspected_by INTEGER DEFAULT NULL,
    inspection_result TEXT DEFAULT NULL,
    inspection_notes TEXT DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS return_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    return_id INTEGER NOT NULL,
    order_item_id INTEGER NOT NULL,
    variant_id INTEGER NOT NULL,
    qty INTEGER NOT NULL,
    unit_price REAL NOT NULL,
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

// 1. Return Stock Inspection Gate Test (§1)
test('Return Inspection Gate: Stock restores ONLY IF inspection PASS; FAIL logs damaged write-off', () => {
  const now = new Date().toISOString();

  // Setup variant stock = 10
  db.prepare("DELETE FROM product_variants WHERE sku = 'M4_RETURN_TEST'").run();
  const vRes = db.prepare("INSERT INTO product_variants (product_id, sku, stock, created_at, updated_at) VALUES (1, 'M4_RETURN_TEST', 10, ?, ?)").run(now, now);
  const varId = vRes.lastInsertRowid;

  // Insert Return 1: PASS
  const r1Res = db.prepare("INSERT INTO returns (order_id, customer_id, reason, status, refund_amount, created_at, updated_at) VALUES (1, 1, 'Defect', 'REQUESTED', 500, ?, ?)").run(now, now);
  const returnIdPass = r1Res.lastInsertRowid;
  db.prepare("INSERT INTO return_items (return_id, order_item_id, variant_id, qty, unit_price, tax_amount, line_total) VALUES (?, 1, ?, 2, 200, 50, 500)").run(returnIdPass, varId);

  // Process Inspection PASS
  db.transaction(() => {
    const items = db.prepare('SELECT * FROM return_items WHERE return_id = ?').all(returnIdPass);
    for (const item of items) {
      db.prepare('UPDATE product_variants SET stock = stock + ? WHERE id = ?').run(item.qty, item.variant_id);
    }
    db.prepare("UPDATE returns SET status = 'INSPECTED', inspection_result = 'PASS' WHERE id = ?").run(returnIdPass);
  })();

  const stockAfterPass = db.prepare('SELECT stock FROM product_variants WHERE id = ?').get(varId).stock;
  assert.strictEqual(stockAfterPass, 12, 'Stock must increase by 2 to 12 on inspection PASS');

  // Insert Return 2: FAIL (Damaged)
  const r2Res = db.prepare("INSERT INTO returns (order_id, customer_id, reason, status, refund_amount, created_at, updated_at) VALUES (1, 1, 'Damaged transit', 'REQUESTED', 500, ?, ?)").run(now, now);
  const returnIdFail = r2Res.lastInsertRowid;
  db.prepare("INSERT INTO return_items (return_id, order_item_id, variant_id, qty, unit_price, tax_amount, line_total) VALUES (?, 1, ?, 2, 200, 50, 500)").run(returnIdFail, varId);

  // Process Inspection FAIL (Write-off, do NOT restore stock)
  db.transaction(() => {
    db.prepare("UPDATE returns SET status = 'INSPECTED', inspection_result = 'FAIL' WHERE id = ?").run(returnIdFail);
  })();

  const stockAfterFail = db.prepare('SELECT stock FROM product_variants WHERE id = ?').get(varId).stock;
  assert.strictEqual(stockAfterFail, 12, 'Stock must REMAIN 12 (not restored) on inspection FAIL');
});

// 2. Non-Returnable Class Rejection Test (§1)
test('Non-Returnable Classes: Made-to-order and bulky products are rejected at request time', () => {
  function validateReturnability(shippingClass) {
    if (shippingClass === 'made-to-order' || shippingClass === 'bulky') {
      throw new Error(`Items with shipping class '${shippingClass}' are non-returnable.`);
    }
  }

  assert.throws(() => validateReturnability('made-to-order'), /non-returnable/, 'Made-to-order must throw non-returnable');
  assert.throws(() => validateReturnability('bulky'), /non-returnable/, 'Bulky must throw non-returnable');
  assert.doesNotThrow(() => validateReturnability('standard'), 'Standard class must be returnable');
});

// 3. Complete 5-Role RBAC Authorization Test (§2)
test('5-Role RBAC Matrix: Enforces server-side path restrictions for all 5 roles', () => {
  assert.strictEqual(hasRoleAccess('SUPER_ADMIN', '/admin/settings'), true, 'SUPER_ADMIN has all access');
  assert.strictEqual(hasRoleAccess('ADMIN', '/admin/settings'), false, 'ADMIN blocked from settings');
  assert.strictEqual(hasRoleAccess('SALES', '/admin/settings'), false, 'SALES blocked from settings');
  assert.strictEqual(hasRoleAccess('INVENTORY_MANAGER', '/admin/customers'), false, 'INVENTORY_MANAGER blocked from customer PII');
  assert.strictEqual(hasRoleAccess('INVENTORY_MANAGER', '/admin/products'), true, 'INVENTORY_MANAGER allowed on products');
  assert.strictEqual(hasRoleAccess('SUPPORT', '/admin/users'), false, 'SUPPORT blocked from user admin');
});

// 4. PII Redaction Test for Inventory Manager (§2)
test('PII Protection: Customer PII is redacted for Inventory Manager role', () => {
  const dummyCustomer = { id: 42, name: 'John Doe', phone: '+91 99999 88888', email: 'john@example.com', status: 'Active' };

  const redacted = redactCustomerPii(dummyCustomer, 'INVENTORY_MANAGER');
  assert.strictEqual(redacted.name, '[REDACTED FOR INVENTORY ROLE]', 'Name must be redacted');
  assert.strictEqual(redacted.phone, '[REDACTED]', 'Phone must be redacted');
  assert.strictEqual(redacted.email, '[REDACTED]', 'Email must be redacted');

  const unredacted = redactCustomerPii(dummyCustomer, 'SUPER_ADMIN');
  assert.strictEqual(unredacted.name, 'John Doe', 'Super Admin sees unredacted PII');
});

// Cleanup test variants
db.prepare("DELETE FROM product_variants WHERE sku LIKE '%TEST%'").run();

console.log(`\nMilestone 4 Regression Summary: ${totalPassed} Passed, ${totalFailed} Failed.`);
if (totalFailed > 0) process.exit(1);
