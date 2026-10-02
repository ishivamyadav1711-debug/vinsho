import type { APIRoute } from 'astro';
import { prisma } from '../../../lib/db.js';
import { getSessionUser } from '../../../lib/auth.js';
import { logCrmActivity } from '../../../lib/crm.js';

export const POST: APIRoute = async ({ request }) => {
  const user = await getSessionUser(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized admin access.' }), { status: 401 });
  }

  try {
    const { entityType, entityId, body } = await request.json();
    if (!entityType || !entityId || !body || !body.trim()) {
      return new Response(JSON.stringify({ error: 'entityType, entityId and note body are required.' }), { status: 400 });
    }

    const now = new Date();
    const parsedEntityId = parseInt(entityId, 10);

    const newNote = await prisma.crm_notes.create({
      data: {
        entity_type: entityType,
        entity_id: parsedEntityId,
        author_id: user.id,
        body: body.trim(),
        is_internal: true,
        created_at: now
      },
      include: {
        admin_users: {
          select: { name: true }
        }
      }
    });

    await logCrmActivity({
      entityType: entityType as 'customer' | 'enquiry',
      entityId: parsedEntityId,
      actorId: user.id,
      type: 'NOTE_ADDED',
      summary: `Internal note added by ${user.name}: "${body.trim().substring(0, 50)}..."`
    });

    const note = {
      ...newNote,
      author_name: newNote.admin_users?.name || 'Admin'
    };

    return new Response(JSON.stringify({ success: true, note }), { status: 201 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Failed to add note.' }), { status: 500 });
  }
};
