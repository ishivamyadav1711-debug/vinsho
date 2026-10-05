import type { APIRoute } from 'astro';
import { prisma } from '../../../lib/db.js';
import { getSessionUser } from '../../../lib/auth.js';
import { logCrmActivity } from '../../../lib/crm.js';

export const GET: APIRoute = async ({ request, url }) => {
  const user = await getSessionUser(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized admin access.' }), { status: 401 });
  }

  const filter = url.searchParams.get('filter'); // 'overdue', 'pending', 'completed'
  const now = new Date();

  const whereClause: any = {};

  if (filter === 'overdue') {
    whereClause.status = 'PENDING';
    whereClause.due_at = { lt: now };
  } else if (filter === 'pending') {
    whereClause.status = 'PENDING';
  } else if (filter === 'completed') {
    whereClause.status = 'COMPLETED';
  }

  const rawFollowups = await prisma.followUps.findMany({
    where: whereClause,
    include: {
      assignee: { select: { name: true } }
    },
    orderBy: { due_at: 'asc' }
  });

  const followups = rawFollowups.map((f: any) => ({
    ...f,
    assignee_name: f.assignee?.name || null
  }));

  return new Response(JSON.stringify({ success: true, count: followups.length, followups }), { status: 200 });
};

export const POST: APIRoute = async ({ request }) => {
  const user = await getSessionUser(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized admin access.' }), { status: 401 });
  }

  try {
    const { entityType, entityId, dueAt, assignedTo, priority, outcome } = await request.json();
    if (!entityType || !entityId || !dueAt) {
      return new Response(JSON.stringify({ error: 'entityType, entityId and dueAt are required.' }), { status: 400 });
    }

    const now = new Date();
    const dueDate = new Date(dueAt);

    const followUp = await prisma.followUps.create({
      data: {
        entity_type: entityType,
        entity_id: parseInt(entityId, 10),
        due_at: dueDate,
        assigned_to: assignedTo ? parseInt(assignedTo, 10) : user.id,
        priority: priority || 'MEDIUM',
        outcome: outcome || '',
        status: 'PENDING',
        created_at: now
      }
    });

    await logCrmActivity({
      entityType: entityType as 'customer' | 'enquiry',
      entityId: parseInt(entityId, 10),
      actorId: user.id,
      type: 'FOLLOWUP_SCHEDULED',
      summary: `Follow-up scheduled for ${dueDate.toLocaleDateString('en-IN')} (Priority: ${priority || 'MEDIUM'})`
    });

    return new Response(JSON.stringify({ success: true, followup: followUp }), { status: 201 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Failed to schedule follow-up.' }), { status: 500 });
  }
};

export const PUT: APIRoute = async ({ request }) => {
  const user = await getSessionUser(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized admin access.' }), { status: 401 });
  }

  try {
    const { id, status, outcome } = await request.json();
    if (!id) {
      return new Response(JSON.stringify({ error: 'Follow-up ID is required.' }), { status: 400 });
    }

    const followUpId = parseInt(id, 10);
    const existing = await prisma.followUps.findUnique({
      where: { id: followUpId }
    });

    if (!existing) {
      return new Response(JSON.stringify({ error: 'Follow-up not found.' }), { status: 404 });
    }

    const now = new Date();
    const completedAt = status === 'COMPLETED' ? now : existing.completed_at;

    const updated = await prisma.followUps.update({
      where: { id: followUpId },
      data: {
        status: status !== undefined ? status : existing.status,
        outcome: outcome !== undefined ? outcome : existing.outcome,
        completed_at: completedAt
      }
    });

    await logCrmActivity({
      entityType: existing.entity_type as 'customer' | 'enquiry',
      entityId: existing.entity_id,
      actorId: user.id,
      type: 'FOLLOWUP_COMPLETED',
      summary: `Follow-up marked ${status} with outcome: "${outcome || 'None'}"`
    });

    return new Response(JSON.stringify({ success: true, followup: updated }), { status: 200 });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Failed to update follow-up.' }), { status: 500 });
  }
};
