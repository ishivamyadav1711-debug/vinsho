# VINSHO — Pan-India E-Commerce & CRM System

This is the complete transacting online store and CRM backoffice for **VINSHO Studio** (Greater Noida, Delhi NCR, Est. 1997), built with Astro 5, TypeScript, SQLite, and Vanilla CSS.

---

## 1. Local Development & Operational Commands

### 1.1 Development Server
Start dev server in background mode per repository rules:
```bash
npx astro dev --background
```
Manage dev background process with:
- `npx astro dev status`
- `npx astro dev logs`
- `npx astro dev stop`

### 1.2 Database Importer & Test Suites
```bash
npm run seed      # Idempotent database schema & taxonomy importer
npm run test:m1   # Foundation milestone test suite
npm run test:m2   # Enquiry & CRM milestone test suite
npm run test:m3   # Commerce milestone test suite
npm run test:m4   # Operations, Compliance & Handover regression suite
```

### 1.3 Database Backup & Restore Runner
```bash
npm run db:backup                    # Creates timestamped backup at data/backups/vinsho_backup_*.db
npm run db:restore <backup_filepath> # Restores database state cleanly
```

---

## 2. Environment Variables & Production Deployment

Place secrets in `.env` (never commit to git):
```env
COMMERCE_MODE=enquiry              # 'enquiry' (default) or 'live'
RAZORPAY_WEBHOOK_SECRET=your_secret # Signature secret for payment webhooks
SESSION_SECRET=your_cookie_secret   # Cookie encryption secret
NOTIFICATIONS_DEV_MODE=true        # Set 'false' in production for live SMS/WhatsApp
```

---

## 3. Relational Database Schema Overview

The SQLite relational database (`data/vinsho.db`) contains 19 tables:
- **Taxonomy & Catalogue**: `collections`, `subcategories`, `products`, `product_images`, `product_variants`.
- **CRM & Customer Operations**: `customers`, `enquiries`, `crm_notes`, `follow_ups`, `crm_activities`, `tags`, `taggables`, `notification_log`.
- **Commerce & Orders**: `carts`, `cart_items`, `addresses`, `orders`, `order_items`, `payments`, `payment_events`, `inventory_txns`, `stock_reservations`, `invoices`, `shipping_zones`, `returns`, `return_items`, `gapless_sequences`, `admin_users`, `admin_sessions`, `audit_logs`, `login_rate_limits`, `enquiry_rate_limits`.

---

## 4. API Reference Summary

- `POST /api/enquiries` — Public quote requests with DPDP consent, honeypot filter, rate-limiting, and phone deduplication.
- `POST /api/cart` — Cart mutation API enforcing Legal Metrology purchasability gate & live stock checks.
- `POST /api/checkout` — Checkout API executing server-side pre-order checks, volumetric shipping rating, GST tax calculation, and idempotency key creation.
- `POST /api/webhooks/payment` — Signature-verified payment webhook with `provider_event_id` replay protection.
- `GET /api/admin/enquiries` — CRM enquiries pipeline & "Enquiries by Product" demand ranking.
- `POST /api/admin/returns` — Returns management & goods inspection stock gate.
- `GET /api/admin/customers/[id]/export` — DPDP Act 2023 Personal Data Export on Request.
- `DELETE /api/admin/customers/[id]/delete` — DPDP Act 2023 Right to Erasure (erases PII while preserving aggregate counts).

---

## 5. Admin Operational Guide

### 5.1 Add a Product & Make it Sellable
1. Log in to Admin Backoffice (`/admin/login`) as Super Admin or Admin (`admin@vinsho.com` / `VinshoAdmin2026!`).
2. Go to Product Catalogue (`/admin/products`).
3. Click on a product to edit details. Fill in mandatory Legal Metrology fields:
   - Manufacturer / Packer Name & Address
   - Consumer Care Contact
   - Country of Origin (`India`)
   - Add at least one complete Variant (`SKU`, `MRP`, `Selling Price`, `HSN Code`, `GST Rate`, `Net Quantity`, `Packed Weight Kg`, `Packed Dimensions L x B x H Cm`, `Stock`).
4. Click Save. The **Client Homework Audit Notice Box** will confirm purchasability status.

### 5.2 Process an Order
1. Go to Orders (`/admin/orders`).
2. Update order status: `Pending` → `Confirmed` → `Processing` → `Packed` → `Shipped` (enter tracking URL) → `Delivered`.
3. Every status change updates the audit log and sends customer notification events.

### 5.3 Handle a Return
1. Go to Returns (`/admin/returns`).
2. When reverse pickup arrives, click **Inspect**.
3. If goods are undamaged, select **PASS**. Stock is automatically restored to sellable inventory.
4. If goods are damaged, select **FAIL**. Stock is **NOT** restored; a write-off transaction (`WRITE_OFF_DAMAGED_RETURN`) is logged in `inventory_txns`.

---

## 6. Operational Runbooks & Troubleshooting

### 6.1 Webhook Backlog / Failure
If payment webhooks fail or land out of order:
- The payment webhook endpoint `/api/webhooks/payment` is idempotent using `provider_event_id`.
- Replaying any webhook from Razorpay dashboard will safely update payment status to `paid`, confirm the order, decrement stock, and generate the invoice without creating duplicate records.

### 6.2 Emergency Database Restore
If a bad migration or data entry corruption occurs:
1. List available backups: `dir data\backups`
2. Restore latest snapshot: `npm run db:restore data/backups/vinsho_backup_20260810_112618.db`
3. Verify table counts with `npm run test:m1`.

---

## 7. Factual Claims & Compliance Governance

All copy strictly adheres to [`vinsho-claims-register.json`](./vinsho-claims-register.json).
Legal compliance markers (`TODO: client and legal counsel to review before launch`) are embedded across all policy pages (`/policies/*`), invoice template, and grievance officer pages per Consumer Protection (E-Commerce) Rules 2020.
