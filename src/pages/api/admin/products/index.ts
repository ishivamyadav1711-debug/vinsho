import type { APIRoute } from 'astro';
import { db, logAuditAction } from '../../../../lib/db.js';
import { getSessionUser } from '../../../../lib/auth.js';
import { evaluatePurchasability } from '../../../../lib/purchasability.js';

export const GET: APIRoute = async ({ request, url }) => {
  const user = getSessionUser(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized admin access.' }), { status: 401 });
  }

  const search = url.searchParams.get('q')?.trim() || '';
  const collectionId = url.searchParams.get('collection_id');
  const launchPhase = url.searchParams.get('launch_phase');
  const shippingClass = url.searchParams.get('shipping_class');
  const showArchived = url.searchParams.get('archived') === '1';

  let query = `
    SELECT 
      p.*,
      c.name as collection_name,
      c.key as collection_key,
      s.name as subcategory_name,
      s.key as subcategory_key,
      (SELECT url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as image_url,
      (SELECT COUNT(*) FROM product_variants WHERE product_id = p.id) as variant_count
    FROM products p
    JOIN collections c ON p.collection_id = c.id
    JOIN subcategories s ON p.subcategory_id = s.id
    WHERE 1=1
  `;

  const params: any[] = [];

  if (!showArchived) {
    query += ` AND p.deleted_at IS NULL`;
  }

  if (search) {
    query += ` AND (p.name LIKE ? OR p.slug LIKE ? OR p.material LIKE ?)`;
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  if (collectionId) {
    query += ` AND p.collection_id = ?`;
    params.push(parseInt(collectionId, 10));
  }

  if (launchPhase !== null && launchPhase !== undefined && launchPhase !== '') {
    query += ` AND p.launch_phase = ?`;
    params.push(parseInt(launchPhase, 10));
  }

  if (shippingClass) {
    query += ` AND p.shipping_class = ?`;
    params.push(shippingClass);
  }

  query += ` ORDER BY p.name ASC`;

  const products = db.prepare(query).all(...params) as any[];

  // Compute purchasability per product
  const productsWithEval = products.map((p) => {
    const variants = db.prepare('SELECT * FROM product_variants WHERE product_id = ?').all(p.id) as any[];
    const evalRes = evaluatePurchasability(p, variants);
    return {
      ...p,
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
  const user = getSessionUser(request);
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

    const now = new Date().toISOString();

    const result = db.prepare(`
      INSERT INTO products (
        slug, name, collection_id, subcategory_id, description, description_source,
        material, shipping_class, launch_phase, sellable_online, returnable,
        country_of_origin, manufacturer_or_packer, consumer_care_contact,
        lead_time_days, care_instructions, is_purchasable, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
    `).run(
      slug.trim(),
      name.trim(),
      collection_id,
      subcategory_id,
      description || '',
      description_source || 'placeholder',
      material || '',
      shipping_class || 'standard',
      launch_phase !== undefined ? launch_phase : 1,
      sellable_online ? 1 : 0,
      returnable ? 1 : 0,
      country_of_origin || 'India',
      manufacturer_or_packer || null,
      consumer_care_contact || null,
      lead_time_days || null,
      care_instructions || null,
      now,
      now
    );

    const newProdId = result.lastInsertRowid as number;

    if (image_url) {
      db.prepare(`
        INSERT INTO product_images (product_id, url, alt, position, is_primary, created_at, updated_at)
        VALUES (?, ?, ?, 1, 1, ?, ?)
      `).run(newProdId, image_url, name, now, now);
    }

    const newProd = db.prepare('SELECT * FROM products WHERE id = ?').get(newProdId);

    logAuditAction({
      actorId: user.id,
      action: 'CREATE',
      entity: 'products',
      entityId: newProdId,
      after: newProd,
      ip: request.headers.get('x-forwarded-for') || '127.0.0.1',
      userAgent: request.headers.get('user-agent') || ''
    });

    return new Response(JSON.stringify({ success: true, product: newProd }), { status: 201 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Failed to create product.' }), { status: 500 });
  }
};
