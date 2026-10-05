import type { APIRoute } from 'astro';
import Razorpay from 'razorpay';
import { prisma } from '../../../../../lib/db';
import { getSessionUser } from '../../../../../lib/auth';
import { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } from '../../../../../lib/razorpay.config';

export const POST: APIRoute = async ({ request, params }) => {
  const user = await getSessionUser(request);
  if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const { id } = params;
  if (!id) {
    return new Response(JSON.stringify({ error: 'Order ID is required' }), { status: 400 });
  }

  try {
    const order = await prisma.orders.findUnique({ 
      where: { id: Number(id) },
      include: { Payments: true } 
    });
    if (!order) {
      return new Response(JSON.stringify({ error: 'Order not found' }), { status: 404 });
    }

    if (order.payment_status === 'refunded') {
      return new Response(JSON.stringify({ error: 'Order has already been refunded.' }), { status: 400 });
    }

    if (order.payment_status !== 'paid') {
      return new Response(JSON.stringify({ error: 'Only paid orders can be refunded.' }), { status: 400 });
    }

    const payment = order.Payments.find(p => p.provider === 'RAZORPAY' && p.status === 'SUCCESS');
    if (!payment || !payment.provider_payment_id) {
      return new Response(JSON.stringify({ error: 'Order is missing a successful Razorpay Payment ID.' }), { status: 400 });
    }

    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      return new Response(JSON.stringify({ error: 'Razorpay API credentials not configured.' }), { status: 500 });
    }

    // Initialize Razorpay
    const razorpay = new Razorpay({
      key_id: RAZORPAY_KEY_ID,
      key_secret: RAZORPAY_KEY_SECRET,
    });

    const amountInPaise = Math.round(Number(order.grand_total) * 100);

    // Call Razorpay API to issue the refund
    const refund = await razorpay.payments.refund(payment.provider_payment_id, {
      amount: amountInPaise,
      notes: {
        order_number: order.order_number,
        admin_user_id: String(user.id)
      }
    });

    if (!refund || !refund.id) {
      throw new Error('Failed to create refund via Razorpay API.');
    }

    const now = new Date();

    // Update the database idempotently
    await prisma.$transaction([
      prisma.orders.updateMany({
        where: { id: Number(order.id), payment_status: 'paid' },
        data: { payment_status: 'refunded', updated_at: now }
      }),
      prisma.payments.create({
        data: {
          order_id: order.id,
          provider: 'RAZORPAY',
          provider_payment_id: refund.id,
          amount: order.grand_total,
          status: 'REFUNDED',
          method: 'REFUND',
          created_at: now
        }
      })
    ]);

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
