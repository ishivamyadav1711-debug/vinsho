import type { APIRoute } from 'astro';
import { POST as verifyPaymentPost } from './verify-payment.js';

export const POST: APIRoute = async (context) => {
  return verifyPaymentPost(context);
};
