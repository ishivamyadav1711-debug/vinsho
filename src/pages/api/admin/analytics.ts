import type { APIRoute } from 'astro';
import { prisma } from '../../../lib/db';
import { getSessionUser } from '../../../lib/auth';

export const GET: APIRoute = async ({ request }) => {
  const user = await getSessionUser(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const [
    totalLeads,
    newLeads,
    qualifiedLeads,
    convertedLeads,
    lostLeads,
    sourcesRaw,
    statusRaw
  ] = await Promise.all([
    prisma.enquiries.count(),
    prisma.enquiries.count({ where: { status: 'New' } }),
    prisma.enquiries.count({ where: { status: 'Qualified' } }),
    prisma.enquiries.count({ where: { status: 'Converted' } }),
    prisma.enquiries.count({ where: { status: 'Lost' } }),
    prisma.enquiries.groupBy({
      by: ['source'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } }
    }),
    prisma.enquiries.groupBy({
      by: ['status'],
      _count: { id: true }
    })
  ]);

  const conversionRate = totalLeads > 0 ? ((convertedLeads / totalLeads) * 100).toFixed(1) + '%' : '0.0%';

  const sources = sourcesRaw.map(s => ({
    source: s.source,
    count: s._count.id
  }));

  const statusBreakdown = statusRaw.map(s => ({
    status: s.status,
    count: s._count.id
  }));

  // Top Product Interest breakdown
  const productInterestRaw = await prisma.enquiries.groupBy({
    by: ['product_id'],
    where: { product_id: { not: null } },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 6
  });

  const productIds = productInterestRaw.map(p => p.product_id).filter((id): id is number => id !== null);
  const products = await prisma.products.findMany({
    where: { id: { in: productIds } },
    select: { id: true, slug: true, name: true }
  });
  const prodMap = new Map(products.map(p => [p.id, p]));

  const productInterest = productInterestRaw.map(p => ({
    product_slug: prodMap.get(p.product_id!)?.slug || `product-${p.product_id}`,
    product_name: prodMap.get(p.product_id!)?.name || 'Product',
    count: p._count.id
  }));

  const collectionInterest: any[] = [];

  return new Response(JSON.stringify({
    metrics: {
      totalLeads,
      newLeads,
      qualifiedLeads,
      convertedLeads,
      lostLeads,
      conversionRate
    },
    sources,
    collectionInterest,
    productInterest,
    statusBreakdown
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};
