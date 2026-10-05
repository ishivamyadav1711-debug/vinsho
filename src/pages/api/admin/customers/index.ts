import type { APIRoute } from 'astro';
import { prisma } from '../../../../lib/db.js';
import { getSessionUser } from '../../../../lib/auth.js';
import { computeCustomerStatus, type CustomerRecord } from '../../../../lib/crm.js';

export const GET: APIRoute = async ({ request, url }) => {
  const user = await getSessionUser(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized admin access.' }), { status: 401 });
  }

  const search = url.searchParams.get('q')?.trim() || '';
  const statusFilter = url.searchParams.get('status');

  const whereClause: any = {
    deleted_at: null
  };

  if (search) {
    whereClause.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { city: { contains: search, mode: 'insensitive' } }
    ];
  }

  if (statusFilter) {
    whereClause.status = statusFilter;
  }

  const rows = await prisma.customers.findMany({
    where: whereClause,
    orderBy: { created_at: 'desc' }
  });

  // Recompute & sync customer status dynamically
  const updatedRows = await Promise.all(
    rows.map(async (c: any) => {
      const computed = computeCustomerStatus(c as CustomerRecord);
      if (computed !== c.status && c.status !== 'VIP') {
        const updated = await prisma.customers.update({
          where: { id: c.id },
          data: { status: computed, updated_at: new Date() }
        });
        return updated;
      }
      return c;
    })
  );

  return new Response(JSON.stringify({
    success: true,
    count: updatedRows.length,
    customers: updatedRows
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};
