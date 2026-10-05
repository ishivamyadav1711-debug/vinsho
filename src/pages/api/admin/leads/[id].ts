import type { APIRoute } from 'astro';
import { prisma } from '../../../../lib/db';
import { getSessionUser } from '../../../../lib/auth';
import { logCrmActivity } from '../../../../lib/crm';

export const GET: APIRoute = async ({ request, params }) => {
  const user = await getSessionUser(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const { id } = params;
  if (!id) {
    return new Response(JSON.stringify({ error: 'Missing lead ID' }), { status: 400 });
  }

  const leadId = parseInt(id, 10);
  const lead = await prisma.customers.findFirst({
    where: { id: leadId, deleted_at: null }
  });

  if (!lead) {
    return new Response(JSON.stringify({ error: 'Lead not found' }), { status: 404 });
  }

  const activities = await prisma.crmActivities.findMany({
    where: { entity_type: 'customer', entity_id: leadId },
    orderBy: { created_at: 'desc' }
  });

  const rawNotes = await prisma.crmNotes.findMany({
    where: { entity_type: 'customer', entity_id: leadId },
    include: { author: { select: { name: true } } },
    orderBy: { created_at: 'desc' }
  });

  const notes = rawNotes.map((n: any) => ({
    ...n,
    author_name: n.AdminUsers?.name || 'Admin'
  }));

  const followUps = await prisma.followUps.findMany({
    where: { entity_type: 'customer', entity_id: leadId },
    orderBy: { due_at: 'asc' }
  });

  // Check duplicate email or phone (excluding current lead)
  let duplicateLead: any = null;
  if (lead.email || lead.phone) {
    duplicateLead = await prisma.customers.findFirst({
      where: {
        id: { not: leadId },
        deleted_at: null,
        OR: [
          lead.email ? { email: lead.email } : {},
          lead.phone ? { phone: lead.phone } : {}
        ].filter(c => Object.keys(c).length > 0)
      },
      select: { id: true, name: true, email: true, phone: true, status: true, created_at: true }
    });
  }

  return new Response(JSON.stringify({ lead, activities, notes, followUps, duplicateLead }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};

export const PATCH: APIRoute = async ({ request, params }) => {
  const user = await getSessionUser(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const { id } = params;
  if (!id) return new Response(JSON.stringify({ error: 'Missing lead ID' }), { status: 400 });

  const leadId = parseInt(id, 10);
  const lead = await prisma.customers.findFirst({
    where: { id: leadId, deleted_at: null }
  });

  if (!lead) return new Response(JSON.stringify({ error: 'Lead not found' }), { status: 404 });

  try {
    const body = await request.json();
    const { status, assigned_to, name, email, phone, company, location } = body;

    const now = new Date();

    // Track status change activity
    if (status && status !== lead.status) {
      await logCrmActivity({
        entityType: 'customer',
        entityId: leadId,
        actorId: user.id,
        type: 'STATUS_CHANGE',
        summary: `Status changed from ${lead.status} to ${status}`
      });
    }

    // Track assignment change activity
    if (assigned_to !== undefined) {
      const newAssignee = assigned_to || 'Unassigned';
      await logCrmActivity({
        entityType: 'customer',
        entityId: leadId,
        actorId: user.id,
        type: 'ASSIGNMENT',
        summary: `Assigned to ${newAssignee}`
      });
    }

    await prisma.customers.update({
      where: { id: leadId },
      data: {
        name: name !== undefined ? name.trim() : undefined,
        email: email !== undefined ? (email ? email.trim().toLowerCase() : null) : undefined,
        phone: phone !== undefined ? phone.trim() : undefined,
        city: location !== undefined ? location.trim() : undefined,
        status: status !== undefined ? status : undefined,
        updated_at: now
      }
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: 'Failed to update lead' }), { status: 500 });
  }
};
