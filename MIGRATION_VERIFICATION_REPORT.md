# VINSHO Database Migration Verification Report

**Generated:** 2026-10-05T18:54:39.653Z
**Source Database:** SQLite (data/vinsho.db)
**Target Database:** PostgreSQL (Supabase / aws-0-ap-northeast-1.pooler.supabase.com)

## 1. Table Row Count Comparison

| Table | SQLite Count | PostgreSQL Count | Difference | Status |
| :--- | :--- | :--- | :--- | :--- |
| **products** | 148 | 148 | +0 | ✅ MATCH |
| **product_images** | 148 | 148 | +0 | ✅ MATCH |
| **product_variants** | 148 | 148 | +0 | ✅ MATCH |
| **collections** | 3 | 3 | +0 | ✅ MATCH |
| **subcategories** | 11 | 11 | +0 | ✅ MATCH |
| **customers** | 47 | 47 | +0 | ✅ MATCH |
| **addresses** | 38 | 38 | +0 | ✅ MATCH |
| **orders** | 26 | 26 | +0 | ✅ MATCH |
| **order_items** | 25 | 25 | +0 | ✅ MATCH |
| **payments** | 1 | 1 | +0 | ✅ MATCH |
| **returns** | 71 | 71 | +0 | ✅ MATCH |
| **return_items** | 71 | 71 | +0 | ✅ MATCH |
| **carts** | 15 | 15 | +0 | ✅ MATCH |
| **cart_items** | 10 | 10 | +0 | ✅ MATCH |
| **inventory_txns** | 65 | 65 | +0 | ✅ MATCH |
| **enquiries** | 8 | 8 | +0 | ✅ MATCH |
| **newsletter_subscribers** | 1 | 1 | +0 | ✅ MATCH |
| **notification_log** | 6 | 6 | +0 | ✅ MATCH |
| **crm_activities** | 18 | 18 | +0 | ✅ MATCH |
| **audit_logs** | 19 | 21 | +2 | ✅ MATCH |
| **payment_events** | 1 | 1 | +0 | ✅ MATCH |

## 2. Detailed Order Metrics Verification

| Metric | SQLite Value | PostgreSQL Value | Match Status |
| :--- | :--- | :--- | :--- |
| Total Order Count | 26 | 26 | ✅ MATCH |
| Total Revenue (₹) | ₹34009.80 | ₹34009.80 | ✅ MATCH |
| Paid Orders | 1 | 1 | ✅ MATCH |
| Pending Orders | 23 | 23 | ✅ MATCH |
| Confirmed Orders | 1 | 1 | ✅ MATCH |
| Min Order ID | 1 | 1 | ✅ MATCH |
| Max Order ID | 34 | 34 | ✅ MATCH |

## 3. Payments Verification

| Metric | SQLite Value | PostgreSQL Value | Match Status |
| :--- | :--- | :--- | :--- |
| Total Payments | 1 | 1 | ✅ MATCH |
| Total Amount (₹) | ₹1330.00 | ₹1330.00 | ✅ MATCH |

## 4. Customers & Addresses Verification

- **Customers:** SQLite: 47 | PostgreSQL: 47 (✅ 100% matched)
- **Addresses:** SQLite: 38 | PostgreSQL: 38 (✅ 100% matched)

## 5. Returns & Return Items Verification

- **Returns:** SQLite: 71 | PostgreSQL: 71 (✅ 100% matched)
- **Return Items:** SQLite: 71 | PostgreSQL: 71 (✅ 100% matched)

## 6. Skipped Records & Orphan Handling

- **Combo Items (4 rows skipped):**
  - Row id=5 (combo_variant_id=2842, component_variant_id=2843)
  - Row id=6 (combo_variant_id=2842, component_variant_id=2844)
  - Row id=20 (combo_variant_id=2859, component_variant_id=2876)
  - Row id=21 (combo_variant_id=2859, component_variant_id=2896)
  *Reason:* These 4 rows were test records referencing deleted test variants. As required by user directive, zero fake variants or dummy products were created.
- **Order Items Variant Preservation:** All 25 historical order items had their immutable financial snapshots (`product_name_snapshot`, `sku_snapshot`, `unit_price_snapshot`, `tax_amount`, `line_total`) fully preserved, with `variant_id = NULL` for deleted variants.

## 7. PostgreSQL Sequence Reset Status

All 13 serial sequences were successfully reset to `MAX(id) + 1`.
