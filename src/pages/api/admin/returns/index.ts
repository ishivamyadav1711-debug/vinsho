import type { APIRoute } from 'astro';
import { db } from '../../../../lib/db.js';
import { getSessionUser } from '../../../../lib/auth.js';
import { requestReturn, inspectAndProcessReturn } from '../../../../lib/returns.js';

export const GET: APIRoute = async ({ request, url }) => {
  const user = getSessionUser(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized admin access.' }), { status: 401 });
  }

  const status = url.searchParams.get('status');
  let query = `
    SELECT r.*, o.order_number, c.name as customer_name, c.phone as customer_phone, u.name as inspector_name
    FROM returns r
    JOIN orders o ON r.order_id = o.id
    JOIN customers c ON r.customer_id = c.id
    LEFT JOIN admin_users u ON r.inspected_by = u.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (status) {
    query += ` AND r.status = ?`;
    params.push(status);
  }

  query += ` ORDER BY r.created_at DESC`;

  const returnsList = db.prepare(query).all(...params);
  return new Response(JSON.stringify({ success: true, count: returnsList.length, returns: returnsList }), { status: 200 });
};

export const POST: APIRoute = async ({ request }) => {
  const user = getSessionUser(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized admin access.' }), { status: 401 });
  }

  try {
    const { action, returnId, result, notes, orderId, customerId, orderItemId, qty, reason, type } = await request.json();

    if (action === 'request') {
      const res = requestReturn({ orderId, customerId, orderItemId, qty, reason, type });
      if (!res.success) {
        return new Response(JSON.stringify({ error: res.error }), { status: 400 });
      }
      return new Response(JSON.stringify({ success: true, returnRecord: res.returnRecord }), { status: 201 });
    }

    if (action === 'inspect') {
      if (!returnId || !result) {
        return new Response(JSON.stringify({ error: 'returnId and inspection result (PASS/FAIL) are required.' }), { status: 400 });
      }

      const res = inspectAndProcessReturn({
        returnId,
        inspectedBy: user.id,
        result,
        notes
      });

      if (!res.success) {
        return new Response(JSON.stringify({ error: res.error }), { status: 400 });
      }

      return new Response(JSON.stringify({ success: true, returnRecord: res.returnRecord }), { status: 200 });
    }

    return new Response(JSON.stringify({ error: 'Invalid action.' }), { status: 400 });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Return action failed.' }), { status: 500 });
  }
};
