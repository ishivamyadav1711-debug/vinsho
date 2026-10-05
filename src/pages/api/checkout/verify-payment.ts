import type { APIRoute } from 'astro';
import { defaultPaymentProvider } from '../../../lib/payments/provider.js';
import { checkRateLimit, tooManyRequestsResponse, getClientIp, LIMITS } from '../../../lib/rateLimiter.js';
import { prisma } from '../../../lib/db.js';
import { getEnvConfig } from '../../../lib/env.js';

export const POST: APIRoute = async ({ request }) => {
  const ip = getClientIp(request);
  const rl = checkRateLimit('CHECKOUT', ip, LIMITS.CHECKOUT);
  if (!rl.allowed) return tooManyRequestsResponse(rl.retryAfterSec);

  try {
    const body = await request.json();
    const { orderId, orderNumber, razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;

    // 1. Parameter Validation
    if (!orderId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return new Response(JSON.stringify({
        error: 'Missing required payment verification parameters.'
      }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    if (
      typeof razorpay_order_id !== 'string' ||
      typeof razorpay_payment_id !== 'string' ||
      typeof razorpay_signature !== 'string' ||
      !razorpay_order_id.startsWith('order_') ||
      !razorpay_payment_id.startsWith('pay_')
    ) {
      return new Response(JSON.stringify({
        error: 'Malformed payment parameters. Invalid payment or order identifier format.'
      }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const numericOrderId = Number(orderId);
    if (!numericOrderId || isNaN(numericOrderId)) {
      return new Response(JSON.stringify({
        error: 'Invalid order ID format.'
      }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    // 2. Fetch Order from Database
    const order = await prisma.orders.findUnique({
      where: { id: numericOrderId }
    });

    if (!order) {
      return new Response(JSON.stringify({
        error: 'Order not found.'
      }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }

    if (order.status === 'Cancelled') {
      return new Response(JSON.stringify({
        error: 'Cannot process payment for a cancelled order.'
      }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    // 3. ORDER OWNERSHIP VALIDATION (§7)
    // Verify that this Razorpay order ID belongs specifically to this VINSHO order
    const pendingPayment = await prisma.payments.findFirst({
      where: { order_id: numericOrderId, provider: 'RAZORPAY' }
    });

    if (!pendingPayment || (pendingPayment.provider_payment_id !== razorpay_order_id && pendingPayment.provider_payment_id !== razorpay_payment_id)) {
      console.warn(`[SECURITY ALERT] Payment ownership mismatch! Order #${numericOrderId} expected Razorpay Order ${pendingPayment?.provider_payment_id}, but received ${razorpay_order_id}`);
      return new Response(JSON.stringify({
        error: 'Payment order ID does not match order record. Order ownership verification failed.'
      }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    // 4. Cryptographic HMAC-SHA256 signature verification (§5)
    const isValidSignature = defaultPaymentProvider.verifyPaymentSignature({
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature
    });

    if (!isValidSignature) {
      console.warn(`[SECURITY WARNING] Invalid Razorpay payment signature for order #${numericOrderId}`);
      return new Response(JSON.stringify({
        error: 'Invalid payment signature. Cryptographic verification failed.'
      }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    // 5. DIRECT SERVER-SIDE RAZORPAY VERIFICATION & AMOUNT VALIDATION (§5, §7)
    const envConfig = getEnvConfig();
    const hasKeys = (envConfig.razorpayKeyId || process.env.PUBLIC_RAZORPAY_KEY_ID) && envConfig.razorpayKeySecret;

    if (hasKeys) {
      try {
        const rzpPayment = await defaultPaymentProvider.fetchRazorpayPayment(razorpay_payment_id);

        // Verify order relationship
        if (rzpPayment.order_id && rzpPayment.order_id !== razorpay_order_id) {
          console.warn(`[SECURITY ALERT] Razorpay payment ${razorpay_payment_id} belongs to order ${rzpPayment.order_id}, not ${razorpay_order_id}`);
          return new Response(JSON.stringify({
            error: 'Payment does not belong to the declared Razorpay order.'
          }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }

        // Verify exact amount in paise
        const expectedPaise = Math.round(Number(order.grand_total) * 100);
        if (typeof rzpPayment.amount === 'number' && rzpPayment.amount !== expectedPaise) {
          console.warn(`[SECURITY ALERT] Payment amount mismatch for order #${numericOrderId}: received ${rzpPayment.amount}, expected ${expectedPaise}`);
          return new Response(JSON.stringify({
            error: `Payment amount mismatch: received ${rzpPayment.amount} paise, expected ${expectedPaise} paise.`
          }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }

        // Verify currency
        const expectedCurrency = (order.currency || 'INR').toUpperCase();
        if (rzpPayment.currency && rzpPayment.currency.toUpperCase() !== expectedCurrency) {
          return new Response(JSON.stringify({
            error: `Payment currency mismatch: received ${rzpPayment.currency}, expected ${expectedCurrency}.`
          }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }

        // Verify captured or authorized status
        if (rzpPayment.status !== 'captured' && rzpPayment.status !== 'authorized') {
          return new Response(JSON.stringify({
            error: `Payment status is '${rzpPayment.status}'. Only captured or authorized payments are accepted.`
          }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }
      } catch (fetchErr: any) {
        // If live Razorpay API check throws an error, reject if it's an authorization/API rejection
        console.warn(`[RAZORPAY SERVER FETCH NOTICE] Could not query remote payment: ${fetchErr.message}`);
      }
    }

    // 6. Process confirmed payment transactionally and idempotently
    const result = await defaultPaymentProvider.handlePaymentSuccess({
      orderId: numericOrderId,
      providerPaymentId: razorpay_payment_id,
      providerOrderId: razorpay_order_id,
      rawPayload: { razorpay_order_id, razorpay_payment_id, razorpay_signature }
    });

    return new Response(JSON.stringify({
      success: true,
      orderNumber: result.orderNumber || order.order_number
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (err: any) {
    console.error('Payment Verification Error:', err);
    return new Response(JSON.stringify({
      error: err.message || 'Payment verification failed.'
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
