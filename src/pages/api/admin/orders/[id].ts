import type { APIRoute } from 'astro';
import { prisma } from '../../../../lib/db.js';
import { getSessionUser } from '../../../../lib/auth.js';
import { updateOrderStatus } from '../../../../lib/orders.js';

export const GET: APIRoute = async ({ request, params }) => {
  const user = await getSessionUser(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  const orderId = Number(params.id);
  if (!orderId || isNaN(orderId)) {
    return new Response(JSON.stringify({ error: 'Invalid order ID' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    const order = await prisma.orders.findUnique({
      where: { id: orderId },
      include: {
        customer: true,
        shipping_address: true,
        billing_address: true,
        OrderItems: true,
        Payments: true,
        Invoices: true
      }
    });

    if (!order) {
      return new Response(JSON.stringify({ error: 'Order not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ order }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};

export const PATCH: APIRoute = async ({ request, params }) => {
  const user = await getSessionUser(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  const orderId = Number(params.id);
  if (!orderId || isNaN(orderId)) {
    return new Response(JSON.stringify({ error: 'Invalid order ID' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    const body = await request.json();
    const { status, notes } = body;

    if (!status) {
      return new Response(JSON.stringify({ error: 'Missing status' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const result = await updateOrderStatus({
      orderId,
      newStatus: status,
      actorId: user.id,
      notes
    });

    if (!result.success) {
      return new Response(JSON.stringify({ error: result.error }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ success: true, order: result.order }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
