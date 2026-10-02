import type { APIRoute } from 'astro';
import { prisma, logAuditAction } from '../../../../lib/db.js';
import { getSessionUser } from '../../../../lib/auth.js';
import { getComboAvailability, setComboComponents } from '../../../../lib/combos.js';

export const GET: APIRoute = async ({ request, params }) => {
  const user = await getSessionUser(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized admin access.' }), { status: 401 });
  }

  const variantId = parseInt(params.id || '0', 10);
  const foundVariant = await prisma.product_variants.findFirst({
    where: {
      id: variantId,
      products: { deleted_at: null }
    },
    include: {
      products: { select: { name: true } }
    }
  });

  if (!foundVariant) {
    return new Response(JSON.stringify({ error: 'Variant not found.' }), { status: 404 });
  }

  const variant = {
    ...foundVariant,
    product_name: foundVariant.products?.name
  };

  const availability = await getComboAvailability(variantId);

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
  const user = await getSessionUser(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized admin access.' }), { status: 401 });
  }

  const variantId = parseInt(params.id || '0', 10);
  const variant = await prisma.product_variants.findUnique({
    where: { id: variantId }
  });

  if (!variant) {
    return new Response(JSON.stringify({ error: 'Variant not found.' }), { status: 404 });
  }

  try {
    const body = await request.json();
    const { components } = body;

    if (!Array.isArray(components)) {
      return new Response(JSON.stringify({ error: 'Components array is required.' }), { status: 400 });
    }

    const setRes = await setComboComponents(variantId, components);
    if (!setRes.success) {
      return new Response(JSON.stringify({ error: setRes.error }), { status: 400 });
    }

    const updatedAvailability = await getComboAvailability(variantId);

    await logAuditAction({
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
