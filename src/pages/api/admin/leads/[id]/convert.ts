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

  const lead = await prisma.customers.findUnique({
    where: { id: leadId }
  });

  if (!lead) return new Response(JSON.stringify({ error: 'Lead not found' }), { status: 404 });

  try {
    const body = await request.json().catch(() => ({}));
    const { address, notes } = body;
    const now = new Date();

    const updated = await prisma.customers.update({
      where: { id: leadId },
      data: {
        status: 'Active',
        city: address || lead.city,
        updated_at: now
      }
    });

    if (notes && notes.trim()) {
      await prisma.crmNotes.create({
        data: {
          entity_type: 'customer',
          entity_id: leadId,
          author_id: user.id,
          body: `Conversion Note: ${notes.trim()}`,
          created_at: now
        }
      });
    }

    await logCrmActivity({
      entityType: 'customer',
      entityId: leadId,
      actorId: user.id,
      type: 'STATUS_CHANGE',
      summary: `Converted lead (${lead.name}) to active customer profile by ${user.name}`
    });

    return new Response(JSON.stringify({ success: true, customerId: updated.id }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: 'Failed to convert customer' }), { status: 500 });
  }
};
