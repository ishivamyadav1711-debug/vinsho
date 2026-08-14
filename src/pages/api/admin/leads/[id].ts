import type { APIRoute } from 'astro';
import { db } from '../../../../lib/db';
import { getSessionUser, logAuditAction } from '../../../../lib/auth';

export const GET: APIRoute = async ({ request, params }) => {
  const user = getSessionUser(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const { id } = params;
  if (!id) {
    return new Response(JSON.stringify({ error: 'Missing lead ID' }), { status: 400 });
  }

  const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(id) as any;
  if (!lead) {
    return new Response(JSON.stringify({ error: 'Lead not found' }), { status: 404 });
  }

  const activities = db.prepare('SELECT * FROM lead_activities WHERE lead_id = ? ORDER BY created_at DESC').all(id);
  const notes = db.prepare('SELECT * FROM lead_notes WHERE lead_id = ? ORDER BY created_at DESC').all(id);
  const followUps = db.prepare('SELECT * FROM follow_ups WHERE lead_id = ? ORDER BY scheduled_at ASC').all(id);

  // Check duplicate email or phone (excluding current lead)
  let duplicateLead: any = null;
  if (lead.email || lead.phone) {
    duplicateLead = db.prepare(`
      SELECT id, name, email, phone, status, created_at FROM leads
      WHERE id != ? AND ((email != '' AND email = ?) OR (phone != '' AND phone = ?))
      LIMIT 1
    `).get(id, lead.email || '', lead.phone || '');
  }

  return new Response(JSON.stringify({ lead, activities, notes, followUps, duplicateLead }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};

export const PATCH: APIRoute = async ({ request, params }) => {
  const user = getSessionUser(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const { id } = params;
  if (!id) return new Response(JSON.stringify({ error: 'Missing lead ID' }), { status: 400 });

  const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(id) as any;
  if (!lead) return new Response(JSON.stringify({ error: 'Lead not found' }), { status: 404 });

  try {
    const body = await request.json();
    const { status, assigned_to, name, email, phone, company, location, budget, requirement, collection_key, subcategory_key, product_slug } = body;

    const now = new Date().toISOString();

    // Track status change activity
    if (status && status !== lead.status) {
      db.prepare(`
        INSERT INTO lead_activities (id, lead_id, user_id, user_name, type, notes, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run('act-' + Date.now(), id, user.id, user.name, 'STATUS_CHANGE', `Status changed from ${lead.status} to ${status}`, now);
      logAuditAction(user.id, user.name, 'STATUS_CHANGE', `leads:${id}`, `Changed status of ${lead.name} from ${lead.status} to ${status}`);
    }

    // Track assignment change activity
    if (assigned_to !== undefined && assigned_to !== lead.assigned_to) {
      const newAssignee = assigned_to || 'Unassigned';
      db.prepare(`
        INSERT INTO lead_activities (id, lead_id, user_id, user_name, type, notes, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run('act-' + Date.now(), id, user.id, user.name, 'ASSIGNMENT', `Assigned to ${newAssignee}`, now);
      logAuditAction(user.id, user.name, 'ASSIGN_LEAD', `leads:${id}`, `Assigned lead ${lead.name} to ${newAssignee}`);
    }

    db.prepare(`
      UPDATE leads
      SET name = COALESCE(?, name),
          email = COALESCE(?, email),
          phone = COALESCE(?, phone),
          company = COALESCE(?, company),
          location = COALESCE(?, location),
          status = COALESCE(?, status),
          assigned_to = COALESCE(?, assigned_to),
          budget = COALESCE(?, budget),
          requirement = COALESCE(?, requirement),
          collection_key = COALESCE(?, collection_key),
          subcategory_key = COALESCE(?, subcategory_key),
          product_slug = COALESCE(?, product_slug),
          updated_at = ?
      WHERE id = ?
    `).run(
      name, email, phone, company, location, status, assigned_to, budget, requirement, collection_key, subcategory_key, product_slug,
      now, id
    );

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: 'Failed to update lead' }), { status: 500 });
  }
};
