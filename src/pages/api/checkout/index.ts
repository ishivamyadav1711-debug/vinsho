import type { APIRoute } from 'astro';
import { createOrder, sendOrderNotifications } from '../../../lib/orders.js';
import { findOrCreateCustomer } from '../../../lib/crm.js';
import { getCustomerFromSession } from '../../../lib/customerAuth.js';
import { checkRateLimit, tooManyRequestsResponse, getClientIp, LIMITS } from '../../../lib/rateLimiter.js';
import { db } from '../../../lib/db.js';
import { getEnvConfig } from '../../../lib/env.js';
import { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, PUBLIC_RAZORPAY_KEY_ID } from '../../../lib/razorpay.config.js';
import Razorpay from 'razorpay';

export const POST: APIRoute = async ({ request }) => {
  const ip = getClientIp(request);
  const rl = checkRateLimit('CHECKOUT', ip, LIMITS.CHECKOUT);
  if (!rl.allowed) return tooManyRequestsResponse(rl.retryAfterSec);

  try {
    const body = await request.json();
    const {
      sessionToken, name, phone, email, line1, line2, city, state, pincode, country, idempotencyKey, couponCode, items: rawItems
    } = body;

    // Check for authenticated customer session (§8, §10)
    const authenticatedCustomer = getCustomerFromSession(request);

    if (!name || !phone || !line1 || !city || !state || !pincode || !idempotencyKey) {
      return new Response(JSON.stringify({ error: 'Name, Phone, Shipping Address, and Idempotency Key are required.' }), { status: 400 });
    }

    const cleanPhone = (phone || '').toString().trim();
    if (!/^\d{10}$/.test(cleanPhone)) {
      return new Response(JSON.stringify({ error: 'Valid 10-digit mobile phone number is required.' }), { status: 400 });
    }

    const cleanPincode = (pincode || '').toString().trim();
    if (!/^\d{6}$/.test(cleanPincode)) {
      return new Response(JSON.stringify({ error: 'Valid 6-digit Indian PIN code is required.' }), { status: 400 });
    }

    let customerId: number;
    if (authenticatedCustomer) {
      customerId = authenticatedCustomer.id;
    } else {
      const { customer } = findOrCreateCustomer({
        name,
        phone: cleanPhone,
        email,
        source: 'Checkout Purchase'
      });
      customerId = customer.id;
    }

    const orderRes = createOrder({
      sessionToken,
      customerId,
      couponCode: couponCode || null,
      items: rawItems,
      shippingAddress: { name, phone: cleanPhone, line1, line2, city, state, pincode: cleanPincode, country },
      idempotencyKey
    });

    if (!orderRes.success || !orderRes.order) {
      return new Response(JSON.stringify({ error: orderRes.error || 'Failed to create order.' }), { status: 400 });
    }

    // Create Razorpay Order
    const amountInPaise = Math.round(orderRes.order.grand_total * 100);
    if (amountInPaise < 100) {
      return new Response(JSON.stringify({ error: 'Order amount must be at least ₹1.' }), { status: 400 });
    }

    const key_id = PUBLIC_RAZORPAY_KEY_ID || RAZORPAY_KEY_ID;
    const key_secret = RAZORPAY_KEY_SECRET;

    if (!key_id || !key_secret) {
      return new Response(JSON.stringify({ error: 'Payment gateway configuration missing.' }), { status: 500 });
    }

    const razorpay = new Razorpay({ key_id, key_secret });

    let rzpOrder;
    try {
      rzpOrder = await razorpay.orders.create({
        amount: amountInPaise,
        currency: orderRes.order.currency || 'INR',
        receipt: orderRes.order.order_number,
      });
    } catch (rzpErr) {
      console.error('Razorpay Error:', rzpErr);
      return new Response(JSON.stringify({ error: 'Failed to initialize payment gateway.' }), { status: 500 });
    }
    
    try {
      db.prepare('UPDATE orders SET razorpay_order_id = ? WHERE id = ?')
        .run(rzpOrder.id, orderRes.order.id);
    } catch (dbErr) {
      console.error('Failed to save Razorpay Order ID to database:', dbErr);
      return new Response(JSON.stringify({ error: 'Failed to initialize payment gateway properly.' }), { status: 500 });
    }

    return new Response(JSON.stringify({
      success: true,
      orderNumber: orderRes.order.order_number,
      razorpayOrderId: rzpOrder.id,
      subtotal: orderRes.order.subtotal,
      discountTotal: orderRes.order.discount_total || 0,
      couponCode: orderRes.order.coupon_code || null,
      taxTotal: orderRes.order.tax_total,
      grandTotal: orderRes.order.grand_total,
      currency: orderRes.order.currency || 'INR',
      keyId: key_id
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (err: any) {
    console.error('Checkout Error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Checkout failed.' }), { status: 500 });
  }
};
