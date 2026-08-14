import type { APIRoute } from 'astro';
import { db } from '../../../lib/db.js';
import { getSessionUser } from '../../../lib/auth.js';

export const GET: APIRoute = async ({ request }) => {
  const user = getSessionUser(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized admin access.' }), { status: 401 });
  }

  const tags = db.prepare('SELECT * FROM tags ORDER BY name ASC').all();
  return new Response(JSON.stringify({ success: true, count: tags.length, tags }), { status: 200 });
};

export const POST: APIRoute = async ({ request }) => {
  const user = getSessionUser(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized admin access.' }), { status: 401 });
  }

  try {
    const { name, colour } = await request.json();
    if (!name || !name.trim()) {
      return new Response(JSON.stringify({ error: 'Tag name is required.' }), { status: 400 });
    }

    const now = new Date().toISOString();
    const res = db.prepare(`
      INSERT INTO tags (name, colour, created_at)
      VALUES (?, ?, ?)
      ON CONFLICT(name) DO UPDATE SET colour = excluded.colour
    `).run(name.trim(), colour || '#670832', now);

    const tag = db.prepare('SELECT * FROM tags WHERE name = ?').get(name.trim());
    return new Response(JSON.stringify({ success: true, tag }), { status: 201 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Failed to create tag.' }), { status: 500 });
  }
};
