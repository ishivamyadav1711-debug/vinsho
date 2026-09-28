import type { APIRoute } from 'astro';
import { db } from '../../../../../lib/db';
import { getSessionUser } from '../../../../../lib/auth';

export const PATCH: APIRoute = async ({ request, params }) => {
  const user = getSessionUser(request);
  if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const { id } = params;
  if (!id) {
    return new Response(JSON.stringify({ error: 'Order ID is required' }), { status: 400 });
  }

  try {
    const body = await request.json();
    const { status } = body;

    if (!status) {
      return new Response(JSON.stringify({ error: 'Status is required' }), { status: 400 });
    }

    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id) as any;
    if (!order) {
      return new Response(JSON.stringify({ error: 'Order not found' }), { status: 404 });
    }

    const validStatuses = [
      'Pending',
      'Processing',
      'Confirmed',
      'Packed',
      'Shipped',
      'Out for Delivery',
      'Delivered',
      'Cancelled'
    ];
    if (!validStatuses.includes(status)) {
      return new Response(JSON.stringify({ error: 'Invalid status provided.' }), { status: 400 });
    }

    // Update order status ONLY (do not touch payment status)
    db.prepare('UPDATE orders SET status = ?, updated_at = ? WHERE id = ?')
      .run(status, new Date().toISOString(), id);

    // Note: To implement a full audit log in the future, we would INSERT INTO order_activity_logs here.

    return new Response(JSON.stringify({ success: true, message: 'Status updated' }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (err: any) {
    console.error('Update Status Error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Server Error' }), { status: 500 });
  }
};
