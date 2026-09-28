import type { APIRoute } from 'astro';
import { db } from '../../../../lib/db.js';
import { getSessionUser } from '../../../../lib/auth.js';

export const GET: APIRoute = async ({ request, url }) => {
  const user = getSessionUser(request);
  if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
    return new Response('Unauthorized', { status: 401 });
  }

  const q = (url.searchParams.get('q') || '').trim().toLowerCase();
  const statusFilter = url.searchParams.get('status') || 'All';
  const paymentFilter = url.searchParams.get('payment') || 'All';
  const customerFilter = url.searchParams.get('customer') || '';

  let sql = `
    SELECT 
      o.id as order_id, o.order_number, o.created_at, o.status as order_status, o.payment_status, o.razorpay_payment_id,
      o.subtotal, o.discount_total, o.shipping_total, o.tax_total, o.grand_total, o.coupon_code,
      c.name as customer_name, c.email as customer_email, c.phone as customer_phone,
      a.name as shipping_name, a.line1, a.line2, a.city, a.state, a.pincode, a.country,
      i.product_name_snapshot, i.variant_label_snapshot, i.sku_snapshot, i.qty, i.unit_price_snapshot, i.line_total
    FROM orders o
    JOIN customers c ON o.customer_id = c.id
    LEFT JOIN addresses a ON o.shipping_address_id = a.id
    JOIN order_items i ON o.id = i.order_id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (q) {
    sql += ' AND (LOWER(o.order_number) LIKE ? OR LOWER(c.name) LIKE ? OR LOWER(c.phone) LIKE ? OR LOWER(c.email) LIKE ? OR LOWER(o.razorpay_order_id) LIKE ? OR LOWER(o.razorpay_payment_id) LIKE ?)';
    const term = `%${q}%`;
    params.push(term, term, term, term, term, term);
  }

  if (statusFilter !== 'All') {
    sql += ' AND o.status = ?';
    params.push(statusFilter);
  }

  if (paymentFilter !== 'All') {
    sql += ' AND o.payment_status = ?';
    params.push(paymentFilter.toLowerCase());
  }

  if (customerFilter) {
    sql += ' AND o.customer_id = ?';
    params.push(customerFilter);
  }

  sql += ' ORDER BY o.created_at DESC, i.id ASC';

  const rows = db.prepare(sql).all(...params) as any[];

  // Define CSV Header
  const headers = [
    'Order ID', 'Order Date', 'Order Status', 'Payment Status', 'Payment ID',
    'Customer Name', 'Customer Email', 'Customer Phone',
    'Product Name', 'Product SKU', 'Variant', 'Quantity', 'Item Price', 'Item Total',
    'Order Subtotal', 'Order Discount', 'Coupon Code', 'Order Shipping', 'Order Tax', 'Order Total',
    'Shipping Name', 'Address Line 1', 'Address Line 2', 'City', 'State', 'Pincode', 'Country'
  ];

  // Helper to escape CSV cell (handle quotes, commas, newlines)
  const escapeCSV = (field: any) => {
    if (field === null || field === undefined) return '""';
    const str = String(field);
    if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return `"${str}"`;
  };

  const csvRows = [headers.map(escapeCSV).join(',')];

  for (const row of rows) {
    const csvRow = [
      row.order_number,
      new Date(row.created_at).toISOString(),
      row.order_status,
      row.payment_status,
      row.razorpay_payment_id || '',
      row.customer_name,
      row.customer_email,
      row.customer_phone,
      row.product_name_snapshot,
      row.sku_snapshot || '',
      row.variant_label_snapshot || '',
      row.qty,
      row.unit_price_snapshot,
      row.line_total,
      row.subtotal,
      row.discount_total || 0,
      row.coupon_code || '',
      row.shipping_total,
      row.tax_total,
      row.grand_total,
      row.shipping_name,
      row.line1,
      row.line2 || '',
      row.city,
      row.state,
      row.pincode,
      row.country || 'India'
    ];
    csvRows.push(csvRow.map(escapeCSV).join(','));
  }

  const csvContent = csvRows.join('\n');
  const buffer = Buffer.from('\uFEFF' + csvContent, 'utf-8'); // Add BOM for Excel UTF-8 compatibility

  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `orders_${dateStr}.csv`;

  return new Response(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`
    }
  });
};
