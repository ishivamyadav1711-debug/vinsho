import type { APIRoute } from 'astro';
import { calculateShipping } from '../../../lib/shipping.js';
import { db } from '../../../lib/db.js';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { pincode, items } = body;

    if (!pincode || !items || !items.length) {
      return new Response(JSON.stringify({ error: 'Pincode and items are required.' }), { status: 400 });
    }

    const cartItems: any[] = [];
    let subtotal = 0;

    for (const raw of items) {
      let v: any = null;
      if (raw.variantId) {
        v = db.prepare(`
          SELECT v.*, p.slug as product_slug, p.name as product_name, p.shipping_class
          FROM product_variants v
          JOIN products p ON v.product_id = p.id
          WHERE v.id = ? AND p.deleted_at IS NULL
        `).get(raw.variantId) as any;
      } else if (raw.slug) {
        v = db.prepare(`
          SELECT v.*, p.slug as product_slug, p.name as product_name, p.shipping_class
          FROM product_variants v
          JOIN products p ON v.product_id = p.id
          WHERE p.slug = ? AND p.deleted_at IS NULL
          ORDER BY v.position ASC, v.id ASC LIMIT 1
        `).get(raw.slug) as any;
      }

      if (!v) {
        return new Response(JSON.stringify({ error: `Product variant not found for ${raw.slug || raw.variantId}.` }), { status: 400 });
      }

      cartItems.push({
        variantId: v.id,
        productSlug: v.product_slug,
        shippingClass: v.shipping_class,
        packedWeightKg: v.packed_weight_kg,
        packedL: v.packed_l_cm,
        packedB: v.packed_b_cm,
        packedH: v.packed_h_cm,
        qty: raw.qty,
        price: v.selling_price
      });

      subtotal += v.selling_price * raw.qty;
    }

    const shipResult = calculateShipping(cartItems, pincode, subtotal);

    return new Response(JSON.stringify({
      success: true,
      serviceable: shipResult.serviceable,
      shippingFee: shipResult.shippingFee,
      reason: shipResult.reason,
      subtotal: subtotal,
      grandTotal: subtotal + shipResult.shippingFee // Not calculating tax here as it's included in price mostly, or we could just return shippingFee
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
