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
    const body = await request.json();
    const { action, scheduledAt, note, followUpId } = body;

    const now = new Date().toISOString();

    if (action === 'complete' && followUpId) {
      db.prepare(`
        UPDATE follow_ups
        SET status = 'COMPLETED', completed_at = ?
        WHERE id = ? AND lead_id = ?
      `).run(now, followUpId, leadId);

      // Record activity
      db.prepare(`
        INSERT INTO lead_activities (id, lead_id, user_id, user_name, type, notes, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run('act-' + Date.now(), leadId, user.id, user.name, 'FOLLOW_UP', 'Completed follow-up task', now);

      logAuditAction(user.id, user.name, 'COMPLETE_FOLLOW_UP', `leads:${leadId}`, 'Completed follow-up');

      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }

    if (!scheduledAt || !note) {
      return new Response(JSON.stringify({ error: 'Scheduled date/time and note are required' }), { status: 400 });
    }

    const newFollowUpId = 'fol-' + Date.now();

    db.prepare(`
      INSERT INTO follow_ups (id, lead_id, user_id, scheduled_at, note, status, created_at)
      VALUES (?, ?, ?, ?, ?, 'PENDING', ?)
    `).run(newFollowUpId, leadId, user.id, scheduledAt, note.trim(), now);

    // Update next_follow_up_at on lead
    db.prepare(`
      UPDATE leads
      SET next_follow_up_at = ?, updated_at = ?
      WHERE id = ?
    `).run(scheduledAt, now, leadId);

    // Record activity
    db.prepare(`
      INSERT INTO lead_activities (id, lead_id, user_id, user_name, type, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('act-' + Date.now(), leadId, user.id, user.name, 'FOLLOW_UP', `Scheduled follow-up for ${new Date(scheduledAt).toLocaleString()}: ${note}`, now);

    logAuditAction(user.id, user.name, 'SCHEDULE_FOLLOW_UP', `leads:${leadId}`, `Scheduled follow-up for ${scheduledAt}`);

    return new Response(JSON.stringify({ success: true, followUpId: newFollowUpId }), { status: 201 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: 'Failed to process follow-up' }), { status: 500 });
  }
};
