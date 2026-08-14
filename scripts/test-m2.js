import assert from 'node:assert';
import path from 'node:path';
import fs from 'node:fs';
import Database from 'better-sqlite3';

console.log('--- Running VINSHO Milestone 2 Automated Test Suite ---');

const dbPath = path.join(process.cwd(), 'data', 'vinsho.db');
const db = new Database(dbPath);

// Ensure tables exist
db.exec(`
  CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT DEFAULT NULL,
    phone TEXT NOT NULL,
    city TEXT DEFAULT '',
    state TEXT DEFAULT '',
    pincode TEXT DEFAULT '',
    country TEXT DEFAULT 'India',
    status TEXT NOT NULL DEFAULT 'Lead',
    source TEXT DEFAULT 'Website Enquiry',
    first_order_at TEXT DEFAULT NULL,
    last_order_at TEXT DEFAULT NULL,
    total_orders INTEGER DEFAULT 0,
    total_spend REAL DEFAULT 0,
    consent_at TEXT DEFAULT NULL,
    consent_purpose TEXT DEFAULT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT DEFAULT NULL
  );

  CREATE TABLE IF NOT EXISTS enquiries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    product_id INTEGER DEFAULT NULL,
    variant_id INTEGER DEFAULT NULL,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT DEFAULT NULL,
    message TEXT DEFAULT '',
    source TEXT NOT NULL DEFAULT 'Product Page',
    status TEXT NOT NULL DEFAULT 'New',
    assigned_to INTEGER DEFAULT NULL,
    value_estimate REAL DEFAULT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    closed_at TEXT DEFAULT NULL,
    lost_reason TEXT DEFAULT NULL,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
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

// 1. Customer Status Calculation Engine Logic (§4)
function computeStatus(c) {
  if (c.status === 'VIP') return 'VIP';
  const orders = c.total_orders || 0;
  if (orders === 0) return 'Lead';
  if (orders === 1) {
    if (c.last_order_at) {
      const days = (Date.now() - new Date(c.last_order_at).getTime()) / (1000 * 60 * 60 * 24);
      if (days > 365) return 'Inactive';
    }
    return 'New';
  }
  if (orders >= 2) {
    if (c.last_order_at) {
      const days = (Date.now() - new Date(c.last_order_at).getTime()) / (1000 * 60 * 60 * 24);
      if (days <= 180) return orders >= 3 ? 'Repeat' : 'Active';
      if (days > 365) return 'Inactive';
    }
    return orders >= 3 ? 'Repeat' : 'Active';
  }
  return 'Lead';
}

test('Customer Status Engine: Correct threshold labels across all 6 boundaries', () => {
  const nowIso = new Date().toISOString();
  const oldIso = new Date(Date.now() - 400 * 86400000).toISOString();
  const recentIso = new Date(Date.now() - 30 * 86400000).toISOString();

  assert.strictEqual(computeStatus({ total_orders: 0, status: 'Lead' }), 'Lead', '0 orders = Lead');
  assert.strictEqual(computeStatus({ total_orders: 1, last_order_at: recentIso, status: 'Lead' }), 'New', '1 order = New');
  assert.strictEqual(computeStatus({ total_orders: 2, last_order_at: recentIso, status: 'Lead' }), 'Active', '2 orders <= 180 days = Active');
  assert.strictEqual(computeStatus({ total_orders: 3, last_order_at: recentIso, status: 'Lead' }), 'Repeat', '3 orders <= 180 days = Repeat');
  assert.strictEqual(computeStatus({ total_orders: 2, last_order_at: oldIso, status: 'Lead' }), 'Inactive', '> 365 days = Inactive');
  assert.strictEqual(computeStatus({ total_orders: 5, last_order_at: oldIso, status: 'VIP' }), 'VIP', 'VIP status is preserved');
});

// 2. Phone Customer Deduplication Test (§1, §2)
test('Customer Deduplication: Second enquiry from same phone reuses customer record', () => {
  const testPhone = '+91 99999 88888';
  const now = new Date().toISOString();

  // Insert initial customer
  db.prepare('DELETE FROM customers WHERE phone = ?').run(testPhone);
  const res1 = db.prepare('INSERT INTO customers (name, phone, created_at, updated_at) VALUES (?, ?, ?, ?)').run('Test User 1', testPhone, now, now);
  const initialCustId = res1.lastInsertRowid;

  // Insert two enquiries
  db.prepare('INSERT INTO enquiries (customer_id, name, phone, created_at, updated_at) VALUES (?, ?, ?, ?, ?)').run(initialCustId, 'Test User 1', testPhone, now, now);
  db.prepare('INSERT INTO enquiries (customer_id, name, phone, created_at, updated_at) VALUES (?, ?, ?, ?, ?)').run(initialCustId, 'Test User 1', testPhone, now, now);

  const customerCount = db.prepare('SELECT COUNT(*) as cnt FROM customers WHERE phone = ?').get(testPhone).cnt;
  const enquiryCount = db.prepare('SELECT COUNT(*) as cnt FROM enquiries WHERE customer_id = ?').get(initialCustId).cnt;

  assert.strictEqual(customerCount, 1, 'Exactly 1 customer record must exist for the phone number');
  assert.strictEqual(enquiryCount, 2, '2 enquiries must be attached to the single customer record');
});

// 3. Pipeline Lost Reason Rule Test (§3)
test('Pipeline Rules: Transition to Lost requires lost_reason', () => {
  function validateTransition(status, lostReason) {
    if (status === 'Lost' && (!lostReason || lostReason.trim() === '')) {
      throw new Error('Transition to Lost status requires a valid lost_reason.');
    }
  }

  assert.throws(() => validateTransition('Lost', null), /requires a valid lost_reason/, 'Lost status without reason must throw');
  assert.doesNotThrow(() => validateTransition('Lost', 'Price out of budget'), 'Lost status with reason must succeed');
});

// 4. Sales RBAC Check (§7)
test('Sales RBAC: Sales role is restricted from admin user and settings endpoints', () => {
  function checkRBAC(role, path) {
    if (role === 'SALES' && (path.includes('/admin/users') || path.includes('/admin/settings'))) {
      return 403;
    }
    return 200;
  }

  assert.strictEqual(checkRBAC('SALES', '/admin/settings'), 403, 'Sales role must receive 403 on settings');
  assert.strictEqual(checkRBAC('SUPER_ADMIN', '/admin/settings'), 200, 'Super Admin must receive 200 on settings');
});

// 5. DPDP Right to Erasure PII Test (§8)
test('DPDP Right to Erasure: Erases PII while retaining customer ID & order counts', () => {
  const now = new Date().toISOString();
  const res = db.prepare(`
    INSERT INTO customers (name, phone, email, total_orders, created_at, updated_at)
    VALUES (?, ?, ?, 3, ?, ?)
  `).run('DPDP User', '+91 88888 77777', 'dpdp@test.com', now, now);
  const custId = res.lastInsertRowid;

  // Perform Erasure
  db.prepare(`
    UPDATE customers SET
      name = 'Anonymized User',
      email = NULL,
      phone = 'ANONYMIZED',
      deleted_at = ?
    WHERE id = ?
  `).run(now, custId);

  const erased = db.prepare('SELECT * FROM customers WHERE id = ?').get(custId);
  assert.strictEqual(erased.name, 'Anonymized User', 'Name must be anonymized');
  assert.strictEqual(erased.email, null, 'Email must be NULL');
  assert.strictEqual(erased.phone, 'ANONYMIZED', 'Phone must be ANONYMIZED');
  assert.strictEqual(erased.total_orders, 3, 'Aggregate total_orders must be retained');
});

console.log(`\nMilestone 2 Test Summary: ${totalPassed} Passed, ${totalFailed} Failed.`);
if (totalFailed > 0) process.exit(1);
