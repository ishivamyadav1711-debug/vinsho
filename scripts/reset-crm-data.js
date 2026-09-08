import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const DB_PATH = 'data/vinsho.db';
const BACKUP_PATH = 'data/VINSHO_CRM_PRE_PRODUCTION_BACKUP.db';

console.log('====================================================');
console.log('       VINSHO CRM PRE-PRODUCTION DATA RESET        ');
console.log('====================================================\n');

const args = process.argv.slice(2);
const isConfirmed = args.includes('--confirm');

if (!fs.existsSync(DB_PATH)) {
  console.error(`Error: Database file not found at ${DB_PATH}`);
  process.exit(1);
}

const db = new Database(DB_PATH);
db.pragma('foreign_keys = ON');

// ── Step 1: Count current records ──────────────────────────────────────
const counts = {
  admin_users: db.prepare('SELECT COUNT(*) as c FROM admin_users').get().c,
  collections: db.prepare('SELECT COUNT(*) as c FROM collections').get().c,
  subcategories: db.prepare('SELECT COUNT(*) as c FROM subcategories').get().c,
  products: db.prepare('SELECT COUNT(*) as c FROM products').get().c,
  product_variants: db.prepare('SELECT COUNT(*) as c FROM product_variants').get().c,
  product_images: db.prepare('SELECT COUNT(*) as c FROM product_images').get().c,
  
  // To delete:
  customers: db.prepare('SELECT COUNT(*) as c FROM customers').get().c,
  addresses: db.prepare('SELECT COUNT(*) as c FROM addresses').get().c,
  orders: db.prepare('SELECT COUNT(*) as c FROM orders').get().c,
  order_items: db.prepare('SELECT COUNT(*) as c FROM order_items').get().c,
  crm_activities: db.prepare('SELECT COUNT(*) as c FROM crm_activities').get().c,
  enquiries: db.prepare('SELECT COUNT(*) as c FROM enquiries').get().c,
  enquiry_rate_limits: db.prepare('SELECT COUNT(*) as c FROM enquiry_rate_limits').get().c,
  cart_items: db.prepare('SELECT COUNT(*) as c FROM cart_items').get().c,
  carts: db.prepare('SELECT COUNT(*) as c FROM carts').get().c,
  inventory_txns: db.prepare('SELECT COUNT(*) as c FROM inventory_txns').get().c,
  returns: db.prepare('SELECT COUNT(*) as c FROM returns').get().c,
  return_items: db.prepare('SELECT COUNT(*) as c FROM return_items').get().c,
  payments: db.prepare('SELECT COUNT(*) as c FROM payments').get().c,
  payment_events: db.prepare('SELECT COUNT(*) as c FROM payment_events').get().c,
  notification_log: db.prepare('SELECT COUNT(*) as c FROM notification_log').get().c,
  newsletter_subscribers: db.prepare('SELECT COUNT(*) as c FROM newsletter_subscribers').get().c,
  audit_logs: db.prepare('SELECT COUNT(*) as c FROM audit_logs').get().c,
  admin_sessions: db.prepare('SELECT COUNT(*) as c FROM admin_sessions').get().c,
};

console.log('RECORDS TO BE PRESERVED:');
console.log(` - Admin Users       : ${counts.admin_users}`);
console.log(` - Collections       : ${counts.collections}`);
console.log(` - Subcategories     : ${counts.subcategories}`);
console.log(` - Products          : ${counts.products}`);
console.log(` - Product Variants  : ${counts.product_variants}`);
console.log(` - Product Images    : ${counts.product_images}`);

console.log('\nRECORDS TO BE DELETED (TEST/DEMO CRM DATA):');
console.log(` - Customers         : ${counts.customers}`);
console.log(` - Addresses         : ${counts.addresses}`);
console.log(` - Orders            : ${counts.orders}`);
console.log(` - Order Items       : ${counts.order_items}`);
console.log(` - CRM Activities    : ${counts.crm_activities}`);
console.log(` - Enquiries / Leads : ${counts.enquiries}`);
console.log(` - Enquiry Limits    : ${counts.enquiry_rate_limits}`);
console.log(` - Carts             : ${counts.carts}`);
console.log(` - Cart Items        : ${counts.cart_items}`);
console.log(` - Inventory Txns    : ${counts.inventory_txns}`);
console.log(` - Returns           : ${counts.returns}`);
console.log(` - Return Items      : ${counts.return_items}`);
console.log(` - Payments          : ${counts.payments}`);
console.log(` - Payment Events    : ${counts.payment_events}`);
console.log(` - Notifications     : ${counts.notification_log}`);
console.log(` - Newsletters       : ${counts.newsletter_subscribers}`);
console.log(` - Audit Logs        : ${counts.audit_logs}`);
console.log(` - Admin Sessions    : ${counts.admin_sessions}`);
console.log('----------------------------------------------------');

if (!isConfirmed) {
  console.log('\n[SAFETY GUARD] Run with --confirm flag to execute reset.');
  console.log('Example: node scripts/reset-crm-data.js --confirm\n');
  process.exit(0);
}

// ── Step 2: Backup Database ───────────────────────────────────────────
console.log('\n1. Creating database backup...');
fs.copyFileSync(DB_PATH, BACKUP_PATH);
console.log(`   Backup created successfully at: ${BACKUP_PATH}`);

// ── Step 3: Delete in Transaction ─────────────────────────────────────
console.log('\n2. Executing safe deletion within a single database transaction...');

const resetTransaction = db.transaction(() => {
  // Delete in reverse foreign-key dependency order
  db.prepare('DELETE FROM return_items').run();
  db.prepare('DELETE FROM returns').run();
  db.prepare('DELETE FROM order_items').run();
  db.prepare('DELETE FROM payment_events').run();
  db.prepare('DELETE FROM payments').run();
  db.prepare('DELETE FROM orders').run();
  db.prepare('DELETE FROM cart_items').run();
  db.prepare('DELETE FROM carts').run();
  db.prepare('DELETE FROM inventory_txns').run();
  db.prepare('DELETE FROM crm_activities').run();
  db.prepare('DELETE FROM enquiries').run();
  db.prepare('DELETE FROM enquiry_rate_limits').run();
  db.prepare('DELETE FROM notification_log').run();
  db.prepare('DELETE FROM newsletter_subscribers').run();
  db.prepare('DELETE FROM addresses').run();
  db.prepare('DELETE FROM customers').run();
  db.prepare('DELETE FROM audit_logs').run();
  db.prepare('DELETE FROM admin_sessions').run();
});

try {
  resetTransaction();
  console.log('\n====================================================');
  console.log('   SUCCESS: CRM BUSINESS DATA HAS BEEN RESET!');
  console.log('====================================================\n');
  console.log('Verification:');
  console.log(` - Remaining Customers : ${db.prepare('SELECT COUNT(*) as c FROM customers').get().c}`);
  console.log(` - Remaining Orders    : ${db.prepare('SELECT COUNT(*) as c FROM orders').get().c}`);
  console.log(` - Remaining Enquiries : ${db.prepare('SELECT COUNT(*) as c FROM enquiries').get().c}`);
  console.log(` - Admin Users Intact  : ${db.prepare('SELECT COUNT(*) as c FROM admin_users').get().c}`);
  console.log(` - Products Intact     : ${db.prepare('SELECT COUNT(*) as c FROM products').get().c}`);
} catch (err) {
  console.error('\n[ERROR] Transaction failed and was rolled back:', err);
  process.exit(1);
}
