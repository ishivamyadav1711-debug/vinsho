import type { APIRoute } from 'astro';
import { db } from '../../../lib/db.js';
import { findOrCreateCustomer } from '../../../lib/crm.js';
import { mergeGuestCart } from '../../../lib/cart.js';
import bcrypt from 'bcryptjs';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { action, name, email, phone, password, sessionToken } = await request.json();

    if (action === 'signup') {
      if (!name || !phone || !password) {
        return new Response(JSON.stringify({ error: 'Name, Phone and Password are required.' }), { status: 400 });
      }

      const { customer } = findOrCreateCustomer({ name, phone, email, source: 'Account Registration' });
      const passwordHash = bcrypt.hashSync(password, 10);

      db.prepare('UPDATE customers SET password_hash = ? WHERE id = ?').run(passwordHash, customer.id);

      if (sessionToken) {
        mergeGuestCart(sessionToken, customer.id);
      }

      return new Response(JSON.stringify({
        success: true,
        message: 'Account created successfully.',
        customer: { id: customer.id, name: customer.name, phone: customer.phone, email: customer.email }
      }), { status: 201 });
    }

    if (action === 'login') {
      if (!phone && !email) {
        return new Response(JSON.stringify({ error: 'Phone or Email is required.' }), { status: 400 });
      }

      const cleanPhone = (phone || '').trim();
      const cleanEmail = (email || '').trim().toLowerCase();

      const customer = db.prepare('SELECT * FROM customers WHERE (phone = ? OR email = ?) AND deleted_at IS NULL').get(cleanPhone || 'NONE', cleanEmail || 'NONE') as any;
      if (!customer) {
        return new Response(JSON.stringify({ error: 'Invalid phone/email or password.' }), { status: 401 });
      }

      if (customer.password_hash && password) {
        const valid = bcrypt.compareSync(password, customer.password_hash);
        if (!valid) {
          return new Response(JSON.stringify({ error: 'Invalid phone/email or password.' }), { status: 401 });
        }
      }

      if (sessionToken) {
        mergeGuestCart(sessionToken, customer.id);
      }

      return new Response(JSON.stringify({
        success: true,
        message: 'Login successful.',
        customer: { id: customer.id, name: customer.name, phone: customer.phone, email: customer.email, status: customer.status }
      }), { status: 200 });
    }

    return new Response(JSON.stringify({ error: 'Invalid action.' }), { status: 400 });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Account operation failed.' }), { status: 500 });
  }
};
