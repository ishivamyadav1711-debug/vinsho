import type { APIRoute } from 'astro';
import PDFDocument from 'pdfkit';
import { db } from '../../../../../lib/db';
import { getSessionUser } from '../../../../../lib/auth';

function getOrGenerateInvoiceNumber(orderId: number): string {
  return db.transaction(() => {
    const existing = db.prepare('SELECT invoice_number FROM invoices WHERE order_id = ?').get(orderId) as any;
    if (existing) return existing.invoice_number;

    db.prepare(`
      INSERT INTO gapless_sequences (sequence_name, current_val)
      VALUES (?, 1)
      ON CONFLICT(sequence_name) DO UPDATE SET current_val = current_val + 1
    `).run('INVOICE');

    const row = db.prepare('SELECT current_val FROM gapless_sequences WHERE sequence_name = ?').get('INVOICE') as any;
    const seq = String(row.current_val).padStart(6, '0');
    const invNumber = `INV-${new Date().getFullYear()}-${seq}`;

    db.prepare(`
      INSERT INTO invoices (order_id, invoice_number, pdf_url, issued_at)
      VALUES (?, ?, ?, ?)
    `).run(orderId, invNumber, 'DYNAMIC', new Date().toISOString());

    return invNumber;
  })();
}

export const GET: APIRoute = async ({ request, params }) => {
  const user = getSessionUser(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized: Please log in.' }), { status: 401 });
  }
  if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
    return new Response(JSON.stringify({ error: 'Forbidden: Insufficient role privileges.' }), { status: 403 });
  }

  const { id } = params;
  if (!id) {
    return new Response(JSON.stringify({ error: 'Order ID is required' }), { status: 400 });
  }

  try {
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id) as any;
    if (!order) {
      return new Response(JSON.stringify({ error: 'Order not found' }), { status: 404 });
    }

    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id) as any[];
    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(order.customer_id) as any;
    const shippingAddress = db.prepare('SELECT * FROM addresses WHERE id = ?').get(order.shipping_address_id) as any;
    
    let billingAddress = shippingAddress;
    if (order.billing_address_id !== order.shipping_address_id) {
      billingAddress = db.prepare('SELECT * FROM addresses WHERE id = ?').get(order.billing_address_id) as any;
    }

    const invoiceNumber = getOrGenerateInvoiceNumber(order.id);
    const invoiceDate = new Date().toLocaleDateString('en-IN');

    // Generate PDF
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks: Buffer[] = [];
    
    const pdfPromise = new Promise<Buffer>((resolve, reject) => {
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });

    // --- Header ---
    doc.fontSize(24).font('Helvetica-Bold').text('VINSHO', 50, 50);
    doc.fontSize(10).font('Helvetica').text('Premium Elegance', 50, 78);
    
    doc.fontSize(20).text('INVOICE', 400, 50, { align: 'right' });
    doc.fontSize(10).text(`Invoice #: ${invoiceNumber}`, 400, 75, { align: 'right' });
    doc.text(`Order #: ${order.order_number}`, 400, 90, { align: 'right' });
    doc.text(`Date: ${invoiceDate}`, 400, 105, { align: 'right' });

    // --- Addresses ---
    doc.moveDown(3);
    const addressY = doc.y;

    doc.fontSize(12).font('Helvetica-Bold').text('Billed To:', 50, addressY);
    doc.fontSize(10).font('Helvetica')
      .text(customer.name, 50, addressY + 15)
      .text(billingAddress.line1, 50, addressY + 30);
    if (billingAddress.line2) {
      doc.text(billingAddress.line2, 50, doc.y);
    }
    doc.text(`${billingAddress.city}, ${billingAddress.state} ${billingAddress.pincode}`, 50, doc.y);
    doc.text(billingAddress.country, 50, doc.y);
    doc.text(`Phone: ${billingAddress.phone}`, 50, doc.y);
    if (customer.email) {
      doc.text(`Email: ${customer.email}`, 50, doc.y);
    }

    doc.fontSize(12).font('Helvetica-Bold').text('Shipped To:', 300, addressY);
    doc.fontSize(10).font('Helvetica')
      .text(shippingAddress.name, 300, addressY + 15)
      .text(shippingAddress.line1, 300, addressY + 30);
    if (shippingAddress.line2) {
      doc.text(shippingAddress.line2, 300, doc.y);
    }
    doc.text(`${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.pincode}`, 300, doc.y);
    doc.text(shippingAddress.country, 300, doc.y);
    doc.text(`Phone: ${shippingAddress.phone}`, 300, doc.y);

    // --- Items Table ---
    doc.moveDown(4);
    const tableTop = doc.y;

    doc.font('Helvetica-Bold');
    doc.text('Item', 50, tableTop);
    doc.text('Qty', 350, tableTop, { width: 30, align: 'center' });
    doc.text('Price', 400, tableTop, { width: 70, align: 'right' });
    doc.text('Total', 480, tableTop, { width: 65, align: 'right' });

    doc.moveTo(50, tableTop + 15).lineTo(545, tableTop + 15).stroke();

    let y = tableTop + 25;
    doc.font('Helvetica');

    for (const item of items) {
      const itemName = `${item.product_name_snapshot} (${item.variant_label_snapshot})`;
      
      doc.text(itemName, 50, y, { width: 280 });
      if (item.sku_snapshot) {
        doc.fontSize(8).fillColor('#666666').text(`SKU: ${item.sku_snapshot}`, 50, y + 15);
        doc.fontSize(10).fillColor('#000000');
      }
      
      doc.text(item.qty.toString(), 350, y, { width: 30, align: 'center' });
      doc.text(`Rs ${item.unit_price_snapshot.toFixed(2)}`, 400, y, { width: 70, align: 'right' });
      doc.text(`Rs ${item.line_total.toFixed(2)}`, 480, y, { width: 65, align: 'right' });
      
      y += 35;
      doc.moveTo(50, y - 10).lineTo(545, y - 10).strokeColor('#e5e5e5').stroke();
      doc.strokeColor('#000000'); // reset
    }

    // --- Totals ---
    y += 10;
    doc.text('Subtotal:', 380, y, { width: 70, align: 'right' });
    doc.text(`Rs ${order.subtotal.toFixed(2)}`, 460, y, { width: 85, align: 'right' });
    
    if (order.discount_total > 0) {
      y += 20;
      doc.text(`Discount:`, 380, y, { width: 70, align: 'right' });
      doc.text(`-Rs ${order.discount_total.toFixed(2)}`, 460, y, { width: 85, align: 'right' });
    }

    y += 20;
    doc.text('Shipping:', 380, y, { width: 70, align: 'right' });
    doc.text(`Rs ${order.shipping_total.toFixed(2)}`, 460, y, { width: 85, align: 'right' });

    y += 25;
    doc.font('Helvetica-Bold');
    doc.text('Grand Total:', 380, y, { width: 70, align: 'right' });
    doc.text(`Rs ${order.grand_total.toFixed(2)}`, 460, y, { width: 85, align: 'right' });
    
    doc.font('Helvetica').fontSize(8).fillColor('#666666');
    y += 15;
    doc.text(`(Includes Tax: Rs ${order.tax_total.toFixed(2)})`, 380, y, { width: 165, align: 'right' });

    // --- Payment Details ---
    doc.fillColor('#000000').fontSize(10);
    y += 40;
    doc.font('Helvetica-Bold').text('Payment Information', 50, y);
    doc.font('Helvetica');
    doc.text(`Payment Status: ${order.payment_status.toUpperCase()}`, 50, y + 15);
    if (order.razorpay_payment_id) {
      doc.text(`Razorpay Payment ID: ${order.razorpay_payment_id}`, 50, y + 30);
    }
    if (order.razorpay_order_id) {
      doc.text(`Razorpay Order ID: ${order.razorpay_order_id}`, 50, y + 45);
    }
    if (order.payment_status === 'refunded' && order.razorpay_refund_id) {
      doc.text(`Refund ID: ${order.razorpay_refund_id}`, 50, y + 60);
    }

    // --- Footer ---
    doc.fontSize(10).fillColor('#888888').text('Thank you for shopping with Vinsho.', 50, 750, { align: 'center', width: 500 });

    doc.end();

    const pdfBuffer = await pdfPromise;

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Vinsho-Invoice-${order.order_number}.pdf"`,
        'Content-Length': pdfBuffer.length.toString()
      }
    });

  } catch (err: any) {
    console.error('Invoice Generation Error:', err);
    return new Response(JSON.stringify({ error: 'Server Error processing invoice.' }), { status: 500 });
  }
};
