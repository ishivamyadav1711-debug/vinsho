import { prisma, getNextSequenceNumber } from './db.js';
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

export async function createQuotation(params: CreateQuotationParams): Promise<any> {
  const quoteNumber = await getNextSequenceNumber('QUOTE', 'VIN-Q');
  const now = new Date();
  const validUntil = new Date(now.getTime() + (params.validDays || 14) * 24 * 60 * 60 * 1000);

  let subtotal = 0;
  let taxTotal = 0;
  const processedItems: any[] = [];

  for (const item of params.items) {
    const v = await prisma.productVariants.findUnique({
      where: { id: item.variantId },
      include: { product: true }
    });

    if (!v) throw new Error(`Variant ID ${item.variantId} not found.`);

    const unitPrice = v.selling_price ? Number(v.selling_price) : 0;
    const lineSubtotal = unitPrice * item.qty;
    const discount = item.discount || 0;
    const lineTotal = lineSubtotal - discount;
    const label = [v.size, v.colour].filter(Boolean).join(' / ') || 'Standard';

    subtotal += lineTotal;
    taxTotal += lineTotal * 0.18; // 18% GST estimate

    processedItems.push({
      variantId: v.id,
      productNameSnapshot: v.product.name,
      variantLabelSnapshot: label,
      unitPrice,
      qty: item.qty,
      discount,
      lineTotal
    });
  }

  const grandTotal = Number((subtotal + taxTotal).toFixed(2));

  return await prisma.$transaction(async (tx) => {
    const quotation = await tx.quotations.create({
      data: {
        quote_number: quoteNumber,
        customer_id: params.customerId,
        enquiry_id: params.enquiryId || null,
        created_by: params.createdBy,
        status: 'SENT',
        subtotal: subtotal,
        discount_total: 0,
        tax_total: taxTotal,
        shipping_total: 0,
        grand_total: grandTotal,
        valid_until: validUntil,
        notes: params.notes || '',
        created_at: now,
        updated_at: now
      }
    });

    const quoteId = quotation.id;

    for (const item of processedItems) {
      await tx.quotationItems.create({
        data: {
          quotation_id: quoteId,
          variant_id: item.variantId,
          product_name_snapshot: item.productNameSnapshot,
          variant_label_snapshot: item.variantLabelSnapshot,
          unit_price: item.unitPrice,
          qty: item.qty,
          discount: item.discount,
          line_total: item.lineTotal
        }
      });
    }

    await logCrmActivity({
      entityType: 'customer',
      entityId: params.customerId,
      actorId: params.createdBy,
      type: 'QUOTATION_CREATED',
      summary: `Created Quotation #${quoteNumber} for ₹${grandTotal.toLocaleString('en-IN')}`,
      meta: { quoteNumber, grandTotal }
    });

    return await tx.quotations.findUnique({
      where: { id: quoteId },
      include: { QuotationItems: true }
    });
  });
}

export async function convertQuotationToOrder(quotationId: number, actorId: number): Promise<any> {
  const quote = await prisma.quotations.findUnique({
    where: { id: quotationId },
    include: { QuotationItems: true }
  });
  if (!quote) throw new Error('Quotation not found.');

  const customer = await prisma.customers.findUnique({ where: { id: quote.customer_id } });
  if (!customer) throw new Error('Customer not found.');

  const address = await prisma.addresses.findFirst({
    where: { customer_id: quote.customer_id },
    orderBy: { created_at: 'desc' }
  }) || {
    name: customer.name,
    phone: customer.phone,
    line1: 'Corporate Delivery Desk',
    line2: '',
    city: 'Karnal',
    state: 'Haryana',
    pincode: '132001'
  };

  const orderResult = await createOrder({
    customerId: quote.customer_id,
    items: quote.QuotationItems.map(i => ({ variantId: i.variant_id, qty: i.qty })),
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

  const now = new Date();
  await prisma.quotations.update({
    where: { id: quotationId },
    data: {
      status: 'ACCEPTED',
      updated_at: now
    }
  });

  await logCrmActivity({
    entityType: 'customer',
    entityId: quote.customer_id,
    actorId,
    type: 'QUOTATION_ACCEPTED',
    summary: `Converted Quotation #${quote.quote_number} to Order #${orderResult.order.order_number}`,
    meta: { quoteId: quotationId, orderId: orderResult.order.id }
  });

  return orderResult.order;
}
