import type { APIRoute } from 'astro';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { db } from '../../../lib/db.js';
import { sendOrderNotifications } from '../../../lib/orders.js';
import { getEnvConfig } from '../../../lib/env.js';
import { RAZORPAY_KEY_SECRET } from '../../../lib/razorpay.config.js';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { orderNumber, razorpay_payment_id, razorpay_order_id, razorpay_signature } = body;

    if (!orderNumber || !razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return new Response(JSON.stringify({ error: 'Missing payment verification fields.' }), { status: 400 });
    }

    let key_secret = RAZORPAY_KEY_SECRET;
    
    if (!key_secret) {
      return new Response(JSON.stringify({ error: 'Server misconfiguration.' }), { status: 500 });
    }

    // 1. Look up internal order safely using razorpay_order_id
    const order = db.prepare('SELECT * FROM orders WHERE razorpay_order_id = ?').get(razorpay_order_id) as any;
    if (!order) {
      return new Response(JSON.stringify({ error: 'Order not found or invalid Razorpay Order ID.' }), { status: 404 });
    }

    if (order.order_number !== orderNumber) {
      return new Response(JSON.stringify({ error: 'Order mismatch.' }), { status: 400 });
    }

    if (order.payment_status === 'paid') {
      return new Response(JSON.stringify({ success: true, message: 'Already paid.' }), { status: 200 });
    }

    // 2. Verify Signature securely
    const text = razorpay_order_id + "|" + razorpay_payment_id;
    const generated_signature = crypto
      .createHmac('sha256', key_secret)
      .update(text)
      .digest('hex');

    const expectedBuffer = Buffer.from(generated_signature, 'utf-8');
    const signatureBuffer = Buffer.from(razorpay_signature, 'utf-8');

    if (expectedBuffer.length !== signatureBuffer.length || !crypto.timingSafeEqual(expectedBuffer, signatureBuffer)) {
      return new Response(JSON.stringify({ error: 'Invalid payment signature.' }), { status: 400 });
    }

    // 3. Idempotent checkout processing
    if (!order.payment_verified) {
      db.prepare('UPDATE orders SET payment_status = ?, status = ?, razorpay_payment_id = ?, payment_verified = 1, updated_at = ? WHERE id = ?')
        .run('paid', 'Confirmed', razorpay_payment_id, new Date().toISOString(), order.id);

      // 4. Send Order Confirmation Emails & WhatsApp
      try {
        const customer = db.prepare('SELECT name, email, phone FROM customers WHERE id = ?').get(order.customer_id) as any;
        const address = db.prepare('SELECT phone FROM addresses WHERE id = ?').get(order.shipping_address_id) as any;
        const phone = customer.phone || address?.phone || '';
        
        const { adminEmail } = getEnvConfig();
        const updatedOrder = db.prepare('SELECT * FROM orders WHERE id = ?').get(order.id) as any;
        sendOrderNotifications(updatedOrder, customer, adminEmail, phone);
      } catch (e) {
        console.error('Failed to send order notifications:', e);
      }
    }

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (err: any) {
    console.error('Payment Verify Error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Payment verification failed.' }), { status: 500 });
  }
};
