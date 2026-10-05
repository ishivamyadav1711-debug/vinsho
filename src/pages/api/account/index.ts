import type { APIRoute } from 'astro';
import { prisma } from '../../../lib/db.js';
import { 
  createCustomerSessionToken, 
  getCustomerSessionCookieHeader, 
  getCustomerLogoutCookieHeader, 
  destroyCustomerSession, 
  hashPassword, 
  verifyPassword, 
  generatePasswordResetToken 
} from '../../../lib/customerAuth.js';
import { checkRateLimit, tooManyRequestsResponse, getClientIp, LIMITS } from '../../../lib/rateLimiter.js';
import { sanitizeApiError } from '../../../lib/apiErrors.js';

export const POST: APIRoute = async ({ request }) => {
  const ip = getClientIp(request);

  try {
    const body = await request.json();
    const { action, name, email, phone, password, confirmPassword, token, newPassword } = body;

    // ── Per-action rate limits ───────────────────────────────────────────────
    if (action === 'signup') {
      const rl = checkRateLimit('SIGNUP', ip, LIMITS.SIGNUP);
      if (!rl.allowed) return tooManyRequestsResponse(rl.retryAfterSec);
    } else if (action === 'login') {
      const rl = checkRateLimit('CUSTOMER_LOGIN', ip, LIMITS.CUSTOMER_LOGIN);
      if (!rl.allowed) return tooManyRequestsResponse(rl.retryAfterSec);
    } else if (action === 'forgot-password' || action === 'reset-password') {
      const rl = checkRateLimit('PASSWORD_RESET', ip, LIMITS.PASSWORD_RESET);
      if (!rl.allowed) return tooManyRequestsResponse(rl.retryAfterSec);
    }
    // logout has no rate limit — it must always succeed to avoid locking users out

    if (action === 'signup') {
      const cleanName = (name || '').trim();
      const cleanEmail = (email || '').trim().toLowerCase();
      const cleanPhone = (phone || '').trim();
      const cleanPassword = (password || '').trim();
      const cleanConfirmPassword = (confirmPassword || '').trim();

      if (!cleanName) {
        return new Response(JSON.stringify({ error: 'Full Name is required.' }), { status: 400 });
      }

      if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        return new Response(JSON.stringify({ error: 'Please enter a valid email address.' }), { status: 400 });
      }

      if (!cleanPhone || cleanPhone.length < 10) {
        return new Response(JSON.stringify({ error: 'Please enter a valid 10-digit phone number.' }), { status: 400 });
      }

      if (!cleanPassword || cleanPassword.length < 6) {
        return new Response(JSON.stringify({ error: 'Password must be at least 6 characters long.' }), { status: 400 });
      }

      if (cleanPassword !== cleanConfirmPassword) {
        return new Response(JSON.stringify({ error: 'Passwords do not match.' }), { status: 400 });
      }

      // Check if email or phone already registered
      const existing = await prisma.customers.findFirst({
        where: {
          OR: [
            ...(cleanEmail ? [{ email: cleanEmail }] : []),
            ...(cleanPhone ? [{ phone: cleanPhone }] : [])
          ]
        }
      });

      const now = new Date();
      const passwordHash = hashPassword(cleanPassword);
      let customerId: number;

      if (existing) {
        if (existing.password_hash) {
          return new Response(JSON.stringify({ error: 'An account with this email or phone already exists. Please log in.' }), { status: 400 });
        }
        // Update existing lead record with password & details
        const updated = await prisma.customers.update({
          where: { id: existing.id },
          data: {
            name: cleanName,
            email: cleanEmail || existing.email,
            phone: cleanPhone || existing.phone,
            password_hash: passwordHash,
            status: 'Active',
            updated_at: now
          }
        });
        customerId = updated.id;
      } else {
        // Create new customer record
        const created = await prisma.customers.create({
          data: {
            name: cleanName,
            email: cleanEmail,
            phone: cleanPhone,
            password_hash: passwordHash,
            status: 'Active',
            source: 'Website Signup',
            created_at: now,
            updated_at: now
          }
        });
        customerId = created.id;
      }

      // Create Session
      const { token: sessionToken, expiresAt } = await createCustomerSessionToken(customerId, ip);
      const cookieHeader = getCustomerSessionCookieHeader(sessionToken, expiresAt);

      return new Response(JSON.stringify({
        success: true,
        message: 'Account created successfully.',
        customer: { id: customerId, name: cleanName, email: cleanEmail, phone: cleanPhone }
      }), {
        status: 201,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': cookieHeader
        }
      });
    }

    // 2. LOGIN ACTION
    if (action === 'login') {
      const cleanEmailOrPhone = (email || phone || '').trim().toLowerCase();
      const cleanPassword = (password || '').trim();

      if (!cleanEmailOrPhone) {
        return new Response(JSON.stringify({ error: 'Email or Phone is required.' }), { status: 400 });
      }

      if (!cleanPassword) {
        return new Response(JSON.stringify({ error: 'Password is required.' }), { status: 400 });
      }

      const customer = await prisma.customers.findFirst({
        where: {
          OR: [
            { email: { equals: cleanEmailOrPhone, mode: 'insensitive' } },
            { phone: cleanEmailOrPhone }
          ],
          deleted_at: null
        }
      });

      if (!customer || !customer.password_hash) {
        return new Response(JSON.stringify({ error: 'Account not found. Please register or check your credentials.' }), { status: 401 });
      }

      const isValid = verifyPassword(cleanPassword, customer.password_hash);
      if (!isValid) {
        return new Response(JSON.stringify({ error: 'Incorrect password. Please try again.' }), { status: 401 });
      }

      // Create Session
      const { token: sessionToken, expiresAt } = await createCustomerSessionToken(customer.id, ip);
      const cookieHeader = getCustomerSessionCookieHeader(sessionToken, expiresAt);

      return new Response(JSON.stringify({
        success: true,
        message: 'Login successful.',
        customer: { id: customer.id, name: customer.name, email: customer.email, phone: customer.phone }
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': cookieHeader
        }
      });
    }

    // 3. LOGOUT ACTION
    if (action === 'logout') {
      await destroyCustomerSession(request);
      const logoutCookie = getCustomerLogoutCookieHeader();
      return new Response(JSON.stringify({ success: true, message: 'Logged out successfully.' }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': logoutCookie
        }
      });
    }

    // 4. FORGOT PASSWORD ACTION
    if (action === 'forgot-password') {
      const cleanEmail = (email || '').trim().toLowerCase();
      if (!cleanEmail) {
        return new Response(JSON.stringify({ error: 'Email address is required.' }), { status: 400 });
      }

      const customer = await prisma.customers.findFirst({
        where: {
          email: { equals: cleanEmail, mode: 'insensitive' },
          deleted_at: null
        },
        select: { id: true, name: true, email: true }
      });

      if (!customer) {
        // Return success message to prevent user enumeration
        return new Response(JSON.stringify({
          success: true,
          message: 'If an account exists for this email, password reset instructions have been generated.'
        }), { status: 200 });
      }

      const { token: resetToken } = await generatePasswordResetToken(customer.id);

      return new Response(JSON.stringify({
        success: true,
        message: 'Password reset link generated.',
        resetToken // For dev demo / link generation
      }), { status: 200 });
    }

    // 5. RESET PASSWORD ACTION
    if (action === 'reset-password') {
      const cleanToken = (token || '').trim();
      const cleanPassword = (newPassword || password || '').trim();

      if (!cleanToken) {
        return new Response(JSON.stringify({ error: 'Reset token is required.' }), { status: 400 });
      }

      if (!cleanPassword || cleanPassword.length < 6) {
        return new Response(JSON.stringify({ error: 'New password must be at least 6 characters long.' }), { status: 400 });
      }

      const now = BigInt(Date.now());
      const customer = await prisma.customers.findFirst({
        where: {
          reset_token: cleanToken,
          reset_expires: { gt: now }
        }
      });

      if (!customer) {
        return new Response(JSON.stringify({ error: 'Password reset link is invalid or has expired.' }), { status: 400 });
      }

      const newHash = hashPassword(cleanPassword);
      await prisma.customers.update({
        where: { id: customer.id },
        data: {
          password_hash: newHash,
          reset_token: null,
          reset_expires: null
        }
      });

      return new Response(JSON.stringify({ success: true, message: 'Password reset successfully. You can now log in with your new password.' }), { status: 200 });
    }

    return new Response(JSON.stringify({ error: 'Invalid action specified.' }), { status: 400 });

  } catch (err: any) {
    const safeError = sanitizeApiError(err, 'Account operation failed. Please try again.');
    return new Response(JSON.stringify({ error: safeError }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
