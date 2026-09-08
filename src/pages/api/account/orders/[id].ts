import type { APIRoute } from 'astro';
import { db } from '../../../../lib/db.js';
import { getCustomerFromSession } from '../../../../lib/customerAuth.js';

export const GET: APIRoute = async ({ request, params }) => {
  try {
    const customer = getCustomerFromSession(request);
    if (!customer) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Please log in.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const orderIdParam = params.id;
    if (!orderIdParam) {
      return new Response(JSON.stringify({ error: 'Order ID is required.' }), { status: 400 });
    }

    // Fetch order record
    const order = db.prepare(`
      SELECT * FROM orders WHERE (id = ? OR order_number = ?)
    `).get(orderIdParam, orderIdParam) as any;

    if (!order) {
      return new Response(JSON.stringify({ error: 'Order not found.' }), { status: 404 });
    }

    // CRITICAL SECURITY REQUIREMENT: Ensure authenticated customer owns this order! (§9)
    if (order.customer_id !== customer.id) {
      return new Response(JSON.stringify({ error: 'Forbidden: You do not have permission to view this order.' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Fetch items
    const items = db.prepare(`
      SELECT oi.*, p_img.url as image_url, p.slug as product_slug
      FROM order_items oi
      LEFT JOIN product_variants pv ON oi.variant_id = pv.id
      LEFT JOIN products p ON pv.product_id = p.id
      LEFT JOIN product_images p_img ON (p_img.product_id = pv.product_id AND p_img.is_primary = 1)
      WHERE oi.order_id = ?
    `).all(order.id);

    // Fetch shipping address
    const shippingAddress = db.prepare('SELECT * FROM addresses WHERE id = ?').get(order.shipping_address_id);

    // Fetch payment info if available
    const payment = db.prepare('SELECT id, provider, amount, status, method, created_at FROM payments WHERE order_id = ? ORDER BY id DESC LIMIT 1').get(order.id);

    return new Response(JSON.stringify({
      success: true,
      order: {
        ...order,
        items,
        shippingAddress,
        payment
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Failed to fetch order details.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
