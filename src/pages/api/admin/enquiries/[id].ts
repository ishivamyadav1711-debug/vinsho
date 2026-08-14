import type { APIRoute } from 'astro';
import { db } from '../../../../lib/db.js';
import { getSessionUser } from '../../../../lib/auth.js';
import { transitionEnquiryStatus, type PipelineStatus } from '../../../../lib/crm.js';

export const GET: APIRoute = async ({ request, params }) => {
  const user = getSessionUser(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized admin access.' }), { status: 401 });
  }

  const id = parseInt(params.id || '0', 10);
  const enquiry = db.prepare(`
    SELECT e.*, c.name as customer_name, c.email as customer_email, c.phone as customer_phone, p.name as product_name
    FROM enquiries e
    JOIN customers c ON e.customer_id = c.id
    LEFT JOIN products p ON e.product_id = p.id
    WHERE e.id = ?
  `).get(id);

  if (!enquiry) {
    return new Response(JSON.stringify({ error: 'Enquiry not found.' }), { status: 404 });
  }

  const activities = db.prepare('SELECT * FROM crm_activities WHERE entity_type = ? AND entity_id = ? ORDER BY created_at DESC').all('enquiry', id);
  const notes = db.prepare(`
    SELECT n.*, u.name as author_name
    FROM crm_notes n
    JOIN admin_users u ON n.author_id = u.id
    WHERE n.entity_type = ? AND n.entity_id = ?
    ORDER BY n.created_at DESC
  `).all('enquiry', id);

  return new Response(JSON.stringify({
    success: true,
    enquiry,
    activities,
    notes
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};

export const PUT: APIRoute = async ({ request, params }) => {
  const user = getSessionUser(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized admin access.' }), { status: 401 });
  }

  const id = parseInt(params.id || '0', 10);
  try {
    const body = await request.json();
    const { status, lostReason, note, assignedTo, valueEstimate } = body;

    if (status) {
      const res = transitionEnquiryStatus({
        enquiryId: id,
        newStatus: status as PipelineStatus,
        actorId: user.id,
        lostReason,
        note
      });

      if (!res.success) {
        return new Response(JSON.stringify({ error: res.error }), { status: 400 });
      }
    }

    if (assignedTo !== undefined || valueEstimate !== undefined) {
      const now = new Date().toISOString();
      db.prepare(`
        UPDATE enquiries SET
          assigned_to = COALESCE(?, assigned_to),
          value_estimate = COALESCE(?, value_estimate),
          updated_at = ?
        WHERE id = ?
      `).run(assignedTo || null, valueEstimate || null, now, id);
    }

    const updated = db.prepare('SELECT * FROM enquiries WHERE id = ?').get(id);
    return new Response(JSON.stringify({ success: true, enquiry: updated }), { status: 200 });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Failed to update enquiry.' }), { status: 500 });
  }
};
