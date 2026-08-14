import type { APIRoute } from 'astro';
import { destroySession, getLogoutCookieHeader, getSessionUser, logAuditAction } from '../../../lib/auth';

export const POST: APIRoute = async ({ request }) => {
  const user = getSessionUser(request);
  if (user) {
    logAuditAction(user.id, user.name, 'LOGOUT', 'users', 'User logged out');
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
