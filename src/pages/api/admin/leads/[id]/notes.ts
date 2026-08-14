import type { APIRoute } from 'astro';
import { db } from '../../../../../lib/db';
import { getSessionUser, logAuditAction } from '../../../../../lib/auth';

export const POST: APIRoute = async ({ request, params }) => {
  const user = getSessionUser(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const { id: leadId } = params;
  if (!leadId) return new Response(JSON.stringify({ error: 'Missing lead ID' }), { status: 400 });

  try {
    const { content } = await request.json();
    if (!content || !content.trim()) {
      return new Response(JSON.stringify({ error: 'Note content cannot be empty' }), { status: 400 });
    }

    const now = new Date().toISOString();
    const noteId = 'nt-' + Date.now();

    db.prepare(`
      INSERT INTO lead_notes (id, lead_id, user_id, user_name, content, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(noteId, leadId, user.id, user.name, content.trim(), now);

    db.prepare('UPDATE leads SET updated_at = ? WHERE id = ?').run(now, leadId);

    logAuditAction(user.id, user.name, 'ADD_NOTE', `leads:${leadId}`, 'Added internal note');

    return new Response(JSON.stringify({ success: true, noteId }), { status: 201 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: 'Failed to add note' }), { status: 500 });
  }
};
