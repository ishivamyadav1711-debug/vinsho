import type { APIRoute } from 'astro';
import { prisma } from '../../../lib/db.js';
import { getCustomerFromSession } from '../../../lib/customerAuth.js';
import { sanitizeApiError } from '../../../lib/apiErrors.js';

export const GET: APIRoute = async ({ request }) => {
  try {
    const customer = await getCustomerFromSession(request);
    if (!customer) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Please log in to view your orders.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Query orders belonging strictly to authenticated customer ID with items
    const orders = await prisma.orders.findMany({
      where: { customer_id: customer.id },
      select: {
        id: true,
        order_number: true,
        status: true,
        payment_status: true,
        subtotal: true,
        tax_total: true,
        shipping_total: true,
        discount_total: true,
        grand_total: true,
        currency: true,
        placed_at: true,
        created_at: true,
        order_items: {
          select: {
            id: true,
            product_name_snapshot: true,
            variant_label_snapshot: true,
            unit_price_snapshot: true,
            qty: true,
            line_total: true,
            product_variants: {
              select: {
                products: {
                  select: {
                    product_images: {
                      where: { is_primary: 1 },
                      take: 1,
                      select: { url: true }
                    }
                  }
                }
              }
            }
          }
        }
      },
      orderBy: { id: 'desc' }
    });

    const enrichedOrders = orders.map((o: any) => ({
      id: o.id,
      order_number: o.order_number,
      status: o.status,
      payment_status: o.payment_status,
      subtotal: o.subtotal,
      tax_total: o.tax_total,
      shipping_total: o.shipping_total,
      discount_total: o.discount_total,
      grand_total: o.grand_total,
      currency: o.currency,
      placed_at: o.placed_at,
      created_at: o.created_at,
      items: o.order_items.map((oi: any) => ({
        id: oi.id,
        product_name_snapshot: oi.product_name_snapshot,
        variant_label_snapshot: oi.variant_label_snapshot,
        unit_price_snapshot: oi.unit_price_snapshot,
        qty: oi.qty,
        line_total: oi.line_total,
        image_url: oi.product_variants?.products?.product_images?.[0]?.url || null
      }))
    }));

    return new Response(JSON.stringify({
      success: true,
      orders: enrichedOrders
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    const safeError = sanitizeApiError(err, 'Failed to fetch order history.');
    return new Response(JSON.stringify({ error: safeError }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
