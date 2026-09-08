import { db, logAuditAction } from './db.js';
export { logAuditAction };
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { getEnvConfig } from './env.js';

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: string;
  is_active: number;
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
export function ensureDefaultAdminUser(): AdminUser {
  const existing = db.prepare('SELECT * FROM admin_users WHERE role = ?').get('SUPER_ADMIN') as any;
  if (existing) {
    return {
      id: existing.id,
      name: existing.name,
      email: existing.email,
      role: existing.role,
      is_active: existing.is_active
    };
  }

  const now = new Date().toISOString();
  const envConfig = getEnvConfig();
  const defaultPassword = envConfig.adminPassword;
  const defaultEmail = envConfig.adminEmail;
  const passwordHash = bcrypt.hashSync(defaultPassword, 10);

  const res = db.prepare(`
    INSERT INTO admin_users (name, email, password_hash, role, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run('VINSHO Super Admin', defaultEmail, passwordHash, 'SUPER_ADMIN', 1, now, now);

  return {
    id: res.lastInsertRowid as number,
    name: 'VINSHO Super Admin',
    email: defaultEmail,
    role: 'SUPER_ADMIN',
    is_active: 1
  };
}

/**
 * Check login rate limits (max 5 failed attempts per 15 minutes)
 */
export function checkRateLimit(ip: string): { allowed: boolean; remainingMinutes: number } {
  const now = Date.now();
  const row = db.prepare('SELECT * FROM login_rate_limits WHERE ip = ?').get(ip) as any;

  if (!row) return { allowed: true, remainingMinutes: 0 };

  if (row.blocked_until > now) {
    const remainingMinutes = Math.ceil((row.blocked_until - now) / 60000);
    return { allowed: false, remainingMinutes };
  }

  return { allowed: true, remainingMinutes: 0 };
}

export function recordFailedLogin(ip: string) {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  const maxAttempts = 5;

  const row = db.prepare('SELECT * FROM login_rate_limits WHERE ip = ?').get(ip) as any;

  if (!row || now - row.first_failed_at > windowMs) {
    db.prepare(`
      INSERT INTO login_rate_limits (ip, attempts, first_failed_at, blocked_until)
      VALUES (?, 1, ?, 0)
      ON CONFLICT(ip) DO UPDATE SET attempts = 1, first_failed_at = ?, blocked_until = 0
    `).run(ip, now, now);
  } else {
    const attempts = row.attempts + 1;
    const blockedUntil = attempts >= maxAttempts ? now + windowMs : 0;
    db.prepare('UPDATE login_rate_limits SET attempts = ?, blocked_until = ? WHERE ip = ?').run(
      attempts,
      blockedUntil,
      ip
    );
  }
}

export function clearRateLimit(ip: string) {
  db.prepare('DELETE FROM login_rate_limits WHERE ip = ?').run(ip);
}

export function getSessionUser(request: Request): AdminUser | null {
  ensureDefaultAdminUser();

  const cookieHeader = request.headers.get('cookie');
  const cookies = parseCookies(cookieHeader);
  const token = cookies[SESSION_COOKIE_NAME];

  if (!token) return null;

  const now = Date.now();
  const row = db.prepare(`
    SELECT s.token, s.expires_at, u.id, u.email, u.name, u.role, u.is_active
    FROM admin_sessions s
    JOIN admin_users u ON s.user_id = u.id
    WHERE s.token = ? AND s.expires_at > ? AND u.is_active = 1
  `).get(token, now) as any;

  if (!row) {
    db.prepare('DELETE FROM admin_sessions WHERE token = ?').run(token);
    return null;
  }

  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    is_active: row.is_active
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

export function requireSuperAdmin(request: Request): { allowed: boolean; user: AdminUser | null; error?: string } {
  const user = getSessionUser(request);
  if (!user) return { allowed: false, user: null, error: 'Unauthorized: Session missing' };
  if (user.role !== 'SUPER_ADMIN') {
    return { allowed: false, user, error: 'Forbidden: Super Admin role required' };
  }
  return { allowed: true, user };
}

export function requireSalesOrAdmin(request: Request): { allowed: boolean; user: AdminUser | null; error?: string } {
  const user = getSessionUser(request);
  if (!user) return { allowed: false, user: null, error: 'Unauthorized: Session missing' };
  if (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN' && user.role !== 'SALES') {
    return { allowed: false, user, error: 'Forbidden: Insufficient role privileges' };
  }
  return { allowed: true, user };
}

export function createSessionToken(userId: number, ip = '', userAgent = ''): { token: string; expiresAt: number } {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + SESSION_DURATION_MS;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO admin_sessions (token, user_id, expires_at, ip, user_agent, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(token, userId, expiresAt, ip, userAgent, now);

  db.prepare('UPDATE admin_users SET last_login_at = ?, updated_at = ? WHERE id = ?').run(now, now, userId);

  return { token, expiresAt };
}

export function destroySession(request: Request) {
  const cookieHeader = request.headers.get('cookie');
  const cookies = parseCookies(cookieHeader);
  const token = cookies[SESSION_COOKIE_NAME];
  if (token) {
    db.prepare('DELETE FROM admin_sessions WHERE token = ?').run(token);
  }
}

export function getSessionCookieHeader(token: string, expiresAt: number): string {
  const expiresDate = new Date(expiresAt).toUTCString();
  // Add Secure flag in production so the cookie is only sent over HTTPS.
  // Omit in development so local HTTP servers remain usable.
  const secure = getEnvConfig().isProduction ? '; Secure' : '';
  return `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly${secure}; SameSite=Strict; Expires=${expiresDate}`;
}

export function getLogoutCookieHeader(): string {
  const secure = getEnvConfig().isProduction ? '; Secure' : '';
  return `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly${secure}; SameSite=Strict; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}
