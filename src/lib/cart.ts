import { db } from './db.js';

export interface AddToCartParams {
  sessionToken: string;
  customerId?: number | null;
  variantId: number;
  qty: number;
}

export interface CartItemView {
  cartItemId: number;
  variantId: number;
  productId: number;
  productSlug: string;
  productName: string;
  shippingClass: 'standard' | 'fragile' | 'bulky' | 'made-to-order';
  size?: string;
  colour?: string;
  sku: string;
  mrp: number;
  sellingPrice: number;
  stock: number;
  qty: number;
  packedWeightKg: number | null;
  packedL: number | null;
  packedB: number | null;
  packedH: number | null;
  isPurchasable: boolean;
  gateReason?: string;
}

export function getOrCreateCart(sessionToken: string, customerId?: number | null): any {
  const now = new Date().toISOString();
  const expiryMs = 30 * 24 * 60 * 60 * 1000; // 30 days
  const expiresAt = new Date(Date.now() + expiryMs).toISOString();

  let cart = db.prepare('SELECT * FROM carts WHERE session_token = ? AND status = "ACTIVE"').get(sessionToken) as any;

  if (!cart) {
    const res = db.prepare(`
      INSERT INTO carts (customer_id, session_token, status, expires_at, created_at, updated_at)
      VALUES (?, ?, 'ACTIVE', ?, ?, ?)
    `).run(customerId || null, sessionToken, expiresAt, now, now);

    cart = db.prepare('SELECT * FROM carts WHERE id = ?').get(res.lastInsertRowid);
  } else if (customerId && !cart.customer_id) {
    db.prepare('UPDATE carts SET customer_id = ?, updated_at = ? WHERE id = ?').run(customerId, now, cart.id);
    cart.customer_id = customerId;
  }

  return cart;
}

export function addItemToCart(params: AddToCartParams): { success: boolean; error?: string } {
  // Check variant existence and live stock
  const variant = db.prepare(`
    SELECT v.*, p.id as product_id, p.slug, p.name, p.shipping_class, p.launch_phase, p.sellable_online, p.is_purchasable, p.country_of_origin, p.manufacturer_or_packer, p.consumer_care_contact
    FROM product_variants v
    JOIN products p ON v.product_id = p.id
    WHERE v.id = ? AND p.deleted_at IS NULL
  `).get(params.variantId) as any;

  if (!variant) {
    return { success: false, error: 'Product variant not found.' };
  }

  // Mandatory Purchasability Gate Check
  if (!variant.is_purchasable) {
    return { success: false, error: 'This product is quote-only and cannot be purchased online. Please use the Get Quote option.' };
  }

  if (variant.shipping_class === 'made-to-order' || variant.launch_phase === 0) {
    return { success: false, error: 'Made-to-Order products cannot enter cart. Please use the Enquiry option for custom measurement and quote.' };
  }

  if (!variant.sellable_online || !variant.country_of_origin || !variant.manufacturer_or_packer || !variant.consumer_care_contact) {
    return { success: false, error: 'Product fails Legal Metrology purchasability gate and cannot be purchased online.' };
  }

  if (variant.stock < params.qty) {
    return { success: false, error: `Requested quantity (${params.qty}) exceeds available stock (${variant.stock}).` };
  }

  const cart = getOrCreateCart(params.sessionToken, params.customerId);
  const now = new Date().toISOString();

  const existingItem = db.prepare('SELECT * FROM cart_items WHERE cart_id = ? AND variant_id = ?').get(cart.id, params.variantId) as any;

  if (existingItem) {
    const newQty = existingItem.qty + params.qty;
    if (variant.stock < newQty) {
      return { success: false, error: `Cannot add more units. Total quantity (${newQty}) exceeds available stock (${variant.stock}).` };
    }
    db.prepare('UPDATE cart_items SET qty = ?, unit_price_snapshot = ? WHERE id = ?').run(newQty, variant.selling_price, existingItem.id);
  } else {
    db.prepare(`
      INSERT INTO cart_items (cart_id, variant_id, qty, unit_price_snapshot, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(cart.id, params.variantId, params.qty, variant.selling_price, now);
  }

  return { success: true };
}

export function getCartItems(sessionToken: string): CartItemView[] {
  const cart = db.prepare('SELECT id FROM carts WHERE session_token = ? AND status = "ACTIVE"').get(sessionToken) as any;
  if (!cart) return [];

  const rows = db.prepare(`
    SELECT 
      ci.id as cart_item_id, ci.qty, ci.unit_price_snapshot,
      v.id as variant_id, v.sku, v.size, v.colour, v.mrp, v.selling_price, v.stock,
      v.packed_weight_kg, v.packed_l_cm, v.packed_b_cm, v.packed_h_cm,
      p.id as product_id, p.slug as product_slug, p.name as product_name, p.shipping_class, p.launch_phase, p.sellable_online,
      p.country_of_origin, p.manufacturer_or_packer, p.consumer_care_contact
    FROM cart_items ci
    JOIN product_variants v ON ci.variant_id = v.id
    JOIN products p ON v.product_id = p.id
    WHERE ci.cart_id = ? AND p.deleted_at IS NULL
  `).all(cart.id) as any[];

  return rows.map((r) => {
    const isPurchasable = r.shipping_class !== 'made-to-order' &&
      r.launch_phase > 0 &&
      Boolean(r.sellable_online) &&
      Boolean(r.country_of_origin) &&
      Boolean(r.manufacturer_or_packer) &&
      Boolean(r.consumer_care_contact);

    return {
      cartItemId: r.cart_item_id,
      variantId: r.variant_id,
      productId: r.product_id,
      productSlug: r.product_slug,
      productName: r.product_name,
      shippingClass: r.shipping_class,
      size: r.size,
      colour: r.colour,
      sku: r.sku,
      mrp: r.mrp,
      sellingPrice: r.selling_price,
      stock: r.stock,
      qty: r.qty,
      packedWeightKg: r.packed_weight_kg,
      packedL: r.packed_l_cm,
      packedB: r.packed_b_cm,
      packedH: r.packed_h_cm,
      isPurchasable,
      gateReason: isPurchasable ? undefined : 'Product fails Legal Metrology or is Made-to-Order'
    };
  });
}

/**
 * Merge guest cart items into customer account cart upon login
 */
export function mergeGuestCart(guestToken: string, customerId: number): void {
  const guestCart = db.prepare('SELECT id FROM carts WHERE session_token = ? AND status = "ACTIVE"').get(guestToken) as any;
  if (!guestCart) return;

  const customerCart = getOrCreateCart(`cust-token-${customerId}`, customerId);
  const guestItems = db.prepare('SELECT * FROM cart_items WHERE cart_id = ?').all(guestCart.id) as any[];

  for (const item of guestItems) {
    addItemToCart({
      sessionToken: customerCart.session_token,
      customerId,
      variantId: item.variant_id,
      qty: item.qty
    });
  }

  db.prepare('UPDATE carts SET status = "MERGED" WHERE id = ?').run(guestCart.id);
}
