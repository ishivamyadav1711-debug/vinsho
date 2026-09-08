import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';

const dbDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'vinsho.db');
export const db = new Database(dbPath);

// Enable WAL mode & Foreign Key enforcement
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

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
      blurb TEXT DEFAULT '',
      order_index INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT DEFAULT NULL,
      FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE
    );

    -- 3. Products Table
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      collection_id INTEGER NOT NULL,
      subcategory_id INTEGER NOT NULL,
      description TEXT DEFAULT '',
      description_source TEXT DEFAULT 'placeholder',
      tagline TEXT DEFAULT '',
      features TEXT DEFAULT '[]',
      closing_line TEXT DEFAULT '',
      material TEXT DEFAULT '',
      shipping_class TEXT NOT NULL DEFAULT 'standard',
      launch_phase INTEGER NOT NULL DEFAULT 1,
      sellable_online INTEGER NOT NULL DEFAULT 1,
      returnable INTEGER NOT NULL DEFAULT 1,
      country_of_origin TEXT DEFAULT 'India',
      manufacturer_or_packer TEXT DEFAULT NULL,
      consumer_care_contact TEXT DEFAULT NULL,
      lead_time_days INTEGER DEFAULT NULL,
      care_instructions TEXT DEFAULT NULL,
      is_purchasable INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT DEFAULT NULL,
      FOREIGN KEY (collection_id) REFERENCES collections(id),
      FOREIGN KEY (subcategory_id) REFERENCES subcategories(id)
    );

    -- 4. Product Images Table
    CREATE TABLE IF NOT EXISTS product_images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      url TEXT NOT NULL,
      alt TEXT DEFAULT '',
      position INTEGER DEFAULT 0,
      is_primary INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    -- 5. Product Variants Table
    CREATE TABLE IF NOT EXISTS product_variants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      sku TEXT UNIQUE DEFAULT NULL,
      size TEXT DEFAULT NULL,
      colour TEXT DEFAULT NULL,
      mrp REAL DEFAULT NULL,
      selling_price REAL DEFAULT NULL,
      currency TEXT DEFAULT 'INR',
      hsn_code TEXT DEFAULT NULL,
      gst_rate REAL DEFAULT NULL,
      net_quantity TEXT DEFAULT NULL,
      packed_weight_kg REAL DEFAULT NULL,
      packed_l_cm REAL DEFAULT NULL,
      packed_b_cm REAL DEFAULT NULL,
      packed_h_cm REAL DEFAULT NULL,
      stock INTEGER DEFAULT NULL,
      position INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    -- 6. Admin Users Table
    CREATE TABLE IF NOT EXISTS admin_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'SUPER_ADMIN',
      is_active INTEGER NOT NULL DEFAULT 1,
      last_login_at TEXT DEFAULT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- 7. Audit Logs Table
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      actor_id INTEGER NOT NULL,
      action TEXT NOT NULL,
      entity TEXT NOT NULL,
      entity_id INTEGER NOT NULL,
      before TEXT DEFAULT NULL,
      after TEXT DEFAULT NULL,
      ip TEXT DEFAULT '',
      user_agent TEXT DEFAULT '',
      created_at TEXT NOT NULL
    );

    -- Admin Sessions Table
    CREATE TABLE IF NOT EXISTS admin_sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      ip TEXT DEFAULT '',
      user_agent TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES admin_users(id) ON DELETE CASCADE
    );

    -- Login Rate Limiting Table
    CREATE TABLE IF NOT EXISTS login_rate_limits (
      ip TEXT PRIMARY KEY,
      attempts INTEGER DEFAULT 1,
      first_failed_at INTEGER NOT NULL,
      blocked_until INTEGER DEFAULT 0
    );

    -- Newsletter Subscribers Table
    CREATE TABLE IF NOT EXISTS newsletter_subscribers (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      source TEXT DEFAULT 'Footer Form',
      created_at TEXT NOT NULL
    );

    -- M2 Table 1: Customers (Deduplicated on phone first, then email)
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
      password_hash TEXT DEFAULT NULL,
      reset_token TEXT DEFAULT NULL,
      reset_expires INTEGER DEFAULT NULL,
      consent_at TEXT DEFAULT NULL,
      consent_purpose TEXT DEFAULT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT DEFAULT NULL
    );

    -- Customer Sessions Table
    CREATE TABLE IF NOT EXISTS customer_sessions (
      token TEXT PRIMARY KEY,
      customer_id INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      ip TEXT DEFAULT '',
      user_agent TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
    );

    -- M2 Table 2: Enquiries
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
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
      FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE SET NULL,
      FOREIGN KEY (assigned_to) REFERENCES admin_users(id) ON DELETE SET NULL
    );

    -- M2 Table 3: Internal CRM Notes
    CREATE TABLE IF NOT EXISTS crm_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_type TEXT NOT NULL,
      entity_id INTEGER NOT NULL,
      author_id INTEGER NOT NULL,
      body TEXT NOT NULL,
      is_internal INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      FOREIGN KEY (author_id) REFERENCES admin_users(id)
    );

    -- M2 Table 4: Follow-ups & Reminders
    CREATE TABLE IF NOT EXISTS follow_ups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_type TEXT NOT NULL,
      entity_id INTEGER NOT NULL,
      due_at TEXT NOT NULL,
      assigned_to INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING',
      priority TEXT NOT NULL DEFAULT 'MEDIUM',
      completed_at TEXT DEFAULT NULL,
      outcome TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      FOREIGN KEY (assigned_to) REFERENCES admin_users(id)
    );

    -- M2 Table 5: CRM Activity Audit Timeline
    CREATE TABLE IF NOT EXISTS crm_activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_type TEXT NOT NULL,
      entity_id INTEGER NOT NULL,
      actor_id INTEGER DEFAULT NULL,
      type TEXT NOT NULL,
      summary TEXT NOT NULL,
      meta TEXT DEFAULT NULL,
      created_at TEXT NOT NULL
    );

    -- M2 Table 6: Tags Vocabulary
    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      colour TEXT NOT NULL DEFAULT '#8A174B',
      created_at TEXT NOT NULL
    );

    -- M2 Table 7: Taggables
    CREATE TABLE IF NOT EXISTS taggables (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tag_id INTEGER NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    );

    -- M2 Table 8: Notification Log
    CREATE TABLE IF NOT EXISTS notification_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      channel TEXT NOT NULL,
      template TEXT NOT NULL,
      recipient TEXT NOT NULL,
      entity_type TEXT DEFAULT NULL,
      entity_id INTEGER DEFAULT NULL,
      status TEXT NOT NULL DEFAULT 'LOGGED_DEV',
      sent_at TEXT DEFAULT NULL,
      error TEXT DEFAULT NULL,
      created_at TEXT NOT NULL
    );

    -- Enquiry Submission Rate Limiting
    CREATE TABLE IF NOT EXISTS enquiry_rate_limits (
      identifier TEXT PRIMARY KEY,
      attempts INTEGER DEFAULT 1,
      first_attempt_at INTEGER NOT NULL,
      blocked_until INTEGER DEFAULT 0
    );

    -- M3 Table 3: Customer Addresses
    CREATE TABLE IF NOT EXISTS addresses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL,
      type TEXT NOT NULL DEFAULT 'SHIPPING',
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      line1 TEXT NOT NULL,
      line2 TEXT DEFAULT '',
      city TEXT NOT NULL,
      state TEXT NOT NULL,
      pincode TEXT NOT NULL,
      country TEXT NOT NULL DEFAULT 'India',
      is_default INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
    );

    -- M3 Table 4: Orders
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT UNIQUE NOT NULL,
      customer_id INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'Pending',
      payment_status TEXT NOT NULL DEFAULT 'pending',
      subtotal REAL NOT NULL,
      tax_total REAL NOT NULL,
      shipping_total REAL NOT NULL,
      discount_total REAL DEFAULT 0,
      grand_total REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'INR',
      shipping_address_id INTEGER NOT NULL,
      billing_address_id INTEGER NOT NULL,
      is_interstate INTEGER NOT NULL DEFAULT 0,
      placed_at TEXT NOT NULL,
      idempotency_key TEXT UNIQUE NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (customer_id) REFERENCES customers(id),
      FOREIGN KEY (shipping_address_id) REFERENCES addresses(id),
      FOREIGN KEY (billing_address_id) REFERENCES addresses(id)
    );

    -- M3 Table 5: Order Items (Snapshots)
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
      line_total REAL NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (variant_id) REFERENCES product_variants(id)
    );

    -- M3 Table 6: Payments
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      provider TEXT NOT NULL DEFAULT 'RAZORPAY',
      provider_payment_id TEXT UNIQUE NOT NULL,
      amount REAL NOT NULL,
      status TEXT NOT NULL,
      method TEXT DEFAULT 'HOSTED_CHECKOUT',
      refund_amount REAL DEFAULT 0,
      refund_status TEXT DEFAULT 'NONE',
      refunded_at TEXT DEFAULT NULL,
      failure_reason TEXT DEFAULT NULL,
      raw_payload TEXT DEFAULT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id)
    );

    -- Quotations Table
    CREATE TABLE IF NOT EXISTS quotations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      quote_number TEXT UNIQUE NOT NULL,
      customer_id INTEGER NOT NULL,
      enquiry_id INTEGER DEFAULT NULL,
      created_by INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'DRAFT',
      subtotal REAL NOT NULL DEFAULT 0,
      discount_total REAL NOT NULL DEFAULT 0,
      tax_total REAL NOT NULL DEFAULT 0,
      shipping_total REAL NOT NULL DEFAULT 0,
      grand_total REAL NOT NULL DEFAULT 0,
      valid_until TEXT NOT NULL,
      notes TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (customer_id) REFERENCES customers(id),
      FOREIGN KEY (created_by) REFERENCES admin_users(id)
    );

    -- Quotation Line Items Table
    CREATE TABLE IF NOT EXISTS quotation_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      quotation_id INTEGER NOT NULL,
      variant_id INTEGER NOT NULL,
      product_name_snapshot TEXT NOT NULL,
      variant_label_snapshot TEXT NOT NULL,
      unit_price REAL NOT NULL,
      qty INTEGER NOT NULL DEFAULT 1,
      discount REAL DEFAULT 0,
      line_total REAL NOT NULL,
      FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE CASCADE
    );

    -- M3 Table 7: Payment Events (Webhook Idempotency)
    CREATE TABLE IF NOT EXISTS payment_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      payment_id INTEGER DEFAULT NULL,
      provider_event_id TEXT UNIQUE NOT NULL,
      type TEXT NOT NULL,
      payload TEXT NOT NULL,
      processed_at TEXT NOT NULL
    );

    -- M3 Table 8: Inventory Transactions
    CREATE TABLE IF NOT EXISTS inventory_txns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      variant_id INTEGER NOT NULL,
      delta INTEGER NOT NULL,
      reason TEXT NOT NULL,
      order_id INTEGER DEFAULT NULL,
      actor_id INTEGER DEFAULT NULL,
      balance_after INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (variant_id) REFERENCES product_variants(id)
    );

    -- M3 Table 9: Stock Reservations
    CREATE TABLE IF NOT EXISTS stock_reservations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      variant_id INTEGER NOT NULL,
      cart_id INTEGER NOT NULL,
      qty INTEGER NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (variant_id) REFERENCES product_variants(id),
      FOREIGN KEY (cart_id) REFERENCES carts(id)
    );

    -- M3 Table 10: Invoices
    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER UNIQUE NOT NULL,
      invoice_number TEXT UNIQUE NOT NULL,
      pdf_url TEXT NOT NULL,
      issued_at TEXT NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id)
    );

    -- M3 Table 11: Shipping Zones
    CREATE TABLE IF NOT EXISTS shipping_zones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      pincode_ranges TEXT NOT NULL,
      rules TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    -- Gapless Sequence Generator Table
    CREATE TABLE IF NOT EXISTS gapless_sequences (
      sequence_name TEXT PRIMARY KEY,
      current_val INTEGER DEFAULT 0
    );

    -- M4 Table 1: Returns & RTO Master Table
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
      updated_at TEXT NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id),
      FOREIGN KEY (customer_id) REFERENCES customers(id),
      FOREIGN KEY (inspected_by) REFERENCES admin_users(id)
    );

    -- M4 Table 2: Return Line Items
    CREATE TABLE IF NOT EXISTS return_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      return_id INTEGER NOT NULL,
      order_item_id INTEGER NOT NULL,
      variant_id INTEGER NOT NULL,
      qty INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      tax_amount REAL NOT NULL,
      line_total REAL NOT NULL,
      FOREIGN KEY (return_id) REFERENCES returns(id) ON DELETE CASCADE,
      FOREIGN KEY (order_item_id) REFERENCES order_items(id)
    );

    -- Performance Indexes
    CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
    CREATE INDEX IF NOT EXISTS idx_products_collection ON products(collection_id);
    CREATE INDEX IF NOT EXISTS idx_products_subcategory ON products(subcategory_id);
    CREATE INDEX IF NOT EXISTS idx_variants_product ON product_variants(product_id);
    CREATE INDEX IF NOT EXISTS idx_images_product ON product_images(product_id);
    CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
    CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
    CREATE INDEX IF NOT EXISTS idx_enquiries_customer ON enquiries(customer_id);
    CREATE INDEX IF NOT EXISTS idx_enquiries_status ON enquiries(status);
    CREATE INDEX IF NOT EXISTS idx_enquiries_product ON enquiries(product_id);
    CREATE INDEX IF NOT EXISTS idx_followups_due ON follow_ups(due_at, status);
    CREATE INDEX IF NOT EXISTS idx_activities_entity ON crm_activities(entity_type, entity_id);
    CREATE INDEX IF NOT EXISTS idx_orders_number ON orders(order_number);
    CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
    CREATE INDEX IF NOT EXISTS idx_orders_idempotency ON orders(idempotency_key);
    CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id);
    CREATE INDEX IF NOT EXISTS idx_payment_events_provider ON payment_events(provider_event_id);
    CREATE INDEX IF NOT EXISTS idx_returns_order ON returns(order_id);
    CREATE INDEX IF NOT EXISTS idx_returns_status ON returns(status);
  `);

  // Auto-migrate new product text columns if missing
  const cols = db.prepare("PRAGMA table_info(products)").all() as any[];
  const colNames = new Set(cols.map((c) => c.name));
  if (!colNames.has('tagline')) {
    db.exec("ALTER TABLE products ADD COLUMN tagline TEXT DEFAULT ''");
  }
  if (!colNames.has('features')) {
    db.exec("ALTER TABLE products ADD COLUMN features TEXT DEFAULT '[]'");
  }
  if (!colNames.has('closing_line')) {
    db.exec("ALTER TABLE products ADD COLUMN closing_line TEXT DEFAULT ''");
  }
  if (!colNames.has('gift_eligible')) {
    db.exec("ALTER TABLE products ADD COLUMN gift_eligible INTEGER NOT NULL DEFAULT 0");
  }

  // Auto-migrate orders columns if missing
  const orderCols = db.prepare("PRAGMA table_info(orders)").all() as any[];
  const orderColNames = new Set(orderCols.map((c) => c.name));
  if (!orderColNames.has('discount_total')) {
    db.exec("ALTER TABLE orders ADD COLUMN discount_total REAL DEFAULT 0");
  }
  if (!orderColNames.has('currency')) {
    db.exec("ALTER TABLE orders ADD COLUMN currency TEXT NOT NULL DEFAULT 'INR'");
  }
  if (!orderColNames.has('is_interstate')) {
    db.exec("ALTER TABLE orders ADD COLUMN is_interstate INTEGER NOT NULL DEFAULT 0");
  }
  if (!orderColNames.has('idempotency_key')) {
    db.exec("ALTER TABLE orders ADD COLUMN idempotency_key TEXT UNIQUE DEFAULT NULL");
  }
  if (!orderColNames.has('coupon_code')) {
    db.exec("ALTER TABLE orders ADD COLUMN coupon_code TEXT DEFAULT NULL");
  }

  // Auto-migrate combo_items table if missing
  db.exec(`
    CREATE TABLE IF NOT EXISTS combo_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      combo_variant_id INTEGER NOT NULL,
      component_variant_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (combo_variant_id) REFERENCES product_variants(id) ON DELETE CASCADE,
      FOREIGN KEY (component_variant_id) REFERENCES product_variants(id) ON DELETE CASCADE,
      UNIQUE(combo_variant_id, component_variant_id)
    );
    CREATE INDEX IF NOT EXISTS idx_combo_items_combo ON combo_items(combo_variant_id);
    CREATE INDEX IF NOT EXISTS idx_combo_items_component ON combo_items(component_variant_id);
  `);

  // Auto-migrate customers columns if missing
  const custCols = db.prepare("PRAGMA table_info(customers)").all() as any[];
  const custColNames = new Set(custCols.map((c) => c.name));
  if (!custColNames.has('password_hash')) {
    db.exec("ALTER TABLE customers ADD COLUMN password_hash TEXT DEFAULT NULL");
  }
  if (!custColNames.has('reset_token')) {
    db.exec("ALTER TABLE customers ADD COLUMN reset_token TEXT DEFAULT NULL");
  }
  if (!custColNames.has('reset_expires')) {
    db.exec("ALTER TABLE customers ADD COLUMN reset_expires INTEGER DEFAULT NULL");
  }
}

/**
 * Generates gapless sequence numbers for Orders (VIN-2026-000001) and Invoices (INV-2026-000001).
 */
export function getNextSequenceNumber(sequenceName: string, prefix: string): string {
  return db.transaction(() => {
    db.prepare(`
      INSERT INTO gapless_sequences (sequence_name, current_val)
      VALUES (?, 1)
      ON CONFLICT(sequence_name) DO UPDATE SET current_val = current_val + 1
    `).run(sequenceName);

    const row = db.prepare('SELECT current_val FROM gapless_sequences WHERE sequence_name = ?').get(sequenceName) as any;
    const seq = String(row.current_val).padStart(6, '0');
    return `${prefix}-${new Date().getFullYear()}-${seq}`;
  })();
}

export function getAllSubscribers() {
  try {
    return db.prepare('SELECT * FROM newsletter_subscribers ORDER BY created_at DESC').all();
  } catch {
    return [];
  }
}

export function addSubscriber(email: string, source = 'Website Footer') {
  const cleanEmail = email.trim().toLowerCase();
  const existing = db.prepare('SELECT id FROM newsletter_subscribers WHERE email = ?').get(cleanEmail);
  if (existing) {
    return { success: true, alreadySubscribed: true };
  }
  const id = 'sub-' + Date.now();
  const now = new Date().toISOString();
  db.prepare('INSERT INTO newsletter_subscribers (id, email, source, created_at) VALUES (?, ?, ?, ?)').run(id, cleanEmail, source, now);
  return { success: true, alreadySubscribed: false };
}

// Audit Logger Helper
export function logAuditAction(params: {
  actorId: number;
  action: string;
  entity: string;
  entityId: number;
  before?: any;
  after?: any;
  ip?: string;
  userAgent?: string;
}) {
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO audit_logs (actor_id, action, entity, entity_id, before, after, ip, user_agent, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    params.actorId,
    params.action,
    params.entity,
    params.entityId,
    params.before ? JSON.stringify(params.before) : null,
    params.after ? JSON.stringify(params.after) : null,
    params.ip || '',
    params.userAgent || '',
    now
  );
}

// Initialize tables on load
initDatabase();

// Graceful Shutdown Handler: Closes SQLite WAL checkpoints cleanly on server termination
function gracefulShutdown(signal: string) {
  console.log(`[SERVER SHUTDOWN] Received ${signal}. Closing SQLite database connection cleanly...`);
  try {
    if (db && db.open) {
      db.pragma('wal_checkpoint(TRUNCATE)');
      db.close();
      console.log('[SERVER SHUTDOWN] SQLite database closed successfully.');
    }
  } catch (err: any) {
    console.error('[SERVER SHUTDOWN ERROR]', err);
  }
}

if (typeof process !== 'undefined') {
  process.once('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.once('SIGINT', () => gracefulShutdown('SIGINT'));
}

