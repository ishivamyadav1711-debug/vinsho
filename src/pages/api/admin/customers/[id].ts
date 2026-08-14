import type { APIRoute } from 'astro';
import { db } from '../../../../lib/db.js';
import { getSessionUser } from '../../../../lib/auth.js';
import { logCrmActivity } from '../../../../lib/crm.js';

export const GET: APIRoute = async ({ request, params }) => {
  const user = getSessionUser(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized admin access.' }), { status: 401 });
  }

  const id = parseInt(params.id || '0', 10);
  const customer = db.prepare('SELECT * FROM customers WHERE id = ? AND deleted_at IS NULL').get(id);

  if (!customer) {
    return new Response(JSON.stringify({ error: 'Customer not found.' }), { status: 404 });
  }

  const enquiries = db.prepare(`
    SELECT e.*, p.name as product_name, p.slug as product_slug
    FROM enquiries e
    LEFT JOIN products p ON e.product_id = p.id
    WHERE e.customer_id = ?
    ORDER BY e.created_at DESC
  `).all(id);

  const activities = db.prepare('SELECT * FROM crm_activities WHERE entity_type = ? AND entity_id = ? ORDER BY created_at DESC').all('customer', id);
  const notes = db.prepare(`
    SELECT n.*, u.name as author_name
    FROM crm_notes n
    JOIN admin_users u ON n.author_id = u.id
    WHERE n.entity_type = ? AND n.entity_id = ?
    ORDER BY n.created_at DESC
  `).all('customer', id);

  return new Response(JSON.stringify({
    success: true,
    customer,
    enquiries,
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
  const existing = db.prepare('SELECT * FROM customers WHERE id = ?').get(id) as any;

  if (!existing) {
    return new Response(JSON.stringify({ error: 'Customer not found.' }), { status: 404 });
  }

  try {
    const body = await request.json();
    const { name, email, phone, city, state, pincode, status } = body;

    const now = new Date().toISOString();

    // Section 4 Rule: VIP status set manually by admin only
    const newStatus = status === 'VIP' ? 'VIP' : existing.status;

    db.prepare(`
      UPDATE customers SET
        name = COALESCE(?, name),
        email = COALESCE(?, email),
        phone = COALESCE(?, phone),
        city = COALESCE(?, city),
        state = COALESCE(?, state),
        pincode = COALESCE(?, pincode),
        status = ?,
        updated_at = ?
      WHERE id = ?
    `).run(name || null, email || null, phone || null, city || null, state || null, pincode || null, newStatus, now, id);

    logCrmActivity({
      entityType: 'customer',
      entityId: id,
      actorId: user.id,
      type: 'STATUS_CHANGE',
      summary: `Customer details updated by ${user.name}${status === 'VIP' ? ' (VIP status granted)' : ''}`
    });

    const updated = db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
    return new Response(JSON.stringify({ success: true, customer: updated }), { status: 200 });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Failed to update customer.' }), { status: 500 });
  }
};
