import type { APIRoute } from 'astro';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { db } from '../../../lib/db.js';
import { sendOrderNotifications } from '../../../lib/orders.js';
import { getEnvConfig } from '../../../lib/env.js';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { orderNumber, razorpay_payment_id, razorpay_order_id, razorpay_signature } = body;

    if (!orderNumber || !razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return new Response(JSON.stringify({ error: 'Missing payment verification fields.' }), { status: 400 });
    }

    let key_secret = process.env.RAZORPAY_KEY_SECRET;
    try { key_secret = key_secret || (import.meta as any).env?.RAZORPAY_KEY_SECRET; } catch (e) {}
    
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

    // 3. Mark as paid and save payment ID
    db.prepare('UPDATE orders SET payment_status = ?, status = ?, razorpay_payment_id = ?, updated_at = ? WHERE id = ?')
      .run('paid', 'Processing', razorpay_payment_id, new Date().toISOString(), order.id);

    // 4. Send Order Confirmation Emails
    try {
      const customer = db.prepare('SELECT name, email FROM customers WHERE id = ?').get(order.customer_id) as any;
      const { adminEmail } = getEnvConfig();
      sendOrderNotifications(order, customer, adminEmail);
    } catch (e) {
      console.error('Failed to send order email:', e);
    }

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (err: any) {
    console.error('Payment Verify Error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Payment verification failed.' }), { status: 500 });
  }
};
