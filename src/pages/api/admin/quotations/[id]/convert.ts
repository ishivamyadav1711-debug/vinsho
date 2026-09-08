import type { APIRoute } from 'astro';
import { getSessionUser } from '../../../../../lib/auth.js';
import { convertQuotationToOrder } from '../../../../../lib/quotations.js';

export const POST: APIRoute = async ({ request, params }) => {
  const user = getSessionUser(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const quoteId = parseInt(params.id || '0', 10);
  if (!quoteId) {
    return new Response(JSON.stringify({ error: 'Invalid quotation ID' }), { status: 400 });
  }

  try {
    const order = convertQuotationToOrder(quoteId, user.id);
    return new Response(JSON.stringify({ success: true, order }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Failed to convert quotation.' }), { status: 500 });
  }
};
