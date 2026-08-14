import type { APIRoute } from 'astro';
import { db } from '../../../../lib/db.js';
import { getSessionUser } from '../../../../lib/auth.js';

export const GET: APIRoute = async ({ request, url }) => {
  const user = getSessionUser(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized admin access.' }), { status: 401 });
  }

  const status = url.searchParams.get('status');
  const search = url.searchParams.get('q')?.trim() || '';

  let query = `
    SELECT 
      e.*,
      c.name as customer_name, c.email as customer_email, c.phone as customer_phone, c.status as customer_status,
      p.name as product_name, p.slug as product_slug,
      u.name as assignee_name
    FROM enquiries e
    JOIN customers c ON e.customer_id = c.id
    LEFT JOIN products p ON e.product_id = p.id
    LEFT JOIN admin_users u ON e.assigned_to = u.id
    WHERE c.deleted_at IS NULL
  `;

  const params: any[] = [];

  if (status) {
    query += ` AND e.status = ?`;
    params.push(status);
  }

  if (search) {
    query += ` AND (e.name LIKE ? OR e.phone LIKE ? OR e.email LIKE ? OR p.name LIKE ?)`;
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }

  query += ` ORDER BY e.created_at DESC`;

  const enquiries = db.prepare(query).all(...params);

  // Group by product for client pricing priority analysis (§6)
  const productDemand = db.prepare(`
    SELECT p.id, p.name, p.slug, COUNT(e.id) as enquiry_count
    FROM enquiries e
    JOIN products p ON e.product_id = p.id
    GROUP BY p.id
    ORDER BY enquiry_count DESC
  `).all();

  return new Response(JSON.stringify({
    success: true,
    count: enquiries.length,
    enquiries,
    productDemand
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};
