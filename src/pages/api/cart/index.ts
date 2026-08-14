import type { APIRoute } from 'astro';
import { db } from '../../../lib/db.js';
import { addItemToCart, getCartItems, getOrCreateCart } from '../../../lib/cart.js';

export const GET: APIRoute = async ({ request, url }) => {
  const sessionToken = url.searchParams.get('sessionToken') || request.headers.get('x-session-token') || 'guest-session';
  const items = getCartItems(sessionToken);

  const subtotal = items.reduce((sum, item) => sum + (item.sellingPrice * item.qty), 0);
  const totalItems = items.reduce((sum, item) => sum + item.qty, 0);

  return new Response(JSON.stringify({
    success: true,
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
    const { sessionToken, variantId, qty } = body;

    if (!sessionToken || !variantId || !qty) {
      return new Response(JSON.stringify({ error: 'sessionToken, variantId and qty are required.' }), { status: 400 });
    }

    const res = addItemToCart({
      sessionToken,
      variantId: parseInt(variantId, 10),
      qty: parseInt(qty, 10)
    });

    if (!res.success) {
      return new Response(JSON.stringify({ error: res.error }), { status: 400 });
    }

    const items = getCartItems(sessionToken);
    return new Response(JSON.stringify({ success: true, message: 'Item added to cart.', items }), { status: 200 });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Failed to add item to cart.' }), { status: 500 });
  }
};

export const DELETE: APIRoute = async ({ request, url }) => {
  const sessionToken = url.searchParams.get('sessionToken') || 'guest-session';
  const cartItemId = parseInt(url.searchParams.get('cartItemId') || '0', 10);

  const cart = db.prepare('SELECT id FROM carts WHERE session_token = ?').get(sessionToken) as any;
  if (cart && cartItemId) {
    db.prepare('DELETE FROM cart_items WHERE id = ? AND cart_id = ?').run(cartItemId, cart.id);
  }

  const items = getCartItems(sessionToken);
  return new Response(JSON.stringify({ success: true, message: 'Item removed from cart.', items }), { status: 200 });
};
