import type { APIRoute } from 'astro';
import { prisma } from '../../../../../lib/db';
import { getSessionUser } from '../../../../../lib/auth';
import { updateOrderStatus } from '../../../../../lib/orders';

export const POST: APIRoute = async ({ request, params }) => {
  const user = await getSessionUser(request);
  if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const { id } = params;
  if (!id) {
    return new Response(JSON.stringify({ error: 'Order ID is required' }), { status: 400 });
  }

  try {
    const order = await prisma.orders.findUnique({ where: { id: Number(id) } });
    if (!order) {
      return new Response(JSON.stringify({ error: 'Order not found' }), { status: 404 });
    }

    const res = await updateOrderStatus({
      orderId: Number(id),
      newStatus: 'Cancelled',
      actorId: user.id
    });
    
    if (!res.success) {
      return new Response(JSON.stringify({ error: res.error }), { status: 400 });
    }

    return new Response(JSON.stringify({ success: true, message: 'Order cancelled successfully.' }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (err: any) {
    console.error('Cancel Order Error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Server Error' }), { status: 500 });
  }
};
