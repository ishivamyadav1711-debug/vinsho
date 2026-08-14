import type { APIRoute } from 'astro';
import { createOrder } from '../../../lib/orders.js';
import { defaultPaymentProvider } from '../../../lib/payments/provider.js';
import { findOrCreateCustomer } from '../../../lib/crm.js';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const {
      sessionToken, name, phone, email, line1, line2, city, state, pincode, country, idempotencyKey
    } = body;

    if (!sessionToken || !name || !phone || !line1 || !city || !state || !pincode || !idempotencyKey) {
      return new Response(JSON.stringify({ error: 'Name, Phone, Shipping Address, and Idempotency Key are required.' }), { status: 400 });
    }

    // 1. Resolve or Create Customer Record
    const { customer } = findOrCreateCustomer({
      name,
      phone,
      email,
      source: 'Checkout Purchase'
    });

    // 2. Create Order (Server-Side Verification, Snapshots & Idempotency Key)
    const orderRes = createOrder({
      sessionToken,
      customerId: customer.id,
      shippingAddress: { name, phone, line1, line2, city, state, pincode, country },
      idempotencyKey
    });

    if (!orderRes.success || !orderRes.order) {
      return new Response(JSON.stringify({ error: orderRes.error || 'Failed to create order.' }), { status: 400 });
    }

    // 3. Initiate Hosted Payment Checkout Session (§0, §6)
    const paymentSession = await defaultPaymentProvider.initiateCheckoutSession(orderRes.order);

    return new Response(JSON.stringify({
      success: true,
      orderNumber: orderRes.order.order_number,
      grandTotal: orderRes.order.grand_total,
      currency: orderRes.order.currency,
      providerPaymentId: paymentSession.providerPaymentId,
      checkoutUrl: paymentSession.checkoutUrl
    }), { status: 200 });

  } catch (err: any) {
    console.error('Checkout Error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Checkout failed.' }), { status: 500 });
  }
};
