import type { APIRoute } from 'astro';
import PDFDocument from 'pdfkit';
import { prisma } from '../../../../../lib/db';
import { getSessionUser } from '../../../../../lib/auth';

async function getOrGenerateInvoiceNumber(orderId: number): Promise<string> {
  const existing = await prisma.invoices.findFirst({ where: { order_id: orderId } });
  if (existing) return existing.invoice_number;

  const result = await prisma.$transaction(async (tx) => {
    // Generate new sequence
    const seqRow = await tx.gaplessSequences.upsert({
      where: { sequence_name: 'INVOICE' },
      update: { current_val: { increment: 1 } },
      create: { sequence_name: 'INVOICE', current_val: 1 }
    });
    
    const seq = String(seqRow.current_val).padStart(6, '0');
    const invNumber = `INV-${new Date().getFullYear()}-${seq}`;

    await tx.invoices.create({
      data: {
        order_id: orderId,
        invoice_number: invNumber,
        pdf_url: 'DYNAMIC',
        issued_at: new Date()
      }
    });
    return invNumber;
  });

  return result;
}

export const GET: APIRoute = async ({ request, params }) => {
  const user = await getSessionUser(request);
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
    const order = await prisma.orders.findUnique({ 
      where: { id: Number(id) },
      include: { Payments: true }
    });
    if (!order) {
      return new Response(JSON.stringify({ error: 'Order not found' }), { status: 404 });
    }

    const items = await prisma.orderItems.findMany({ where: { order_id: Number(order.id) } });
    const customer = await prisma.customers.findUnique({ where: { id: order.customer_id } });
    const shippingAddress = await prisma.addresses.findUnique({ where: { id: order.shipping_address_id! } });
    
    let billingAddress = shippingAddress;
    if (order.billing_address_id && order.billing_address_id !== order.shipping_address_id) {
      billingAddress = await prisma.addresses.findUnique({ where: { id: order.billing_address_id } });
    }

    if (!customer || !shippingAddress || !billingAddress) {
      return new Response(JSON.stringify({ error: 'Missing customer or address information' }), { status: 500 });
    }

    const invoiceNumber = await getOrGenerateInvoiceNumber(Number(order.id));
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
    doc.text(`Rs ${Number(order.subtotal).toFixed(2)}`, 460, y, { width: 85, align: 'right' });
    
    if (Number(order.discount_total || 0) > 0) {
      y += 20;
      doc.text(`Discount:`, 380, y, { width: 70, align: 'right' });
      doc.text(`-Rs ${Number(order.discount_total || 0).toFixed(2)}`, 460, y, { width: 85, align: 'right' });
    }

    y += 20;
    doc.text('Shipping:', 380, y, { width: 70, align: 'right' });
    doc.text(`Rs ${Number(order.shipping_total).toFixed(2)}`, 460, y, { width: 85, align: 'right' });

    y += 25;
    doc.font('Helvetica-Bold');
    doc.text('Grand Total:', 380, y, { width: 70, align: 'right' });
    doc.text(`Rs ${Number(order.grand_total).toFixed(2)}`, 460, y, { width: 85, align: 'right' });
    
    doc.font('Helvetica').fontSize(8).fillColor('#666666');
    y += 15;
    doc.text(`(Includes Tax: Rs ${Number(order.tax_total).toFixed(2)})`, 380, y, { width: 165, align: 'right' });

    // --- Payment Details ---
    doc.fillColor('#000000').fontSize(10);
    y += 40;
    doc.font('Helvetica-Bold').text('Payment Information', 50, y);
    doc.font('Helvetica');
    doc.text(`Payment Status: ${order.payment_status.toUpperCase()}`, 50, y + 15);
    const successfulPayment = order.Payments?.find(p => p.provider === 'RAZORPAY' && p.status === 'SUCCESS');
    const refundPayment = order.Payments?.find(p => p.provider === 'RAZORPAY' && p.status === 'REFUNDED');

    if (successfulPayment?.provider_payment_id) {
      doc.text(`Razorpay Payment ID: ${successfulPayment.provider_payment_id}`, 50, y + 30);
    }
    if (order.payment_status === 'refunded' && refundPayment?.provider_payment_id) {
      doc.text(`Refund ID: ${refundPayment.provider_payment_id}`, 50, y + 45);
    }

    // --- Footer ---
    doc.fontSize(10).fillColor('#888888').text('Thank you for shopping with Vinsho.', 50, 750, { align: 'center', width: 500 });

    doc.end();

    const pdfBuffer = await pdfPromise;

    return new Response(pdfBuffer as any, {
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
