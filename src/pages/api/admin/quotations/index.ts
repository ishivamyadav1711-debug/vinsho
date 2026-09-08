import type { APIRoute } from 'astro';
import { getSessionUser } from '../../../../lib/auth.js';
import { createQuotation } from '../../../../lib/quotations.js';

export const POST: APIRoute = async ({ request }) => {
  const user = getSessionUser(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  try {
    const body = await request.json();
    const { customerId, enquiryId, validDays, notes, items } = body;

    if (!customerId || !items || !Array.isArray(items) || items.length === 0) {
      return new Response(JSON.stringify({ error: 'customerId and at least 1 item are required.' }), { status: 400 });
    }

    const quotation = createQuotation({
      customerId: parseInt(customerId, 10),
      enquiryId: enquiryId ? parseInt(enquiryId, 10) : undefined,
      createdBy: user.id,
      validDays: validDays ? parseInt(validDays, 10) : 14,
      notes,
      items
    });

    return new Response(JSON.stringify({ success: true, quotation }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Failed to create quotation.' }), { status: 500 });
  }
};
