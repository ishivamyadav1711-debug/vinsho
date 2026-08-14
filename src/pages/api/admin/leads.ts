import type { APIRoute } from 'astro';
import { db } from '../../../lib/db';
import { getSessionUser, logAuditAction } from '../../../lib/auth';

export const GET: APIRoute = async ({ request }) => {
  const user = getSessionUser(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const url = new URL(request.url);
  const q = (url.searchParams.get('q') || '').trim().toLowerCase();
  const status = url.searchParams.get('status') || '';
  const source = url.searchParams.get('source') || '';
  const collectionKey = url.searchParams.get('collectionKey') || '';
  const assignedTo = url.searchParams.get('assignedTo') || '';
  const sort = url.searchParams.get('sort') || 'newest';

  let sql = 'SELECT * FROM leads WHERE 1=1';
  const params: any[] = [];

  if (q) {
    sql += ' AND (LOWER(name) LIKE ? OR LOWER(email) LIKE ? OR LOWER(phone) LIKE ? OR LOWER(company) LIKE ? OR LOWER(product_slug) LIKE ?)';
    const term = `%${q}%`;
    params.push(term, term, term, term, term);
  }

  if (status) {
    sql += ' AND status = ?';
    params.push(status);
  }

  if (source) {
    sql += ' AND source = ?';
    params.push(source);
  }

  if (collectionKey) {
    sql += ' AND collection_key = ?';
    params.push(collectionKey);
  }

  if (assignedTo) {
    sql += ' AND assigned_to = ?';
    params.push(assignedTo);
  }

  // Sorting
  if (sort === 'oldest') {
    sql += ' ORDER BY created_at ASC';
  } else if (sort === 'name') {
    sql += ' ORDER BY name ASC';
  } else if (sort === 'last_contact') {
    sql += ' ORDER BY last_contact_at DESC';
  } else if (sort === 'next_follow_up') {
    sql += ' ORDER BY next_follow_up_at ASC';
  } else {
    sql += ' ORDER BY created_at DESC';
  }

  const leads = db.prepare(sql).all(...params);

  return new Response(JSON.stringify({ leads, total: leads.length }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};

export const POST: APIRoute = async ({ request }) => {
  const user = getSessionUser(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const body = await request.json();
    const { name, email, phone, company, location, source, status, assignedTo, collectionKey, subcategoryKey, productSlug, budget, requirement } = body;

    if (!name || (!email && !phone)) {
      return new Response(JSON.stringify({ error: 'Name and either Email or Phone are required.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const now = new Date().toISOString();
    const leadId = 'ld-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4);

    db.prepare(`
      INSERT INTO leads (id, name, email, phone, company, location, source, status, assigned_to, collection_key, subcategory_key, product_slug, budget, requirement, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      leadId,
      name.trim(),
      (email || '').trim().toLowerCase(),
      (phone || '').trim(),
      (company || '').trim(),
      (location || '').trim(),
      source || 'Manual Entry',
      status || 'NEW',
      assignedTo || user.name,
      collectionKey || '',
      subcategoryKey || '',
      productSlug || '',
      budget || '',
      requirement || '',
      now,
      now
    );

    logAuditAction(user.id, user.name, 'CREATE_LEAD', `leads:${leadId}`, `Created new lead for ${name}`);

    // Initial activity
    db.prepare(`
      INSERT INTO lead_activities (id, lead_id, user_id, user_name, type, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      'act-' + Date.now(),
      leadId,
      user.id,
      user.name,
      'NOTE',
      `Lead created manually by ${user.name}`,
      now
    );

    return new Response(JSON.stringify({ success: true, leadId }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: 'Failed to create lead.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
