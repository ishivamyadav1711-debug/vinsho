import type { APIRoute } from 'astro';
import { db } from '../../../lib/db.js';
import { getCustomerFromSession } from '../../../lib/customerAuth.js';

export const GET: APIRoute = async ({ request }) => {
  try {
    const customer = getCustomerFromSession(request);
    if (!customer) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Please log in to view your orders.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Query orders belonging strictly to authenticated customer ID
    const orders = db.prepare(`
      SELECT o.id, o.order_number, o.status, o.payment_status, o.subtotal, o.tax_total, o.shipping_total, o.discount_total, o.grand_total, o.currency, o.placed_at, o.created_at
      FROM orders o
      WHERE o.customer_id = ?
      ORDER BY o.id DESC
    `).all(customer.id) as any[];

    // Attach item summary for each order
    const enrichedOrders = orders.map((o) => {
      const items = db.prepare(`
        SELECT oi.id, oi.product_name_snapshot, oi.variant_label_snapshot, oi.unit_price_snapshot, oi.qty, oi.line_total, p_img.url as image_url
        FROM order_items oi
        LEFT JOIN product_variants pv ON oi.variant_id = pv.id
        LEFT JOIN product_images p_img ON (p_img.product_id = pv.product_id AND p_img.is_primary = 1)
        WHERE oi.order_id = ?
      `).all(o.id);

      return {
        ...o,
        items
      };
    });

    return new Response(JSON.stringify({
      success: true,
      orders: enrichedOrders
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Failed to fetch order history.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
