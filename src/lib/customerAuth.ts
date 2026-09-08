import { db } from './db.js';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { parseCookies } from './auth.js';
import { getEnvConfig } from './env.js';

export interface CustomerUser {
  id: number;
  name: string;
  email: string | null;
  phone: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
  status?: string;
}

const CUSTOMER_SESSION_COOKIE = 'vinsho_customer_session';
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days session persistence

/**
 * Creates a new secure customer session in the database and returns token & cookie header.
 */
export function createCustomerSessionToken(customerId: number, ip = '', userAgent = ''): { token: string; expiresAt: number } {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + SESSION_DURATION_MS;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO customer_sessions (token, customer_id, expires_at, ip, user_agent, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(token, customerId, expiresAt, ip, userAgent, now);

  db.prepare('UPDATE customers SET updated_at = ? WHERE id = ?').run(now, customerId);

  return { token, expiresAt };
}

/**
 * Gets the current authenticated customer from HTTP request cookies.
 */
export function getCustomerFromSession(request: Request): CustomerUser | null {
  const cookieHeader = request.headers.get('cookie');
  const cookies = parseCookies(cookieHeader);
  const token = cookies[CUSTOMER_SESSION_COOKIE];

  if (!token) return null;

  const now = Date.now();
  const row = db.prepare(`
    SELECT s.token, s.expires_at, c.id, c.name, c.email, c.phone, c.city, c.state, c.pincode, c.country, c.status
    FROM customer_sessions s
    JOIN customers c ON s.customer_id = c.id
    WHERE s.token = ? AND s.expires_at > ? AND c.deleted_at IS NULL
  `).get(token, now) as any;

  if (!row) {
    db.prepare('DELETE FROM customer_sessions WHERE token = ?').run(token);
    return null;
  }

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    city: row.city,
    state: row.state,
    pincode: row.pincode,
    country: row.country,
    status: row.status
  };
}

/**
 * Destroys the customer session.
 */
export function destroyCustomerSession(request: Request) {
  const cookieHeader = request.headers.get('cookie');
  const cookies = parseCookies(cookieHeader);
  const token = cookies[CUSTOMER_SESSION_COOKIE];
  if (token) {
    db.prepare('DELETE FROM customer_sessions WHERE token = ?').run(token);
  }
}

/**
 * Returns HTTP Set-Cookie header for setting customer session.
 */
export function getCustomerSessionCookieHeader(token: string, expiresAt: number): string {
  const expiresDate = new Date(expiresAt).toUTCString();
  // Secure flag is added in production (HTTPS only).
  // Omit in development so local HTTP remains usable.
  const secure = getEnvConfig().isProduction ? '; Secure' : '';
  // SameSite=Lax: correct for customer-facing storefront — allows cookie to be
  // sent on top-level navigations (e.g. after payment redirect) while blocking
  // cross-site sub-resource requests.
  return `${CUSTOMER_SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly${secure}; SameSite=Lax; Expires=${expiresDate}`;
}

/**
 * Returns HTTP Set-Cookie header for logging out customer.
 */
export function getCustomerLogoutCookieHeader(): string {
  const secure = getEnvConfig().isProduction ? '; Secure' : '';
  return `${CUSTOMER_SESSION_COOKIE}=; Path=/; HttpOnly${secure}; SameSite=Lax; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

/**
 * Password hashing utility
 */
export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

/**
 * Password verification utility
 */
export function verifyPassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

/**
 * Generate 6-digit or random token for password reset
 */
export function generatePasswordResetToken(customerId: number): { token: string; expiresAt: number } {
  const token = crypto.randomBytes(20).toString('hex');
  const expiresAt = Date.now() + 60 * 60 * 1000; // 1 hour validity

  db.prepare('UPDATE customers SET reset_token = ?, reset_expires = ? WHERE id = ?').run(
    token,
    expiresAt,
    customerId
  );

  return { token, expiresAt };
}
