import type { APIRoute } from 'astro';
import { addSubscriber } from '../../lib/db';
import { checkRateLimit, tooManyRequestsResponse, getClientIp, LIMITS } from '../../lib/rateLimiter.js';

export const POST: APIRoute = async ({ request }) => {
  const ip = getClientIp(request);
  const rl = checkRateLimit('SUBSCRIBE', ip, LIMITS.SUBSCRIBE);
  if (!rl.allowed) return tooManyRequestsResponse(rl.retryAfterSec);

  try {
    const body = await request.json();
    const { email, source } = body;

    if (!email || !email.includes('@')) {
      return new Response(JSON.stringify({ error: 'Please provide a valid email address.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const result = addSubscriber(email, source || 'Website Footer');

    return new Response(JSON.stringify({
      success: true,
      message: result.alreadySubscribed 
        ? 'You are already subscribed to VINSHO updates!' 
        : 'Thank you for subscribing to VINSHO updates.',
      alreadySubscribed: result.alreadySubscribed
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: 'Failed to process subscription.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
