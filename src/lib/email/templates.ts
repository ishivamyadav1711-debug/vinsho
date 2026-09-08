/**
 * VINSHO — Transactional Email Templates
 *
 * All templates return { subject, html, text }.
 * Design principles:
 * - No customer PII in subject lines (prevents info disclosure in email subject previews).
 * - Minimal PII in bodies — only what the recipient needs.
 * - Reset links contain only the opaque token, not the customer's name/email.
 * - All templates are plain-HTML compatible with major email clients (no CSS variables, no Grid).
 */

import { getEnvConfig } from '../env.js';

interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

// ─── Shared layout ────────────────────────────────────────────────────────────

function layout(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;max-width:600px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="background:#1a1a1a;padding:24px 32px;">
            <span style="color:#fff;font-size:24px;font-weight:bold;letter-spacing:2px;">VINSHO</span>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            ${bodyHtml}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f5f5f5;padding:16px 32px;border-top:1px solid #e0e0e0;">
            <p style="margin:0;font-size:12px;color:#888;text-align:center;">
              &copy; ${new Date().getFullYear()} VINSHO Home Decor &bull; Karnal, Haryana &bull;
              <a href="https://vinsho.com" style="color:#888;">vinsho.com</a>
            </p>
            <p style="margin:8px 0 0;font-size:11px;color:#aaa;text-align:center;">
              You received this email because you have an account or made a purchase at vinsho.com.
              Please do not reply to this email.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function btn(text: string, href: string): string {
  return `<a href="${href}" style="display:inline-block;background:#1a1a1a;color:#fff;text-decoration:none;padding:12px 28px;border-radius:4px;font-size:14px;font-weight:bold;margin:16px 0;">${text}</a>`;
}

// ─── Template 1: Password Reset ───────────────────────────────────────────────

export function passwordResetTemplate(opts: {
  customerName: string;
  resetToken: string;
}): EmailContent {
  const { siteUrl } = getEnvConfig();
  const resetUrl = `${siteUrl}/account?action=reset-password&token=${opts.resetToken}`;

  const html = layout('Reset Your VINSHO Password', `
    <h2 style="color:#1a1a1a;margin:0 0 16px;">Reset your password</h2>
    <p style="color:#444;line-height:1.6;">Hi ${escHtml(opts.customerName)},</p>
    <p style="color:#444;line-height:1.6;">
      We received a request to reset the password for your VINSHO account.
      Click the button below to choose a new password. This link expires in <strong>1 hour</strong>.
    </p>
    ${btn('Reset Password', resetUrl)}
    <p style="color:#666;font-size:13px;line-height:1.6;margin-top:24px;">
      If you didn&#39;t request a password reset, you can safely ignore this email.
      Your password will not change unless you click the link above.
    </p>
    <p style="color:#999;font-size:12px;margin-top:16px;">
      Or copy and paste this URL into your browser:<br>
      <a href="${resetUrl}" style="color:#666;word-break:break-all;">${resetUrl}</a>
    </p>
  `);

  return {
    subject: 'Reset your VINSHO password',
    html,
    text:
      `Hi ${opts.customerName},\n\n` +
      `We received a request to reset your VINSHO password.\n\n` +
      `Reset link (expires in 1 hour):\n${resetUrl}\n\n` +
      `If you didn't request this, ignore this email.`,
  };
}

// ─── Template 2: Order Confirmation (to customer) ─────────────────────────────

export function orderConfirmationTemplate(opts: {
  customerName: string;
  orderNumber: string;
  grandTotal: number;
  items: Array<{ productNameSnapshot: string; variantLabelSnapshot: string; qty: number; unitPriceSnapshot: number }>;
  shippingAddress: { name: string; line1: string; city: string; state: string; pincode: string };
}): EmailContent {
  const { siteUrl } = getEnvConfig();
  const itemRows = opts.items.map(i =>
    `<tr>
      <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;color:#333;font-size:14px;">
        ${escHtml(i.productNameSnapshot)}<br>
        <span style="color:#888;font-size:12px;">${escHtml(i.variantLabelSnapshot)} &times; ${i.qty}</span>
      </td>
      <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;text-align:right;color:#333;font-size:14px;">
        &#8377;${(i.unitPriceSnapshot * i.qty).toLocaleString('en-IN')}
      </td>
    </tr>`
  ).join('');

  const html = layout(`Order Confirmed — ${opts.orderNumber}`, `
    <h2 style="color:#1a1a1a;margin:0 0 8px;">Order Confirmed!</h2>
    <p style="color:#444;line-height:1.6;">Hi ${escHtml(opts.customerName)}, thank you for your order.</p>
    <p style="background:#f0f0f0;padding:12px 16px;border-radius:4px;font-size:14px;color:#333;">
      <strong>Order #:</strong> ${escHtml(opts.orderNumber)}<br>
      <strong>Total:</strong> &#8377;${opts.grandTotal.toLocaleString('en-IN')}
    </p>

    <h3 style="color:#333;font-size:16px;margin:24px 0 8px;">Items Ordered</h3>
    <table width="100%" cellpadding="0" cellspacing="0">
      <thead>
        <tr>
          <th style="text-align:left;color:#888;font-size:12px;font-weight:normal;padding-bottom:8px;border-bottom:2px solid #e0e0e0;">Product</th>
          <th style="text-align:right;color:#888;font-size:12px;font-weight:normal;padding-bottom:8px;border-bottom:2px solid #e0e0e0;">Amount</th>
        </tr>
      </thead>
      <tbody>${itemRows}</tbody>
    </table>

    <h3 style="color:#333;font-size:16px;margin:24px 0 8px;">Shipping To</h3>
    <p style="color:#444;font-size:14px;line-height:1.6;margin:0;">
      ${escHtml(opts.shippingAddress.name)}<br>
      ${escHtml(opts.shippingAddress.line1)}<br>
      ${escHtml(opts.shippingAddress.city)}, ${escHtml(opts.shippingAddress.state)} — ${escHtml(opts.shippingAddress.pincode)}
    </p>

    <p style="color:#666;font-size:13px;margin-top:24px;">
      We&#39;ll notify you when your order is dispatched. For queries, reply to this email or
      contact us at <a href="mailto:vinvks@gmail.com" style="color:#333;">vinvks@gmail.com</a>.
    </p>
    ${btn('View My Orders', `${siteUrl}/account#orders`)}
  `);

  return {
    subject: `Order Confirmed — ${opts.orderNumber} | VINSHO`,
    html,
    text:
      `Hi ${opts.customerName}, your VINSHO order ${opts.orderNumber} is confirmed!\n\n` +
      `Total: ₹${opts.grandTotal}\n\n` +
      `Items:\n` + opts.items.map(i => `  - ${i.productNameSnapshot} x${i.qty}: ₹${i.unitPriceSnapshot * i.qty}`).join('\n') +
      `\n\nShipping to: ${opts.shippingAddress.name}, ${opts.shippingAddress.city}\n\n` +
      `Track orders at: ${siteUrl}/account`,
  };
}

// ─── Template 3: Payment Confirmation (to customer) ──────────────────────────

export function paymentConfirmationTemplate(opts: {
  customerName: string;
  orderNumber: string;
  grandTotal: number;
  paymentMethod?: string;
}): EmailContent {
  const html = layout(`Payment Received — ${opts.orderNumber}`, `
    <h2 style="color:#1a1a1a;margin:0 0 8px;">Payment Received</h2>
    <p style="color:#444;line-height:1.6;">Hi ${escHtml(opts.customerName)},</p>
    <p style="color:#444;line-height:1.6;">
      We&#39;ve received your payment for order <strong>${escHtml(opts.orderNumber)}</strong>.
      Your order is now confirmed and being prepared for dispatch.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f9f9;border-radius:4px;padding:16px;margin:16px 0;">
      <tr>
        <td style="color:#555;font-size:14px;padding:4px 0;">Order Number</td>
        <td style="color:#333;font-size:14px;font-weight:bold;text-align:right;padding:4px 0;">${escHtml(opts.orderNumber)}</td>
      </tr>
      <tr>
        <td style="color:#555;font-size:14px;padding:4px 0;">Amount Paid</td>
        <td style="color:#333;font-size:14px;font-weight:bold;text-align:right;padding:4px 0;">&#8377;${opts.grandTotal.toLocaleString('en-IN')}</td>
      </tr>
      ${opts.paymentMethod ? `<tr>
        <td style="color:#555;font-size:14px;padding:4px 0;">Payment Method</td>
        <td style="color:#333;font-size:14px;text-align:right;padding:4px 0;">${escHtml(opts.paymentMethod)}</td>
      </tr>` : ''}
    </table>
    <p style="color:#666;font-size:13px;">
      Questions? Contact us at <a href="mailto:vinvks@gmail.com" style="color:#333;">vinvks@gmail.com</a>
    </p>
  `);

  return {
    subject: `Payment Received — ${opts.orderNumber} | VINSHO`,
    html,
    text:
      `Hi ${opts.customerName},\n\nYour payment for VINSHO order ${opts.orderNumber} has been received.\n` +
      `Amount: ₹${opts.grandTotal}\n\nThank you for shopping with VINSHO!`,
  };
}

// ─── Template 4: Payment Failed (to customer) ────────────────────────────────

export function paymentFailedTemplate(opts: {
  customerName: string;
  orderNumber: string;
  grandTotal: number;
}): EmailContent {
  const { siteUrl } = getEnvConfig();

  const html = layout(`Payment Failed — ${opts.orderNumber}`, `
    <h2 style="color:#c0392b;margin:0 0 8px;">Payment Was Not Successful</h2>
    <p style="color:#444;line-height:1.6;">Hi ${escHtml(opts.customerName)},</p>
    <p style="color:#444;line-height:1.6;">
      Unfortunately your payment for order <strong>${escHtml(opts.orderNumber)}</strong>
      (&#8377;${opts.grandTotal.toLocaleString('en-IN')}) could not be processed.
      Your items are still reserved. Please retry your payment.
    </p>
    ${btn('Retry Payment', `${siteUrl}/checkout`)}
    <p style="color:#666;font-size:13px;margin-top:16px;">
      If you continue to have trouble, contact us at
      <a href="mailto:vinvks@gmail.com" style="color:#333;">vinvks@gmail.com</a>
    </p>
  `);

  return {
    subject: `Action Required: Payment Failed — ${opts.orderNumber} | VINSHO`,
    html,
    text:
      `Hi ${opts.customerName},\n\nYour payment for VINSHO order ${opts.orderNumber} failed.\n` +
      `Amount: ₹${opts.grandTotal}\n\nPlease retry at: ${siteUrl}/checkout`,
  };
}

// ─── Template 5: Enquiry Acknowledgement (to customer) ───────────────────────

export function enquiryAckTemplate(opts: {
  customerName: string;
  subject?: string;
  productName?: string;
}): EmailContent {
  const topicLine = opts.productName
    ? `regarding <strong>${escHtml(opts.productName)}</strong>`
    : opts.subject
    ? `regarding <strong>${escHtml(opts.subject)}</strong>`
    : '';

  const html = layout('We received your message', `
    <h2 style="color:#1a1a1a;margin:0 0 8px;">Thank you for reaching out!</h2>
    <p style="color:#444;line-height:1.6;">Hi ${escHtml(opts.customerName)},</p>
    <p style="color:#444;line-height:1.6;">
      We&#39;ve received your enquiry ${topicLine} and our team will get back to you
      within <strong>24&ndash;48 hours</strong>.
    </p>
    <p style="color:#666;font-size:13px;margin-top:16px;">
      For urgent queries, call us at
      <a href="tel:+919625515351" style="color:#333;">+91 96255 15351</a>
      or email <a href="mailto:vinvks@gmail.com" style="color:#333;">vinvks@gmail.com</a>.
    </p>
  `);

  return {
    subject: 'We received your enquiry | VINSHO',
    html,
    text:
      `Hi ${opts.customerName},\n\n` +
      `Thank you for contacting VINSHO. We've received your enquiry and will respond within 24–48 hours.\n\n` +
      `For urgent queries: +91 96255 15351 | vinvks@gmail.com`,
  };
}

// ─── Template 6: Admin — New Enquiry Notification ────────────────────────────

export function adminNewEnquiryTemplate(opts: {
  enquiryId: number;
  customerName: string;
  phone: string;
  subject?: string;
  source?: string;
}): EmailContent {
  const { siteUrl } = getEnvConfig();

  const html = layout('New Customer Enquiry', `
    <h2 style="color:#1a1a1a;margin:0 0 8px;">New Enquiry #${opts.enquiryId}</h2>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="color:#555;font-size:14px;padding:6px 0;">Customer</td>
          <td style="color:#333;font-size:14px;font-weight:bold;padding:6px 0;">${escHtml(opts.customerName)}</td></tr>
      <tr><td style="color:#555;font-size:14px;padding:6px 0;">Phone</td>
          <td style="color:#333;font-size:14px;padding:6px 0;">${escHtml(opts.phone)}</td></tr>
      ${opts.subject ? `<tr><td style="color:#555;font-size:14px;padding:6px 0;">Subject</td>
          <td style="color:#333;font-size:14px;padding:6px 0;">${escHtml(opts.subject)}</td></tr>` : ''}
      <tr><td style="color:#555;font-size:14px;padding:6px 0;">Source</td>
          <td style="color:#333;font-size:14px;padding:6px 0;">${escHtml(opts.source || 'Website')}</td></tr>
    </table>
    ${btn('View in Admin', `${siteUrl}/admin/enquiries/${opts.enquiryId}`)}
  `);

  return {
    subject: `New Enquiry #${opts.enquiryId} from ${opts.customerName}`,
    html,
    text:
      `New Enquiry #${opts.enquiryId}\n` +
      `Customer: ${opts.customerName}\nPhone: ${opts.phone}\n` +
      `${opts.subject ? `Subject: ${opts.subject}\n` : ''}` +
      `View: ${siteUrl}/admin/enquiries/${opts.enquiryId}`,
  };
}

// ─── Template 7: Admin — New Order Notification ──────────────────────────────

export function adminNewOrderTemplate(opts: {
  orderNumber: string;
  customerName: string;
  grandTotal: number;
  itemCount: number;
}): EmailContent {
  const { siteUrl } = getEnvConfig();

  const html = layout('New Order Received', `
    <h2 style="color:#1a1a1a;margin:0 0 8px;">New Order — ${escHtml(opts.orderNumber)}</h2>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="color:#555;font-size:14px;padding:6px 0;">Customer</td>
          <td style="color:#333;font-size:14px;font-weight:bold;padding:6px 0;">${escHtml(opts.customerName)}</td></tr>
      <tr><td style="color:#555;font-size:14px;padding:6px 0;">Total</td>
          <td style="color:#333;font-size:14px;font-weight:bold;padding:6px 0;">&#8377;${opts.grandTotal.toLocaleString('en-IN')}</td></tr>
      <tr><td style="color:#555;font-size:14px;padding:6px 0;">Items</td>
          <td style="color:#333;font-size:14px;padding:6px 0;">${opts.itemCount}</td></tr>
    </table>
    ${btn('View Order in Admin', `${siteUrl}/admin/orders`)}
  `);

  return {
    subject: `New Order ${opts.orderNumber} — ₹${opts.grandTotal.toLocaleString('en-IN')}`,
    html,
    text:
      `New VINSHO Order: ${opts.orderNumber}\n` +
      `Customer: ${opts.customerName}\nTotal: ₹${opts.grandTotal}\nItems: ${opts.itemCount}\n` +
      `View: ${siteUrl}/admin/orders`,
  };
}

// ─── Utility ──────────────────────────────────────────────────────────────────

function escHtml(str: string | undefined | null): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
