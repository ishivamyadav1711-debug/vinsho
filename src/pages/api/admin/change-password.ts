import type { APIRoute } from 'astro';
import { prisma, logAuditAction } from '../../../lib/db.js';
import { getSessionUser, createSessionToken, getSessionCookieHeader } from '../../../lib/auth.js';
import bcrypt from 'bcryptjs';

export const POST: APIRoute = async ({ request }) => {
  try {
    const user = await getSessionUser(request);
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

    const userRecord = await prisma.adminUsers.findFirst({
      where: {
        id: user.id,
        is_active: true
      }
    });

    if (!userRecord || !bcrypt.compareSync(currentPassword, userRecord.password_hash)) {
      return new Response(JSON.stringify({ success: false, message: 'Current password is incorrect.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const now = new Date();
    const newHash = bcrypt.hashSync(newPassword, 10);

    // Update user password in database
    await prisma.adminUsers.update({
      where: { id: user.id },
      data: {
        password_hash: newHash,
        updated_at: now
      }
    });

    // Invalidate prior sessions & rotate current session
    await prisma.adminSessions.deleteMany({
      where: { user_id: user.id }
    });

    const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1';
    const userAgent = request.headers.get('user-agent') || '';
    const { token, expiresAt } = await createSessionToken(user.id, clientIp, userAgent);
    const cookieHeader = getSessionCookieHeader(token, expiresAt);

    await logAuditAction({
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
