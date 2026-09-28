import type { APIRoute } from 'astro';
import { db } from '../../../../../lib/db';
import { getSessionUser } from '../../../../../lib/auth';
import { getComboComponents } from '../../../../../lib/combos';

export const POST: APIRoute = async ({ request, params }) => {
  const user = getSessionUser(request);
  if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const { id } = params;
  if (!id) {
    return new Response(JSON.stringify({ error: 'Order ID is required' }), { status: 400 });
  }

  try {
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id) as any;
    if (!order) {
      return new Response(JSON.stringify({ error: 'Order not found' }), { status: 404 });
    }

    if (order.status === 'Cancelled') {
      return new Response(JSON.stringify({ error: 'Order is already cancelled.' }), { status: 400 });
    }
    
    if (['Shipped', 'Out for Delivery', 'Delivered'].includes(order.status)) {
      return new Response(JSON.stringify({ error: 'Cannot cancel an order that has already been shipped.' }), { status: 400 });
    }

    db.transaction(() => {
      // 1. Release inventory
      const items = db.prepare('SELECT variant_id, qty FROM order_items WHERE order_id = ?').all(order.id) as any[];
      for (const item of items) {
        const comboComponents = getComboComponents(item.variant_id);
        if (comboComponents.length > 0) {
          for (const comp of comboComponents) {
            db.prepare('UPDATE product_variants SET stock = stock + ? WHERE id = ?').run(comp.quantity * item.qty, comp.component_variant_id);
          }
        } else {
          db.prepare('UPDATE product_variants SET stock = stock + ? WHERE id = ?').run(item.qty, item.variant_id);
        }
      }

      // 2. Update status. Do not fake refund for paid orders.
      // Payment status remains "paid" until actually refunded via Razorpay.
      db.prepare('UPDATE orders SET status = ?, updated_at = ? WHERE id = ?')
        .run('Cancelled', new Date().toISOString(), order.id);
    })();

    return new Response(JSON.stringify({ success: true, message: 'Order cancelled successfully.' }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (err: any) {
    console.error('Cancel Order Error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Server Error' }), { status: 500 });
  }
};
