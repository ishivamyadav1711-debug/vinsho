import type { APIRoute } from 'astro';
import { prisma } from '../../../../../lib/db.js';
import { getSessionUser } from '../../../../../lib/auth.js';

export const GET: APIRoute = async ({ request, params }) => {
  const user = await getSessionUser(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized admin access.' }), { status: 401 });
  }

  const productId = parseInt(params.id || '0', 10);
  if (!productId) {
    return new Response(JSON.stringify({ error: 'Invalid product ID.' }), { status: 400 });
  }

  const product = await prisma.products.findUnique({
    where: { id: productId },
    include: { ProductVariants: { select: { id: true } } }
  });

  if (!product) {
    return new Response(JSON.stringify({ error: 'Product not found.' }), { status: 404 });
  }

  const variantIds = product.ProductVariants.map((v) => v.id);

  if (variantIds.length === 0) {
    return new Response(JSON.stringify({ success: true, history: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const historyRaw = await prisma.inventoryTxns.findMany({
    where: {
      variant_id: { in: variantIds }
    },
    orderBy: { created_at: 'desc' },
    take: 50
  });

  // Fetch admin names or order numbers if available
  const actorIds = [...new Set(historyRaw.map((h) => h.actor_id).filter(Boolean))] as number[];
  const orderIds = [...new Set(historyRaw.map((h) => h.order_id).filter(Boolean))] as number[];

  const [admins, orders] = await Promise.all([
    prisma.adminUsers.findMany({
      where: { id: { in: actorIds } },
      select: { id: true, name: true, email: true }
    }),
    prisma.orders.findMany({
      where: { id: { in: orderIds } },
      select: { id: true, order_number: true }
    })
  ]);

  const adminMap = new Map(admins.map((a) => [a.id, a.name]));
  const orderMap = new Map(orders.map((o) => [o.id, o.order_number]));

  const history = historyRaw.map((h) => ({
    id: h.id,
    variantId: h.variant_id,
    delta: h.delta,
    reason: h.reason,
    balanceAfter: h.balance_after,
    orderId: h.order_id,
    orderNumber: h.order_id ? orderMap.get(h.order_id) || `Order #${h.order_id}` : null,
    actorId: h.actor_id,
    actorName: h.actor_id ? adminMap.get(h.actor_id) || `Admin #${h.actor_id}` : null,
    createdAt: h.created_at
  }));

  return new Response(JSON.stringify({
    success: true,
    history
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};
