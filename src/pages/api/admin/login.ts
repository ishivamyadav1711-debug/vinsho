import type { APIRoute } from 'astro';
import { db, logAuditAction } from '../../../lib/db.js';
import { createSessionToken, getSessionCookieHeader, checkRateLimit, recordFailedLogin, clearRateLimit, ensureDefaultAdminUser } from '../../../lib/auth.js';
import bcrypt from 'bcryptjs';

export const POST: APIRoute = async ({ request }) => {
  try {
    ensureDefaultAdminUser();

    const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1';
    const rateCheck = checkRateLimit(clientIp);

    if (!rateCheck.allowed) {
      return new Response(JSON.stringify({ 
        error: `Too many failed login attempts. Account temporarily locked. Please try again in ${rateCheck.remainingMinutes} minutes.` 
      }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { email, password } = await request.json();

    if (!email || !password) {
      return new Response(JSON.stringify({ error: 'Email and Password are required.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const user = db.prepare('SELECT * FROM admin_users WHERE email = ? AND is_active = 1').get(email.trim().toLowerCase()) as any;

    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      recordFailedLogin(clientIp);
      return new Response(JSON.stringify({ error: 'Invalid admin credentials.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    clearRateLimit(clientIp);

    const userAgent = request.headers.get('user-agent') || '';
    const { token, expiresAt } = createSessionToken(user.id, clientIp, userAgent);
    const cookieHeader = getSessionCookieHeader(token, expiresAt);

    logAuditAction({
      actorId: user.id,
      action: 'LOGIN',
      entity: 'admin_users',
      entityId: user.id,
      after: { email: user.email, name: user.name },
      ip: clientIp,
      userAgent
    });

    return new Response(JSON.stringify({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': cookieHeader
      }
    });
  } catch (err: any) {
    console.error('Login Error:', err);
    return new Response(JSON.stringify({ error: 'Server authentication error.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
