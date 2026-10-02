import type { APIRoute } from 'astro';
import { prisma, logAuditAction } from '../../../lib/db.js';
import { requireSuperAdmin } from '../../../lib/auth.js';
import bcrypt from 'bcryptjs';

export const GET: APIRoute = async ({ request }) => {
  const authCheck = await requireSuperAdmin(request);
  if (!authCheck.allowed) {
    return new Response(JSON.stringify({ error: authCheck.error }), { status: authCheck.user ? 403 : 401 });
  }

  const users = await prisma.adminUsers.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      is_active: true,
      last_login_at: true,
      created_at: true
    },
    orderBy: { name: 'asc' }
  });

  return new Response(JSON.stringify({ success: true, users }), { status: 200 });
};

export const POST: APIRoute = async ({ request }) => {
  const authCheck = await requireSuperAdmin(request);
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
    const existing = await prisma.adminUsers.findFirst({
      where: { email: cleanEmail }
    });

    if (existing) {
      return new Response(JSON.stringify({ error: 'User with this email already exists.' }), { status: 400 });
    }

    const now = new Date();
    const passwordHash = bcrypt.hashSync(password, 10);

    const newUser = await prisma.adminUsers.create({
      data: {
        name: name.trim(),
        email: cleanEmail,
        password_hash: passwordHash,
        role: role || 'SALES',
        is_active: true,
        created_at: now,
        updated_at: now
      }
    });

    await logAuditAction({
      actorId: admin.id,
      action: 'CREATE_USER',
      entity: 'admin_users',
      entityId: newUser.id,
      after: { email: cleanEmail, name, role: role || 'SALES' },
      ip: request.headers.get('x-forwarded-for') || '127.0.0.1'
    });

    return new Response(JSON.stringify({ success: true, message: 'Team member added successfully.' }), { status: 201 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Failed to create user.' }), { status: 500 });
  }
};
