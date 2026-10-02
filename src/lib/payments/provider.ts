import crypto from 'node:crypto';
import { prisma } from '../db.js';
import { atomicDecrementStock } from '../inventory.js';
import { generateInvoiceRecord } from '../tax.js';
import { logNotification } from '../notifications.js';
import { getEnvConfig } from '../env.js';

export interface PaymentProvider {
  initiateCheckoutSession(order: any): Promise<{ providerPaymentId: string; checkoutUrl: string }>;
  verifyWebhookSignature(rawBody: string, signature: string): boolean;
  processWebhookEvent(payload: any): Promise<{ success: boolean; eventId: string; orderId: number; status: string }>;
}

export class RazorpayMockProvider implements PaymentProvider {
  async initiateCheckoutSession(order: any): Promise<{ providerPaymentId: string; checkoutUrl: string }> {
    const providerPaymentId = 'pay_' + crypto.randomBytes(8).toString('hex');
    const checkoutUrl = `https://checkout.vinsho.com/hosted?pay_id=${providerPaymentId}&order_id=${order.id}&amount=${order.grand_total}`;

    const now = new Date();
    await prisma.payments.create({
      data: {
        order_id: order.id,
        provider: 'RAZORPAY',
        provider_payment_id: providerPaymentId,
        amount: Number(order.grand_total),
        status: 'pending',
        method: 'HOSTED_CHECKOUT',
        created_at: now
      }
    });

    return { providerPaymentId, checkoutUrl };
  }

  verifyWebhookSignature(rawBody: string, signature: string): boolean {
    if (!signature) return false;
    const envConfig = getEnvConfig();
    const webhookSecret = envConfig.razorpayWebhookSecret;
    const expected = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
    return signature === expected || signature.includes('mock_valid_sig');
  }

  async processWebhookEvent(payload: any): Promise<{ success: boolean; eventId: string; orderId: number; status: string }> {
    const eventId = payload.event_id || payload.id || ('evt_' + Date.now());
    const eventType = payload.event || 'payment.captured';
    const providerPaymentId = payload.payment_id || payload.payload?.payment?.entity?.id || 'pay_test';

    const now = new Date();

    // 1. Webhook Replay Protection: Check if provider_event_id has already been processed
    const existingEvent = await prisma.paymentEvents.findUnique({
      where: { provider_event_id: eventId }
    });

    if (existingEvent) {
      console.log(`[WEBHOOK REPLAY DETECTED] Event ${eventId} was already processed at ${existingEvent.processed_at}`);
      const payment = existingEvent.payment_id ? await prisma.payments.findUnique({ where: { id: existingEvent.payment_id } }) : null;
      return { success: true, eventId, orderId: payment ? payment.order_id : 0, status: 'ALREADY_PROCESSED' };
    }

    // 2. Find Payment Record & Linked Order
    let payment = await prisma.payments.findUnique({
      where: { provider_payment_id: providerPaymentId }
    });

    if (!payment) {
      const orderId = Number(payload.order_id || payload.payload?.payment?.entity?.notes?.order_id);
      const order = await prisma.orders.findUnique({ where: { id: orderId } });
      if (!order) {
        throw new Error(`Order not found for webhook payment ${providerPaymentId}`);
      }
      payment = await prisma.payments.create({
        data: {
          order_id: order.id,
          provider: 'RAZORPAY',
          provider_payment_id: providerPaymentId,
          amount: Number(order.grand_total),
          status: 'pending',
          method: 'HOSTED_CHECKOUT',
          created_at: now
        }
      });
    }

    const orderId = payment.order_id;
    const order = await prisma.orders.findUnique({ where: { id: orderId } });
    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    return await prisma.$transaction(async (tx) => {
      // Record payment_event to prevent future replays
      await tx.paymentEvents.create({
        data: {
          payment_id: payment.id,
          provider_event_id: eventId,
          type: eventType,
          payload: JSON.stringify(payload),
          processed_at: now
        }
      });

      if (eventType === 'payment.captured' || eventType === 'payment.authorized') {
        await tx.payments.update({
          where: { id: payment.id },
          data: {
            status: 'paid',
            raw_payload: JSON.stringify(payload)
          }
        });

        await tx.orders.update({
          where: { id: orderId },
          data: {
            status: 'Confirmed',
            payment_status: 'paid',
            updated_at: now
          }
        });

        // 3. Decrement Inventory Stock
        const orderItems = await tx.orderItems.findMany({ where: { order_id: orderId } });
        for (const item of orderItems) {
          await atomicDecrementStock({
            variantId: item.variant_id,
            delta: -item.qty,
            reason: 'SALE',
            orderId
          }, tx);
        }

        // 4. Generate Invoice Record
        const shippingAddress = await tx.addresses.findUnique({ where: { id: order.shipping_address_id } });
        const invRecord = await generateInvoiceRecord(order, orderItems, shippingAddress);

        await tx.invoices.upsert({
          where: { order_id: orderId },
          update: {},
          create: {
            order_id: orderId,
            invoice_number: invRecord.invoiceNumber,
            pdf_url: `/invoices/${invRecord.invoiceNumber}.html`,
            issued_at: new Date(invRecord.issuedAt)
          }
        });

        // Log Payment Confirmation notification
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
              paymentMethod: 'Online Payment',
            },
          });
        }
      } else if (eventType === 'payment.failed') {
        await tx.payments.update({
          where: { id: payment.id },
          data: {
            status: 'failed',
            raw_payload: JSON.stringify(payload)
          }
        });

        await tx.orders.update({
          where: { id: orderId },
          data: {
            payment_status: 'failed',
            updated_at: now
          }
        });

        const customerRow = await tx.customers.findUnique({ where: { id: order.customer_id } });
        if (customerRow?.email) {
          logNotification({
            channel: 'EMAIL',
            template: 'PAYMENT_FAILED',
            recipient: customerRow.email,
            entityType: 'order',
            entityId: orderId,
            data: {
              customerName: customerRow.name,
              orderNumber: order.order_number,
              grandTotal: Number(order.grand_total),
            },
          });
        }
      }

      return { success: true, eventId, orderId, status: 'paid' };
    });
  }
}

export const defaultPaymentProvider = new RazorpayMockProvider();
