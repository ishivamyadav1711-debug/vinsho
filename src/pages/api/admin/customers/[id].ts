import type { APIRoute } from 'astro';
import { prisma } from '../../../../lib/db.js';
import { getSessionUser } from '../../../../lib/auth.js';
import { logCrmActivity } from '../../../../lib/crm.js';

export const GET: APIRoute = async ({ request, params }) => {
  const user = await getSessionUser(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized admin access.' }), { status: 401 });
  }

  const id = parseInt(params.id || '0', 10);
  const customer = await prisma.customers.findFirst({
    where: { id, deleted_at: null }
  });

  if (!customer) {
    return new Response(JSON.stringify({ error: 'Customer not found.' }), { status: 404 });
  }

  const rawEnquiries = await prisma.enquiries.findMany({
    where: { customer_id: id },
    orderBy: { created_at: 'desc' }
  });

  const productIds = rawEnquiries.map((e: any) => e.product_id).filter(Boolean);
  const productsList = await prisma.products.findMany({
    where: { id: { in: productIds as number[] } },
    select: { id: true, name: true, slug: true }
  });
  const productsMap = new Map(productsList.map((p: any) => [p.id, p]));

  const enquiries = rawEnquiries.map((e: any) => {
    const p = e.product_id ? productsMap.get(e.product_id) : null;
    return {
      ...e,
      product_name: p?.name || null,
      product_slug: p?.slug || null
    };
  });

  const activities = await prisma.crmActivities.findMany({
    where: { entity_type: 'customer', entity_id: id },
    orderBy: { created_at: 'desc' }
  });

  const rawNotes = await prisma.crmNotes.findMany({
    where: { entity_type: 'customer', entity_id: id },
    include: {
      author: { select: { name: true } }
    },
    orderBy: { created_at: 'desc' }
  });

  const notes = rawNotes.map((n: any) => ({
    ...n,
    author_name: n.author?.name || 'Admin'
  }));

  return new Response(JSON.stringify({
    success: true,
    customer,
    enquiries,
    activities,
    notes
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};

export const PUT: APIRoute = async ({ request, params }) => {
  const user = await getSessionUser(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized admin access.' }), { status: 401 });
  }

  const id = parseInt(params.id || '0', 10);
  const existing = await prisma.customers.findUnique({
    where: { id }
  });

  if (!existing) {
    return new Response(JSON.stringify({ error: 'Customer not found.' }), { status: 404 });
  }

  try {
    const body = await request.json();
    const { name, email, phone, city, state, pincode, status } = body;

    const now = new Date();

    // Section 4 Rule: VIP status set manually by admin only
    const newStatus = status === 'VIP' ? 'VIP' : existing.status;

    const updated = await prisma.customers.update({
      where: { id },
      data: {
        name: name !== undefined ? name.trim() : existing.name,
        email: email !== undefined ? (email ? email.trim().toLowerCase() : null) : existing.email,
        phone: phone !== undefined ? phone.trim() : existing.phone,
        city: city !== undefined ? city.trim() : existing.city,
        state: state !== undefined ? state.trim() : existing.state,
        pincode: pincode !== undefined ? pincode.trim() : existing.pincode,
        status: newStatus,
        updated_at: now
      }
    });

    await logCrmActivity({
      entityType: 'customer',
      entityId: id,
      actorId: user.id,
      type: 'STATUS_CHANGE',
      summary: `Customer details updated by ${user.name}${status === 'VIP' ? ' (VIP status granted)' : ''}`
    });

    return new Response(JSON.stringify({ success: true, customer: updated }), { status: 200 });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Failed to update customer.' }), { status: 500 });
  }
};
