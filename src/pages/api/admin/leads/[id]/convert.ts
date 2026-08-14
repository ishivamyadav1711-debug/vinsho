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

  const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(leadId) as any;
  if (!lead) return new Response(JSON.stringify({ error: 'Lead not found' }), { status: 404 });

  try {
    const { address, notes } = await request.json();
    const now = new Date().toISOString();
    const customerId = 'cust-' + Date.now();

    // Check if customer already exists for this lead
    const existingCust = db.prepare('SELECT id FROM customers WHERE lead_id = ?').get(leadId) as any;
    if (existingCust) {
      return new Response(JSON.stringify({ error: 'Customer record already exists for this lead', customerId: existingCust.id }), { status: 400 });
    }

    db.prepare(`
      INSERT INTO customers (id, lead_id, name, email, phone, company, address, source, converted_at, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      customerId,
      leadId,
      lead.name,
      lead.email,
      lead.phone,
      lead.company,
      address || lead.location,
      lead.source,
      now,
      notes || '',
      now
    );

    // Update lead status to CONVERTED
    db.prepare(`
      UPDATE leads
      SET status = 'CONVERTED', updated_at = ?
      WHERE id = ?
    `).run(now, leadId);

    // Record activity
    db.prepare(`
      INSERT INTO lead_activities (id, lead_id, user_id, user_name, type, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('act-' + Date.now(), leadId, user.id, user.name, 'STATUS_CHANGE', 'Converted lead to official Customer profile', now);

    logAuditAction(user.id, user.name, 'CONVERT_CUSTOMER', `customers:${customerId}`, `Converted lead ${lead.name} to customer`);

    return new Response(JSON.stringify({ success: true, customerId }), { status: 201 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: 'Failed to convert customer' }), { status: 500 });
  }
};
