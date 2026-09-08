import type { APIRoute } from 'astro';
import { db, logAuditAction } from '../../../lib/db.js';
import { getSessionUser, createSessionToken, getSessionCookieHeader } from '../../../lib/auth.js';
import bcrypt from 'bcryptjs';

export const POST: APIRoute = async ({ request }) => {
  try {
    const user = getSessionUser(request);
    if (!user) {
      return new Response(JSON.stringify({ success: false, message: 'Unauthorized: Session missing or expired.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return new Response(JSON.stringify({ success: false, message: 'Invalid request payload.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { currentPassword, newPassword, confirmPassword } = body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return new Response(JSON.stringify({ success: false, message: 'All password fields are required.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (newPassword !== confirmPassword) {
      return new Response(JSON.stringify({ success: false, message: 'New password and confirmation do not match.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (currentPassword === newPassword) {
      return new Response(JSON.stringify({ success: false, message: 'New password must be different from current password.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Password Complexity Verification: Min 8 chars, 1 uppercase, 1 lowercase, 1 number
    const minLength = newPassword.length >= 8;
    const hasUpper = /[A-Z]/.test(newPassword);
    const hasLower = /[a-z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);

    if (!minLength || !hasUpper || !hasLower || !hasNumber) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number.'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const userRecord = db.prepare('SELECT * FROM admin_users WHERE id = ? AND is_active = 1').get(user.id) as any;
    if (!userRecord || !bcrypt.compareSync(currentPassword, userRecord.password_hash)) {
      return new Response(JSON.stringify({ success: false, message: 'Current password is incorrect.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const now = new Date().toISOString();
    const newHash = bcrypt.hashSync(newPassword, 10);

    // Update user password in database
    db.prepare('UPDATE admin_users SET password_hash = ?, updated_at = ? WHERE id = ?').run(newHash, now, user.id);

    // Invalidate prior sessions & rotate current session
    db.prepare('DELETE FROM admin_sessions WHERE user_id = ?').run(user.id);

    const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1';
    const userAgent = request.headers.get('user-agent') || '';
    const { token, expiresAt } = createSessionToken(user.id, clientIp, userAgent);
    const cookieHeader = getSessionCookieHeader(token, expiresAt);

    logAuditAction({
      actorId: user.id,
      action: 'PASSWORD_CHANGE',
      entity: 'admin_users',
      entityId: user.id,
      after: { email: user.email, updated: true },
      ip: clientIp,
      userAgent
    });

    return new Response(JSON.stringify({
      success: true,
      message: 'Password changed successfully.'
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': cookieHeader
      }
    });

  } catch (err: any) {
    console.error('Change Password Error:', err);
    return new Response(JSON.stringify({ success: false, message: 'Server error while updating password.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
