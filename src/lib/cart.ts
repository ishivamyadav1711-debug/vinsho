import { prisma } from './db.js';

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

export async function getOrCreateCart(sessionToken: string): Promise<number> {
  const cart = await prisma.carts.findFirst({
    where: { session_token: sessionToken, status: 'ACTIVE' }
  });
  if (cart) return cart.id;

  const now = new Date();
  const expiresAt = BigInt(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const newCart = await prisma.carts.create({
    data: {
      session_token: sessionToken,
      status: 'ACTIVE',
      expires_at: expiresAt,
      created_at: now,
      updated_at: now
    }
  });

  return newCart.id;
}

export async function addItemToCart(params: {
  sessionToken: string;
  variantId?: number;
  slug?: string;
  productId?: number;
  qty: number;
}): Promise<{ success: boolean; error?: string }> {
  const cartId = await getOrCreateCart(params.sessionToken);

  let targetVariantId = params.variantId;
  if (!targetVariantId && (params.slug || params.productId)) {
    const v = await prisma.productVariants.findFirst({
      where: {
        product: {
          OR: [
            params.slug ? { slug: params.slug } : {},
            params.productId ? { id: params.productId } : {}
          ],
          deleted_at: null
        }
      },
      orderBy: [{ position: 'asc' }, { id: 'asc' }]
    });
    if (v) targetVariantId = v.id;
  }

  if (!targetVariantId) {
    return { success: false, error: 'Product variant not found in database.' };
  }

  const variant = await prisma.productVariants.findFirst({
    where: {
      id: targetVariantId,
      product: { deleted_at: null }
    },
    include: {
      product: {
        include: { collection: true }
      }
    }
  });

  if (!variant) {
    return { success: false, error: 'Product variant not found in database.' };
  }

  const colKey = (variant.product.collection?.key || '').toLowerCase();
  const isGifting = colKey.includes('gifting') || colKey.includes('gift') || variant.product.slug.includes('combo') || variant.product.slug.includes('gifting');

  // Protection: Ensure stub dummy products or non-purchasable items cannot be added
  if (!variant.product.is_purchasable || !isGifting || variant.product.collection_id === 999999 || variant.product.id === 999999) {
    return { success: false, error: 'This product is available at store only and cannot be added to online cart.' };
  }

  if (params.qty <= 0 || params.qty > 999 || isNaN(params.qty)) {
    return { success: false, error: 'Invalid quantity. Must be a positive integer between 1 and 999.' };
  }

  const existingItem = await prisma.cartItems.findFirst({
    where: { cart_id: cartId, variant_id: targetVariantId }
  });

  const now = new Date();
  const unitPrice = variant.selling_price ? Number(variant.selling_price) : 0;

  if (existingItem) {
    await prisma.cartItems.update({
      where: { id: existingItem.id },
      data: { qty: { increment: params.qty } }
    });
  } else {
    await prisma.cartItems.create({
      data: {
        cart_id: cartId,
        variant_id: targetVariantId,
        qty: params.qty,
        unit_price_snapshot: unitPrice,
        created_at: now
      }
    });
  }

  return { success: true };
}

export async function getCartItems(sessionToken: string): Promise<CartItemView[]> {
  const cart = await prisma.carts.findFirst({
    where: { session_token: sessionToken, status: 'ACTIVE' }
  });
  if (!cart) return [];

  const items = await prisma.cartItems.findMany({
    where: {
      cart_id: cart.id,
      variant: {
        product: {
          deleted_at: null,
          id: { not: 999999 } // Ensure dummy stubs are excluded
        }
      }
    },
    include: {
      variant: {
        include: {
          product: {
            include: {
              collection: true,
              ProductImages: {
                orderBy: [{ is_primary: 'desc' }, { position: 'asc' }],
                take: 1
              }
            }
          }
        }
      }
    }
  });

  return items
    .filter((ci): ci is typeof ci & { variant: NonNullable<typeof ci.variant> } => Boolean(ci.variant))
    .map((ci) => {
      const v = ci.variant;
      const p = v.product;
      const c = p.collection;

      const colKey = (c?.key || '').toLowerCase();
      const isGiftingCol = colKey.includes('gifting') || colKey.includes('gift') || p.slug.includes('combo') || p.slug.includes('gifting');

      const isPurchasable = p.shipping_class !== 'made-to-order' &&
        p.launch_phase > 0 &&
        Boolean(p.sellable_online) &&
        isGiftingCol &&
        Boolean(p.country_of_origin) &&
        Boolean(p.manufacturer_or_packer) &&
        Boolean(p.consumer_care_contact);

      const primaryImage = p.ProductImages?.[0]?.url || '/placeholder.png';

      return {
        cartItemId: ci.id,
        variantId: v.id,
        productSlug: p.slug,
        productName: p.name,
        shippingClass: p.shipping_class,
        packedWeightKg: v.packed_weight_kg ? Number(v.packed_weight_kg) : undefined,
        packedL: v.packed_l_cm ? Number(v.packed_l_cm) : undefined,
        packedB: v.packed_b_cm ? Number(v.packed_b_cm) : undefined,
        packedH: v.packed_h_cm ? Number(v.packed_h_cm) : undefined,
        qty: ci.qty,
        sellingPrice: v.selling_price ? Number(v.selling_price) : 0,
        mrp: v.mrp ? Number(v.mrp) : undefined,
        stock: v.stock || 100,
        isPurchasable,
        image: primaryImage,
        variantTitle: [v.size, v.colour].filter(Boolean).join(' / ') || 'Standard Variant'
      };
    });
}
