import type { APIRoute } from 'astro';
import { db, logAuditAction } from '../../../lib/db.js';
import { requireSuperAdmin } from '../../../lib/auth.js';
import bcrypt from 'bcryptjs';

export const GET: APIRoute = async ({ request }) => {
  const authCheck = requireSuperAdmin(request);
  if (!authCheck.allowed) {
    return new Response(JSON.stringify({ error: authCheck.error }), { status: authCheck.user ? 403 : 401 });
  }

  const users = db.prepare('SELECT id, email, name, role, is_active, last_login_at, created_at FROM admin_users ORDER BY name ASC').all();
  return new Response(JSON.stringify({ success: true, users }), { status: 200 });
};

export const POST: APIRoute = async ({ request }) => {
  const authCheck = requireSuperAdmin(request);
  if (!authCheck.allowed) {
    return new Response(JSON.stringify({ error: authCheck.error }), { status: authCheck.user ? 403 : 401 });
  }

  const admin = authCheck.user!;

  try {
    const { name, email, password, role } = await request.json();
    if (!name || !email || !password) {
      return new Response(JSON.stringify({ error: 'Name, Email, and Password are required.' }), { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = db.prepare('SELECT id FROM admin_users WHERE email = ?').get(cleanEmail);
    if (existing) {
      return new Response(JSON.stringify({ error: 'User with this email already exists.' }), { status: 400 });
    }

    const now = new Date().toISOString();
    const passwordHash = bcrypt.hashSync(password, 10);

    const res = db.prepare(`
      INSERT INTO admin_users (name, email, password_hash, role, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, 1, ?, ?)
    `).run(name.trim(), cleanEmail, passwordHash, role || 'SALES', now, now);

    const newUserId = res.lastInsertRowid as number;

    logAuditAction({
      actorId: admin.id,
      action: 'CREATE_USER',
      entity: 'admin_users',
      entityId: newUserId,
      after: { email: cleanEmail, name, role: role || 'SALES' },
      ip: request.headers.get('x-forwarded-for') || '127.0.0.1'
    });

    return new Response(JSON.stringify({ success: true, message: 'Team member added successfully.' }), { status: 201 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Failed to create user.' }), { status: 500 });
  }
};
