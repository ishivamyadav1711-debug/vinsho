import type { APIRoute } from 'astro';
import { prisma } from '../../../lib/db.js';
import { getSessionUser } from '../../../lib/auth.js';

export const GET: APIRoute = async ({ request }) => {
  const user = await getSessionUser(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized admin access.' }), { status: 401 });
  }

  const tags = await prisma.tags.findMany({
    orderBy: { name: 'asc' }
  });
  return new Response(JSON.stringify({ success: true, count: tags.length, tags }), { status: 200 });
};

export const POST: APIRoute = async ({ request }) => {
  const user = await getSessionUser(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized admin access.' }), { status: 401 });
  }

  try {
    const { name, colour } = await request.json();
    if (!name || !name.trim()) {
      return new Response(JSON.stringify({ error: 'Tag name is required.' }), { status: 400 });
    }

    const cleanName = name.trim();
    const tagColour = colour || '#8A174B';
    const now = new Date();

    const tag = await prisma.tags.upsert({
      where: { name: cleanName },
      update: { colour: tagColour },
      create: {
        name: cleanName,
        colour: tagColour,
        created_at: now
      }
    });

    return new Response(JSON.stringify({ success: true, tag }), { status: 201 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Failed to create tag.' }), { status: 500 });
  }
};
