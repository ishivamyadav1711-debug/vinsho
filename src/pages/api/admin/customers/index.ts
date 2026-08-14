import type { APIRoute } from 'astro';
import { db } from '../../../../lib/db.js';
import { getSessionUser } from '../../../../lib/auth.js';
import { computeCustomerStatus, type CustomerRecord } from '../../../../lib/crm.js';

export const GET: APIRoute = async ({ request, url }) => {
  const user = getSessionUser(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized admin access.' }), { status: 401 });
  }

  const search = url.searchParams.get('q')?.trim() || '';
  const statusFilter = url.searchParams.get('status');

  let query = `SELECT * FROM customers WHERE deleted_at IS NULL`;
  const params: any[] = [];

  if (search) {
    query += ` AND (name LIKE ? OR phone LIKE ? OR email LIKE ? OR city LIKE ?)`;
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }

  if (statusFilter) {
    query += ` AND status = ?`;
    params.push(statusFilter);
  }

  query += ` ORDER BY created_at DESC`;

  const rows = db.prepare(query).all(...params) as CustomerRecord[];

  // Recompute & sync customer status dynamically
  const updatedRows = rows.map((c) => {
    const computed = computeCustomerStatus(c);
    if (computed !== c.status && c.status !== 'VIP') {
      db.prepare('UPDATE customers SET status = ?, updated_at = ? WHERE id = ?').run(computed, new Date().toISOString(), c.id);
      return { ...c, status: computed };
    }
    return c;
  });

  return new Response(JSON.stringify({
    success: true,
    count: updatedRows.length,
    customers: updatedRows
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};
