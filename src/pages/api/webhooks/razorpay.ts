import type { APIRoute } from 'astro';
import crypto from 'crypto';
import { db } from '../../../lib/db.js';
import { getEnvConfig } from '../../../lib/env.js';
import { sendOrderNotifications } from '../../../lib/orders.js';

export const POST: APIRoute = async ({ request }) => {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-razorpay-signature');

    if (!signature) {
      return new Response(JSON.stringify({ error: 'Missing webhook signature.' }), { status: 400 });
    }

    const envConfig = getEnvConfig();
    const webhookSecret = envConfig.razorpayWebhookSecret || process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error('Webhook secret misconfigured.');
      return new Response(JSON.stringify({ error: 'Webhook misconfiguration.' }), { status: 500 });
    }

    // 1. Verify Webhook Signature securely
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    const expectedBuffer = Buffer.from(expectedSignature, 'utf-8');
    const signatureBuffer = Buffer.from(signature, 'utf-8');

    if (expectedBuffer.length !== signatureBuffer.length || !crypto.timingSafeEqual(expectedBuffer, signatureBuffer)) {
      return new Response(JSON.stringify({ error: 'Invalid webhook signature.' }), { status: 400 });
    }

    // 2. Safely parse the trusted payload
    const payload = JSON.parse(rawBody);
    const eventType = payload.event;
    
    // We only care about order.paid or payment.captured for successful payments
    if (eventType !== 'order.paid' && eventType !== 'payment.captured' && eventType !== 'payment.failed') {
      return new Response(JSON.stringify({ success: true, message: 'Event ignored.' }), { status: 200 });
    }

    // Extract Razorpay IDs from payload safely
    const paymentEntity = payload.payload?.payment?.entity;
    const orderEntity = payload.payload?.order?.entity;
    
    const razorpay_order_id = orderEntity?.id || paymentEntity?.order_id;
    const razorpay_payment_id = paymentEntity?.id;

    if (!razorpay_order_id) {
      return new Response(JSON.stringify({ error: 'Missing razorpay_order_id in payload.' }), { status: 400 });
    }

    // 3. Look up internal order safely using razorpay_order_id
    const order = db.prepare('SELECT * FROM orders WHERE razorpay_order_id = ?').get(razorpay_order_id) as any;
    if (!order) {
      console.warn(`Webhook received for unknown Razorpay Order ID: ${razorpay_order_id}`);
      return new Response(JSON.stringify({ success: true, message: 'Order not found in this system.' }), { status: 200 });
    }

    if (eventType === 'payment.failed') {
      // If payment failed, only update if it is still pending
      if (order.payment_status === 'pending') {
        db.prepare('UPDATE orders SET payment_status = ?, updated_at = ? WHERE id = ?')
          .run('failed', new Date().toISOString(), order.id);
      }
      return new Response(JSON.stringify({ success: true, message: 'Payment failure logged.' }), { status: 200 });
    }

    // Handle Success (payment.captured / order.paid)
    if (order.payment_status === 'paid') {
      // Idempotent success
      return new Response(JSON.stringify({ success: true, message: 'Already marked as paid.' }), { status: 200 });
    }

    // 4. Mark as paid
    db.prepare('UPDATE orders SET payment_status = ?, status = ?, razorpay_payment_id = ?, updated_at = ? WHERE id = ?')
      .run('paid', 'Processing', razorpay_payment_id || order.razorpay_payment_id, new Date().toISOString(), order.id);

    // 5. Fire confirmation notifications
    try {
      const customer = db.prepare('SELECT name, email FROM customers WHERE id = ?').get(order.customer_id) as any;
      sendOrderNotifications(order, customer, envConfig.adminEmail);
    } catch (e) {
      console.error('Failed to send order email from webhook:', e);
    }

    return new Response(JSON.stringify({ success: true, message: 'Order marked as paid.' }), { status: 200 });
    
  } catch (err: any) {
    console.error('Razorpay Webhook Error:', err);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
};
