import type { APIRoute } from 'astro';
import { prisma } from '../../../lib/db';
import { getSessionUser } from '../../../lib/auth';
import { logCrmActivity } from '../../../lib/crm';

export const GET: APIRoute = async ({ request, url }) => {
  const user = await getSessionUser(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const q = (url.searchParams.get('q') || '').trim().toLowerCase();
  const status = url.searchParams.get('status') || '';
  const source = url.searchParams.get('source') || '';
  const assignedTo = url.searchParams.get('assignedTo') || '';
  const sort = url.searchParams.get('sort') || 'newest';

  const whereClause: any = {
    status: status || 'Lead',
    deleted_at: null
  };

  if (q) {
    whereClause.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { email: { contains: q, mode: 'insensitive' } },
      { phone: { contains: q, mode: 'insensitive' } },
      { city: { contains: q, mode: 'insensitive' } }
    ];
  }

  if (source) {
    whereClause.source = source;
  }

  const orderByMap: Record<string, any> = {
    'oldest': { created_at: 'asc' },
    'name': { name: 'asc' },
    'last_contact': { updated_at: 'desc' },
    'newest': { created_at: 'desc' }
  };
  const orderBy = orderByMap[sort] || { created_at: 'desc' };

  const leads = await prisma.customers.findMany({
    where: whereClause,
    orderBy
  });

  return new Response(JSON.stringify({ leads, total: leads.length }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};

export const POST: APIRoute = async ({ request }) => {
  const user = await getSessionUser(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const body = await request.json();
    const { name, email, phone, company, location, source, status, assignedTo, collectionKey, subcategoryKey, productSlug, budget, requirement } = body;

    if (!name || (!email && !phone)) {
      return new Response(JSON.stringify({ error: 'Name and either Email or Phone are required.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const now = new Date();
    const cleanPhone = (phone || '').trim();
    const cleanEmail = (email || '').trim().toLowerCase() || null;

    // Create lead customer profile in PostgreSQL
    const customer = await prisma.customers.create({
      data: {
        name: name.trim(),
        email: cleanEmail,
        phone: cleanPhone || 'Not Provided',
        city: (location || '').trim(),
        source: source || 'Manual Entry',
        status: 'Lead',
        consent_at: now,
        consent_purpose: 'Manual lead registration under DPDP Act 2023',
        created_at: now,
        updated_at: now
      }
    });

    // Create initial Enquiry record if requirement or product details supplied
    let productId: number | null = null;
    if (productSlug) {
      const prod = await prisma.products.findFirst({
        where: { slug: productSlug, deleted_at: null },
        select: { id: true }
      });
      if (prod) productId = prod.id;
    }

    const message = [
      company ? `Company: ${company}` : '',
      budget ? `Budget: ${budget}` : '',
      requirement ? `Requirement: ${requirement}` : ''
    ].filter(Boolean).join('\n\n');

    const enquiry = await prisma.enquiries.create({
      data: {
        customer_id: customer.id,
        product_id: productId,
        name: name.trim(),
        phone: cleanPhone || 'Not Provided',
        email: cleanEmail,
        message,
        source: source || 'Manual Entry',
        status: 'New',
        created_at: now,
        updated_at: now
      }
    });

    await logCrmActivity({
      entityType: 'customer',
      entityId: customer.id,
      actorId: user.id,
      type: 'LEAD_CREATED',
      summary: `Lead created manually by ${user.name} (${customer.name})`
    });

    return new Response(JSON.stringify({ success: true, leadId: customer.id, customerId: customer.id, enquiryId: enquiry.id }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: 'Failed to create lead.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
