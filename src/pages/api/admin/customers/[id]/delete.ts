import type { APIRoute } from 'astro';
import { db } from '../../../../../lib/db.js';
import { getSessionUser } from '../../../../../lib/auth.js';
import { logCrmActivity } from '../../../../../lib/crm.js';

export const DELETE: APIRoute = async ({ request, params }) => {
  const user = getSessionUser(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized admin access.' }), { status: 401 });
  }

  const id = parseInt(params.id || '0', 10);
  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(id) as any;

  if (!customer) {
    return new Response(JSON.stringify({ error: 'Customer not found.' }), { status: 404 });
  }

  const now = new Date().toISOString();

  // Section 8 DPDP Rule: Erase PII while preserving anonymized aggregate counts & orders
  db.transaction(() => {
    db.prepare(`
      UPDATE customers SET
        name = 'Anonymized User (DPDP Right to Erasure)',
        email = NULL,
        phone = ?,
        city = '',
        state = '',
        pincode = '',
        deleted_at = ?,
        updated_at = ?
      WHERE id = ?
    `).run(`ANONYMIZED_${id}`, now, now, id);

    // Anonymize Linked Enquiries
    db.prepare(`
      UPDATE enquiries SET
        name = 'Anonymized User',
        email = NULL,
        phone = 'ANONYMIZED',
        message = '[Erased per DPDP Act 2023 Request]',
        updated_at = ?
      WHERE customer_id = ?
    `).run(now, id);

    logCrmActivity({
      entityType: 'customer',
      entityId: id,
      actorId: user.id,
      type: 'DPDP_ERASURE',
      summary: `Personal data erased under DPDP Act 2023 Right to Erasure request by ${user.name}`
    });
  })();

  return new Response(JSON.stringify({
    success: true,
    message: 'Customer personal data successfully erased per DPDP Act 2023 request. Aggregate order counts retained.'
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};
