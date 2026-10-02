import type { APIRoute } from 'astro';
import { prisma } from '../../../lib/db.js';
import { getCustomerFromSession } from '../../../lib/customerAuth.js';

export const GET: APIRoute = async ({ request }) => {
  try {
    const customer = await getCustomerFromSession(request);
    if (!customer) {
      return new Response(JSON.stringify({ authenticated: false, customer: null }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Fetch saved shipping addresses for this customer
    const addresses = await prisma.addresses.findMany({
      where: { customer_id: customer.id },
      select: {
        id: true,
        type: true,
        name: true,
        phone: true,
        line1: true,
        line2: true,
        city: true,
        state: true,
        pincode: true,
        country: true,
        is_default: true
      },
      orderBy: { id: 'desc' }
    });

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
