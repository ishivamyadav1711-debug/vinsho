import type { APIRoute } from 'astro';
import { defaultPaymentProvider } from '../../../lib/payments/provider.js';

export const POST: APIRoute = async ({ request }) => {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-razorpay-signature') || request.headers.get('x-signature') || '';

    // Section 0 Standing Rule: Payment state changes ONLY on a signature-verified webhook (§0, §6)
    if (!defaultPaymentProvider.verifyWebhookSignature(rawBody, signature)) {
      console.warn('[WEBHOOK REJECTED] Unsigned or signature mismatch on payment webhook');
      return new Response(JSON.stringify({ error: 'Signature verification failed.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const payload = JSON.parse(rawBody);
    const result = await defaultPaymentProvider.processWebhookEvent(payload);

    return new Response(JSON.stringify({
      success: true,
      message: 'Webhook processed successfully.',
      eventId: result.eventId,
      orderId: result.orderId
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err: any) {
    console.error('Payment Webhook Processing Error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Webhook processing failed.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
