import type { APIRoute } from 'astro';
import crypto from 'crypto';
import { db } from '../../../lib/db.js';
import { sendOrderNotifications } from '../../../lib/orders.js';
import { getEnvConfig } from '../../../lib/env.js';
import { RAZORPAY_WEBHOOK_SECRET } from '../../../lib/razorpay.config.js';

export const POST: APIRoute = async ({ request }) => {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-razorpay-signature');

    if (!signature) {
      return new Response('Missing signature', { status: 400 });
    }

    const secret = RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret) {
      console.error('Webhook Secret is not configured!');
      return new Response('Webhook Secret Missing', { status: 500 });
    }

    const expectedSignature = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    
    if (expectedSignature !== signature) {
      return new Response('Invalid signature', { status: 400 });
    }

    const event = JSON.parse(rawBody);

    if (event.event === 'payment.captured' || event.event === 'order.paid') {
      const paymentEntity = event.payload.payment.entity;
      const razorpay_order_id = paymentEntity.order_id;
      const razorpay_payment_id = paymentEntity.id;

      const order = db.prepare('SELECT * FROM orders WHERE razorpay_order_id = ?').get(razorpay_order_id) as any;
      if (order && !order.payment_verified) {
        db.prepare('UPDATE orders SET payment_status = ?, status = ?, razorpay_payment_id = ?, payment_verified = 1, updated_at = ? WHERE id = ?')
          .run('paid', 'Confirmed', razorpay_payment_id, new Date().toISOString(), order.id);

        try {
          const customer = db.prepare('SELECT name, email, phone FROM customers WHERE id = ?').get(order.customer_id) as any;
          const address = db.prepare('SELECT phone FROM addresses WHERE id = ?').get(order.shipping_address_id) as any;
          const phone = customer?.phone || address?.phone || '';
          
          const { adminEmail } = getEnvConfig();
          const updatedOrder = db.prepare('SELECT * FROM orders WHERE id = ?').get(order.id) as any;
          sendOrderNotifications(updatedOrder, customer, adminEmail, phone);
        } catch (e) {
          console.error('Failed to send order notifications from webhook:', e);
        }
      }
    } else if (event.event === 'payment.failed') {
      const paymentEntity = event.payload.payment.entity;
      const razorpay_order_id = paymentEntity.order_id;
      const errorReason = paymentEntity.error_description || 'Payment Failed';

      const order = db.prepare('SELECT * FROM orders WHERE razorpay_order_id = ?').get(razorpay_order_id) as any;
      if (order && order.payment_status === 'pending') {
        db.prepare('UPDATE orders SET payment_status = ?, updated_at = ? WHERE id = ?')
          .run('failed', new Date().toISOString(), order.id);
      }
    }

    return new Response(JSON.stringify({ status: 'ok' }), { status: 200 });

  } catch (err) {
    console.error('Webhook Processing Error:', err);
    return new Response('Webhook Error', { status: 500 });
  }
};
