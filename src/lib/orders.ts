import { prisma, getNextSequenceNumber } from './db.js';
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

export async function createOrder(params: CreateOrderParams): Promise<OrderCreationResult> {
  const cleanIdempotencyKey = params.idempotencyKey.trim();

  // Idempotency check: Double-submitted checkout must produce 1 order, not 2
  const existingOrder = await prisma.orders.findUnique({
    where: { idempotency_key: cleanIdempotencyKey },
    include: { OrderItems: true }
  });
  if (existingOrder) {
    return { success: true, order: existingOrder };
  }

  const rawItems = params.items || [];
  if (rawItems.length === 0) {
    return { success: false, error: 'No items provided for order creation.' };
  }

  // Load variant details directly from DB
  const cartItems: any[] = [];
  for (const raw of rawItems) {
    const v = await prisma.productVariants.findFirst({
      where: {
        id: raw.variantId,
        product: {
          deleted_at: null,
          id: { not: 999999 } // Guard against stubs
        }
      },
      include: {
        product: true
      }
    });

    if (!v) {
      return { success: false, error: `Variant ID ${raw.variantId} not found in database.` };
    }
    cartItems.push({
      variantId: v.id,
      productSlug: v.product.slug,
      productName: v.product.name,
      shippingClass: v.product.shipping_class,
      packedWeightKg: v.packed_weight_kg ? Number(v.packed_weight_kg) : undefined,
      packedL: v.packed_l_cm ? Number(v.packed_l_cm) : undefined,
      packedB: v.packed_b_cm ? Number(v.packed_b_cm) : undefined,
      packedH: v.packed_h_cm ? Number(v.packed_h_cm) : undefined,
      qty: raw.qty,
      sellingPrice: v.selling_price ? Number(v.selling_price) : 0,
      stock: v.stock !== null && v.stock !== undefined ? v.stock : 100,
      isPurchasable: v.product.is_purchasable,
      gstRate: v.gst_rate ? Number(v.gst_rate) : 18,
      hsnCode: v.hsn_code || '9404',
      size: v.size,
      colour: v.colour,
      sku: v.sku
    });
  }

  // Re-verify purchasability gate & live stock (including combo component availability)
  for (const item of cartItems) {
    if (!item.isPurchasable) {
      return { success: false, error: `Checkout blocked: Item '${item.productName}' fails Legal Metrology purchasability gate or is Made-to-Order.` };
    }

    const comboAvail = await getComboAvailability(item.variantId);
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
  const now = new Date();
  const address = await prisma.addresses.create({
    data: {
      customer_id: params.customerId,
      type: 'SHIPPING',
      name: params.shippingAddress.name.trim(),
      phone: params.shippingAddress.phone.trim(),
      line1: params.shippingAddress.line1.trim(),
      line2: (params.shippingAddress.line2 || '').trim(),
      city: params.shippingAddress.city.trim(),
      state: params.shippingAddress.state.trim(),
      pincode: params.shippingAddress.pincode.trim(),
      country: params.shippingAddress.country || 'India',
      created_at: now
    }
  });
  const addressId = address.id;

  // 4. Calculate Taxes & Line Item Snapshots
  let subtotal = 0;
  let taxTotal = 0;
  const processedOrderItems: any[] = [];
  const buyerState = params.shippingAddress.state;

  for (const item of cartItems) {
    const unitPrice = item.sellingPrice;
    const lineSubtotal = unitPrice * item.qty;
    const gstRate = item.gstRate;
    const hsnCode = item.hsnCode;

    const taxResult = calculateLineTax(unitPrice, item.qty, gstRate, buyerState);

    subtotal += lineSubtotal;
    taxTotal += taxResult.totalTax;

    const variantLabel = [item.size, item.colour].filter(Boolean).join(' / ') || 'Standard';

    processedOrderItems.push({
      variantId: item.variantId,
      productNameSnapshot: item.productName,
      variantLabelSnapshot: variantLabel,
      skuSnapshot: item.sku || `SKU-${item.variantId}`,
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

  discountTotal = Math.max(0, Math.min(discountTotal, subtotal));

  const shippingTotal = shipResult.shippingFee;
  const grandTotal = Number(Math.max(0, subtotal - discountTotal + taxTotal + shippingTotal).toFixed(2));
  const isInterstate = shipResult.serviceable ? (buyerState.toLowerCase() !== 'haryana') : false;

  // Generate Gapless Order Number (VIN-2026-000001)
  const orderNumber = await getNextSequenceNumber('ORDER', 'VIN');

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Insert Order Record
      const createdOrder = await tx.orders.create({
        data: {
          order_number: orderNumber,
          customer_id: params.customerId,
          status: 'Pending',
          payment_status: 'pending',
          subtotal: subtotal,
          tax_total: taxTotal,
          shipping_total: shippingTotal,
          discount_total: discountTotal,
          coupon_code: appliedCouponCode,
          grand_total: grandTotal,
          currency: 'INR',
          shipping_address_id: addressId,
          billing_address_id: addressId,
          is_interstate: isInterstate,
          placed_at: now,
          idempotency_key: cleanIdempotencyKey,
          created_at: now,
          updated_at: now
        }
      });

      const orderId = createdOrder.id;

      // Insert Snapshotted Order Items & Deduct Component/Standalone Inventory
      for (const oi of processedOrderItems) {
        await tx.orderItems.create({
          data: {
            order_id: orderId,
            variant_id: oi.variantId,
            product_name_snapshot: oi.productNameSnapshot,
            variant_label_snapshot: oi.variantLabelSnapshot,
            sku_snapshot: oi.skuSnapshot,
            hsn_snapshot: oi.hsnSnapshot,
            gst_rate_snapshot: oi.gstRateSnapshot,
            unit_price_snapshot: oi.unitPriceSnapshot,
            qty: oi.qty,
            tax_amount: oi.taxAmount,
            line_total: oi.lineTotal
          }
        });

        const comboComponents = await getComboComponents(oi.variantId);
        if (comboComponents.length > 0) {
          // Atomic component stock deduction for bundles
          for (const comp of comboComponents) {
            const totalCompQty = comp.quantity * oi.qty;
            const stockRes = await atomicDecrementStock({
              variantId: comp.component_variant_id,
              delta: -totalCompQty,
              reason: 'SALE',
              orderId
            }, tx);
            if (!stockRes.success) {
              throw new Error(`Stock deduction failed for component '${comp.component_name}' (ID ${comp.component_variant_id}): ${stockRes.error}`);
            }
          }
        } else {
          // Atomic stock deduction for standalone variants
          const stockRes = await atomicDecrementStock({
            variantId: oi.variantId,
            delta: -oi.qty,
            reason: 'SALE',
            orderId
          }, tx);
          if (!stockRes.success) {
            throw new Error(stockRes.error || `Stock deduction failed for variant ID ${oi.variantId}`);
          }
        }
      }

      const fullOrder = await tx.orders.findUnique({
        where: { id: orderId },
        include: { OrderItems: true }
      });

      return fullOrder;
    });

    return { success: true, order: result };
  } catch (err: any) {
    console.error('createOrder transaction error:', err);
    return { success: false, error: err.message || 'Order creation failed' };
  }
}

/**
 * Fires order confirmation emails after a successful createOrder().
 */
export async function sendOrderNotifications(order: any, customer: { name: string; email?: string | null }, adminEmail: string): Promise<void> {
  const items = await prisma.orderItems.findMany({
    where: { order_id: order.id }
  });
  const addr = await prisma.addresses.findUnique({
    where: { id: order.shipping_address_id }
  });

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
        grandTotal: Number(order.grand_total),
        discountTotal: Number(order.discount_total || 0),
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

export const VALID_ORDER_STATUSES = [
  'Pending',
  'Confirmed',
  'Processing',
  'Shipped',
  'Delivered',
  'Cancelled',
  'Returned'
] as const;

export type OrderStatus = typeof VALID_ORDER_STATUSES[number];

export const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  Pending: ['Confirmed', 'Cancelled'],
  Confirmed: ['Processing', 'Cancelled'],
  Processing: ['Shipped', 'Cancelled'],
  Shipped: ['Delivered', 'Returned'],
  Delivered: ['Returned'],
  Cancelled: [],
  Returned: []
};

export async function updateOrderStatus(params: {
  orderId: number;
  newStatus: string;
  actorId?: number;
  notes?: string;
}): Promise<{ success: boolean; error?: string; order?: any }> {
  const { orderId, newStatus, actorId } = params;

  return await prisma.$transaction(async (tx) => {
    const order = await tx.orders.findUnique({
      where: { id: orderId }
    });

    if (!order) {
      return { success: false, error: 'Order not found.' };
    }

    const currentStatus = order.status;
    const allowedNext = VALID_STATUS_TRANSITIONS[currentStatus] || [];

    if (!allowedNext.includes(newStatus)) {
      return {
        success: false,
        error: `Invalid status transition from '${currentStatus}' to '${newStatus}'. Allowed: ${allowedNext.join(', ') || 'None'}`
      };
    }

    // Cancellation: restore inventory if previously deducted
    if (newStatus === 'Cancelled') {
      const saleTxns = await tx.inventoryTxns.findMany({
        where: { order_id: orderId, reason: 'SALE' }
      });

      for (const txn of saleTxns) {
        if (txn.delta < 0) {
          const qtyToRestore = Math.abs(txn.delta);
          await tx.productVariants.update({
            where: { id: txn.variant_id },
            data: { stock: { increment: qtyToRestore } }
          });

          const v = await tx.productVariants.findUnique({
            where: { id: txn.variant_id },
            select: { stock: true }
          });

          await tx.inventoryTxns.create({
            data: {
              variant_id: txn.variant_id,
              delta: qtyToRestore,
              reason: 'ORDER_CANCELLATION_RESTORATION',
              order_id: orderId,
              actor_id: actorId || null,
              balance_after: v?.stock ?? 0,
              created_at: new Date()
            }
          });
        }
      }
    }

    const updated = await tx.orders.update({
      where: { id: orderId },
      data: {
        status: newStatus,
        updated_at: new Date()
      }
    });

    return { success: true, order: updated };
  });
}

