import { db } from './db.js';

export interface CartItemView {
  cartItemId: number;
  variantId: number;
  productSlug: string;
  productName: string;
  shippingClass: string;
  packedWeightKg?: number;
  packedL?: number;
  packedB?: number;
  packedH?: number;
  qty: number;
  sellingPrice: number;
  mrp?: number;
  stock: number;
  isPurchasable: boolean;
  image?: string;
  variantTitle?: string;
}

export function getOrCreateCart(sessionToken: string): number {
  let cart = db.prepare("SELECT id FROM carts WHERE session_token = ? AND status = 'ACTIVE'").get(sessionToken) as any;
  if (cart) return cart.id;

  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const res = db.prepare(`
    INSERT INTO carts (session_token, status, expires_at, created_at, updated_at)
    VALUES (?, 'ACTIVE', ?, ?, ?)
  `).run(sessionToken, expiresAt, now, now);

  return res.lastInsertRowid as number;
}

export function addItemToCart(params: {
  sessionToken: string;
  variantId?: number;
  slug?: string;
  productId?: number;
  qty: number;
}): { success: boolean; error?: string } {
  const cartId = getOrCreateCart(params.sessionToken);

  let targetVariantId = params.variantId;
  if (!targetVariantId && (params.slug || params.productId)) {
    const v = db.prepare(`
      SELECT v.id FROM product_variants v
      JOIN products p ON v.product_id = p.id
      WHERE (p.slug = ? OR p.id = ?) AND p.deleted_at IS NULL
      ORDER BY v.position ASC, v.id ASC
      LIMIT 1
    `).get(params.slug || '', params.productId || 0) as any;
    if (v) targetVariantId = v.id;
  }

  if (!targetVariantId) {
    return { success: false, error: 'Product variant not found in database.' };
  }

  const variant = db.prepare(`
    SELECT v.*, p.id as product_id, p.slug, p.name, p.shipping_class, p.launch_phase, p.sellable_online, p.is_purchasable, p.country_of_origin, p.manufacturer_or_packer, p.consumer_care_contact, c.key as collection_key
    FROM product_variants v
    JOIN products p ON v.product_id = p.id
    JOIN collections c ON p.collection_id = c.id
    WHERE v.id = ? AND p.deleted_at IS NULL
  `).get(targetVariantId) as any;

  if (!variant) {
    return { success: false, error: 'Product variant not found in database.' };
  }

  const colKey = (variant.collection_key || '').toLowerCase();
  const isGifting = colKey.includes('gifting') || colKey.includes('gift') || variant.slug.includes('combo') || variant.slug.includes('gifting');

  if (!variant.is_purchasable || !isGifting) {
    return { success: false, error: 'This product is available at store only and cannot be added to online cart.' };
  }

  if (params.qty <= 0 || params.qty > 999 || isNaN(params.qty)) {
    return { success: false, error: 'Invalid quantity. Must be a positive integer between 1 and 999.' };
  }

  const existingItem = db.prepare('SELECT id, qty FROM cart_items WHERE cart_id = ? AND variant_id = ?').get(cartId, targetVariantId) as any;
  const now = new Date().toISOString();

  if (existingItem) {
    db.prepare('UPDATE cart_items SET qty = qty + ? WHERE id = ?').run(params.qty, existingItem.id);
  } else {
    db.prepare(`
      INSERT INTO cart_items (cart_id, variant_id, qty, unit_price_snapshot, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(cartId, targetVariantId, params.qty, variant.selling_price, now);
  }

  return { success: true };
}

export function getCartItems(sessionToken: string): CartItemView[] {
  const cart = db.prepare("SELECT id FROM carts WHERE session_token = ? AND status = 'ACTIVE'").get(sessionToken) as any;
  if (!cart) return [];

  const rows = db.prepare(`
    SELECT 
      ci.id as cart_item_id, ci.qty, ci.unit_price_snapshot,
      v.id as variant_id, v.sku, v.size, v.colour, v.mrp, v.selling_price, v.stock,
      v.packed_weight_kg, v.packed_l_cm, v.packed_b_cm, v.packed_h_cm,
      p.id as product_id, p.slug as product_slug, p.name as product_name, p.shipping_class, p.launch_phase, p.sellable_online,
      p.country_of_origin, p.manufacturer_or_packer, p.consumer_care_contact, c.key as collection_key,
      (SELECT url FROM product_images WHERE product_id = p.id ORDER BY is_primary DESC, position ASC LIMIT 1) as image_url
    FROM cart_items ci
    JOIN product_variants v ON ci.variant_id = v.id
    JOIN products p ON v.product_id = p.id
    JOIN collections c ON p.collection_id = c.id
    WHERE ci.cart_id = ? AND p.deleted_at IS NULL
  `).all(cart.id) as any[];

  return rows.map((r) => {
    const colKey = (r.collection_key || '').toLowerCase();
    const isGiftingCol = colKey.includes('gifting') || colKey.includes('gift') || r.product_slug.includes('combo') || r.product_slug.includes('gifting');

    const isPurchasable = r.shipping_class !== 'made-to-order' &&
      r.launch_phase > 0 &&
      Boolean(r.sellable_online) &&
      isGiftingCol &&
      Boolean(r.country_of_origin) &&
      Boolean(r.manufacturer_or_packer) &&
      Boolean(r.consumer_care_contact);

    return {
      cartItemId: r.cart_item_id,
      variantId: r.variant_id,
      productSlug: r.product_slug,
      productName: r.product_name,
      shippingClass: r.shipping_class,
      packedWeightKg: r.packed_weight_kg,
      packedL: r.packed_l_cm,
      packedB: r.packed_b_cm,
      packedH: r.packed_h_cm,
      qty: r.qty,
      sellingPrice: r.selling_price,
      mrp: r.mrp,
      stock: r.stock || 100,
      isPurchasable,
      image: r.image_url || '/placeholder.png',
      variantTitle: [r.size, r.colour].filter(Boolean).join(' / ') || 'Standard Variant'
    };
  });
}
