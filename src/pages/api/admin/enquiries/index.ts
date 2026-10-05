import type { APIRoute } from 'astro';
import { prisma } from '../../../../lib/db.js';
import { getSessionUser } from '../../../../lib/auth.js';

export const GET: APIRoute = async ({ request, url }) => {
  const user = await getSessionUser(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized admin access.' }), { status: 401 });
  }

  const status = url.searchParams.get('status');
  const search = url.searchParams.get('q')?.trim() || '';

  const whereClause: any = {
    customers: {
      deleted_at: null
    }
  };

  if (status) {
    whereClause.status = status;
  }

  if (search) {
    whereClause.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { products: { name: { contains: search, mode: 'insensitive' } } }
    ];
  }

  const [rawEnquiries, rawDemand] = await Promise.all([
    prisma.enquiries.findMany({
      where: whereClause,
      include: {
        customer: {
          select: { name: true, email: true, phone: true, status: true }
        }
      },
      orderBy: { created_at: 'desc' }
    }),
    prisma.enquiries.groupBy({
      by: ['product_id'],
      where: { product_id: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } }
    })
  ]);

  const productIds = rawEnquiries.map((e: any) => e.product_id).filter(Boolean);
  const userIds = rawEnquiries.map((e: any) => e.assigned_to).filter(Boolean);

  const [productsList, usersList] = await Promise.all([
    prisma.products.findMany({ where: { id: { in: productIds as number[] } }, select: { id: true, name: true, slug: true } }),
    prisma.adminUsers.findMany({ where: { id: { in: userIds as number[] } }, select: { id: true, name: true } })
  ]);

  const productsMap = new Map(productsList.map((p: any) => [p.id, p]));
  const usersMap = new Map(usersList.map((u: any) => [u.id, u]));

  const enquiries = rawEnquiries.map((e: any) => {
    const p = e.product_id ? productsMap.get(e.product_id) : null;
    const u = e.assigned_to ? usersMap.get(e.assigned_to) : null;
    return {
      ...e,
      customer_name: e.customer?.name,
      customer_email: e.customer?.email,
      customer_phone: e.customer?.phone,
      customer_status: e.customer?.status,
      product_name: p?.name,
      product_slug: p?.slug,
      assignee_name: u?.name || null
    };
  });

  const demandProductIds = rawDemand.map(d => d.product_id).filter((id): id is number => id !== null);
  const products = await prisma.products.findMany({
    where: { id: { in: demandProductIds } },
    select: { id: true, name: true, slug: true }
  });
  const prodMap = new Map(products.map(p => [p.id, p]));

  const productDemand = rawDemand.map(d => ({
    id: d.product_id,
    name: prodMap.get(d.product_id!)?.name || 'Product',
    slug: prodMap.get(d.product_id!)?.slug || '',
    enquiry_count: d._count.id
  }));

  return new Response(JSON.stringify({
    success: true,
    count: enquiries.length,
    enquiries,
    productDemand
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};
