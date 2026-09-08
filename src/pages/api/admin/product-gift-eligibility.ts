import type { APIRoute } from 'astro';
import { db } from '../../../lib/db';

export const GET: APIRoute = async () => {
  try {
    const products = db.prepare(`
      SELECT p.id, p.slug, p.name, p.gift_eligible, c.name as collection_name
      FROM products p
      LEFT JOIN collections c ON p.collection_id = c.id
      ORDER BY p.name ASC
    `).all();

    return new Response(JSON.stringify({
      success: true,
      products: products.map((p: any) => ({
        id: p.id,
        slug: p.slug,
        name: p.name,
        collection: p.collection_name,
        giftEligible: Boolean(p.gift_eligible)
      }))
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500 });
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { slug, giftEligible } = body;

    if (!slug) {
      return new Response(JSON.stringify({ success: false, error: 'Product slug is required' }), { status: 400 });
    }

    const isEligible = giftEligible ? 1 : 0;
    const stmt = db.prepare('UPDATE products SET gift_eligible = ?, updated_at = datetime("now") WHERE slug = ?');
    const result = stmt.run(isEligible, slug);

    if (result.changes === 0) {
      return new Response(JSON.stringify({ success: false, error: 'Product not found' }), { status: 404 });
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Product '${slug}' gift eligibility updated to ${Boolean(isEligible)}`
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500 });
  }
};
