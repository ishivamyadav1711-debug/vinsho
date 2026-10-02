import { prisma, logAuditAction } from './db.js';
export { logAuditAction };
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { getEnvConfig } from './env.js';

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: string;
  is_active: boolean | number;
}

const SESSION_COOKIE_NAME = 'vinsho_admin_session';
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

export function parseCookies(cookieHeader: string | null): Record<string, string> {
  const list: Record<string, string> = {};
  if (!cookieHeader) return list;

  cookieHeader.split(';').forEach((cookie) => {
    const parts = cookie.split('=');
    const name = parts.shift()?.trim();
    const value = parts.join('=').trim();
    if (name && value) {
      list[name] = decodeURIComponent(value);
    }
  });

  return list;
}

/**
 * Seed default super admin user if empty
 */
export async function ensureDefaultAdminUser(): Promise<AdminUser> {
  const existing = await prisma.adminUsers.findFirst({
    where: { role: 'SUPER_ADMIN' }
  });

  if (existing) {
    return {
      id: existing.id,
      name: existing.name,
      email: existing.email,
      role: existing.role,
      is_active: existing.is_active
    };
  }

  const now = new Date();
  const envConfig = getEnvConfig();
  const defaultPassword = envConfig.adminPassword;
  const defaultEmail = envConfig.adminEmail;
  const passwordHash = bcrypt.hashSync(defaultPassword, 10);

  const created = await prisma.adminUsers.create({
    data: {
      name: 'VINSHO Super Admin',
      email: defaultEmail,
      password_hash: passwordHash,
      role: 'SUPER_ADMIN',
      is_active: true,
      created_at: now,
      updated_at: now
    }
  });

  return {
    id: created.id,
    name: created.name,
    email: created.email,
    role: created.role,
    is_active: created.is_active
  };
}

/**
 * Check login rate limits (max 5 failed attempts per 15 minutes)
 */
export async function checkRateLimit(ip: string): Promise<{ allowed: boolean; remainingMinutes: number }> {
  const now = BigInt(Date.now());
  const row = await prisma.loginRateLimits.findUnique({
    where: { ip }
  });

  if (!row) return { allowed: true, remainingMinutes: 0 };

  if (row.blocked_until && row.blocked_until > now) {
    const remainingMinutes = Math.ceil(Number(row.blocked_until - now) / 60000);
    return { allowed: false, remainingMinutes };
  }

  return { allowed: true, remainingMinutes: 0 };
}

export async function recordFailedLogin(ip: string): Promise<void> {
  const nowMs = Date.now();
  const now = BigInt(nowMs);
  const windowMs = BigInt(15 * 60 * 1000);
  const maxAttempts = 5;

  const row = await prisma.loginRateLimits.findUnique({
    where: { ip }
  });

  if (!row || (now - row.first_failed_at) > windowMs) {
    await prisma.loginRateLimits.upsert({
      where: { ip },
      update: { attempts: 1, first_failed_at: now, blocked_until: BigInt(0) },
      create: { ip, attempts: 1, first_failed_at: now, blocked_until: BigInt(0) }
    });
  } else {
    const attempts = (row.attempts ?? 0) + 1;
    const blockedUntil = attempts >= maxAttempts ? now + windowMs : BigInt(0);
    await prisma.loginRateLimits.update({
      where: { ip },
      data: {
        attempts,
        blocked_until: blockedUntil
      }
    });
  }
}

export async function clearRateLimit(ip: string): Promise<void> {
  try {
    await prisma.loginRateLimits.delete({
      where: { ip }
    });
  } catch (err) {
    // Ignore not found
  }
}

export async function getSessionUser(request: Request): Promise<AdminUser | null> {
  await ensureDefaultAdminUser();

  const cookieHeader = request.headers.get('cookie');
  const cookies = parseCookies(cookieHeader);
  const token = cookies[SESSION_COOKIE_NAME];

  if (!token) return null;

  const now = BigInt(Date.now());
  const session = await prisma.adminSessions.findUnique({
    where: { token },
    include: { user: true }
  });

  if (!session || session.expires_at <= now || !session.user.is_active) {
    if (session) {
      await prisma.adminSessions.delete({ where: { token } }).catch(() => {});
    }
    return null;
  }

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role: session.user.role,
    is_active: session.user.is_active
  };
}

export type AdminRole = 'SUPER_ADMIN' | 'ADMIN' | 'SALES' | 'INVENTORY_MANAGER' | 'SUPPORT';

export function hasRoleAccess(userRole: string, targetPath: string): boolean {
  if (userRole === 'SUPER_ADMIN') return true;

  if (userRole === 'ADMIN') {
    if (targetPath.includes('/admin/users') || targetPath.includes('/admin/settings')) return false;
    return true;
  }

  if (userRole === 'SALES') {
    if (targetPath.includes('/admin/users') || targetPath.includes('/admin/settings')) return false;
    return true;
  }

  if (userRole === 'INVENTORY_MANAGER') {
    if (targetPath.includes('/admin/customers') || targetPath.includes('/admin/users') || targetPath.includes('/admin/settings')) return false;
    return true;
  }

  if (userRole === 'SUPPORT') {
    if (targetPath.includes('/admin/users') || targetPath.includes('/admin/settings')) return false;
    return true;
  }

  return false;
}

export function redactCustomerPii(customer: any, userRole: string): any {
  if (userRole === 'INVENTORY_MANAGER') {
    return {
      id: customer.id,
      name: '[REDACTED FOR INVENTORY ROLE]',
      phone: '[REDACTED]',
      email: '[REDACTED]',
      city: '[REDACTED]',
      state: '[REDACTED]',
      status: customer.status
    };
  }
  return customer;
}

export async function requireSuperAdmin(request: Request): Promise<{ allowed: boolean; user: AdminUser | null; error?: string }> {
  const user = await getSessionUser(request);
  if (!user) return { allowed: false, user: null, error: 'Unauthorized: Session missing' };
  if (user.role !== 'SUPER_ADMIN') {
    return { allowed: false, user, error: 'Forbidden: Super Admin role required' };
  }
  return { allowed: true, user };
}

export async function requireSalesOrAdmin(request: Request): Promise<{ allowed: boolean; user: AdminUser | null; error?: string }> {
  const user = await getSessionUser(request);
  if (!user) return { allowed: false, user: null, error: 'Unauthorized: Session missing' };
  if (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN' && user.role !== 'SALES') {
    return { allowed: false, user, error: 'Forbidden: Insufficient role privileges' };
  }
  return { allowed: true, user };
}

export async function createSessionToken(userId: number, ip = '', userAgent = ''): Promise<{ token: string; expiresAt: number }> {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAtMs = Date.now() + SESSION_DURATION_MS;
  const expiresAt = BigInt(expiresAtMs);
  const now = new Date();

  await prisma.adminSessions.create({
    data: {
      token,
      user_id: userId,
      expires_at: expiresAt,
      ip,
      user_agent: userAgent,
      created_at: now
    }
  });

  await prisma.adminUsers.update({
    where: { id: userId },
    data: {
      last_login_at: now,
      updated_at: now
    }
  });

  return { token, expiresAt: expiresAtMs };
}

export async function destroySession(request: Request): Promise<void> {
  const cookieHeader = request.headers.get('cookie');
  const cookies = parseCookies(cookieHeader);
  const token = cookies[SESSION_COOKIE_NAME];
  if (token) {
    try {
      await prisma.adminSessions.delete({ where: { token } });
    } catch (err) {
      // Ignore if already deleted
    }
  }
}

export function getSessionCookieHeader(token: string, expiresAt: number): string {
  const expiresDate = new Date(expiresAt).toUTCString();
  const secure = getEnvConfig().isProduction ? '; Secure' : '';
  return `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly${secure}; SameSite=Strict; Expires=${expiresDate}`;
}

export function getLogoutCookieHeader(): string {
  const secure = getEnvConfig().isProduction ? '; Secure' : '';
  return `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly${secure}; SameSite=Strict; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}
