import { getNextSequenceNumber } from './db.js';

export interface TaxCalculationResult {
  isInterstate: boolean;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalTax: number;
}

const ORIGIN_STATE = 'Haryana'; // VINSHO Studio registered GST state

/**
 * Calculates GST tax split based on buyer shipping address state.
 * Intra-state (Haryana -> Haryana): Split equal CGST + SGST
 * Inter-state (Haryana -> Other State): IGST
 */
export function calculateLineTax(unitPrice: number, qty: number, gstRatePercent: number, buyerState: string): TaxCalculationResult {
  const lineSubtotal = unitPrice * qty;
  const totalTax = Number(((lineSubtotal * gstRatePercent) / 100).toFixed(2));
  const isInterstate = (buyerState || '').trim().toLowerCase() !== ORIGIN_STATE.toLowerCase();

  if (isInterstate) {
    return {
      isInterstate: true,
      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount: totalTax,
      totalTax
    };
  }

  const halfTax = Number((totalTax / 2).toFixed(2));
  return {
    isInterstate: false,
    cgstAmount: halfTax,
    sgstAmount: halfTax,
    igstAmount: 0,
    totalTax
  };
}

/**
 * Generate Invoice Document HTML/PDF record with gapless sequence number.
 * Tagged: TODO: CA to review before first live order
 */
export async function generateInvoiceRecord(order: any, orderItems: any[], shippingAddress: any): Promise<{ invoiceNumber: string; htmlContent: string; issuedAt: string }> {
  const invoiceNumber = await getNextSequenceNumber('INVOICE', 'INV');
  const issuedAt = new Date().toISOString();

  const isInterstate = Boolean(order.is_interstate);

  const itemsHtml = orderItems.map((item: any) => {
    const unitPrice = Number(item.unit_price_snapshot || 0);
    const taxAmount = Number(item.tax_amount || 0);
    const lineTotal = Number(item.line_total || 0);
    return `
    <tr>
      <td>${item.product_name_snapshot} (${item.variant_label_snapshot})</td>
      <td>${item.sku_snapshot}</td>
      <td>${item.hsn_snapshot}</td>
      <td>₹${unitPrice.toFixed(2)}</td>
      <td>${item.qty}</td>
      <td>${item.gst_rate_snapshot}%</td>
      <td>₹${taxAmount.toFixed(2)}</td>
      <td>₹${lineTotal.toFixed(2)}</td>
    </tr>
  `;
  }).join('');

  const subtotal = Number(order.subtotal || 0);
  const taxTotal = Number(order.tax_total || 0);
  const shippingTotal = Number(order.shipping_total || 0);
  const grandTotal = Number(order.grand_total || 0);

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <title>TAX INVOICE ${invoiceNumber}</title>
      <style>
        body { font-family: sans-serif; margin: 40px; color: #1e293b; }
        .inv-head { display: flex; justify-content: space-between; border-bottom: 2px solid #8A174B; padding-bottom: 15px; }
        .brand-title { font-size: 24px; font-weight: bold; color: #8A174B; letter-spacing: 2px; }
        .todo-notice { background: #fef3c7; color: #92400e; padding: 8px 12px; border-radius: 4px; margin-block: 15px; font-size: 12px; font-weight: bold; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 13px; }
        th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; }
        th { background: #f8fafc; }
        .totals { margin-top: 20px; float: right; width: 300px; }
        .totals-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; }
        .totals-row.grand { font-size: 16px; font-weight: bold; border-top: 2px solid #0f172a; padding-top: 8px; color: #8A174B; }
      </style>
    </head>
    <body>
      <div class="inv-head">
        <div>
          <div class="brand-title">VINSHO STUDIO</div>
          <div>Pan-India Luxury Home &amp; Furnishings</div>
          <div>GSTIN: 06AAAAA0000A1Z5 &middot; State: Haryana (06)</div>
        </div>
        <div style="text-align: right;">
          <h2 style="margin: 0; color: #0f172a;">TAX INVOICE</h2>
          <div><b>Invoice #:</b> ${invoiceNumber}</div>
          <div><b>Order #:</b> ${order.order_number}</div>
          <div><b>Date:</b> ${new Date(issuedAt).toLocaleDateString('en-IN')}</div>
        </div>
      </div>

      <div class="todo-notice">
        TODO: CA to review before first live order
      </div>

      <div style="display: flex; justify-content: space-between; margin-top: 20px;">
        <div>
          <b>Billed &amp; Shipped To:</b><br/>
          ${shippingAddress?.name || ''}<br/>
          ${shippingAddress?.line1 || ''}, ${shippingAddress?.line2 || ''}<br/>
          ${shippingAddress?.city || ''}, ${shippingAddress?.state || ''} - ${shippingAddress?.pincode || ''}<br/>
          Phone: ${shippingAddress?.phone || ''}
        </div>
        <div>
          <b>Supply Type:</b> ${isInterstate ? 'Inter-State (IGST Applicable)' : 'Intra-State (CGST + SGST Applicable)'}<br/>
          <b>Place of Supply:</b> ${shippingAddress?.state || ''}
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Item Description</th>
            <th>SKU</th>
            <th>HSN</th>
            <th>Unit Price</th>
            <th>Qty</th>
            <th>GST %</th>
            <th>Tax Amount</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      <div class="totals">
        <div class="totals-row"><span>Subtotal:</span> <span>₹${subtotal.toFixed(2)}</span></div>
        <div class="totals-row"><span>Tax Total:</span> <span>₹${taxTotal.toFixed(2)}</span></div>
        <div class="totals-row"><span>Shipping:</span> <span>₹${shippingTotal.toFixed(2)}</span></div>
        <div class="totals-row grand"><span>Grand Total:</span> <span>₹${grandTotal.toFixed(2)}</span></div>
      </div>
    </body>
    </html>
  `;

  return { invoiceNumber, htmlContent, issuedAt };
}
