import { prisma } from './db.js';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { parseCookies } from './auth.js';
import { getEnvConfig } from './env.js';

export interface CustomerUser {
  id: number;
  name: string;
  email: string | null;
  phone: string;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  country?: string | null;
  status?: string;
}

const CUSTOMER_SESSION_COOKIE = 'vinsho_customer_session';
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days session persistence

/**
 * Creates a new secure customer session in the database and returns token & cookie header.
 */
export async function createCustomerSessionToken(customerId: number, ip = '', userAgent = ''): Promise<{ token: string; expiresAt: number }> {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAtMs = Date.now() + SESSION_DURATION_MS;
  const expiresAt = BigInt(expiresAtMs);
  const now = new Date();

  await prisma.customerSessions.create({
    data: {
      token,
      customer_id: customerId,
      expires_at: expiresAt,
      ip,
      user_agent: userAgent,
      created_at: now
    }
  });

  await prisma.customers.update({
    where: { id: customerId },
    data: { updated_at: now }
  });

  return { token, expiresAt: expiresAtMs };
}

/**
 * Gets the current authenticated customer from HTTP request cookies.
 */
export async function getCustomerFromSession(request: Request): Promise<CustomerUser | null> {
  const cookieHeader = request.headers.get('cookie');
  const cookies = parseCookies(cookieHeader);
  const token = cookies[CUSTOMER_SESSION_COOKIE];

  if (!token) return null;

  const now = BigInt(Date.now());
  const session = await prisma.customerSessions.findUnique({
    where: { token },
    include: { customer: true }
  });

  if (!session || session.expires_at <= now || session.customer.deleted_at !== null) {
    if (session) {
      await prisma.customerSessions.delete({ where: { token } }).catch(() => {});
    }
    return null;
  }

  return {
    id: session.customer.id,
    name: session.customer.name,
    email: session.customer.email,
    phone: session.customer.phone,
    city: session.customer.city,
    state: session.customer.state,
    pincode: session.customer.pincode,
    country: session.customer.country,
    status: session.customer.status
  };
}

/**
 * Destroys the customer session.
 */
export async function destroyCustomerSession(request: Request): Promise<void> {
  const cookieHeader = request.headers.get('cookie');
  const cookies = parseCookies(cookieHeader);
  const token = cookies[CUSTOMER_SESSION_COOKIE];
  if (token) {
    try {
      await prisma.customerSessions.delete({ where: { token } });
    } catch (err) {
      // Ignore if already deleted
    }
  }
}

/**
 * Returns HTTP Set-Cookie header for setting customer session.
 */
export function getCustomerSessionCookieHeader(token: string, expiresAt: number): string {
  const expiresDate = new Date(expiresAt).toUTCString();
  const secure = getEnvConfig().isProduction ? '; Secure' : '';
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
export async function generatePasswordResetToken(customerId: number): Promise<{ token: string; expiresAt: number }> {
  const token = crypto.randomBytes(20).toString('hex');
  const expiresAtMs = Date.now() + 60 * 60 * 1000; // 1 hour validity
  const expiresAt = BigInt(expiresAtMs);

  await prisma.customers.update({
    where: { id: customerId },
    data: {
      reset_token: token,
      reset_expires: expiresAt
    }
  });

  return { token, expiresAt: expiresAtMs };
}
