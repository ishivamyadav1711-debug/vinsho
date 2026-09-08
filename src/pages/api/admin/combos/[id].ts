import type { APIRoute } from 'astro';
import { db, logAuditAction } from '../../../../lib/db.js';
import { getSessionUser } from '../../../../lib/auth.js';
import { getComboAvailability, setComboComponents } from '../../../../lib/combos.js';

export const GET: APIRoute = async ({ request, params }) => {
  const user = getSessionUser(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized admin access.' }), { status: 401 });
  }

  const variantId = parseInt(params.id || '0', 10);
  const variant = db.prepare(`
    SELECT v.*, p.name as product_name
    FROM product_variants v
    JOIN products p ON v.product_id = p.id
    WHERE v.id = ? AND p.deleted_at IS NULL
  `).get(variantId) as any;

  if (!variant) {
    return new Response(JSON.stringify({ error: 'Variant not found.' }), { status: 404 });
  }

  const availability = getComboAvailability(variantId);

  return new Response(JSON.stringify({
    success: true,
    variant,
    availability
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

  const variantId = parseInt(params.id || '0', 10);
  const variant = db.prepare('SELECT * FROM product_variants WHERE id = ?').get(variantId) as any;

  if (!variant) {
    return new Response(JSON.stringify({ error: 'Variant not found.' }), { status: 404 });
  }

  try {
    const body = await request.json();
    const { components } = body;

    if (!Array.isArray(components)) {
      return new Response(JSON.stringify({ error: 'Components array is required.' }), { status: 400 });
    }

    const setRes = setComboComponents(variantId, components);
    if (!setRes.success) {
      return new Response(JSON.stringify({ error: setRes.error }), { status: 400 });
    }

    const updatedAvailability = getComboAvailability(variantId);

    logAuditAction({
      actorId: user.id,
      action: 'UPDATE',
      entity: 'combo_items',
      entityId: variantId,
      before: null,
      after: updatedAvailability,
      ip: request.headers.get('x-forwarded-for') || '127.0.0.1',
      userAgent: request.headers.get('user-agent') || ''
    });

    return new Response(JSON.stringify({
      success: true,
      availability: updatedAvailability
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Failed to update combo components.' }), { status: 500 });
  }
};
