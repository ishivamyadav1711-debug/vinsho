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
    const { type, notes } = await request.json();
    if (!type || !notes) {
      return new Response(JSON.stringify({ error: 'Activity type and notes are required' }), { status: 400 });
    }

    const now = new Date();

    const activity = await prisma.crmActivities.create({
      data: {
        entity_type: 'customer',
        entity_id: leadId,
        actor_id: user.id,
        type: type.toUpperCase(),
        summary: notes,
        created_at: now
      }
    });

    await prisma.customers.update({
      where: { id: leadId },
      data: { updated_at: now }
    });

    return new Response(JSON.stringify({ success: true, activityId: activity.id }), { status: 201 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: 'Failed to add activity' }), { status: 500 });
  }
};
