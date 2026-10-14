import type { APIRoute } from 'astro';
import { prisma, logAuditAction } from '../../../../lib/db.js';
import { getSessionUser } from '../../../../lib/auth.js';
import { evaluatePurchasability } from '../../../../lib/purchasability.js';
import { invalidateTaxonomyCache } from '../../../../utils/taxonomy.js';

export const GET: APIRoute = async ({ request, url }) => {
  const user = await getSessionUser(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized admin access.' }), { status: 401 });
  }

  const search = url.searchParams.get('q')?.trim() || '';
  const collectionId = url.searchParams.get('collection_id');
  const launchPhase = url.searchParams.get('launch_phase');
  const shippingClass = url.searchParams.get('shipping_class');
  const showArchived = url.searchParams.get('archived') === '1';

  const whereClause: any = {};

  if (!showArchived) {
    whereClause.deleted_at = null;
  }

  if (search) {
    whereClause.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { slug: { contains: search, mode: 'insensitive' } },
      { material: { contains: search, mode: 'insensitive' } }
    ];
  }

  if (collectionId) {
    whereClause.collection_id = parseInt(collectionId, 10);
  }

  if (launchPhase !== null && launchPhase !== undefined && launchPhase !== '') {
    whereClause.launch_phase = parseInt(launchPhase, 10);
  }

  if (shippingClass) {
    whereClause.shipping_class = shippingClass;
  }

  const products = await prisma.products.findMany({
    where: whereClause,
    include: {
      collection: {
        select: { name: true, key: true }
      },
      subcategories: {
        select: { name: true, key: true }
      },
      product_images: {
        where: { is_primary: 1 },
        take: 1,
        select: { url: true }
      },
      product_variants: true
    },
    orderBy: { name: 'asc' }
  });

  // Compute purchasability per product
  const productsWithEval = products.map((p: any) => {
    const evalRes = evaluatePurchasability(p, p.product_variants || []);
    return {
      ...p,
      collection_name: p.collections?.name,
      collection_key: p.collections?.key,
      subcategory_name: p.subcategories?.name,
      subcategory_key: p.subcategories?.key,
      image_url: p.product_images?.[0]?.url || null,
      variant_count: (p.product_variants || []).length,
      purchasability: evalRes
    };
  });

  return new Response(JSON.stringify({
    success: true,
    count: productsWithEval.length,
    products: productsWithEval
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SHIPPING_CLASSES = ['standard', 'fragile', 'bulky', 'made-to-order'];

// Same studio defaults the catalogue seed applies, so new products start with
// the Legal Metrology fields filled in. Editable later on the product page.
const DEFAULT_MANUFACTURER = 'VINSHO Studio, Greater Noida, UP';
const DEFAULT_CONSUMER_CARE = 'vinvks@gmail.com | +91 9625515351';

const badRequest = (error: string, status = 400) =>
  new Response(JSON.stringify({ error }), { status, headers: { 'Content-Type': 'application/json' } });

/** Parses an optional non-negative number. Returns undefined when blank, NaN when invalid. */
function optionalNonNegative(value: unknown, integer = false): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'number' && typeof value !== 'string') return Number.NaN;
  const text = String(value).trim();
  const n = Number(text);
  if (text === '' || !Number.isFinite(n) || n < 0 || (integer && !Number.isInteger(n))) return Number.NaN;
  return n;
}

const asText = (value: unknown): string =>
  typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';

interface NewProductInput {
  name: string;
  slug: string;
  collectionId: number;
  subcategoryId: number;
  shippingClass: string;
  imageUrl: string;
  variant: { sku: string | null; mrp: number | null; selling_price: number | null; stock: number | null };
}

/** Validates the shape of the request body. Database checks (slug/SKU clashes, subcategory ownership) happen in POST. */
function parseNewProductInput(body: any): { error: string } | { input: NewProductInput } {
  const name = asText(body.name);
  const slug = asText(body.slug).toLowerCase();
  const collectionId = Number.parseInt(asText(body.collection_id), 10);
  const subcategoryId = Number.parseInt(asText(body.subcategory_id), 10);

  if (!name || !slug || !collectionId || !subcategoryId) {
    return { error: 'Name, URL slug, Collection, and Subcategory are required.' };
  }
  if (!SLUG_PATTERN.test(slug)) {
    return { error: 'URL slug may only contain lowercase letters, numbers, and single hyphens (e.g. lavender-soy-candle).' };
  }

  const shippingClass = asText(body.shipping_class) || 'standard';
  if (!SHIPPING_CLASSES.includes(shippingClass)) {
    return { error: `Shipping class must be one of: ${SHIPPING_CLASSES.join(', ')}.` };
  }

  const imageUrl = asText(body.image_url);
  if (imageUrl && !imageUrl.startsWith('/') && !/^https?:\/\//i.test(imageUrl)) {
    return { error: 'Image URL must start with "/" (a file under public/) or "https://".' };
  }

  // First variant: price and stock are optional (store-only items may be "price on request"),
  // but whatever is supplied must be a valid non-negative number.
  const v = body.variant && typeof body.variant === 'object' ? body.variant : {};
  const mrp = optionalNonNegative(v.mrp);
  const sellingPrice = optionalNonNegative(v.selling_price);
  const stock = optionalNonNegative(v.stock, true);
  if ([mrp, sellingPrice, stock].some((n) => Number.isNaN(n))) {
    return { error: 'MRP, selling price, and stock must be zero or more (stock must be a whole number).' };
  }
  if (mrp !== undefined && sellingPrice !== undefined && sellingPrice > mrp) {
    return { error: 'Selling price cannot be higher than MRP.' };
  }

  return {
    input: {
      name,
      slug,
      collectionId,
      subcategoryId,
      shippingClass,
      imageUrl,
      variant: {
        sku: asText(v.sku) || null,
        mrp: mrp ?? null,
        selling_price: sellingPrice ?? null,
        stock: stock ?? null
      }
    }
  };
}

export const POST: APIRoute = async ({ request }) => {
  const user = await getSessionUser(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized admin access.' }), { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      description, description_source, material, launch_phase, sellable_online, returnable,
      country_of_origin, manufacturer_or_packer, consumer_care_contact,
      lead_time_days, care_instructions
    } = body;

    const parsed = parseNewProductInput(body);
    if ('error' in parsed) {
      return badRequest(parsed.error);
    }
    const { name: cleanName, slug: cleanSlug, collectionId, subcategoryId, shippingClass, imageUrl, variant: variantFields } = parsed.input;
    const sku = variantFields.sku;

    const subcategory = await prisma.subcategories.findFirst({
      where: { id: subcategoryId, collection_id: collectionId, deleted_at: null },
      include: { collection: true }
    });
    if (!subcategory || subcategory.collection.deleted_at) {
      return badRequest('The selected subcategory does not belong to the selected collection.');
    }

    const existingSlug = await prisma.products.findUnique({ where: { slug: cleanSlug }, select: { id: true } });
    if (existingSlug) {
      return badRequest(`The URL slug "${cleanSlug}" is already used by another product (it may be hidden). Choose a different slug.`, 409);
    }
    if (sku) {
      const existingSku = await prisma.productVariants.findFirst({ where: { sku }, select: { id: true } });
      if (existingSku) {
        return badRequest(`SKU "${sku}" is already used by another product.`, 409);
      }
    }

    const productFields = {
      country_of_origin: country_of_origin || 'India',
      manufacturer_or_packer: manufacturer_or_packer || DEFAULT_MANUFACTURER,
      consumer_care_contact: consumer_care_contact || DEFAULT_CONSUMER_CARE
    };
    const purchasability = evaluatePurchasability(
      { ...productFields, collectionKey: subcategory.collection.key, subcategoryKey: subcategory.key },
      [variantFields]
    );

    const now = new Date();

    // Product, primary image, and first variant are written in one nested create,
    // so a product never exists half-made.
    const newProd = await prisma.products.create({
      data: {
        slug: cleanSlug,
        name: cleanName,
        collection_id: collectionId,
        subcategory_id: subcategoryId,
        description: description || '',
        description_source: description_source || (description ? 'written' : 'placeholder'),
        material: material || '',
        shipping_class: shippingClass,
        launch_phase: launch_phase !== undefined ? Number(launch_phase) : 1,
        sellable_online: sellable_online !== undefined ? Boolean(sellable_online) : true,
        returnable: returnable !== undefined ? Boolean(returnable) : true,
        ...productFields,
        lead_time_days: lead_time_days ? Number(lead_time_days) : null,
        care_instructions: care_instructions || null,
        is_purchasable: purchasability.isPurchasable,
        created_at: now,
        updated_at: now,
        ProductVariants: {
          create: {
            ...variantFields,
            currency: 'INR',
            position: 1,
            created_at: now,
            updated_at: now
          }
        },
        ...(imageUrl ? {
          ProductImages: {
            create: {
              url: imageUrl,
              alt: cleanName,
              position: 1,
              is_primary: true,
              created_at: now,
              updated_at: now
            }
          }
        } : {})
      }
    });

    await logAuditAction({
      actorId: user.id,
      action: 'CREATE',
      entity: 'products',
      entityId: newProd.id,
      after: newProd,
      ip: request.headers.get('x-forwarded-for') || '127.0.0.1',
      userAgent: request.headers.get('user-agent') || ''
    });

    invalidateTaxonomyCache();
    return new Response(JSON.stringify({ success: true, product: newProd }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    // Two admins saving the same slug at once: the unique index catches what the pre-check missed.
    if (err?.code === 'P2002') {
      return badRequest('A product with this URL slug already exists. Choose a different slug.', 409);
    }
    console.error('[Create Product] Failed:', err);
    return new Response(JSON.stringify({ error: 'Failed to create product. Please try again.' }), { status: 500 });
  }
};
