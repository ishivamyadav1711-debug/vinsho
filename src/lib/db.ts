import { createSyncFn } from 'synckit';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Use import.meta.url to safely resolve the worker file path
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const syncFn = createSyncFn(path.resolve(__dirname, 'db-worker.mjs'));

const dbUrl = process.env.TURSO_DATABASE_URL || 'file:data/vinsho.db';
const authToken = process.env.TURSO_AUTH_TOKEN;

// Initialize the worker synchronously
syncFn('init', dbUrl, authToken);

// Normalizes better-sqlite3 arguments to libsql/client format
const normalizeArgs = (args) => {
  if (args.length === 1) {
    if (Array.isArray(args[0])) return args[0];
    if (typeof args[0] === 'object' && args[0] !== null) return args[0];
  }
  return args;
};

// Create a synchronous wrapper that mimics better-sqlite3 API
export const db = {
  pragma: (sql) => {
    // Pragmas like WAL are specific to local SQLite. 
    // We can just execute them or ignore them if using Turso over HTTP.
    try {
      syncFn('execute', { sql: `PRAGMA ${sql}`, args: [] });
    } catch (e) {
      // Ignore pragma failures on remote databases
    }
  },
  prepare: (sql) => {
    return {
      get: (...args) => {
        const normalizedArgs = normalizeArgs(args);
        const res = syncFn('execute', { sql, args: normalizedArgs });
        return res.rows[0];
      },
      all: (...args) => {
        const normalizedArgs = normalizeArgs(args);
        const res = syncFn('execute', { sql, args: normalizedArgs });
        return res.rows;
      },
      run: (...args) => {
        const normalizedArgs = normalizeArgs(args);
        const res = syncFn('execute', { sql, args: normalizedArgs });
        return { lastInsertRowid: res.lastInsertRowid, changes: res.rowsAffected };
      }
    };
  },
  exec: (sql) => {
    return syncFn('executeMultiple', sql);
  },
  transaction: (fn) => {
    return (...args) => {
      syncFn('begin');
      try {
        const result = fn(...args);
        syncFn('commit');
        return result;
      } catch (err) {
        syncFn('rollback');
        throw err;
      }
    };
  }
};

// Also export the initDatabase function since it's used elsewhere
export function initDatabase() {
  db.exec(`
    -- 1. Collections Table
    CREATE TABLE IF NOT EXISTS collections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      blurb TEXT DEFAULT '',
      order_index INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT DEFAULT NULL
    );

    -- 2. Subcategories Table
    CREATE TABLE IF NOT EXISTS subcategories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      collection_id INTEGER NOT NULL,
      key TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      order_index INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT DEFAULT NULL,
      FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE
    );

    -- 3. Products Table
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subcategory_id INTEGER NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      art_form TEXT,
      dimensions TEXT,
      weight TEXT,
      material TEXT,
      is_new_arrival INTEGER DEFAULT 0,
      is_corporate_gifting INTEGER DEFAULT 0,
      is_on_sale INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT DEFAULT NULL,
      FOREIGN KEY (subcategory_id) REFERENCES subcategories(id) ON DELETE CASCADE
    );

    -- 4. Product Variants Table
    CREATE TABLE IF NOT EXISTS product_variants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      size TEXT NOT NULL,
      colour TEXT NOT NULL,
      sku TEXT NOT NULL,
      mrp REAL NOT NULL,
      selling_price REAL NOT NULL,
      stock INTEGER DEFAULT 0,
      position INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT DEFAULT NULL,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    -- 5. Product Images Table
    CREATE TABLE IF NOT EXISTS product_images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      image_url TEXT NOT NULL,
      alt_text TEXT,
      position INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    -- 6. Customers Table
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id INTEGER,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      phone TEXT,
      gst_number TEXT,
      company_name TEXT,
      source TEXT,
      status TEXT DEFAULT 'ACTIVE',
      total_spent REAL DEFAULT 0,
      converted_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT DEFAULT NULL
    );

    -- 7. Addresses Table
    CREATE TABLE IF NOT EXISTS addresses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      address_line1 TEXT NOT NULL,
      address_line2 TEXT,
      city TEXT NOT NULL,
      state TEXT NOT NULL,
      pincode TEXT NOT NULL,
      country TEXT DEFAULT 'India',
      is_default INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
    );

    -- 8. Orders Table
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT UNIQUE NOT NULL,
      customer_id INTEGER NOT NULL,
      status TEXT DEFAULT 'PENDING',
      payment_status TEXT DEFAULT 'UNPAID',
      payment_method TEXT,
      subtotal REAL NOT NULL,
      tax_total REAL DEFAULT 0,
      shipping_total REAL DEFAULT 0,
      discount_total REAL DEFAULT 0,
      grand_total REAL NOT NULL,
      tracking_number TEXT,
      shipping_provider TEXT,
      notes TEXT,
      razorpay_order_id TEXT,
      razorpay_payment_id TEXT,
      razorpay_signature TEXT,
      shipping_address_id INTEGER,
      billing_address_id INTEGER,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT DEFAULT NULL,
      FOREIGN KEY (customer_id) REFERENCES customers(id),
      FOREIGN KEY (shipping_address_id) REFERENCES addresses(id),
      FOREIGN KEY (billing_address_id) REFERENCES addresses(id)
    );

    -- 9. Order Items Table
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      variant_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      total_price REAL NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (variant_id) REFERENCES product_variants(id)
    );

    -- 10. Admin Users Table
    CREATE TABLE IF NOT EXISTS admin_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      last_login_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- 11. Admin Sessions Table
    CREATE TABLE IF NOT EXISTS admin_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token TEXT NOT NULL UNIQUE,
      user_id INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      ip TEXT,
      user_agent TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES admin_users(id) ON DELETE CASCADE
    );

    -- 12. Audit Logs Table
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id INTEGER,
      details TEXT,
      ip TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES admin_users(id) ON DELETE SET NULL
    );

    -- 13. Leads Table
    CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      company_name TEXT,
      source TEXT,
      status TEXT DEFAULT 'NEW',
      notes TEXT,
      assigned_to INTEGER,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT DEFAULT NULL,
      FOREIGN KEY (assigned_to) REFERENCES admin_users(id) ON DELETE SET NULL
    );

    -- 14. Lead Activities Table
    CREATE TABLE IF NOT EXISTS lead_activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id INTEGER NOT NULL,
      user_id INTEGER,
      activity_type TEXT NOT NULL,
      description TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES admin_users(id) ON DELETE SET NULL
    );

    -- 15. Enquiries Table
    CREATE TABLE IF NOT EXISTS enquiries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER,
      lead_id INTEGER,
      enquiry_type TEXT NOT NULL,
      subject TEXT NOT NULL,
      message TEXT,
      status TEXT DEFAULT 'Open',
      assigned_to INTEGER,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      closed_at TEXT,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
      FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
      FOREIGN KEY (assigned_to) REFERENCES admin_users(id) ON DELETE SET NULL
    );

    -- 16. Quotations Table
    CREATE TABLE IF NOT EXISTS quotations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      enquiry_id INTEGER,
      customer_id INTEGER NOT NULL,
      quotation_number TEXT UNIQUE NOT NULL,
      total_amount REAL NOT NULL,
      status TEXT DEFAULT 'DRAFT',
      valid_until TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (enquiry_id) REFERENCES enquiries(id) ON DELETE SET NULL,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
    );

    -- 17. Follow Ups Table
    CREATE TABLE IF NOT EXISTS follow_ups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id INTEGER,
      customer_id INTEGER,
      user_id INTEGER NOT NULL,
      scheduled_at TEXT NOT NULL,
      due_at TEXT NOT NULL,
      status TEXT DEFAULT 'PENDING',
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      completed_at TEXT,
      FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES admin_users(id) ON DELETE CASCADE
    );

    -- 18. Product Combos Table
    CREATE TABLE IF NOT EXISTS product_combos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      base_price REAL NOT NULL,
      discount_percentage REAL DEFAULT 0,
      final_price REAL NOT NULL,
      is_active INTEGER DEFAULT 1,
      image_url TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT DEFAULT NULL
    );

    -- 19. Combo Items Table
    CREATE TABLE IF NOT EXISTS combo_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      combo_id INTEGER NOT NULL,
      variant_id INTEGER NOT NULL,
      quantity INTEGER DEFAULT 1,
      FOREIGN KEY (combo_id) REFERENCES product_combos(id) ON DELETE CASCADE,
      FOREIGN KEY (variant_id) REFERENCES product_variants(id)
    );

    -- 20. Combo Orders Table
    CREATE TABLE IF NOT EXISTS combo_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      combo_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      total_price REAL NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (combo_id) REFERENCES product_combos(id)
    );

    -- 21. Corporate Inquiries Table
    CREATE TABLE IF NOT EXISTS corporate_inquiries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      company_name TEXT,
      approx_quantity INTEGER,
      message TEXT,
      status TEXT DEFAULT 'NEW',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- 22. Lead Notes Table
    CREATE TABLE IF NOT EXISTS lead_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id INTEGER NOT NULL,
      user_id INTEGER,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES admin_users(id) ON DELETE SET NULL
    );

    -- 23. System Config Table
    CREATE TABLE IF NOT EXISTS system_config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      description TEXT,
      updated_at TEXT NOT NULL
    );
    
    -- 24. Order Returns Table
    CREATE TABLE IF NOT EXISTS order_returns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      return_number TEXT UNIQUE NOT NULL,
      order_id INTEGER NOT NULL,
      customer_id INTEGER NOT NULL,
      status TEXT DEFAULT 'REQUESTED',
      reason TEXT NOT NULL,
      resolution TEXT,
      refund_amount REAL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      resolved_at TEXT,
      FOREIGN KEY (order_id) REFERENCES orders(id),
      FOREIGN KEY (customer_id) REFERENCES customers(id)
    );

    -- 25. Return Items Table
    CREATE TABLE IF NOT EXISTS return_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      return_id INTEGER NOT NULL,
      order_item_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      condition TEXT,
      FOREIGN KEY (return_id) REFERENCES order_returns(id) ON DELETE CASCADE,
      FOREIGN KEY (order_item_id) REFERENCES order_items(id)
    );

    -- 26. Payments Table
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      customer_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      payment_method TEXT NOT NULL,
      payment_status TEXT DEFAULT 'SUCCESS',
      transaction_id TEXT,
      notes TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id),
      FOREIGN KEY (customer_id) REFERENCES customers(id)
    );
    
    -- 27. Login Rate Limits Table
    CREATE TABLE IF NOT EXISTS login_rate_limits (
      ip TEXT PRIMARY KEY,
      attempts INTEGER DEFAULT 1,
      locked_until TEXT
    );
  `);
}
