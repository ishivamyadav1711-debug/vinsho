import type { APIRoute } from 'astro';
import { getSessionUser } from '../../../../../lib/auth.js';
import { db } from '../../../../../lib/db.js';
import { logCrmActivity } from '../../../../../lib/crm.js';

export const POST: APIRoute = async ({ request, params }) => {
  const user = getSessionUser(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const customerId = parseInt(params.id || '0', 10);
  if (!customerId) {
    return new Response(JSON.stringify({ error: 'Invalid customer ID' }), { status: 400 });
  }

  try {
    const body = await request.json();
    const { note, body: noteBody } = body;
    const content = (note || noteBody || '').trim();

    if (!content) {
      return new Response(JSON.stringify({ error: 'Note content is required.' }), { status: 400 });
    }

    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO crm_notes (entity_type, entity_id, author_id, body, created_at)
      VALUES ('customer', ?, ?, ?, ?)
    `).run(customerId, user.id, content, now);

    logCrmActivity({
      entityType: 'customer',
      entityId: customerId,
      actorId: user.id,
      type: 'NOTE_ADDED',
      summary: `Added CRM Note: "${content.slice(0, 100)}${content.length > 100 ? '...' : ''}"`,
      meta: { content }
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Failed to add note.' }), { status: 500 });
  }
};
