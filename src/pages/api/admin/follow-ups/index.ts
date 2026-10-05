import type { APIRoute } from 'astro';
import { getSessionUser } from '../../../../lib/auth.js';
import { prisma } from '../../../../lib/db.js';
import { logCrmActivity } from '../../../../lib/crm.js';

export const POST: APIRoute = async ({ request }) => {
  const user = await getSessionUser(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  try {
    const body = await request.json();
    const { entityType = 'customer', entityId, dueAt, outcome, priority = 'MEDIUM' } = body;

    if (!entityId || !dueAt) {
      return new Response(JSON.stringify({ error: 'entityId and dueAt are required.' }), { status: 400 });
    }

    const now = new Date();
    const dueDate = new Date(dueAt);

    const followUp = await prisma.followUps.create({
      data: {
        entity_type: entityType,
        entity_id: parseInt(entityId, 10),
        due_at: dueDate,
        assigned_to: user.id,
        status: 'PENDING',
        priority,
        outcome: outcome || '',
        created_at: now
      }
    });

    await logCrmActivity({
      entityType: entityType as 'customer' | 'enquiry',
      entityId: parseInt(entityId, 10),
      actorId: user.id,
      type: 'FOLLOWUP_SCHEDULED',
      summary: `Scheduled follow-up for ${dueDate.toLocaleString('en-IN')}: "${outcome || 'Follow-up'}"`,
      meta: { dueAt, outcome, followUpId: followUp.id }
    });

    return new Response(JSON.stringify({ success: true, followUpId: followUp.id }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Failed to schedule follow-up.' }), { status: 500 });
  }
};
