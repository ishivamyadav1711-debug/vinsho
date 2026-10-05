import type { APIRoute } from 'astro';
import { prisma } from '../../../../lib/db.js';
import { getSessionUser } from '../../../../lib/auth.js';
import { requestReturn, inspectAndProcessReturn } from '../../../../lib/returns.js';

export const GET: APIRoute = async ({ request, url }) => {
  const user = await getSessionUser(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized admin access.' }), { status: 401 });
  }

  const status = url.searchParams.get('status');

  const returnsListRaw = await prisma.returns.findMany({
    where: status ? { status } : undefined,
    orderBy: { created_at: 'desc' }
  });
  
  const orderIds = returnsListRaw.map((r: any) => r.order_id);
  const customerIds = returnsListRaw.map((r: any) => r.customer_id);
  const userIds = returnsListRaw.map((r: any) => r.inspected_by).filter(Boolean);

  const [orders, customers, users] = await Promise.all([
    prisma.orders.findMany({ where: { id: { in: orderIds } }, select: { id: true, order_number: true } }),
    prisma.customers.findMany({ where: { id: { in: customerIds } }, select: { id: true, name: true, phone: true } }),
    prisma.adminUsers.findMany({ where: { id: { in: userIds as number[] } }, select: { id: true, name: true } })
  ]);

  const ordersMap = new Map(orders.map((o: any) => [o.id, o]));
  const customersMap = new Map(customers.map((c: any) => [c.id, c]));
  const usersMap = new Map(users.map((u: any) => [u.id, u]));

  const returnsList = returnsListRaw.map((r: any) => {
    return {
      ...r,
      orders: ordersMap.get(r.order_id) || null,
      customers: customersMap.get(r.customer_id) || null,
      admin_users: r.inspected_by ? usersMap.get(r.inspected_by) || null : null
    };
  });

  const formattedReturns = returnsList.map((r: any) => ({
    ...r,
    order_number: r.orders?.order_number,
    customer_name: r.customers?.name,
    customer_phone: r.customers?.phone,
    inspector_name: r.admin_users?.name || null
  }));

  return new Response(JSON.stringify({ success: true, count: formattedReturns.length, returns: formattedReturns }), { status: 200 });
};

export const POST: APIRoute = async ({ request }) => {
  const user = await getSessionUser(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized admin access.' }), { status: 401 });
  }

  try {
    const { action, returnId, result, notes, orderId, customerId, orderItemId, qty, reason, type } = await request.json();

    if (action === 'request') {
      const res = await requestReturn({ orderId, customerId, orderItemId, qty, reason, type });
      if (!res.success) {
        return new Response(JSON.stringify({ error: res.error }), { status: 400 });
      }
      return new Response(JSON.stringify({ success: true, returnRecord: res.returnRecord }), { status: 201 });
    }

    if (action === 'inspect') {
      if (!returnId || !result) {
        return new Response(JSON.stringify({ error: 'returnId and inspection result (PASS/FAIL) are required.' }), { status: 400 });
      }

      const res = await inspectAndProcessReturn({
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
