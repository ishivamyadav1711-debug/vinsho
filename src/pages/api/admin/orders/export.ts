import type { APIRoute } from 'astro';
import { prisma } from '../../../../lib/db';
import { getSessionUser } from '../../../../lib/auth';
import type { Prisma } from '@prisma/client';

export const GET: APIRoute = async ({ request, url }) => {
  const user = await getSessionUser(request);
  if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
    return new Response('Unauthorized', { status: 401 });
  }

  const q = (url.searchParams.get('q') || '').trim().toLowerCase();
  const statusFilter = url.searchParams.get('status') || 'All';
  const paymentFilter = url.searchParams.get('payment') || 'All';
  const customerFilter = url.searchParams.get('customer') || '';

  const where: Prisma.OrdersWhereInput = {};

  if (q) {
    where.OR = [
      { order_number: { contains: q, mode: 'insensitive' } },
      { customer: { name: { contains: q, mode: 'insensitive' } } },
      { customer: { email: { contains: q, mode: 'insensitive' } } },
      { customer: { phone: { contains: q, mode: 'insensitive' } } }
    ];
  }

  if (statusFilter !== 'All') {
    where.status = statusFilter;
  }
  if (paymentFilter !== 'All') {
    where.payment_status = paymentFilter.toLowerCase();
  }
  if (customerFilter) {
    where.customer_id = Number(customerFilter);
  }

  const orders = await prisma.orders.findMany({
    where,
    orderBy: { created_at: 'desc' },
    include: {
      customer: true,
      shipping_address: true,
      OrderItems: true,
      Payments: true
    }
  });

  const headers = [
    'Order ID', 'Order Date', 'Order Status', 'Payment Status', 'Payment ID',
    'Customer Name', 'Customer Email', 'Customer Phone',
    'Product Name', 'Product SKU', 'Variant', 'Quantity', 'Item Price', 'Item Total',
    'Order Subtotal', 'Order Discount', 'Coupon Code', 'Order Shipping', 'Order Tax', 'Order Total',
    'Shipping Name', 'Address Line 1', 'Address Line 2', 'City', 'State', 'Pincode', 'Country'
  ];

  const escapeCSV = (field: any) => {
    if (field === null || field === undefined) return '""';
    const str = String(field);
    if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return `"${str}"`;
  };

  const csvRows = [headers.map(escapeCSV).join(',')];

  for (const order of orders) {
    const c = order.customer;
    const a = order.shipping_address;
    const rzp = order.Payments.find(p => p.provider === 'RAZORPAY' && p.status === 'SUCCESS')?.provider_payment_id || '';

    for (const item of order.OrderItems) {
      const csvRow = [
        order.order_number,
        new Date(order.created_at).toISOString(),
        order.status,
        order.payment_status,
        rzp,
        c?.name || '',
        c?.email || '',
        c?.phone || '',
        item.product_name_snapshot,
        item.sku_snapshot || '',
        item.variant_label_snapshot || '',
        item.qty,
        item.unit_price_snapshot,
        item.line_total,
        order.subtotal,
        order.discount_total || 0,
        order.coupon_code || '',
        order.shipping_total,
        order.tax_total,
        order.grand_total,
        a?.name || '',
        a?.line1 || '',
        a?.line2 || '',
        a?.city || '',
        a?.state || '',
        a?.pincode || '',
        a?.country || ''
      ];
      csvRows.push(csvRow.map(escapeCSV).join(','));
    }
  }

  const csvContent = csvRows.join('\n');
  const timestamp = new Date().toISOString().split('T')[0];
  
  return new Response(csvContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="orders_export_${timestamp}.csv"`
    }
  });
};
