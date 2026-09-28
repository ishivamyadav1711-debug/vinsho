import type { APIRoute } from 'astro';
import Razorpay from 'razorpay';
import { db, logAuditAction } from '../../../../../lib/db';
import { getSessionUser } from '../../../../../lib/auth';
import { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } from '../../../../../lib/razorpay.config';

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

    if (order.payment_status === 'refunded') {
      return new Response(JSON.stringify({ error: 'Order has already been refunded.' }), { status: 400 });
    }

    if (order.payment_status !== 'paid') {
      return new Response(JSON.stringify({ error: 'Only paid orders can be refunded.' }), { status: 400 });
    }

    if (!order.razorpay_payment_id) {
      return new Response(JSON.stringify({ error: 'Order is missing a Razorpay Payment ID.' }), { status: 400 });
    }

    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      return new Response(JSON.stringify({ error: 'Razorpay API credentials not configured.' }), { status: 500 });
    }

    // Initialize Razorpay
    const razorpay = new Razorpay({
      key_id: RAZORPAY_KEY_ID,
      key_secret: RAZORPAY_KEY_SECRET,
    });

    const amountInPaise = Math.round(order.grand_total * 100);

    // Call Razorpay API to issue the refund
    const refund = await razorpay.payments.refund(order.razorpay_payment_id, {
      amount: amountInPaise,
      notes: {
        order_number: order.order_number,
        admin_user_id: String(user.id)
      }
    });

    if (!refund || !refund.id) {
      throw new Error('Failed to create refund via Razorpay API.');
    }

    const now = new Date().toISOString();

    // Update the database idempotently
    db.prepare(`
      UPDATE orders 
      SET payment_status = 'refunded', razorpay_refund_id = ?, refunded_at = ?, updated_at = ? 
      WHERE id = ? AND payment_status = 'paid'
    `).run(refund.id, now, now, order.id);

    // Audit logging
    logAuditAction({
      actorId: user.id,
      action: 'REFUND_ORDER',
      entity: 'order',
      entityId: order.id,
      before: { payment_status: 'paid' },
      after: { payment_status: 'refunded', refund_id: refund.id, amount: order.grand_total }
    });

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Refund successful',
      refundId: refund.id
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (err: any) {
    console.error('Refund Error:', err);
    // Determine if it is a Razorpay specific error
    const msg = err.error?.description || err.message || 'Server Error processing refund.';
    return new Response(JSON.stringify({ error: 'Refund failed. No payment status was changed. Details: ' + msg }), { status: 500 });
  }
};
