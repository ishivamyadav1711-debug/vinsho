import type { APIRoute } from 'astro';
import { prisma } from '../../../lib/db';

export const GET: APIRoute = async () => {
  try {
    const products = await prisma.products.findMany({
      where: { deleted_at: null },
      select: {
        id: true,
        slug: true,
        name: true,
        gift_eligible: true,
        collections: {
          select: { name: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    return new Response(JSON.stringify({
      success: true,
      products: products.map((p: any) => ({
        id: p.id,
        slug: p.slug,
        name: p.name,
        collection: p.collections?.name || null,
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
    const now = new Date();

    const product = await prisma.products.findFirst({
      where: { slug }
    });

    if (!product) {
      return new Response(JSON.stringify({ success: false, error: 'Product not found' }), { status: 404 });
    }

    await prisma.products.update({
      where: { id: product.id },
      data: {
        gift_eligible: isEligible,
        updated_at: now
      }
    });

    return new Response(JSON.stringify({
      success: true,
      message: `Product '${slug}' gift eligibility updated to ${Boolean(isEligible)}`
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500 });
  }
};
