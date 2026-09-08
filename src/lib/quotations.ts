import { db, getNextSequenceNumber } from './db.js';
import { logCrmActivity } from './crm.js';
import { createOrder } from './orders.js';

export interface CreateQuotationParams {
  customerId: number;
  enquiryId?: number | null;
  createdBy: number;
  validDays?: number;
  notes?: string;
  items: Array<{
    variantId: number;
    qty: number;
    discount?: number;
  }>;
}

export function createQuotation(params: CreateQuotationParams) {
  const quoteNumber = getNextSequenceNumber('QUOTE', 'VIN-Q');
  const now = new Date();
  const nowIso = now.toISOString();
  const validUntil = new Date(now.getTime() + (params.validDays || 14) * 24 * 60 * 60 * 1000).toISOString();

  let subtotal = 0;
  let taxTotal = 0;
  const processedItems: any[] = [];

  for (const item of params.items) {
    const v = db.prepare(`
      SELECT v.*, p.name as product_name
      FROM product_variants v
      JOIN products p ON v.product_id = p.id
      WHERE v.id = ?
    `).get(item.variantId) as any;

    if (!v) throw new Error(`Variant ID ${item.variantId} not found.`);

    const unitPrice = v.selling_price;
    const lineSubtotal = unitPrice * item.qty;
    const discount = item.discount || 0;
    const lineTotal = lineSubtotal - discount;
    const label = [v.size, v.colour].filter(Boolean).join(' / ') || 'Standard';

    subtotal += lineTotal;
    taxTotal += lineTotal * 0.18; // 18% GST estimate

    processedItems.push({
      variantId: v.id,
      productNameSnapshot: v.product_name,
      variantLabelSnapshot: label,
      unitPrice,
      qty: item.qty,
      discount,
      lineTotal
    });
  }

  const grandTotal = Number((subtotal + taxTotal).toFixed(2));

  return db.transaction(() => {
    const res = db.prepare(`
      INSERT INTO quotations (
        quote_number, customer_id, enquiry_id, created_by, status,
        subtotal, discount_total, tax_total, shipping_total, grand_total,
        valid_until, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 'SENT', ?, 0, ?, 0, ?, ?, ?, ?, ?)
    `).run(
      quoteNumber,
      params.customerId,
      params.enquiryId || null,
      params.createdBy,
      subtotal,
      taxTotal,
      grandTotal,
      validUntil,
      params.notes || '',
      nowIso,
      nowIso
    );

    const quoteId = res.lastInsertRowid as number;

    for (const item of processedItems) {
      db.prepare(`
        INSERT INTO quotation_items (
          quotation_id, variant_id, product_name_snapshot, variant_label_snapshot,
          unit_price, qty, discount, line_total
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        quoteId,
        item.variantId,
        item.productNameSnapshot,
        item.variantLabelSnapshot,
        item.unitPrice,
        item.qty,
        item.discount,
        item.lineTotal
      );
    }

    logCrmActivity({
      entityType: 'customer',
      entityId: params.customerId,
      actorId: params.createdBy,
      type: 'QUOTATION_CREATED',
      summary: `Created Quotation #${quoteNumber} for ₹${grandTotal.toLocaleString('en-IN')}`,
      meta: { quoteNumber, grandTotal }
    });

    return db.prepare('SELECT * FROM quotations WHERE id = ?').get(quoteId);
  })();
}

export function convertQuotationToOrder(quotationId: number, actorId: number) {
  const quote = db.prepare('SELECT * FROM quotations WHERE id = ?').get(quotationId) as any;
  if (!quote) throw new Error('Quotation not found.');

  const items = db.prepare('SELECT * FROM quotation_items WHERE quotation_id = ?').all(quotationId) as any[];
  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(quote.customer_id) as any;
  const address = db.prepare('SELECT * FROM addresses WHERE customer_id = ? ORDER BY created_at DESC LIMIT 1').get(quote.customer_id) as any || {
    name: customer.name,
    phone: customer.phone,
    line1: 'Corporate Delivery Desk',
    city: 'Karnal',
    state: 'Haryana',
    pincode: '132001'
  };

  const orderResult = createOrder({
    customerId: quote.customer_id,
    items: items.map(i => ({ variantId: i.variant_id, qty: i.qty })),
    shippingAddress: {
      name: address.name || customer.name,
      phone: address.phone || customer.phone,
      line1: address.line1 || 'Corporate Address',
      line2: address.line2 || '',
      city: address.city || 'Karnal',
      state: address.state || 'Haryana',
      pincode: address.pincode || '132001'
    },
    idempotencyKey: `quote_conv_${quotationId}_${Date.now()}`
  });

  if (!orderResult.success || !orderResult.order) {
    throw new Error(orderResult.error || 'Failed to convert quotation to order.');
  }

  // Update quotation status to ACCEPTED
  db.prepare(`UPDATE quotations SET status = 'ACCEPTED', updated_at = ? WHERE id = ?`)
    .run(new Date().toISOString(), quotationId);

  logCrmActivity({
    entityType: 'customer',
    entityId: quote.customer_id,
    actorId,
    type: 'QUOTATION_ACCEPTED',
    summary: `Converted Quotation #${quote.quote_number} to Order #${orderResult.order.order_number}`,
    meta: { quoteId: quotationId, orderId: orderResult.order.id }
  });

  return orderResult.order;
}
