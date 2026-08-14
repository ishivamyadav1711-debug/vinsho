import type { APIRoute } from 'astro';
import { db, logAuditAction } from '../../../../lib/db.js';
import { getSessionUser } from '../../../../lib/auth.js';
import { evaluatePurchasability } from '../../../../lib/purchasability.js';

export const GET: APIRoute = async ({ request, params }) => {
  const user = getSessionUser(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized admin access.' }), { status: 401 });
  }

  const id = parseInt(params.id || '0', 10);
  const product = db.prepare(`
    SELECT p.*, c.name as collection_name, s.name as subcategory_name
    FROM products p
    JOIN collections c ON p.collection_id = c.id
    JOIN subcategories s ON p.subcategory_id = s.id
    WHERE p.id = ?
  `).get(id) as any;

  if (!product) {
    return new Response(JSON.stringify({ error: 'Product not found.' }), { status: 404 });
  }

  const images = db.prepare('SELECT * FROM product_images WHERE product_id = ? ORDER BY position ASC').all(id);
  const variants = db.prepare('SELECT * FROM product_variants WHERE product_id = ? ORDER BY position ASC').all(id) as any[];

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
  const user = getSessionUser(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized admin access.' }), { status: 401 });
  }

  const id = parseInt(params.id || '0', 10);
  const existingProduct = db.prepare('SELECT * FROM products WHERE id = ?').get(id) as any;

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

    const now = new Date().toISOString();

    db.transaction(() => {
      // 1. Update Product attributes
      db.prepare(`
        UPDATE products SET
          name = ?, slug = ?, collection_id = ?, subcategory_id = ?, description = ?,
          description_source = ?, material = ?, shipping_class = ?, launch_phase = ?,
          sellable_online = ?, returnable = ?, country_of_origin = ?,
          manufacturer_or_packer = ?, consumer_care_contact = ?, lead_time_days = ?,
          care_instructions = ?, updated_at = ?
        WHERE id = ?
      `).run(
        name !== undefined ? name.trim() : existingProduct.name,
        slug !== undefined ? slug.trim() : existingProduct.slug,
        collection_id !== undefined ? collection_id : existingProduct.collection_id,
        subcategory_id !== undefined ? subcategory_id : existingProduct.subcategory_id,
        description !== undefined ? description : existingProduct.description,
        description_source !== undefined ? description_source : existingProduct.description_source,
        material !== undefined ? material : existingProduct.material,
        shipping_class !== undefined ? shipping_class : existingProduct.shipping_class,
        launch_phase !== undefined ? launch_phase : existingProduct.launch_phase,
        sellable_online !== undefined ? (sellable_online ? 1 : 0) : existingProduct.sellable_online,
        returnable !== undefined ? (returnable ? 1 : 0) : existingProduct.returnable,
        country_of_origin !== undefined ? country_of_origin : existingProduct.country_of_origin,
        manufacturer_or_packer !== undefined ? manufacturer_or_packer : existingProduct.manufacturer_or_packer,
        consumer_care_contact !== undefined ? consumer_care_contact : existingProduct.consumer_care_contact,
        lead_time_days !== undefined ? lead_time_days : existingProduct.lead_time_days,
        care_instructions !== undefined ? care_instructions : existingProduct.care_instructions,
        now,
        id
      );

      // 2. Handle Variants update if provided
      if (Array.isArray(variants)) {
        db.prepare('DELETE FROM product_variants WHERE product_id = ?').run(id);

        const insertVar = db.prepare(`
          INSERT INTO product_variants (
            product_id, sku, size, colour, mrp, selling_price, currency, hsn_code, gst_rate,
            net_quantity, packed_weight_kg, packed_l_cm, packed_b_cm, packed_h_cm, stock, position, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        variants.forEach((v: any, idx: number) => {
          insertVar.run(
            id,
            v.sku || null,
            v.size || null,
            v.colour || null,
            v.mrp !== undefined && v.mrp !== null && v.mrp !== '' ? parseFloat(v.mrp) : null,
            v.selling_price !== undefined && v.selling_price !== null && v.selling_price !== '' ? parseFloat(v.selling_price) : null,
            v.currency || 'INR',
            v.hsn_code || null,
            v.gst_rate !== undefined && v.gst_rate !== null && v.gst_rate !== '' ? parseFloat(v.gst_rate) : null,
            v.net_quantity || null,
            v.packed_weight_kg !== undefined && v.packed_weight_kg !== null && v.packed_weight_kg !== '' ? parseFloat(v.packed_weight_kg) : null,
            v.packed_l_cm !== undefined && v.packed_l_cm !== null && v.packed_l_cm !== '' ? parseFloat(v.packed_l_cm) : null,
            v.packed_b_cm !== undefined && v.packed_b_cm !== null && v.packed_b_cm !== '' ? parseFloat(v.packed_b_cm) : null,
            v.packed_h_cm !== undefined && v.packed_h_cm !== null && v.packed_h_cm !== '' ? parseFloat(v.packed_h_cm) : null,
            v.stock !== undefined && v.stock !== null && v.stock !== '' ? parseInt(v.stock, 10) : null,
            idx + 1,
            now,
            now
          );
        });
      }

      // 3. Handle Images update if provided
      if (Array.isArray(images)) {
        db.prepare('DELETE FROM product_images WHERE product_id = ?').run(id);

        const insertImg = db.prepare(`
          INSERT INTO product_images (product_id, url, alt, position, is_primary, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        images.forEach((img: any, idx: number) => {
          insertImg.run(
            id,
            img.url,
            img.alt || name || existingProduct.name,
            idx + 1,
            idx === 0 ? 1 : 0,
            now,
            now
          );
        });
      }

      // 4. Re-evaluate Purchasability & Update is_purchasable column
      const updatedProduct = db.prepare('SELECT * FROM products WHERE id = ?').get(id) as any;
      const updatedVariants = db.prepare('SELECT * FROM product_variants WHERE product_id = ?').all(id) as any[];
      const evalRes = evaluatePurchasability(updatedProduct, updatedVariants);

      db.prepare('UPDATE products SET is_purchasable = ? WHERE id = ?').run(evalRes.isPurchasable ? 1 : 0, id);
    })();

    const finalProduct = db.prepare('SELECT * FROM products WHERE id = ?').get(id);

    logAuditAction({
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
  const user = getSessionUser(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized admin access.' }), { status: 401 });
  }

  const id = parseInt(params.id || '0', 10);
  const existingProduct = db.prepare('SELECT * FROM products WHERE id = ?').get(id) as any;

  if (!existingProduct) {
    return new Response(JSON.stringify({ error: 'Product not found.' }), { status: 404 });
  }

  const now = new Date().toISOString();
  // Soft delete per §2 table specifications
  db.prepare('UPDATE products SET deleted_at = ? WHERE id = ?').run(now, id);

  logAuditAction({
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
