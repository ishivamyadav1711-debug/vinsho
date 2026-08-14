import { db, getNextSequenceNumber } from './db.js';
import { getCartItems } from './cart.js';
import { calculateShipping } from './shipping.js';
import { calculateLineTax } from './tax.js';
import { atomicDecrementStock } from './inventory.js';

export interface CreateOrderParams {
  sessionToken: string;
  customerId: number;
  shippingAddress: {
    name: string;
    phone: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    pincode: string;
    country?: string;
  };
  idempotencyKey: string;
}

export interface OrderCreationResult {
  success: boolean;
  order?: any;
  error?: string;
}

export function createOrder(params: CreateOrderParams): OrderCreationResult {
  const cleanIdempotencyKey = params.idempotencyKey.trim();

  // Idempotency check: Double-submitted checkout must produce 1 order, not 2 (§5)
  const existingOrder = db.prepare('SELECT * FROM orders WHERE idempotency_key = ?').get(cleanIdempotencyKey) as any;
  if (existingOrder) {
    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(existingOrder.id);
    return { success: true, order: { ...existingOrder, items } };
  }

  // 1. Fetch Cart Items & Server-Side Pre-Checkout Verification (§5)
  const cartItems = getCartItems(params.sessionToken);
  if (cartItems.length === 0) {
    return { success: false, error: 'Your cart is empty.' };
  }

  // Re-verify purchasability gate & live stock for every line item
  for (const item of cartItems) {
    if (!item.isPurchasable) {
      return { success: false, error: `Checkout blocked: Item '${item.productName}' fails Legal Metrology purchasability gate or is Made-to-Order (${item.gateReason}).` };
    }
    if (item.stock < item.qty) {
      return { success: false, error: `Checkout blocked: Item '${item.productName}' has insufficient stock (Requested: ${item.qty}, Available: ${item.stock}).` };
    }
  }

  // 2. Calculate Shipping Fees & Pincode Serviceability
  const shippingItems = cartItems.map((c) => ({
    variantId: c.variantId,
    productSlug: c.productSlug,
    shippingClass: c.shippingClass,
    packedWeightKg: c.packedWeightKg,
    packedL: c.packedL,
    packedB: c.packedB,
    packedH: c.packedH,
    qty: c.qty,
    price: c.sellingPrice
  }));

  const cartSubtotal = cartItems.reduce((acc, c) => acc + (c.sellingPrice * c.qty), 0);
  const shipResult = calculateShipping(shippingItems, params.shippingAddress.pincode, cartSubtotal);

  if (!shipResult.serviceable) {
    return { success: false, error: `Delivery unserviceable for pincode ${params.shippingAddress.pincode}: ${shipResult.reason}` };
  }

  // 3. Save / Resolve Shipping & Billing Addresses
  const now = new Date().toISOString();
  const addrRes = db.prepare(`
    INSERT INTO addresses (customer_id, type, name, phone, line1, line2, city, state, pincode, country, created_at)
    VALUES (?, 'SHIPPING', ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    params.customerId,
    params.shippingAddress.name.trim(),
    params.shippingAddress.phone.trim(),
    params.shippingAddress.line1.trim(),
    (params.shippingAddress.line2 || '').trim(),
    params.shippingAddress.city.trim(),
    params.shippingAddress.state.trim(),
    params.shippingAddress.pincode.trim(),
    params.shippingAddress.country || 'India',
    now
  );
  const addressId = addrRes.lastInsertRowid as number;

  // 4. Calculate Taxes & Line Item Snapshots
  let subtotal = 0;
  let taxTotal = 0;
  const processedOrderItems: any[] = [];
  const buyerState = params.shippingAddress.state;

  for (const item of cartItems) {
    // Query exact variant data from DB to ensure prices are server-recomputed (§3)
    const variantRow = db.prepare(`
      SELECT v.*, p.name as product_name
      FROM product_variants v JOIN products p ON v.product_id = p.id
      WHERE v.id = ?
    `).get(item.variantId) as any;

    const unitPrice = variantRow.selling_price; // Always server-recomputed!
    const lineSubtotal = unitPrice * item.qty;
    const gstRate = variantRow.gst_rate || 18;
    const hsnCode = variantRow.hsn_code || '9404';

    const taxResult = calculateLineTax(unitPrice, item.qty, gstRate, buyerState);

    subtotal += lineSubtotal;
    taxTotal += taxResult.totalTax;

    const variantLabel = [variantRow.size, variantRow.colour].filter(Boolean).join(' / ') || 'Standard';

    processedOrderItems.push({
      variantId: item.variantId,
      productNameSnapshot: variantRow.product_name,
      variantLabelSnapshot: variantLabel,
      skuSnapshot: variantRow.sku,
      hsnSnapshot: hsnCode,
      gstRateSnapshot: gstRate,
      unitPriceSnapshot: unitPrice,
      qty: item.qty,
      taxAmount: taxResult.totalTax,
      lineTotal: lineSubtotal + taxResult.totalTax
    });
  }

  const shippingTotal = shipResult.shippingFee;
  const grandTotal = Number((subtotal + taxTotal + shippingTotal).toFixed(2));
  const isInterstate = shipResult.serviceable ? (buyerState.toLowerCase() !== 'haryana' ? 1 : 0) : 0;

  // Generate Gapless Order Number (VIN-2026-000001)
  const orderNumber = getNextSequenceNumber('ORDER', 'VIN');

  return db.transaction(() => {
    // Insert Order Record
    const orderRes = db.prepare(`
      INSERT INTO orders (
        order_number, customer_id, status, payment_status, subtotal, tax_total, shipping_total, discount_total,
        grand_total, currency, shipping_address_id, billing_address_id, is_interstate, placed_at, idempotency_key, created_at, updated_at
      ) VALUES (?, ?, 'Pending', 'pending', ?, ?, ?, 0, ?, 'INR', ?, ?, ?, ?, ?, ?, ?)
    `).run(
      orderNumber,
      params.customerId,
      subtotal,
      taxTotal,
      shippingTotal,
      grandTotal,
      addressId,
      addressId,
      isInterstate,
      now,
      cleanIdempotencyKey,
      now,
      now
    );

    const orderId = orderRes.lastInsertRowid as number;

    // Insert Snapshotted Order Items (§1)
    for (const oi of processedOrderItems) {
      db.prepare(`
        INSERT INTO order_items (
          order_id, variant_id, product_name_snapshot, variant_label_snapshot, sku_snapshot,
          hsn_snapshot, gst_rate_snapshot, unit_price_snapshot, qty, tax_amount, line_total
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        orderId,
        oi.variantId,
        oi.productNameSnapshot,
        oi.variantLabelSnapshot,
        oi.skuSnapshot,
        oi.hsnSnapshot,
        oi.gstRateSnapshot,
        oi.unitPriceSnapshot,
        oi.qty,
        oi.taxAmount,
        oi.lineTotal
      );
    }

    const createdOrder = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId) as any;
    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(orderId);

    return { success: true, order: { ...createdOrder, items } };
  })();
}
