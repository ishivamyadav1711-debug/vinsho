import type { APIRoute } from 'astro';
import { db } from '../../../lib/db.js';
import { getCustomerFromSession } from '../../../lib/customerAuth.js';

export const GET: APIRoute = async ({ request }) => {
  try {
    const customer = getCustomerFromSession(request);
    if (!customer) {
      return new Response(JSON.stringify({ authenticated: false, customer: null }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Fetch saved shipping addresses for this customer
    const addresses = db.prepare(`
      SELECT id, type, name, phone, line1, line2, city, state, pincode, country, is_default
      FROM addresses 
      WHERE customer_id = ? 
      ORDER BY id DESC
    `).all(customer.id);

    return new Response(JSON.stringify({
      authenticated: true,
      customer,
      addresses
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Failed to fetch account info.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
