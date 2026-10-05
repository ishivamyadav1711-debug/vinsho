import type { APIRoute } from 'astro';
import { prisma } from '../../../../../lib/db';
import { getSessionUser } from '../../../../../lib/auth';
import { logCrmActivity } from '../../../../../lib/crm';

export const POST: APIRoute = async ({ request, params }) => {
  const user = await getSessionUser(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const { id } = params;
  if (!id) return new Response(JSON.stringify({ error: 'Missing lead ID' }), { status: 400 });
  const leadId = parseInt(id, 10);

  try {
    const body = await request.json();
    const { action, scheduledAt, note, followUpId } = body;

    const now = new Date();

    if (action === 'complete' && followUpId) {
      await prisma.followUps.update({
        where: { id: parseInt(followUpId, 10) },
        data: {
          status: 'COMPLETED',
          completed_at: now
        }
      });

      await logCrmActivity({
        entityType: 'customer',
        entityId: leadId,
        actorId: user.id,
        type: 'FOLLOWUP_COMPLETED',
        summary: 'Completed follow-up task'
      });

      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }

    if (!scheduledAt || !note) {
      return new Response(JSON.stringify({ error: 'Scheduled date/time and note are required' }), { status: 400 });
    }

    const dueDate = new Date(scheduledAt);

    const followUp = await prisma.followUps.create({
      data: {
        entity_type: 'customer',
        entity_id: leadId,
        due_at: dueDate,
        assigned_to: user.id,
        status: 'PENDING',
        priority: 'MEDIUM',
        outcome: note.trim(),
        created_at: now
      }
    });

    await prisma.customers.update({
      where: { id: leadId },
      data: { updated_at: now }
    });

    await logCrmActivity({
      entityType: 'customer',
      entityId: leadId,
      actorId: user.id,
      type: 'FOLLOWUP_SCHEDULED',
      summary: `Scheduled follow-up for ${dueDate.toLocaleString('en-IN')}: ${note}`
    });

    return new Response(JSON.stringify({ success: true, followUpId: followUp.id }), { status: 201 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: 'Failed to process follow-up' }), { status: 500 });
  }
};
