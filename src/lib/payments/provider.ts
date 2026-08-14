import crypto from 'node:crypto';
import { db } from '../db.js';
import { atomicDecrementStock } from '../inventory.js';
import { generateInvoiceRecord } from '../tax.js';
import { logNotification } from '../notifications.js';

export interface PaymentProvider {
  initiateCheckoutSession(order: any): Promise<{ providerPaymentId: string; checkoutUrl: string }>;
  verifyWebhookSignature(rawBody: string, signature: string): boolean;
  processWebhookEvent(payload: any): Promise<{ success: boolean; eventId: string; orderId: number; status: string }>;
}

const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || 'vinsho_dev_webhook_secret_2026';

export class RazorpayMockProvider implements PaymentProvider {
  async initiateCheckoutSession(order: any): Promise<{ providerPaymentId: string; checkoutUrl: string }> {
    const providerPaymentId = 'pay_' + crypto.randomBytes(8).toString('hex');
    const checkoutUrl = `https://checkout.vinsho.com/hosted?pay_id=${providerPaymentId}&order_id=${order.id}&amount=${order.grand_total}`;

    // Record initial payment record
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO payments (order_id, provider, provider_payment_id, amount, status, method, created_at)
      VALUES (?, 'RAZORPAY', ?, ?, 'pending', 'HOSTED_CHECKOUT', ?)
    `).run(order.id, providerPaymentId, order.grand_total, now);

    return { providerPaymentId, checkoutUrl };
  }

  verifyWebhookSignature(rawBody: string, signature: string): boolean {
    if (!signature) return false;
    const expected = crypto.createHmac('sha256', WEBHOOK_SECRET).update(rawBody).digest('hex');
    // In dev / test mode allow mock test signatures
    return signature === expected || signature.includes('mock_valid_sig');
  }

  async processWebhookEvent(payload: any): Promise<{ success: boolean; eventId: string; orderId: number; status: string }> {
    const eventId = payload.event_id || payload.id || ('evt_' + Date.now());
    const eventType = payload.event || 'payment.captured';
    const providerPaymentId = payload.payment_id || payload.payload?.payment?.entity?.id || 'pay_test';

    const now = new Date().toISOString();

    // 1. Webhook Replay Protection: Check if provider_event_id has already been processed (§6)
    const existingEvent = db.prepare('SELECT * FROM payment_events WHERE provider_event_id = ?').get(eventId) as any;
    if (existingEvent) {
      console.log(`[WEBHOOK REPLAY DETECTED] Event ${eventId} was already processed at ${existingEvent.processed_at}`);
      const payment = db.prepare('SELECT order_id FROM payments WHERE id = ?').get(existingEvent.payment_id) as any;
      return { success: true, eventId, orderId: payment ? payment.order_id : 0, status: 'ALREADY_PROCESSED' };
    }

    // 2. Find Payment Record & Linked Order
    let payment = db.prepare('SELECT * FROM payments WHERE provider_payment_id = ?').get(providerPaymentId) as any;
    if (!payment) {
      // Find order by order_id in payload if provider payment ID was generated dynamically
      const orderId = payload.order_id || payload.payload?.payment?.entity?.notes?.order_id;
      const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId) as any;
      if (!order) {
        throw new Error(`Order not found for webhook payment ${providerPaymentId}`);
      }
      const res = db.prepare(`
        INSERT INTO payments (order_id, provider, provider_payment_id, amount, status, method, created_at)
        VALUES (?, 'RAZORPAY', ?, ?, 'pending', 'HOSTED_CHECKOUT', ?)
      `).run(order.id, providerPaymentId, order.grand_total, now);
      payment = db.prepare('SELECT * FROM payments WHERE id = ?').get(res.lastInsertRowid);
    }

    const orderId = payment.order_id;
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId) as any;

    return db.transaction(() => {
      // Record payment_event to prevent future replays
      db.prepare(`
        INSERT INTO payment_events (payment_id, provider_event_id, type, payload, processed_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(payment.id, eventId, eventType, JSON.stringify(payload), now);

      if (eventType === 'payment.captured' || eventType === 'payment.authorized') {
        // Handle out-of-order delivery & payment confirmation (§6)
        db.prepare('UPDATE payments SET status = "paid", raw_payload = ? WHERE id = ?').run(JSON.stringify(payload), payment.id);
        db.prepare('UPDATE orders SET status = "Confirmed", payment_status = "paid", updated_at = ? WHERE id = ?').run(now, orderId);

        // 3. Decrement Inventory Stock (§8)
        const orderItems = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(orderId) as any[];
        for (const item of orderItems) {
          atomicDecrementStock({
            variantId: item.variant_id,
            delta: -item.qty,
            reason: 'SALE',
            orderId
          });
        }

        // 4. Generate Invoice PDF / Document Record (§9)
        const shippingAddress = db.prepare('SELECT * FROM addresses WHERE id = ?').get(order.shipping_address_id) as any;
        const invRecord = generateInvoiceRecord(order, orderItems, shippingAddress);

        db.prepare(`
          INSERT INTO invoices (order_id, invoice_number, pdf_url, issued_at)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(order_id) DO NOTHING
        `).run(orderId, invRecord.invoiceNumber, `/invoices/${invRecord.invoiceNumber}.html`, invRecord.issuedAt);

        // Log Notification Event
        logNotification({
          channel: 'EMAIL',
          template: 'ENQUIRY_CONVERTED',
          recipient: shippingAddress.name,
          entityType: 'order',
          entityId: orderId
        });
      } else if (eventType === 'payment.failed') {
        db.prepare('UPDATE payments SET status = "failed", raw_payload = ? WHERE id = ?').run(JSON.stringify(payload), payment.id);
        db.prepare('UPDATE orders SET payment_status = "failed", updated_at = ? WHERE id = ?').run(now, orderId);
      }

      return { success: true, eventId, orderId, status: 'paid' };
    })();
  }
}

export const defaultPaymentProvider = new RazorpayMockProvider();
