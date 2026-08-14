import type { APIRoute } from 'astro';
import { db } from '../../../lib/db.js';
import { getSessionUser } from '../../../lib/auth.js';
import { logCrmActivity } from '../../../lib/crm.js';

export const POST: APIRoute = async ({ request }) => {
  const user = getSessionUser(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized admin access.' }), { status: 401 });
  }

  try {
    const { entityType, entityId, body } = await request.json();
    if (!entityType || !entityId || !body || !body.trim()) {
      return new Response(JSON.stringify({ error: 'entityType, entityId and note body are required.' }), { status: 400 });
    }

    const now = new Date().toISOString();
    const res = db.prepare(`
      INSERT INTO crm_notes (entity_type, entity_id, author_id, body, is_internal, created_at)
      VALUES (?, ?, ?, ?, 1, ?)
    `).run(entityType, entityId, user.id, body.trim(), now);

    const noteId = res.lastInsertRowid as number;

    logCrmActivity({
      entityType: entityType as 'customer' | 'enquiry',
      entityId: parseInt(entityId, 10),
      actorId: user.id,
      type: 'NOTE_ADDED',
      summary: `Internal note added by ${user.name}: "${body.trim().substring(0, 50)}..."`
    });

    const note = db.prepare(`
      SELECT n.*, u.name as author_name
      FROM crm_notes n JOIN admin_users u ON n.author_id = u.id
      WHERE n.id = ?
    `).get(noteId);

    return new Response(JSON.stringify({ success: true, note }), { status: 201 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Failed to add note.' }), { status: 500 });
  }
};
