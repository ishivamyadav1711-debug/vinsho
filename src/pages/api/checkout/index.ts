import type { APIRoute } from 'astro';
import { createOrder, sendOrderNotifications } from '../../../lib/orders.js';
import { findOrCreateCustomer } from '../../../lib/crm.js';
import { getCustomerFromSession } from '../../../lib/customerAuth.js';
import { checkRateLimit, tooManyRequestsResponse, getClientIp, LIMITS } from '../../../lib/rateLimiter.js';
import { prisma } from '../../../lib/db.js';
import { getEnvConfig } from '../../../lib/env.js';
import { defaultPaymentProvider } from '../../../lib/payments/provider.js';
import { sanitizeApiError } from '../../../lib/apiErrors.js';

export const POST: APIRoute = async ({ request }) => {
  const ip = getClientIp(request);
  const rl = checkRateLimit('CHECKOUT', ip, LIMITS.CHECKOUT);
  if (!rl.allowed) return tooManyRequestsResponse(rl.retryAfterSec);

  try {
    const body = await request.json();
    const {
      sessionToken, name, phone, email, line1, line2, city, state, pincode, country, idempotencyKey, couponCode, items: rawItems
    } = body;

    console.log('[CHECKOUT API] Request received with payload:', JSON.stringify({ ...body, items: rawItems }, null, 2));

    const authenticatedCustomer = await getCustomerFromSession(request);

    console.log('[CHECKOUT API] Validating required fields...');
    if (!name || !phone || !line1 || !city || !state || !pincode || !idempotencyKey) {
      const missing = [];
      if (!name) missing.push('name');
      if (!phone) missing.push('phone');
      if (!line1) missing.push('line1');
      if (!city) missing.push('city');
      if (!state) missing.push('state');
      if (!pincode) missing.push('pincode');
      if (!idempotencyKey) missing.push('idempotencyKey');
      
      console.error(`[CHECKOUT API] 400 - Missing required fields: ${missing.join(', ')}`);
      return new Response(JSON.stringify({ 
        success: false, stage: 'VALIDATE_REQUIRED_FIELDS', code: 'MISSING_FIELDS', message: `Missing required fields: ${missing.join(', ')}` 
      }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    console.log('[CHECKOUT API] Validating phone number format...');
    const cleanPhone = (phone || '').toString().trim();
    if (!/^\d{10}$/.test(cleanPhone)) {
      console.error(`[CHECKOUT API] 400 - Invalid phone: ${cleanPhone}`);
      return new Response(JSON.stringify({ 
        success: false, stage: 'VALIDATE_PHONE', code: 'INVALID_PHONE', message: `Phone '${cleanPhone}' is not a valid 10-digit number.` 
      }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    console.log('[CHECKOUT API] Validating pincode format...');
    const cleanPincode = (pincode || '').toString().trim();
    if (!/^\d{6}$/.test(cleanPincode)) {
      console.error(`[CHECKOUT API] 400 - Invalid pincode: ${cleanPincode}`);
      return new Response(JSON.stringify({ 
        success: false, stage: 'VALIDATE_PINCODE', code: 'INVALID_PINCODE', message: `Pincode '${cleanPincode}' is not a valid 6-digit number.` 
      }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    let customerId: number;
    if (authenticatedCustomer) {
      customerId = authenticatedCustomer.id;
    } else {
      console.log('[CHECKOUT API] Resolving guest customer record...');
      const { customer } = await findOrCreateCustomer({
        name,
        phone: cleanPhone,
        email,
        source: 'Checkout Purchase'
      });
      customerId = customer.id;
    }

    console.log('[CHECKOUT API] Validating cart items structure...');
    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      console.error('[CHECKOUT API] 400 - Cart is empty or invalid structure.');
      return new Response(JSON.stringify({ 
        success: false, stage: 'VALIDATE_CART_STRUCTURE', code: 'EMPTY_CART', message: 'Cart is empty.' 
      }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const invalidItems = rawItems.filter(i => typeof i.variantId !== 'number' || isNaN(i.variantId) || i.variantId === null);
    if (invalidItems.length > 0) {
      console.error('[CHECKOUT API] 400 - Invalid variant ID found in cart items:', invalidItems);
      return new Response(JSON.stringify({ 
        success: false, stage: 'VALIDATE_CART_VARIANTS', code: 'INVALID_VARIANT_ID', message: 'Some items in your cart are missing a valid variant ID (this can happen if your cart is from an older version of the site). Please clear your cart and add the items again.' 
      }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    console.log('[CHECKOUT API] Initiating order creation sequence...');
    const orderRes = await createOrder({
      sessionToken,
      customerId,
      couponCode: couponCode || null,
      items: rawItems,
      shippingAddress: { name, phone: cleanPhone, line1, line2, city, state, pincode: cleanPincode, country },
      idempotencyKey
    });

    if (!orderRes.success || !orderRes.order) {
      console.error('[CHECKOUT API] 400 - createOrder returned success: false', orderRes);
      return new Response(JSON.stringify({ 
        success: false, stage: 'CREATE_ORDER', code: 'ORDER_CREATION_FAILED', message: orderRes.error || 'Failed to create order.' 
      }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    // Initiate Razorpay checkout session
    const paymentSession = await defaultPaymentProvider.initiateCheckoutSession(orderRes.order);
    const envConfig = getEnvConfig();
    const razorpayKeyId = envConfig.razorpayKeyId || process.env.PUBLIC_RAZORPAY_KEY_ID || '';

    // Fire order notification emails (fire-and-forget — never blocks response)
    try {
      const customer = await prisma.customers.findUnique({
        where: { id: customerId },
        select: { name: true, email: true }
      });
      const { adminEmail } = getEnvConfig();
      sendOrderNotifications(orderRes.order, customer || { name, email }, adminEmail);
    } catch (_) { /* email failure must not affect the order response */ }

    return new Response(JSON.stringify({
      success: true,
      orderId: orderRes.order.id,
      orderNumber: orderRes.order.order_number,
      subtotal: orderRes.order.subtotal,
      discountTotal: orderRes.order.discount_total || 0,
      couponCode: orderRes.order.coupon_code || null,
      taxTotal: orderRes.order.tax_total,
      shippingTotal: orderRes.order.shipping_total,
      grandTotal: orderRes.order.grand_total,
      currency: orderRes.order.currency || 'INR',
      razorpayOrderId: paymentSession.razorpayOrderId,
      razorpayKeyId,
      keyId: razorpayKeyId
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (err: any) {
    console.error('Checkout Error [Top Level Catch]:', err);
    return new Response(JSON.stringify({ 
      success: false,
      stage: 'TOP_LEVEL_CATCH',
      code: 'INTERNAL_ERROR',
      message: err.message || 'Checkout failed due to an internal error.'
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
