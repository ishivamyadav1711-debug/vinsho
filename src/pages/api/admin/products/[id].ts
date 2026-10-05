import type { APIRoute } from 'astro';
import { prisma, logAuditAction } from '../../../../lib/db.js';
import { getSessionUser } from '../../../../lib/auth.js';
import { evaluatePurchasability } from '../../../../lib/purchasability.js';

export const GET: APIRoute = async ({ request, params }) => {
  const user = await getSessionUser(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized admin access.' }), { status: 401 });
  }

  const id = parseInt(params.id || '0', 10);
  const foundProduct = await prisma.products.findUnique({
    where: { id },
    include: {
      collection: { select: { name: true } },
      subcategory: { select: { name: true } }
    }
  });

  if (!foundProduct) {
    return new Response(JSON.stringify({ error: 'Product not found.' }), { status: 404 });
  }

  const product = {
    ...foundProduct,
    collection_name: foundProduct.collection?.name,
    subcategory_name: foundProduct.subcategory?.name
  };

  const images = await prisma.productImages.findMany({
    where: { product_id: id },
    orderBy: { position: 'asc' }
  });

  const variants = await prisma.productVariants.findMany({
    where: { product_id: id },
    orderBy: { position: 'asc' }
  });

  const evalRes = evaluatePurchasability(product, variants);

  return new Response(JSON.stringify({
    success: true,
    product,
    images,
    variants,
    purchasability: evalRes
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};

export const PUT: APIRoute = async ({ request, params }) => {
  const user = await getSessionUser(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized admin access.' }), { status: 401 });
  }

  const id = parseInt(params.id || '0', 10);
  const existingProduct = await prisma.products.findUnique({
    where: { id }
  });

  if (!existingProduct) {
    return new Response(JSON.stringify({ error: 'Product not found.' }), { status: 404 });
  }

  try {
    const body = await request.json();
    const {
      name, slug, collection_id, subcategory_id, description, description_source,
      material, shipping_class, launch_phase, sellable_online, returnable,
      country_of_origin, manufacturer_or_packer, consumer_care_contact,
      lead_time_days, care_instructions, variants, images
    } = body;

    const now = new Date();

    await prisma.$transaction(async (tx) => {
      // 1. Update Product attributes
      await tx.products.update({
        where: { id },
        data: {
          name: name !== undefined ? name.trim() : existingProduct.name,
          slug: slug !== undefined ? slug.trim() : existingProduct.slug,
          collection_id: collection_id !== undefined ? collection_id : existingProduct.collection_id,
          subcategory_id: subcategory_id !== undefined ? subcategory_id : existingProduct.subcategory_id,
          description: description !== undefined ? description : existingProduct.description,
          description_source: description_source !== undefined ? description_source : existingProduct.description_source,
          material: material !== undefined ? material : existingProduct.material,
          shipping_class: shipping_class !== undefined ? shipping_class : existingProduct.shipping_class,
          launch_phase: launch_phase !== undefined ? launch_phase : existingProduct.launch_phase,
          sellable_online: sellable_online !== undefined ? Boolean(sellable_online) : existingProduct.sellable_online,
          returnable: returnable !== undefined ? Boolean(returnable) : existingProduct.returnable,
          country_of_origin: country_of_origin !== undefined ? country_of_origin : existingProduct.country_of_origin,
          manufacturer_or_packer: manufacturer_or_packer !== undefined ? manufacturer_or_packer : existingProduct.manufacturer_or_packer,
          consumer_care_contact: consumer_care_contact !== undefined ? consumer_care_contact : existingProduct.consumer_care_contact,
          lead_time_days: lead_time_days !== undefined ? lead_time_days : existingProduct.lead_time_days,
          care_instructions: care_instructions !== undefined ? care_instructions : existingProduct.care_instructions,
          updated_at: now
        }
      });

      // 2. Handle Variants update if provided
      if (Array.isArray(variants)) {
        await tx.productVariants.deleteMany({ where: { product_id: id } });

        for (let idx = 0; idx < variants.length; idx++) {
          const v = variants[idx];
          await tx.productVariants.create({
            data: {
              product_id: id,
              sku: v.sku || null,
              size: v.size || null,
              colour: v.colour || null,
              mrp: v.mrp !== undefined && v.mrp !== null && v.mrp !== '' ? parseFloat(v.mrp) : null,
              selling_price: v.selling_price !== undefined && v.selling_price !== null && v.selling_price !== '' ? parseFloat(v.selling_price) : null,
              currency: v.currency || 'INR',
              hsn_code: v.hsn_code || null,
              gst_rate: v.gst_rate !== undefined && v.gst_rate !== null && v.gst_rate !== '' ? parseFloat(v.gst_rate) : null,
              net_quantity: v.net_quantity || null,
              packed_weight_kg: v.packed_weight_kg !== undefined && v.packed_weight_kg !== null && v.packed_weight_kg !== '' ? parseFloat(v.packed_weight_kg) : null,
              packed_l_cm: v.packed_l_cm !== undefined && v.packed_l_cm !== null && v.packed_l_cm !== '' ? parseFloat(v.packed_l_cm) : null,
              packed_b_cm: v.packed_b_cm !== undefined && v.packed_b_cm !== null && v.packed_b_cm !== '' ? parseFloat(v.packed_b_cm) : null,
              packed_h_cm: v.packed_h_cm !== undefined && v.packed_h_cm !== null && v.packed_h_cm !== '' ? parseFloat(v.packed_h_cm) : null,
              stock: v.stock !== undefined && v.stock !== null && v.stock !== '' ? parseInt(v.stock, 10) : null,
              position: idx + 1,
              created_at: now,
              updated_at: now
            }
          });
        }
      }

      // 3. Handle Images update if provided
      if (Array.isArray(images)) {
        await tx.productImages.deleteMany({ where: { product_id: id } });

        for (let idx = 0; idx < images.length; idx++) {
          const img = images[idx];
          await tx.productImages.create({
            data: {
              product_id: id,
              url: img.url,
              alt: img.alt || name || existingProduct.name,
              position: idx + 1,
              is_primary: idx === 0,
              created_at: now,
              updated_at: now
            }
          });
        }
      }

      // 4. Re-evaluate Purchasability & Update is_purchasable column
      const updatedProduct = await tx.products.findUnique({ where: { id } });
      const updatedVariants = await tx.productVariants.findMany({ where: { product_id: id } });
      const evalRes = evaluatePurchasability(updatedProduct, updatedVariants);

      await tx.products.update({
        where: { id },
        data: { is_purchasable: Boolean(evalRes.isPurchasable) }
      });
    });

    const finalProduct = await prisma.products.findUnique({ where: { id } });

    await logAuditAction({
      actorId: user.id,
      action: 'UPDATE',
      entity: 'products',
      entityId: id,
      before: existingProduct,
      after: finalProduct,
      ip: request.headers.get('x-forwarded-for') || '127.0.0.1',
      userAgent: request.headers.get('user-agent') || ''
    });

    return new Response(JSON.stringify({ success: true, product: finalProduct }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Failed to update product.' }), { status: 500 });
  }
};

export const DELETE: APIRoute = async ({ request, params }) => {
  const user = await getSessionUser(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized admin access.' }), { status: 401 });
  }

  const id = parseInt(params.id || '0', 10);
  const existingProduct = await prisma.products.findUnique({ where: { id } });

  if (!existingProduct) {
    return new Response(JSON.stringify({ error: 'Product not found.' }), { status: 404 });
  }

  const now = new Date();
  // Soft delete per §2 table specifications
  await prisma.products.update({
    where: { id },
    data: { deleted_at: now }
  });

  await logAuditAction({
    actorId: user.id,
    action: 'ARCHIVE',
    entity: 'products',
    entityId: id,
    before: existingProduct,
    after: { ...existingProduct, deleted_at: now },
    ip: request.headers.get('x-forwarded-for') || '127.0.0.1',
    userAgent: request.headers.get('user-agent') || ''
  });

  return new Response(JSON.stringify({ success: true, message: 'Product archived successfully.' }), { status: 200 });
};
