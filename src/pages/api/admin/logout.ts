import type { APIRoute } from 'astro';
import { destroySession, getLogoutCookieHeader, getSessionUser, logAuditAction } from '../../../lib/auth';

export const POST: APIRoute = async ({ request }) => {
  const user = await getSessionUser(request);
  if (user) {
    logAuditAction({
      actorId: user.id,
      action: 'LOGOUT',
      entity: 'users',
      entityId: user.id,
      after: { name: user.name, note: 'User logged out' }
    });
  }

  destroySession(request);

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': getLogoutCookieHeader()
    }
  });
};
