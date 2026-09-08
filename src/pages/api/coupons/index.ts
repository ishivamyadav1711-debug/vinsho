import type { APIRoute } from 'astro';
import { validateAndCalculateCoupon } from '../../../lib/coupons.js';
import { checkRateLimit, tooManyRequestsResponse, getClientIp, LIMITS } from '../../../lib/rateLimiter.js';

export const POST: APIRoute = async ({ request }) => {
  const ip = getClientIp(request);
  const rl = checkRateLimit('COUPON', ip, LIMITS.COUPON);
  if (!rl.allowed) return tooManyRequestsResponse(rl.retryAfterSec);

  try {
    const body = await request.json();
    const { code, subtotal = 0 } = body;

    if (!code || typeof code !== 'string') {
      return new Response(JSON.stringify({ success: false, error: 'Promo coupon code is required.' }), { status: 400 });
    }

    const result = validateAndCalculateCoupon(code, subtotal);
    if (!result.valid) {
      return new Response(JSON.stringify({ success: false, error: result.error }), { status: 400 });
    }

    return new Response(JSON.stringify({
      success: true,
      code: result.code,
      discountAmount: result.discountAmount,
      message: result.message
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message || 'Failed to process coupon.' }), { status: 500 });
  }
};
