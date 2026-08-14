import type { APIRoute } from 'astro';
import { getAllSubscribers } from '../../../lib/db';
import { getSessionUser } from '../../../lib/auth';

export const GET: APIRoute = async ({ request }) => {
  const user = getSessionUser(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  try {
    const subscribers = getAllSubscribers();
    return new Response(JSON.stringify({ subscribers }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: 'Failed to fetch subscribers' }), { status: 500 });
  }
};
