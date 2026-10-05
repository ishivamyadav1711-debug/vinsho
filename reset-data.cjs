const Database = require('better-sqlite3');
const db = new Database('data/vinsho.db');

const tablesToClear = [
  'cart_items',
  'carts',
  'stock_reservations',
  'quotation_items',
  'quotations',
  'return_items',
  'returns',
  'payment_events',
  'payments',
  'invoices',
  'order_items',
  'orders',
  'crm_activities',
  'crm_notes',
  'follow_ups',
  'enquiries',
  'addresses',
  'customer_sessions',
  'customers',
  'newsletter_subscribers',
  'login_rate_limits',
  'enquiry_rate_limits',
  'notification_log'
];

db.pragma('foreign_keys = OFF');

for (const table of tablesToClear) {
  try {
    db.prepare(`DELETE FROM ${table}`).run();
    console.log(`Cleared ${table}`);
  } catch (err) {
    console.error(`Error clearing ${table}:`, err.message);
  }
}

db.pragma('foreign_keys = ON');

console.log('All transactional data has been zeroed out!');
