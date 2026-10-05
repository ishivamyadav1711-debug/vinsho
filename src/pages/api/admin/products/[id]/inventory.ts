import type { APIRoute } from 'astro';
import { prisma, logAuditAction } from '../../../../../lib/db.js';
import { getSessionUser } from '../../../../../lib/auth.js';
import { adjustVariantStock } from '../../../../../lib/inventory.js';

export const POST: APIRoute = async ({ request, params }) => {
  const user = await getSessionUser(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized admin access.' }), { status: 401 });
  }

  const productId = parseInt(params.id || '0', 10);
  if (!productId) {
    return new Response(JSON.stringify({ error: 'Invalid product ID.' }), { status: 400 });
  }

  const product = await prisma.products.findUnique({
    where: { id: productId },
    include: { ProductVariants: true }
  });

  if (!product) {
    return new Response(JSON.stringify({ error: 'Product not found.' }), { status: 404 });
  }

  try {
    const body = await request.json();
    const { variantId, mode, quantity, reasonText } = body;

    if (!mode) {
      return new Response(JSON.stringify({ error: 'Mode is required (ADD, REMOVE, SET, MARK_OUT_OF_STOCK, MARK_IN_STOCK).' }), { status: 400 });
    }

    // Determine target variant ID (if not provided, use primary/first variant of the product)
    let targetVariantId = variantId ? parseInt(variantId, 10) : null;
    if (!targetVariantId) {
      if (!product.ProductVariants || product.ProductVariants.length === 0) {
        return new Response(JSON.stringify({ error: 'Product has no variants to adjust stock for.' }), { status: 400 });
      }
      targetVariantId = product.ProductVariants[0].id;
    }

    const result = await adjustVariantStock({
      variantId: targetVariantId,
      mode,
      quantity: quantity !== undefined ? Number(quantity) : undefined,
      actorId: user.id,
      reasonText
    });

    if (!result.success) {
      return new Response(JSON.stringify({ error: result.error || 'Stock adjustment failed.' }), { status: 400 });
    }

    // Log admin audit action
    await logAuditAction({
      actorId: user.id,
      action: `STOCK_${mode}`,
      entity: 'product_variants',
      entityId: targetVariantId,
      before: { stock: result.previousStock },
      after: { stock: result.newStock, delta: result.delta },
      ip: request.headers.get('x-forwarded-for') || '127.0.0.1',
      userAgent: request.headers.get('user-agent') || ''
    });

    return new Response(JSON.stringify({
      success: true,
      productId,
      variantId: targetVariantId,
      previousStock: result.previousStock,
      newStock: result.newStock,
      delta: result.delta
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err: any) {
    console.error('Inventory mutation API error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Server error during stock adjustment.' }), { status: 500 });
  }
};
