import type { APIRoute } from 'astro';
import { db } from '../../../lib/db.js';
import { getSessionUser } from '../../../lib/auth.js';
import { logCrmActivity } from '../../../lib/crm.js';

export const GET: APIRoute = async ({ request, url }) => {
  const user = getSessionUser(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized admin access.' }), { status: 401 });
  }

  const filter = url.searchParams.get('filter'); // 'overdue', 'pending', 'completed'
  const nowIso = new Date().toISOString();

  let query = `
    SELECT f.*, u.name as assignee_name
    FROM follow_ups f
    LEFT JOIN admin_users u ON f.assigned_to = u.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (filter === 'overdue') {
    query += ` AND f.status = 'PENDING' AND f.due_at < ?`;
    params.push(nowIso);
  } else if (filter === 'pending') {
    query += ` AND f.status = 'PENDING'`;
  } else if (filter === 'completed') {
    query += ` AND f.status = 'COMPLETED'`;
  }

  query += ` ORDER BY f.due_at ASC`;

  const followups = db.prepare(query).all(...params);
  return new Response(JSON.stringify({ success: true, count: followups.length, followups }), { status: 200 });
};

export const POST: APIRoute = async ({ request }) => {
  const user = getSessionUser(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized admin access.' }), { status: 401 });
  }

  try {
    const { entityType, entityId, dueAt, assignedTo, priority, outcome } = await request.json();
    if (!entityType || !entityId || !dueAt) {
      return new Response(JSON.stringify({ error: 'entityType, entityId and dueAt are required.' }), { status: 400 });
    }

    const now = new Date().toISOString();
    const res = db.prepare(`
      INSERT INTO follow_ups (entity_type, entity_id, due_at, assigned_to, priority, outcome, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'PENDING', ?)
    `).run(entityType, entityId, dueAt, assignedTo || user.id, priority || 'MEDIUM', outcome || '', now);

    const followupId = res.lastInsertRowid as number;

    logCrmActivity({
      entityType: entityType as 'customer' | 'enquiry',
      entityId: parseInt(entityId, 10),
      actorId: user.id,
      type: 'FOLLOWUP_SCHEDULED',
      summary: `Follow-up scheduled for ${new Date(dueAt).toLocaleDateString()} (Priority: ${priority || 'MEDIUM'})`
    });

    const followup = db.prepare('SELECT * FROM follow_ups WHERE id = ?').get(followupId);
    return new Response(JSON.stringify({ success: true, followup }), { status: 201 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Failed to schedule follow-up.' }), { status: 500 });
  }
};

export const PUT: APIRoute = async ({ request }) => {
  const user = getSessionUser(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized admin access.' }), { status: 401 });
  }

  try {
    const { id, status, outcome } = await request.json();
    if (!id) {
      return new Response(JSON.stringify({ error: 'Follow-up ID is required.' }), { status: 400 });
    }

    const existing = db.prepare('SELECT * FROM follow_ups WHERE id = ?').get(id) as any;
    if (!existing) {
      return new Response(JSON.stringify({ error: 'Follow-up not found.' }), { status: 404 });
    }

    const now = new Date().toISOString();
    const completedAt = status === 'COMPLETED' ? now : existing.completed_at;

    db.prepare(`
      UPDATE follow_ups SET
        status = COALESCE(?, status),
        outcome = COALESCE(?, outcome),
        completed_at = ?
      WHERE id = ?
    `).run(status || null, outcome || null, completedAt, id);

    logCrmActivity({
      entityType: existing.entity_type,
      entityId: existing.entity_id,
      actorId: user.id,
      type: 'FOLLOWUP_COMPLETED',
      summary: `Follow-up marked ${status} with outcome: "${outcome || 'None'}"`
    });

    const updated = db.prepare('SELECT * FROM follow_ups WHERE id = ?').get(id);
    return new Response(JSON.stringify({ success: true, followup: updated }), { status: 200 });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Failed to update follow-up.' }), { status: 500 });
  }
};
