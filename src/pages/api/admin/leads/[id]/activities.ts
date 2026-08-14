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
    const { type, notes } = await request.json();
    if (!type || !notes) {
      return new Response(JSON.stringify({ error: 'Activity type and notes are required' }), { status: 400 });
    }

    const now = new Date().toISOString();
    const actId = 'act-' + Date.now();

    db.prepare(`
      INSERT INTO lead_activities (id, lead_id, user_id, user_name, type, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(actId, leadId, user.id, user.name, type, notes, now);

    // Update last_contact_at and updated_at on lead
    db.prepare('UPDATE leads SET last_contact_at = ?, updated_at = ? WHERE id = ?').run(now, now, leadId);

    logAuditAction(user.id, user.name, 'ADD_ACTIVITY', `leads:${leadId}`, `Added ${type} activity`);

    return new Response(JSON.stringify({ success: true, activityId: actId }), { status: 201 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: 'Failed to add activity' }), { status: 500 });
  }
};
