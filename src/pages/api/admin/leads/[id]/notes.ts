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
    const { content } = await request.json();
    if (!content || !content.trim()) {
      return new Response(JSON.stringify({ error: 'Note content cannot be empty' }), { status: 400 });
    }

    const now = new Date();

    const note = await prisma.crmNotes.create({
      data: {
        entity_type: 'customer',
        entity_id: leadId,
        author_id: user.id,
        body: content.trim(),
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
      type: 'NOTE_ADDED',
      summary: `Internal note added by ${user.name}: "${content.trim().slice(0, 50)}..."`
    });

    return new Response(JSON.stringify({ success: true, noteId: note.id }), { status: 201 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: 'Failed to add note' }), { status: 500 });
  }
};
