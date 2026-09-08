import type { APIRoute } from 'astro';
import { getSessionUser } from '../../../../lib/auth.js';
import { db } from '../../../../lib/db.js';
import { logCrmActivity } from '../../../../lib/crm.js';

export const POST: APIRoute = async ({ request }) => {
  const user = getSessionUser(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  try {
    const body = await request.json();
    const { entityType = 'customer', entityId, dueAt, outcome, priority = 'MEDIUM' } = body;

    if (!entityId || !dueAt) {
      return new Response(JSON.stringify({ error: 'entityId and dueAt are required.' }), { status: 400 });
    }

    const now = new Date().toISOString();
    const res = db.prepare(`
      INSERT INTO follow_ups (entity_type, entity_id, due_at, assigned_to, status, priority, outcome, created_at)
      VALUES (?, ?, ?, ?, 'PENDING', ?, ?, ?)
    `).run(entityType, entityId, dueAt, user.id, priority, outcome || '', now);

    logCrmActivity({
      entityType: entityType as 'customer' | 'enquiry',
      entityId: parseInt(entityId, 10),
      actorId: user.id,
      type: 'FOLLOWUP_SCHEDULED',
      summary: `Scheduled follow-up for ${new Date(dueAt).toLocaleString('en-IN')}: "${outcome || 'Follow-up'}"`,
      meta: { dueAt, outcome, followUpId: res.lastInsertRowid }
    });

    return new Response(JSON.stringify({ success: true, followUpId: res.lastInsertRowid }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Failed to schedule follow-up.' }), { status: 500 });
  }
};
