import crypto from 'node:crypto';
import { prisma } from '../db.js';
import { atomicDecrementStock } from '../inventory.js';
import { generateInvoiceRecord } from '../tax.js';
import { logNotification } from '../notifications.js';
import { getEnvConfig } from '../env.js';

export interface PaymentProvider {
  initiateCheckoutSession(order: any): Promise<{ providerPaymentId: string; razorpayOrderId?: string; checkoutUrl?: string }>;
  verifyPaymentSignature(params: { razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string }): boolean;
  verifyWebhookSignature(rawBody: string, signature: string): boolean;
  processWebhookEvent(payload: any): Promise<{ success: boolean; eventId: string; orderId: number; status: string }>;
  handlePaymentSuccess(params: { orderId: number; providerPaymentId: string; providerOrderId?: string; rawPayload?: any }): Promise<{ success: boolean; orderId: number; orderNumber: string }>;
}

export class RazorpayProvider implements PaymentProvider {
  /**
   * Initiates Razorpay Order via server-to-server API call.
   * Requires configured RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.
   * NEVER generates fake, placeholder, or random order/payment IDs.
   * Creates a pending payment record in PostgreSQL linked to the order.
   */
  async initiateCheckoutSession(order: any): Promise<{ providerPaymentId: string; razorpayOrderId: string; checkoutUrl: string }> {
    const envConfig = getEnvConfig();
    const keyId = envConfig.razorpayKeyId || process.env.PUBLIC_RAZORPAY_KEY_ID;
    const keySecret = envConfig.razorpayKeySecret;

    if (!keyId || !keySecret) {
      throw new Error('Razorpay credentials (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET) are not configured. Online checkout cannot be initiated.');
    }

    const amountInPaise = Math.round(Number(order.grand_total) * 100);
    if (isNaN(amountInPaise) || amountInPaise <= 0) {
      throw new Error(`Invalid order grand total amount: ${order.grand_total}`);
    }

    let razorpayOrderId: string;

    try {
      const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
      const rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: amountInPaise,
          currency: (order.currency || 'INR').toUpperCase(),
          receipt: String(order.order_number),
          notes: {
            order_id: String(order.id),
            order_number: String(order.order_number)
          }
        })
      });

      if (!rzpRes.ok) {
        const errBody = await rzpRes.text();
        throw new Error(`Razorpay API order creation rejected (${rzpRes.status}): ${errBody}`);
      }

      const rzpData = await rzpRes.json();
      if (!rzpData.id || typeof rzpData.id !== 'string' || !rzpData.id.startsWith('order_')) {
        throw new Error(`Invalid Razorpay order ID returned: ${JSON.stringify(rzpData.id)}`);
      }

      razorpayOrderId = rzpData.id;
    } catch (err: any) {
      console.error('[RAZORPAY API ERROR]', err);
      throw new Error(`Failed to create genuine Razorpay order: ${err.message}`);
    }

    const now = new Date();

    // Create pending payment record in PostgreSQL with genuine Razorpay order ID
    await prisma.payments.create({
      data: {
        order_id: order.id,
        provider: 'RAZORPAY',
        provider_payment_id: razorpayOrderId,
        amount: Number(order.grand_total),
        status: 'pending',
        method: 'HOSTED_CHECKOUT',
        created_at: now
      }
    });

    return {
      providerPaymentId: razorpayOrderId,
      razorpayOrderId,
      checkoutUrl: 'https://checkout.razorpay.com/v1/checkout.js'
    };
  }

  /**
   * Directly queries Razorpay API to verify payment details, status, and amount.
   */
  async fetchRazorpayPayment(paymentId: string): Promise<any> {
    const envConfig = getEnvConfig();
    const keyId = envConfig.razorpayKeyId || process.env.PUBLIC_RAZORPAY_KEY_ID;
    const keySecret = envConfig.razorpayKeySecret;

    if (!keyId || !keySecret) {
      throw new Error('Razorpay credentials not configured for server payment fetch.');
    }

    const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
    const res = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}`, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      }
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Failed to fetch payment details from Razorpay (${res.status}): ${errText}`);
    }

    return await res.json();
  }

  /**
   * Verifies payment signature returned by Razorpay Checkout modal.
   * HMAC-SHA256 of (razorpay_order_id + '|' + razorpay_payment_id) with RAZORPAY_KEY_SECRET.
   * Uses timingSafeEqual to prevent side-channel timing attacks.
   */
  verifyPaymentSignature(params: { razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string }): boolean {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = params;
    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return false;
    }

    // Must be valid formats
    if (typeof razorpayOrderId !== 'string' || typeof razorpayPaymentId !== 'string' || typeof razorpaySignature !== 'string') {
      return false;
    }

    const envConfig = getEnvConfig();
    const keySecret = envConfig.razorpayKeySecret;
    if (!keySecret) {
      console.warn('[RAZORPAY WARNING] RAZORPAY_KEY_SECRET is not configured.');
      return false;
    }

    try {
      const payload = `${razorpayOrderId}|${razorpayPaymentId}`;
      const expected = crypto.createHmac('sha256', keySecret).update(payload).digest('hex');

      const sigBuf = Buffer.from(razorpaySignature.trim(), 'utf8');
      const expectedBuf = Buffer.from(expected, 'utf8');

      if (sigBuf.length !== expectedBuf.length) {
        return false;
      }
      return crypto.timingSafeEqual(sigBuf, expectedBuf);
    } catch {
      return false;
    }
  }

  /**
   * Production webhook HMAC-SHA256 verification against RAZORPAY_WEBHOOK_SECRET.
   * Uses timingSafeEqual to prevent side-channel timing attacks.
   */
  verifyWebhookSignature(rawBody: string, signature: string): boolean {
    if (!rawBody || !signature || typeof signature !== 'string') return false;
    const envConfig = getEnvConfig();
    const webhookSecret = envConfig.razorpayWebhookSecret;
    if (!webhookSecret) return false;

    try {
      const expected = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
      const sigBuf = Buffer.from(signature.trim(), 'utf8');
      const expectedBuf = Buffer.from(expected, 'utf8');
      if (sigBuf.length !== expectedBuf.length) {
        return false;
      }
      return crypto.timingSafeEqual(sigBuf, expectedBuf);
    } catch {
      return false;
    }
  }

  /**
   * Idempotent payment success processor.
   * Used by both frontend verification API and backend webhook handlers.
   */
  async handlePaymentSuccess(params: {
    orderId: number;
    providerPaymentId: string;
    providerOrderId?: string;
    rawPayload?: any;
  }): Promise<{ success: boolean; orderId: number; orderNumber: string }> {
    const { orderId, providerPaymentId, rawPayload } = params;
    const now = new Date();

    const order = await prisma.orders.findUnique({
      where: { id: orderId }
    });

    if (!order) {
      throw new Error(`Order #${orderId} not found`);
    }

    // Check if order is already paid & confirmed (Idempotency)
    if (order.payment_status === 'paid' && order.status === 'Confirmed') {
      return { success: true, orderId, orderNumber: order.order_number };
    }

    await prisma.$transaction(async (tx) => {
      // 1. Update or create payment record with the genuine Razorpay payment ID
      const existingPayment = await tx.payments.findFirst({
        where: { order_id: orderId }
      });

      if (existingPayment) {
        await tx.payments.update({
          where: { id: existingPayment.id },
          data: {
            status: 'paid',
            provider_payment_id: providerPaymentId,
            raw_payload: rawPayload ? JSON.stringify(rawPayload) : existingPayment.raw_payload
          }
        });
      } else {
        await tx.payments.create({
          data: {
            order_id: orderId,
            provider: 'RAZORPAY',
            provider_payment_id: providerPaymentId,
            amount: Number(order.grand_total),
            status: 'paid',
            method: 'HOSTED_CHECKOUT',
            raw_payload: rawPayload ? JSON.stringify(rawPayload) : null,
            created_at: now
          }
        });
      }

      // 2. Mark order Confirmed and paid
      await tx.orders.update({
        where: { id: orderId },
        data: {
          status: 'Confirmed',
          payment_status: 'paid',
          updated_at: now
        }
      });

      // 3. Decrement stock idempotently (only if not already decremented for this order)
      const existingSaleTxn = await tx.inventoryTxns.findFirst({
        where: { order_id: orderId, reason: 'SALE' }
      });

      const orderItems = await tx.orderItems.findMany({ where: { order_id: orderId } });

      if (!existingSaleTxn) {
        for (const item of orderItems) {
          if (item.variant_id) {
            await atomicDecrementStock({
              variantId: item.variant_id,
              delta: -item.qty,
              reason: 'SALE',
              orderId
            }, tx);
          }
        }
      }

      // 4. Generate Invoice Record idempotently
      const existingInvoice = await tx.invoices.findFirst({
        where: { order_id: orderId }
      });

      if (!existingInvoice) {
        const shippingAddress = order.shipping_address_id
          ? await tx.addresses.findUnique({ where: { id: order.shipping_address_id } })
          : null;

        const invRecord = await generateInvoiceRecord(order, orderItems, shippingAddress);

        await tx.invoices.create({
          data: {
            order_id: orderId,
            invoice_number: invRecord.invoiceNumber,
            pdf_url: `/invoices/${invRecord.invoiceNumber}.html`,
            issued_at: new Date(invRecord.issuedAt)
          }
        });
      }

      // 5. Customer Notification
      const customerRow = await tx.customers.findUnique({ where: { id: order.customer_id } });
      if (customerRow?.email) {
        logNotification({
          channel: 'EMAIL',
          template: 'PAYMENT_CONFIRMATION',
          recipient: customerRow.email,
          entityType: 'order',
          entityId: orderId,
          data: {
            customerName: customerRow.name,
            orderNumber: order.order_number,
            grandTotal: Number(order.grand_total),
            paymentMethod: 'Online Payment (Razorpay)'
          }
        });
      }
    });

    return { success: true, orderId, orderNumber: order.order_number };
  }

  /**
   * Processes incoming Razorpay webhooks.
   * Strictly validates payload, event ID, payment entity, order ownership, and amount.
   * Rejects malformed payloads and amount/order mismatches.
   */
  async processWebhookEvent(payload: any): Promise<{ success: boolean; eventId: string; orderId: number; status: string }> {
    if (!payload || typeof payload !== 'object') {
      throw new Error('Malformed webhook payload: expected JSON object.');
    }

    const eventId = payload.id || payload.event_id;
    if (!eventId || typeof eventId !== 'string') {
      throw new Error('Malformed webhook payload: missing event ID.');
    }

    const eventType = payload.event;
    if (!eventType || typeof eventType !== 'string') {
      throw new Error('Malformed webhook payload: missing event type.');
    }

    const paymentEntity = payload.payload?.payment?.entity;
    const now = new Date();

    // 1. Replay Protection: Check if event already processed
    const existingEvent = await prisma.paymentEvents.findUnique({
      where: { provider_event_id: eventId }
    });

    if (existingEvent) {
      console.log(`[WEBHOOK REPLAY DETECTED] Event ${eventId} was already processed at ${existingEvent.processed_at}`);
      const payment = existingEvent.payment_id ? await prisma.payments.findUnique({ where: { id: existingEvent.payment_id } }) : null;
      return { success: true, eventId, orderId: payment ? payment.order_id : 0, status: 'ALREADY_PROCESSED' };
    }

    if (eventType === 'payment.captured' || eventType === 'payment.authorized' || eventType === 'order.paid') {
      if (!paymentEntity || typeof paymentEntity !== 'object') {
        throw new Error('Malformed webhook payload: missing payment entity for payment event.');
      }

      const providerPaymentId = paymentEntity.id;
      if (!providerPaymentId || typeof providerPaymentId !== 'string' || !providerPaymentId.startsWith('pay_')) {
        throw new Error('Malformed webhook payload: missing or invalid payment ID.');
      }

      const rzpOrderId = paymentEntity.order_id;
      if (!rzpOrderId || typeof rzpOrderId !== 'string' || !rzpOrderId.startsWith('order_')) {
        throw new Error('Malformed webhook payload: missing or invalid Razorpay order ID.');
      }

      // Determine VINSHO target order
      let orderId = Number(
        paymentEntity.notes?.order_id ||
        payload.payload?.order?.entity?.notes?.order_id
      );

      if (!orderId || isNaN(orderId)) {
        // Look up by provider_payment_id (which holds rzpOrderId from initiation)
        const linkedPayment = await prisma.payments.findFirst({
          where: { provider_payment_id: rzpOrderId }
        });
        if (linkedPayment) orderId = linkedPayment.order_id;
      }

      if (!orderId) {
        throw new Error(`Unable to determine VINSHO order_id for Razorpay webhook event ${eventId} (Razorpay Order: ${rzpOrderId})`);
      }

      // Fetch VINSHO Order from DB
      const order = await prisma.orders.findUnique({ where: { id: orderId } });
      if (!order) {
        throw new Error(`VINSHO order #${orderId} referenced by webhook does not exist.`);
      }

      // Order Ownership Validation (§7): Ensure Razorpay Order belongs to this VINSHO order
      const existingPayment = await prisma.payments.findFirst({
        where: { order_id: orderId, provider: 'RAZORPAY' }
      });

      if (!existingPayment || (existingPayment.provider_payment_id !== rzpOrderId && existingPayment.provider_payment_id !== providerPaymentId)) {
        throw new Error(`Payment order ID ${rzpOrderId} does not match order record for VINSHO order #${orderId}.`);
      }

      // Amount Validation (§7): Reject if amount does not match order grand total
      const expectedPaise = Math.round(Number(order.grand_total) * 100);
      if (typeof paymentEntity.amount === 'number' && paymentEntity.amount !== expectedPaise) {
        throw new Error(`Payment amount mismatch for order #${orderId}: received ${paymentEntity.amount} paise, expected ${expectedPaise} paise.`);
      }

      // Currency Validation (§7)
      const expectedCurrency = (order.currency || 'INR').toUpperCase();
      if (paymentEntity.currency && paymentEntity.currency.toUpperCase() !== expectedCurrency) {
        throw new Error(`Payment currency mismatch for order #${orderId}: received ${paymentEntity.currency}, expected ${expectedCurrency}.`);
      }

      // Record webhook event to prevent future replays
      await prisma.paymentEvents.create({
        data: {
          payment_id: existingPayment?.id || null,
          provider_event_id: eventId,
          type: eventType,
          payload: JSON.stringify(payload),
          processed_at: now
        }
      });

      await this.handlePaymentSuccess({
        orderId,
        providerPaymentId,
        providerOrderId: rzpOrderId,
        rawPayload: payload
      });

      return { success: true, eventId, orderId, status: 'paid' };

    } else if (eventType === 'payment.failed') {
      const providerPaymentId = paymentEntity?.id || 'pay_failed';
      const rzpOrderId = paymentEntity?.order_id;
      let orderId = Number(paymentEntity?.notes?.order_id);

      if (!orderId && rzpOrderId) {
        const linkedPayment = await prisma.payments.findFirst({
          where: { provider_payment_id: rzpOrderId }
        });
        if (linkedPayment) orderId = linkedPayment.order_id;
      }

      if (orderId) {
        const existingPayment = await prisma.payments.findFirst({ where: { order_id: orderId } });
        await prisma.paymentEvents.create({
          data: {
            payment_id: existingPayment?.id || null,
            provider_event_id: eventId,
            type: eventType,
            payload: JSON.stringify(payload),
            processed_at: now
          }
        });

        await prisma.orders.update({
          where: { id: orderId },
          data: {
            payment_status: 'failed',
            updated_at: now
          }
        });
        return { success: true, eventId, orderId, status: 'failed' };
      }

      return { success: true, eventId, orderId: 0, status: 'failed_unlinked' };
    }

    return { success: true, eventId, orderId: 0, status: 'unhandled_event' };
  }
}

export const defaultPaymentProvider = new RazorpayProvider();
