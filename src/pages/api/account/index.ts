import type { APIRoute } from 'astro';
import { db } from '../../../lib/db.js';
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
      const existing = db.prepare(`
        SELECT id, password_hash, email, phone FROM customers 
        WHERE (email = ? AND email IS NOT NULL AND email != '') 
           OR (phone = ? AND phone IS NOT NULL AND phone != '')
      `).get(cleanEmail, cleanPhone) as any;

      const now = new Date().toISOString();
      const passwordHash = hashPassword(cleanPassword);
      let customerId: number;

      if (existing) {
        if (existing.password_hash) {
          return new Response(JSON.stringify({ error: 'An account with this email or phone already exists. Please log in.' }), { status: 400 });
        }
        // Update existing lead record with password & details
        db.prepare(`
          UPDATE customers 
          SET name = ?, email = ?, phone = ?, password_hash = ?, status = 'Active', updated_at = ? 
          WHERE id = ?
        `).run(cleanName, cleanEmail, cleanPhone, passwordHash, now, existing.id);
        customerId = existing.id;
      } else {
        // Create new customer record
        const res = db.prepare(`
          INSERT INTO customers (name, email, phone, password_hash, status, source, created_at, updated_at)
          VALUES (?, ?, ?, ?, 'Active', 'Website Signup', ?, ?)
        `).run(cleanName, cleanEmail, cleanPhone, passwordHash, now, now);
        customerId = res.lastInsertRowid as number;
      }

      // Create Session
      const { token: sessionToken, expiresAt } = createCustomerSessionToken(customerId);
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

      const customer = db.prepare(`
        SELECT * FROM customers 
        WHERE (LOWER(email) = ? OR phone = ?) AND deleted_at IS NULL
      `).get(cleanEmailOrPhone, cleanEmailOrPhone) as any;

      if (!customer || !customer.password_hash) {
        return new Response(JSON.stringify({ error: 'Account not found. Please register or check your credentials.' }), { status: 401 });
      }

      const isValid = verifyPassword(cleanPassword, customer.password_hash);
      if (!isValid) {
        return new Response(JSON.stringify({ error: 'Incorrect password. Please try again.' }), { status: 401 });
      }

      // Create Session
      const { token: sessionToken, expiresAt } = createCustomerSessionToken(customer.id);
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
      destroyCustomerSession(request);
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

      const customer = db.prepare('SELECT id, name, email FROM customers WHERE LOWER(email) = ? AND deleted_at IS NULL').get(cleanEmail) as any;
      if (!customer) {
        // Return success message to prevent user enumeration
        return new Response(JSON.stringify({
          success: true,
          message: 'If an account exists for this email, password reset instructions have been generated.'
        }), { status: 200 });
      }

      const { token: resetToken } = generatePasswordResetToken(customer.id);

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

      const now = Date.now();
      const customer = db.prepare('SELECT id FROM customers WHERE reset_token = ? AND reset_expires > ?').get(cleanToken, now) as any;

      if (!customer) {
        return new Response(JSON.stringify({ error: 'Password reset link is invalid or has expired.' }), { status: 400 });
      }

      const newHash = hashPassword(cleanPassword);
      db.prepare('UPDATE customers SET password_hash = ?, reset_token = NULL, reset_expires = NULL WHERE id = ?').run(newHash, customer.id);

      return new Response(JSON.stringify({ success: true, message: 'Password reset successfully. You can now log in with your new password.' }), { status: 200 });
    }

    return new Response(JSON.stringify({ error: 'Invalid action specified.' }), { status: 400 });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Account operation failed.' }), { status: 500 });
  }
};
