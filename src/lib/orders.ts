import { db, getNextSequenceNumber } from './db.js';
import { calculateShipping } from './shipping.js';
import { calculateLineTax } from './tax.js';
import { atomicDecrementStock } from './inventory.js';
import { logNotification } from './notifications.js';
import { validateAndCalculateCoupon } from './coupons.js';
import { getComboAvailability, getComboComponents } from './combos.js';

export interface CreateOrderParams {
  sessionToken?: string;
  customerId: number;
  couponCode?: string | null;
  items?: Array<{
    variantId: number;
    qty: number;
  }>;
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

  // Idempotency check: Double-submitted checkout must produce 1 order, not 2
  const existingOrder = db.prepare('SELECT * FROM orders WHERE idempotency_key = ?').get(cleanIdempotencyKey) as any;
  if (existingOrder) {
    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(existingOrder.id);
    return { success: true, order: { ...existingOrder, items } };
  }

  const rawItems = params.items || [];
  if (rawItems.length === 0) {
    return { success: false, error: 'No items provided for order creation.' };
  }

  // Load variant details directly from DB
  const cartItems: any[] = [];
  for (const raw of rawItems) {
    const v = db.prepare(`
      SELECT v.*, p.slug as product_slug, p.name as product_name, p.shipping_class, p.launch_phase, p.sellable_online, p.is_purchasable
      FROM product_variants v
      JOIN products p ON v.product_id = p.id
      WHERE v.id = ? AND p.deleted_at IS NULL
    `).get(raw.variantId) as any;
    if (!v) {
      return { success: false, error: `Variant ID ${raw.variantId} not found in database.` };
    }
    cartItems.push({
      variantId: v.id,
      productSlug: v.product_slug,
      productName: v.product_name,
      shippingClass: v.shipping_class,
      packedWeightKg: v.packed_weight_kg,
      packedL: v.packed_l_cm,
      packedB: v.packed_b_cm,
      packedH: v.packed_h_cm,
      qty: raw.qty,
      sellingPrice: v.selling_price,
      stock: v.stock !== null && v.stock !== undefined ? v.stock : 100,
      isPurchasable: v.is_purchasable
    });
  }

  // Re-verify purchasability gate & live stock (including combo component availability)
  for (const item of cartItems) {
    if (!item.isPurchasable) {
      return { success: false, error: `Checkout blocked: Item '${item.productName}' fails Legal Metrology purchasability gate or is Made-to-Order.` };
    }

    const comboAvail = getComboAvailability(item.variantId);
    if (comboAvail.isBundle) {
      if (comboAvail.maxSellableCombos < item.qty) {
        return { success: false, error: `Checkout blocked: Item '${item.productName}' has insufficient component stock balance (Requested: ${item.qty}, Available: ${comboAvail.maxSellableCombos}).` };
      }
    } else {
      if (item.stock < item.qty) {
        return { success: false, error: `Checkout blocked: Item '${item.productName}' has insufficient stock (Requested: ${item.qty}, Available: ${item.stock}).` };
      }
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
      skuSnapshot: variantRow.sku || `SKU-${item.variantId}`,
      hsnSnapshot: hsnCode,
      gstRateSnapshot: gstRate,
      unitPriceSnapshot: unitPrice,
      qty: item.qty,
      taxAmount: taxResult.totalTax,
      lineTotal: lineSubtotal + taxResult.totalTax
    });
  }

  // 5. Server-Authoritative Coupon Discount Calculation
  let discountTotal = 0;
  let appliedCouponCode: string | null = null;

  if (params.couponCode && params.couponCode.trim() !== '') {
    const couponRes = validateAndCalculateCoupon(params.couponCode, subtotal);
    if (!couponRes.valid) {
      return { success: false, error: couponRes.error || 'Invalid coupon code.' };
    }
    discountTotal = couponRes.discountAmount;
    appliedCouponCode = couponRes.code || params.couponCode.trim().toUpperCase();
  }

  // Guard against discount exceeding subtotal or being negative
  discountTotal = Math.max(0, Math.min(discountTotal, subtotal));

  const shippingTotal = shipResult.shippingFee;
  const grandTotal = Number(Math.max(0, subtotal - discountTotal + taxTotal + shippingTotal).toFixed(2));
  const isInterstate = shipResult.serviceable ? (buyerState.toLowerCase() !== 'haryana' ? 1 : 0) : 0;

  // Generate Gapless Order Number (VIN-2026-000001)
  const orderNumber = getNextSequenceNumber('ORDER', 'VIN');

  return db.transaction(() => {
    // Insert Order Record
    const orderRes = db.prepare(`
      INSERT INTO orders (
        order_number, customer_id, status, payment_status, subtotal, tax_total, shipping_total, discount_total, coupon_code,
        grand_total, currency, shipping_address_id, billing_address_id, is_interstate, placed_at, idempotency_key, created_at, updated_at
      ) VALUES (?, ?, 'Pending', 'pending', ?, ?, ?, ?, ?, ?, 'INR', ?, ?, ?, ?, ?, ?, ?)
    `).run(
      orderNumber,
      params.customerId,
      subtotal,
      taxTotal,
      shippingTotal,
      discountTotal,
      appliedCouponCode,
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

    // Insert Snapshotted Order Items & Deduct Component/Standalone Inventory
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

      const comboComponents = getComboComponents(oi.variantId);
      if (comboComponents.length > 0) {
        // Atomic component stock deduction for bundles
        for (const comp of comboComponents) {
          const totalCompQty = comp.quantity * oi.qty;
          const stockRes = atomicDecrementStock({
            variantId: comp.component_variant_id,
            delta: -totalCompQty,
            reason: 'SALE',
            orderId
          });
          if (!stockRes.success) {
            throw new Error(`Stock deduction failed for component '${comp.component_name}' (ID ${comp.component_variant_id}): ${stockRes.error}`);
          }
        }
      } else {
        // Atomic stock deduction for standalone variants
        const stockRes = atomicDecrementStock({
          variantId: oi.variantId,
          delta: -oi.qty,
          reason: 'SALE',
          orderId
        });
        if (!stockRes.success) {
          throw new Error(stockRes.error || `Stock deduction failed for variant ID ${oi.variantId}`);
        }
      }
    }

    const createdOrder = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId) as any;
    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(orderId) as any[];

    return { success: true, order: { ...createdOrder, items } };
  })();
}

/**
 * Fires order confirmation emails after a successful createOrder().
 */
export function sendOrderNotifications(order: any, customer: { name: string; email?: string | null }, adminEmail: string): void {
  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id) as any[];
  const addr = db.prepare('SELECT * FROM addresses WHERE id = ?').get(order.shipping_address_id) as any;

  if (customer.email) {
    logNotification({
      channel: 'EMAIL',
      template: 'ORDER_CONFIRMATION',
      recipient: customer.email,
      entityType: 'order',
      entityId: order.id,
      data: {
        customerName: customer.name,
        orderNumber: order.order_number,
        grandTotal: order.grand_total,
        discountTotal: order.discount_total || 0,
        couponCode: order.coupon_code || '',
        items,
        shippingAddress: addr || {},
      },
    });
  }

  logNotification({
    channel: 'EMAIL',
    template: 'NEW_ENQUIRY_STAFF',
    recipient: adminEmail,
    entityType: 'order',
    entityId: order.id,
    data: {
      enquiryId: order.id,
      customerName: customer.name,
      phone: addr?.phone || '',
      subject: `Order ${order.order_number} — ₹${order.grand_total}${order.coupon_code ? ' (Coupon: ' + order.coupon_code + ')' : ''}`,
      source: 'Checkout',
    },
  });
}
