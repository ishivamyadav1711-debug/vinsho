/**
 * VINSHO Production Recovery - Phase 3 Data Migration Script
 * Migrates real transactional and customer data from SQLite (data/vinsho.db) to PostgreSQL.
 * Strict rules:
 * - NO fake/dummy catalog records
 * - Preserve immutable historical financial snapshots
 * - Order items with deleted variants retain variant_id = NULL
 * - Skip orphaned combo_items test records
 * - Reset all PostgreSQL serial sequences
 */

import fs from 'fs';
import path from 'path';
import postgres from 'postgres';
import Database from 'better-sqlite3';

const envLocal = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf-8');
const directUrlMatch = envLocal.match(/DIRECT_URL="([^"]+)"/);
if (!directUrlMatch) {
  throw new Error('DIRECT_URL not found in .env.local');
}

const sql = postgres(directUrlMatch[1]);
const db = new Database(path.join(process.cwd(), 'data/vinsho.db'), { readonly: true });

async function runMigration() {
  console.log('====================================================');
  console.log('STARTING VINSHO SQLITE -> POSTGRESQL DATA MIGRATION');
  console.log('====================================================\n');

  // Verify PG connection
  const [pgInfo] = await sql`SELECT current_database(), current_user, version()`;
  console.log(`Connected to PG Database: ${pgInfo.current_database} as ${pgInfo.current_user}\n`);

  // Fetch valid variant IDs from PG
  const pgVariants = await sql`SELECT id FROM product_variants`;
  const validVariantIds = new Set(pgVariants.map(v => v.id));
  console.log(`Loaded ${validVariantIds.size} valid product variants from PostgreSQL.`);

  // 1. CUSTOMERS (47)
  console.log('\n--- 1. Migrating CUSTOMERS ---');
  const customers = db.prepare('SELECT * FROM customers ORDER BY id').all();
  console.log(`SQLite customers count: ${customers.length}`);
  let custInserted = 0;
  for (const c of customers) {
    await sql`
      INSERT INTO customers (
        id, name, email, phone, city, state, pincode, country,
        status, source, first_order_at, last_order_at, total_orders, total_spend,
        consent_at, consent_purpose, created_at, updated_at, deleted_at,
        password_hash, reset_token, reset_expires
      ) VALUES (
        ${c.id}, ${c.name}, ${c.email}, ${c.phone}, ${c.city ?? ''}, ${c.state ?? ''}, ${c.pincode ?? ''}, ${c.country ?? 'India'},
        ${c.status ?? 'Lead'}, ${c.source ?? 'Website Enquiry'},
        ${c.first_order_at ? new Date(c.first_order_at) : null},
        ${c.last_order_at ? new Date(c.last_order_at) : null},
        ${c.total_orders ?? 0}, ${c.total_spend ?? 0},
        ${c.consent_at ? new Date(c.consent_at) : null}, ${c.consent_purpose},
        ${new Date(c.created_at)}, ${new Date(c.updated_at)},
        ${c.deleted_at ? new Date(c.deleted_at) : null},
        ${c.password_hash}, ${c.reset_token}, ${c.reset_expires ? BigInt(c.reset_expires) : null}
      )
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        email = EXCLUDED.email,
        phone = EXCLUDED.phone,
        updated_at = EXCLUDED.updated_at
    `;
    custInserted++;
  }
  console.log(`Customers migrated: ${custInserted}`);

  // 2. ADDRESSES (38)
  console.log('\n--- 2. Migrating ADDRESSES ---');
  const addresses = db.prepare('SELECT * FROM addresses ORDER BY id').all();
  console.log(`SQLite addresses count: ${addresses.length}`);
  let addrInserted = 0;
  for (const a of addresses) {
    await sql`
      INSERT INTO addresses (
        id, customer_id, type, name, phone, line1, line2,
        city, state, pincode, country, is_default, created_at
      ) VALUES (
        ${a.id}, ${a.customer_id}, ${a.type ?? 'SHIPPING'}, ${a.name}, ${a.phone},
        ${a.line1}, ${a.line2 ?? ''}, ${a.city}, ${a.state}, ${a.pincode},
        ${a.country ?? 'India'}, ${Boolean(a.is_default)}, ${new Date(a.created_at)}
      )
      ON CONFLICT (id) DO NOTHING
    `;
    addrInserted++;
  }
  console.log(`Addresses migrated: ${addrInserted}`);

  // 3. ORDERS (26)
  console.log('\n--- 3. Migrating ORDERS ---');
  const orders = db.prepare('SELECT * FROM orders ORDER BY id').all();
  console.log(`SQLite orders count: ${orders.length}`);
  let ordersInserted = 0;
  for (const o of orders) {
    await sql`
      INSERT INTO orders (
        id, order_number, customer_id, status, payment_status,
        subtotal, tax_total, shipping_total, discount_total, grand_total,
        currency, shipping_address_id, billing_address_id, is_interstate,
        placed_at, idempotency_key, created_at, updated_at, coupon_code
      ) VALUES (
        ${o.id}, ${o.order_number}, ${o.customer_id}, ${o.status ?? 'Pending'}, ${o.payment_status ?? 'pending'},
        ${o.subtotal}, ${o.tax_total}, ${o.shipping_total}, ${o.discount_total ?? 0}, ${o.grand_total},
        ${o.currency ?? 'INR'}, ${o.shipping_address_id}, ${o.billing_address_id}, ${Boolean(o.is_interstate)},
        ${new Date(o.placed_at)}, ${o.idempotency_key}, ${new Date(o.created_at)}, ${new Date(o.updated_at)}, ${o.coupon_code}
      )
      ON CONFLICT (id) DO NOTHING
    `;
    ordersInserted++;
  }
  console.log(`Orders migrated: ${ordersInserted}`);

  // 4. ORDER_ITEMS (25)
  console.log('\n--- 4. Migrating ORDER_ITEMS ---');
  const orderItems = db.prepare('SELECT * FROM order_items ORDER BY id').all();
  console.log(`SQLite order_items count: ${orderItems.length}`);
  let oiInserted = 0;
  for (const oi of orderItems) {
    const validVariantId = validVariantIds.has(oi.variant_id) ? oi.variant_id : null;
    await sql`
      INSERT INTO order_items (
        id, order_id, variant_id, product_name_snapshot, variant_label_snapshot,
        sku_snapshot, hsn_snapshot, gst_rate_snapshot, unit_price_snapshot,
        qty, tax_amount, line_total
      ) VALUES (
        ${oi.id}, ${oi.order_id}, ${validVariantId}, ${oi.product_name_snapshot}, ${oi.variant_label_snapshot},
        ${oi.sku_snapshot}, ${oi.hsn_snapshot}, ${oi.gst_rate_snapshot}, ${oi.unit_price_snapshot},
        ${oi.qty}, ${oi.tax_amount}, ${oi.line_total}
      )
      ON CONFLICT (id) DO NOTHING
    `;
    oiInserted++;
  }
  console.log(`Order items migrated: ${oiInserted}`);

  // 5. PAYMENTS (1)
  console.log('\n--- 5. Migrating PAYMENTS ---');
  const payments = db.prepare('SELECT * FROM payments ORDER BY id').all();
  console.log(`SQLite payments count: ${payments.length}`);
  let payInserted = 0;
  for (const p of payments) {
    await sql`
      INSERT INTO payments (
        id, order_id, provider, provider_payment_id, amount,
        status, method, raw_payload, created_at
      ) VALUES (
        ${p.id}, ${p.order_id}, ${p.provider ?? 'RAZORPAY'}, ${p.provider_payment_id}, ${p.amount},
        ${p.status}, ${p.method ?? 'HOSTED_CHECKOUT'}, ${p.raw_payload}, ${new Date(p.created_at)}
      )
      ON CONFLICT (id) DO NOTHING
    `;
    payInserted++;
  }
  console.log(`Payments migrated: ${payInserted}`);

  // 6. RETURNS (71)
  console.log('\n--- 6. Migrating RETURNS ---');
  const returns = db.prepare('SELECT * FROM returns ORDER BY id').all();
  console.log(`SQLite returns count: ${returns.length}`);
  let retInserted = 0;
  for (const r of returns) {
    await sql`
      INSERT INTO returns (
        id, order_id, customer_id, type, reason, status,
        refund_amount, is_rto, inspected_by, inspection_result,
        inspection_notes, created_at, updated_at
      ) VALUES (
        ${r.id}, ${r.order_id}, ${r.customer_id}, ${r.type ?? 'CUSTOMER_INITIATED'}, ${r.reason}, ${r.status ?? 'REQUESTED'},
        ${r.refund_amount}, ${Boolean(r.is_rto)}, ${r.inspected_by}, ${r.inspection_result},
        ${r.inspection_notes ?? ''}, ${new Date(r.created_at)}, ${new Date(r.updated_at)}
      )
      ON CONFLICT (id) DO NOTHING
    `;
    retInserted++;
  }
  console.log(`Returns migrated: ${retInserted}`);

  // 7. RETURN_ITEMS (71)
  console.log('\n--- 7. Migrating RETURN_ITEMS ---');
  const returnItems = db.prepare('SELECT * FROM return_items ORDER BY id').all();
  console.log(`SQLite return_items count: ${returnItems.length}`);
  let riInserted = 0;
  for (const ri of returnItems) {
    await sql`
      INSERT INTO return_items (
        id, return_id, order_item_id, variant_id, qty, unit_price, tax_amount, line_total
      ) VALUES (
        ${ri.id}, ${ri.return_id}, ${ri.order_item_id}, ${ri.variant_id}, ${ri.qty},
        ${ri.unit_price}, ${ri.tax_amount}, ${ri.line_total}
      )
      ON CONFLICT (id) DO NOTHING
    `;
    riInserted++;
  }
  console.log(`Return items migrated: ${riInserted}`);

  // 8. CARTS (15)
  console.log('\n--- 8. Migrating CARTS ---');
  const carts = db.prepare('SELECT * FROM carts ORDER BY id').all();
  console.log(`SQLite carts count: ${carts.length}`);
  let cartsInserted = 0;
  for (const c of carts) {
    const expiresMs = BigInt(new Date(c.expires_at).getTime());
    await sql`
      INSERT INTO carts (
        id, customer_id, session_token, status, expires_at, created_at, updated_at
      ) VALUES (
        ${c.id}, ${c.customer_id}, ${c.session_token}, ${c.status ?? 'ACTIVE'},
        ${expiresMs}, ${new Date(c.created_at)}, ${new Date(c.updated_at)}
      )
      ON CONFLICT (id) DO NOTHING
    `;
    cartsInserted++;
  }
  console.log(`Carts migrated: ${cartsInserted}`);

  // 9. CART_ITEMS (10)
  console.log('\n--- 9. Migrating CART_ITEMS ---');
  const cartItems = db.prepare('SELECT * FROM cart_items ORDER BY id').all();
  console.log(`SQLite cart_items count: ${cartItems.length}`);
  let ciInserted = 0;
  for (const ci of cartItems) {
    const validVariantId = validVariantIds.has(ci.variant_id) ? ci.variant_id : null;
    await sql`
      INSERT INTO cart_items (
        id, cart_id, variant_id, qty, unit_price_snapshot, created_at
      ) VALUES (
        ${ci.id}, ${ci.cart_id}, ${validVariantId}, ${ci.qty ?? 1},
        ${ci.unit_price_snapshot}, ${new Date(ci.created_at)}
      )
      ON CONFLICT (id) DO NOTHING
    `;
    ciInserted++;
  }
  console.log(`Cart items migrated: ${ciInserted}`);

  // 10. INVENTORY_TXNS (65)
  console.log('\n--- 10. Migrating INVENTORY_TXNS ---');
  const invTxns = db.prepare('SELECT * FROM inventory_txns ORDER BY id').all();
  console.log(`SQLite inventory_txns count: ${invTxns.length}`);
  let itInserted = 0;
  for (const it of invTxns) {
    await sql`
      INSERT INTO inventory_txns (
        id, variant_id, delta, reason, order_id, actor_id, balance_after, created_at
      ) VALUES (
        ${it.id}, ${it.variant_id}, ${it.delta}, ${it.reason},
        ${it.order_id}, ${it.actor_id}, ${it.balance_after}, ${new Date(it.created_at)}
      )
      ON CONFLICT (id) DO NOTHING
    `;
    itInserted++;
  }
  console.log(`Inventory txns migrated: ${itInserted}`);

  // 11. ENQUIRIES (8)
  console.log('\n--- 11. Migrating ENQUIRIES ---');
  const enquiries = db.prepare('SELECT * FROM enquiries ORDER BY id').all();
  console.log(`SQLite enquiries count: ${enquiries.length}`);
  let enqInserted = 0;
  for (const e of enquiries) {
    await sql`
      INSERT INTO enquiries (
        id, customer_id, product_id, variant_id, name, phone, email,
        message, source, status, assigned_to, value_estimate,
        created_at, updated_at, closed_at, lost_reason
      ) VALUES (
        ${e.id}, ${e.customer_id}, ${e.product_id}, ${e.variant_id}, ${e.name}, ${e.phone}, ${e.email},
        ${e.message ?? ''}, ${e.source ?? 'Product Page'}, ${e.status ?? 'New'}, ${e.assigned_to}, ${e.value_estimate},
        ${new Date(e.created_at)}, ${new Date(e.updated_at)},
        ${e.closed_at ? new Date(e.closed_at) : null}, ${e.lost_reason}
      )
      ON CONFLICT (id) DO NOTHING
    `;
    enqInserted++;
  }
  console.log(`Enquiries migrated: ${enqInserted}`);

  // 12. NEWSLETTER_SUBSCRIBERS (1)
  console.log('\n--- 12. Migrating NEWSLETTER_SUBSCRIBERS ---');
  const subscribers = db.prepare('SELECT * FROM newsletter_subscribers ORDER BY id').all();
  console.log(`SQLite newsletter_subscribers count: ${subscribers.length}`);
  let subInserted = 0;
  for (const s of subscribers) {
    await sql`
      INSERT INTO newsletter_subscribers (
        id, email, source, created_at
      ) VALUES (
        ${s.id}, ${s.email}, ${s.source ?? 'Footer Form'}, ${new Date(s.created_at)}
      )
      ON CONFLICT (id) DO NOTHING
    `;
    subInserted++;
  }
  console.log(`Newsletter subscribers migrated: ${subInserted}`);

  // 13. NOTIFICATION_LOG (6)
  console.log('\n--- 13. Migrating NOTIFICATION_LOG ---');
  const notifs = db.prepare('SELECT * FROM notification_log ORDER BY id').all();
  console.log(`SQLite notification_log count: ${notifs.length}`);
  let notifInserted = 0;
  for (const n of notifs) {
    await sql`
      INSERT INTO notification_log (
        id, channel, template, recipient, entity_type, entity_id,
        status, sent_at, error, created_at
      ) VALUES (
        ${n.id}, ${n.channel}, ${n.template}, ${n.recipient}, ${n.entity_type}, ${n.entity_id},
        ${n.status ?? 'LOGGED_DEV'}, ${n.sent_at ? new Date(n.sent_at) : null}, ${n.error}, ${new Date(n.created_at)}
      )
      ON CONFLICT (id) DO NOTHING
    `;
    notifInserted++;
  }
  console.log(`Notification logs migrated: ${notifInserted}`);

  // 14. CRM_ACTIVITIES (18)
  console.log('\n--- 14. Migrating CRM_ACTIVITIES ---');
  const crmActs = db.prepare('SELECT * FROM crm_activities ORDER BY id').all();
  console.log(`SQLite crm_activities count: ${crmActs.length}`);
  let actInserted = 0;
  for (const a of crmActs) {
    await sql`
      INSERT INTO crm_activities (
        id, entity_type, entity_id, actor_id, type, summary, meta, created_at
      ) VALUES (
        ${a.id}, ${a.entity_type}, ${a.entity_id}, ${a.actor_id}, ${a.type},
        ${a.summary}, ${a.meta}, ${new Date(a.created_at)}
      )
      ON CONFLICT (id) DO NOTHING
    `;
    actInserted++;
  }
  console.log(`CRM activities migrated: ${actInserted}`);

  // 15. RESET ALL SERIAL SEQUENCES
  console.log('\n--- 15. Resetting PostgreSQL Sequences ---');
  const tablesWithSerial = [
    'customers',
    'addresses',
    'orders',
    'order_items',
    'payments',
    'returns',
    'return_items',
    'carts',
    'cart_items',
    'inventory_txns',
    'enquiries',
    'notification_log',
    'crm_activities'
  ];

  for (const table of tablesWithSerial) {
    await sql.unsafe(`
      SELECT setval(pg_get_serial_sequence('${table}', 'id'), COALESCE((SELECT MAX(id) FROM "${table}"), 1));
    `);
    console.log(`Reset sequence for ${table}`);
  }

  // 16. Log skipped records
  console.log('\n--- 16. Skipped Records Summary ---');
  const comboItems = db.prepare('SELECT * FROM combo_items').all();
  console.log(`Skipped ${comboItems.length} orphaned combo_items test rows:`);
  for (const ci of comboItems) {
    console.log(`  - ComboItem id=${ci.id}: combo_variant_id=${ci.combo_variant_id}, component_variant_id=${ci.component_variant_id} (deleted test variants)`);
  }

  console.log('\n====================================================');
  console.log('DATA MIGRATION COMPLETED SUCCESSFULLY!');
  console.log('====================================================\n');

  await sql.end();
  db.close();
}

runMigration().catch(err => {
  console.error('\n*** MIGRATION FAILED ***', err);
  process.exit(1);
});
