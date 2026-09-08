import type { APIRoute } from 'astro';
import { db } from '../../../lib/db';
import { checkRateLimit, tooManyRequestsResponse, getClientIp, LIMITS } from '../../../lib/rateLimiter.js';

export interface HamperConfigPayload {
  hamperId?: string;
  occasion?: string;
  items: Array<{
    variantId?: number | string;
    productSlug?: string;
    productName?: string;
    quantity: number;
    unitPrice?: number;
    image?: string;
  }>;
  packaging?: {
    id: string;
    name: string;
    price: number;
  };
  recipientName?: string;
  senderName?: string;
  message?: string;
  selectedBudgetId?: string;
  subtotal?: number;
  packagingCost?: number;
  total?: number;
}

const PACKAGING_PRICES: Record<string, { name: string; price: number }> = {
  'box_signature_cork': { name: 'Signature Cork Box', price: 350 },
  'basket_artisanal_jute': { name: 'Artisanal Jute Basket', price: 450 },
  'box_velvet_maroon': { name: 'Velvet & Gold Chest', price: 650 }
};

export const POST: APIRoute = async ({ request }) => {
  const ip = getClientIp(request);
  const rl = checkRateLimit('HAMPER_VALIDATE', ip, LIMITS.HAMPER_VALIDATE);
  if (!rl.allowed) return tooManyRequestsResponse(rl.retryAfterSec);

  try {
    const payload: HamperConfigPayload = await request.json();

    if (!payload || !payload.items || payload.items.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Your hamper must contain at least 1 product item.'
      }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    let serverSubtotal = 0;
    const validatedItems = [];

    // Server-side inventory & price verification against SQLite DB
    for (const item of payload.items) {
      let variantRow: any = null;

      if (item.variantId && item.variantId !== 0 && item.variantId !== '0') {
        variantRow = db.prepare(`
          SELECT v.*, p.slug as prod_slug, p.name as prod_name,
                 (SELECT url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as primary_image
          FROM product_variants v
          JOIN products p ON v.product_id = p.id
          WHERE v.id = ? AND p.deleted_at IS NULL
        `).get(item.variantId);
      }

      if (!variantRow && item.productSlug) {
        variantRow = db.prepare(`
          SELECT v.*, p.slug as prod_slug, p.name as prod_name,
                 (SELECT url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as primary_image
          FROM product_variants v
          JOIN products p ON v.product_id = p.id
          WHERE p.slug = ? AND p.deleted_at IS NULL
          ORDER BY v.position ASC, v.id ASC
          LIMIT 1
        `).get(item.productSlug);
      }

      if (!variantRow) {
        return new Response(JSON.stringify({
          success: false,
          error: `Product or variant "${item.productName || item.productSlug}" was not found in available database catalog.`
        }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }

      // Check current stock balance
      const availableStock = variantRow.stock !== null && variantRow.stock !== undefined ? variantRow.stock : 100;
      if (availableStock < item.quantity) {
        return new Response(JSON.stringify({
          success: false,
          error: `Insufficient stock for "${variantRow.prod_name}" (Requested: ${item.quantity}, Available: ${availableStock}).`
        }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }

      const unitPrice = Number(variantRow.selling_price) || 0;
      const lineTotal = unitPrice * item.quantity;
      serverSubtotal += lineTotal;

      const variantLabel = [variantRow.size, variantRow.colour].filter(Boolean).join(' / ') || 'Standard Variant';

      validatedItems.push({
        productId: variantRow.product_id,
        productSlug: variantRow.prod_slug,
        variantId: variantRow.id,
        quantity: item.quantity,
        unitPrice,
        productName: variantRow.prod_name,
        variantLabel,
        image: item.image || variantRow.primary_image || '/placeholder.png'
      });
    }

    // Server-side packaging cost calculation
    const pkgChoice = PACKAGING_PRICES[payload.packaging?.id] || { name: 'Signature Cork Box', price: 350 };
    const packagingCost = pkgChoice.price;
    const serverTotal = serverSubtotal + packagingCost;

    const validatedConfig: HamperConfigPayload = {
      hamperId: payload.hamperId || `hamper_${Date.now()}`,
      occasion: payload.occasion || 'Special Occasion',
      items: validatedItems,
      packaging: {
        id: payload.packaging?.id || 'box_signature_cork',
        name: pkgChoice.name,
        price: packagingCost
      },
      recipientName: (payload.recipientName || '').trim(),
      senderName: (payload.senderName || '').trim(),
      message: (payload.message || '').trim().slice(0, 250),
      selectedBudgetId: payload.selectedBudgetId || 'all',
      subtotal: serverSubtotal,
      packagingCost,
      total: serverTotal
    };

    return new Response(JSON.stringify({
      success: true,
      verifiedTotal: serverTotal,
      validatedConfig
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (err: any) {
    console.error('Hamper validation error:', err);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to validate hamper. Please try again.'
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
