import type { APIRoute } from 'astro';
import { prisma } from '../../../lib/db.js';
import { updateOrderStatus } from '../../../lib/orders.js';

export const POST: APIRoute = async ({ request }) => {
  // Protect cron endpoint with a secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET || 'dev-cron-secret'}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    // Find orders that are Pending, unpaid, and older than 30 minutes
    const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000);
    
    const abandonedOrders = await prisma.orders.findMany({
      where: {
        status: 'Pending',
        payment_status: 'pending',
        placed_at: { lt: thirtyMinsAgo }
      },
      select: { id: true }
    });

    let releasedCount = 0;

    for (const order of abandonedOrders) {
      // updateOrderStatus to 'Cancelled' automatically releases inventory previously deducted as SALE
      const res = await updateOrderStatus({
        orderId: order.id,
        newStatus: 'Cancelled',
        notes: 'Auto-cancelled abandoned checkout'
      });
      
      if (res.success) {
        releasedCount++;
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      releasedOrders: releasedCount,
      totalFound: abandonedOrders.length
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (error: any) {
    console.error('Failed to release abandoned inventory:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};
