import type { APIRoute } from 'astro';
import { prisma } from '../../../../lib/db.js';
import { getCustomerFromSession } from '../../../../lib/customerAuth.js';
import { sanitizeApiError } from '../../../../lib/apiErrors.js';

export const GET: APIRoute = async ({ request, params }) => {
  try {
    const customer = await getCustomerFromSession(request);
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

    const parsedId = !isNaN(Number(orderIdParam)) ? Number(orderIdParam) : -1;

    // Fetch order record
    const order = await prisma.orders.findFirst({
      where: {
        OR: [
          { id: parsedId },
          { order_number: orderIdParam }
        ]
      }
    });

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

    // Fetch items with variant and primary product image
    const rawItems = await prisma.orderItems.findMany({
      where: { order_id: order.id },
      include: {
        variant: {
          include: {
            product: {
              include: {
                ProductImages: {
                  where: { is_primary: true },
                  take: 1
                }
              }
            }
          }
        }
      }
    });

    const items = rawItems.map((oi: any) => ({
      ...oi,
      image_url: oi.product_variants?.products?.product_images?.[0]?.url || null,
      product_slug: oi.product_variants?.products?.slug || null
    }));

    // Fetch shipping address
    const shippingAddress = order.shipping_address_id
      ? await prisma.addresses.findUnique({ where: { id: order.shipping_address_id } })
      : null;

    // Fetch payment info if available
    const payment = await prisma.payments.findFirst({
      where: { order_id: order.id },
      select: {
        id: true,
        provider: true,
        amount: true,
        status: true,
        method: true,
        created_at: true
      },
      orderBy: { id: 'desc' }
    });

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
    const safeError = sanitizeApiError(err, 'Failed to fetch order details.');
    return new Response(JSON.stringify({ error: safeError }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
