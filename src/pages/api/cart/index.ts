import type { APIRoute } from 'astro';
import { addItemToCart, getCartItems } from '../../../lib/cart.js';
import { sanitizeApiError } from '../../../lib/apiErrors.js';

export const GET: APIRoute = async ({ request, url }) => {
  const sessionToken = url.searchParams.get('sessionToken') || request.headers.get('x-session-token') || 'guest-session';
  const items = await getCartItems(sessionToken);

  const subtotal = items.reduce((sum: number, item: any) => sum + (item.sellingPrice * item.qty), 0);
  const totalItems = items.reduce((sum: number, item: any) => sum + item.qty, 0);

  return new Response(JSON.stringify({
    success: true,
    sessionToken,
    count: totalItems,
    subtotal,
    items
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { sessionToken, variantId, slug, productId, qty = 1 } = body;

    if (!sessionToken || (!variantId && !slug && !productId)) {
      return new Response(JSON.stringify({ error: 'sessionToken and variantId or slug are required.' }), { status: 400 });
    }

    const parsedQty = parseInt(qty, 10);
    if (isNaN(parsedQty) || parsedQty <= 0 || parsedQty > 999) {
      return new Response(JSON.stringify({ error: 'Quantity must be a positive integer between 1 and 999.' }), { status: 400 });
    }

    const res = await addItemToCart({
      sessionToken,
      variantId: variantId ? parseInt(variantId, 10) : undefined,
      slug,
      productId: productId ? parseInt(productId, 10) : undefined,
      qty: parsedQty
    });

    if (!res.success) {
      return new Response(JSON.stringify({ error: res.error }), { status: 400 });
    }

    const items = await getCartItems(sessionToken);
    const subtotal = items.reduce((sum: number, item: any) => sum + (item.sellingPrice * item.qty), 0);
    const totalItems = items.reduce((sum: number, item: any) => sum + item.qty, 0);

    return new Response(JSON.stringify({
      success: true,
      message: 'Item added to cart.',
      count: totalItems,
      subtotal,
      items
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (err: any) {
    const safeError = sanitizeApiError(err, 'Failed to add item to cart.');
    return new Response(JSON.stringify({ error: safeError }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
