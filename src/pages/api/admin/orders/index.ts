import type { APIRoute } from 'astro';
import { prisma } from '../../../../lib/db.js';
import { getSessionUser } from '../../../../lib/auth.js';

export const GET: APIRoute = async ({ request }) => {
  const user = await getSessionUser(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const paymentStatus = url.searchParams.get('payment_status');
    const search = url.searchParams.get('search');
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(url.searchParams.get('limit') || '20', 10)));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status && status !== 'ALL') {
      where.status = status;
    }
    if (paymentStatus && paymentStatus !== 'ALL') {
      where.payment_status = paymentStatus;
    }
    if (search && search.trim() !== '') {
      const q = search.trim();
      where.OR = [
        { order_number: { contains: q, mode: 'insensitive' } },
        { customer: { name: { contains: q, mode: 'insensitive' } } },
        { customer: { phone: { contains: q, mode: 'insensitive' } } },
        { customer: { email: { contains: q, mode: 'insensitive' } } }
      ];
    }

    const [orders, total] = await Promise.all([
      prisma.orders.findMany({
        where,
        include: {
          customer: { select: { id: true, name: true, phone: true, email: true } },
          OrderItems: { select: { id: true, product_name_snapshot: true, qty: true, line_total: true } },
          Payments: { select: { id: true, status: true, amount: true, provider: true } }
        },
        orderBy: { id: 'desc' },
        skip,
        take: limit
      }),
      prisma.orders.count({ where })
    ]);

    return new Response(JSON.stringify({
      orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (err: any) {
    console.error('Admin Orders Fetch Error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Failed to fetch orders.' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
