import type { APIRoute } from 'astro';
import { prisma, logAuditAction } from '../../../../lib/db.js';
import { getSessionUser } from '../../../../lib/auth.js';
import { evaluatePurchasability } from '../../../../lib/purchasability.js';

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

export const POST: APIRoute = async ({ request }) => {
  const user = await getSessionUser(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized admin access.' }), { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      slug, name, collection_id, subcategory_id, description, description_source,
      material, shipping_class, launch_phase, sellable_online, returnable,
      country_of_origin, manufacturer_or_packer, consumer_care_contact,
      lead_time_days, care_instructions, image_url
    } = body;

    if (!slug || !name || !collection_id || !subcategory_id) {
      return new Response(JSON.stringify({ error: 'Slug, Name, Collection, and Subcategory are required.' }), { status: 400 });
    }

    const now = new Date();

    const newProd = await prisma.products.create({
      data: {
        slug: slug.trim(),
        name: name.trim(),
        collection_id: Number(collection_id),
        subcategory_id: Number(subcategory_id),
        description: description || '',
        description_source: description_source || 'placeholder',
        material: material || '',
        shipping_class: shipping_class || 'standard',
        launch_phase: launch_phase !== undefined ? Number(launch_phase) : 1,
        sellable_online: Boolean(sellable_online),
        returnable: Boolean(returnable),
        country_of_origin: country_of_origin || 'India',
        manufacturer_or_packer: manufacturer_or_packer || null,
        consumer_care_contact: consumer_care_contact || null,
        lead_time_days: lead_time_days ? Number(lead_time_days) : null,
        care_instructions: care_instructions || null,
        is_purchasable: false,
        created_at: now,
        updated_at: now,
        ...(image_url ? {
          product_images: {
            create: {
              url: image_url,
              alt: name,
              position: 1,
              is_primary: 1,
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

    return new Response(JSON.stringify({ success: true, product: newProd }), { status: 201 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Failed to create product.' }), { status: 500 });
  }
};
