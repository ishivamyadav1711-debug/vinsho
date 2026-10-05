import type { APIRoute } from 'astro';
import { prisma } from '../../../../../lib/db.js';
import { getSessionUser } from '../../../../../lib/auth.js';
import { logCrmActivity } from '../../../../../lib/crm.js';

export const GET: APIRoute = async ({ request, params }) => {
  const user = await getSessionUser(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized admin access.' }), { status: 401 });
  }

  const id = parseInt(params.id || '0', 10);
  const customer = await prisma.customers.findUnique({
    where: { id }
  });

  if (!customer) {
    return new Response(JSON.stringify({ error: 'Customer not found.' }), { status: 404 });
  }

  const [enquiries, notes, activities] = await Promise.all([
    prisma.enquiries.findMany({ where: { customer_id: id } }),
    prisma.crmNotes.findMany({ where: { entity_type: 'customer', entity_id: id } }),
    prisma.crmActivities.findMany({ where: { entity_type: 'customer', entity_id: id } })
  ]);

  await logCrmActivity({
    entityType: 'customer',
    entityId: id,
    actorId: user.id,
    type: 'DPDP_EXPORT',
    summary: `Customer personal data exported under DPDP Act 2023 by ${user.name}`
  });

  const exportPayload = {
    notice: 'TODO: client and legal counsel to confirm privacy notice text under DPDP Act 2023.',
    exportedAt: new Date().toISOString(),
    customerProfile: {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      city: customer.city,
      state: customer.state,
      pincode: customer.pincode,
      country: customer.country,
      status: customer.status,
      consentAt: customer.consent_at,
      consentPurpose: customer.consent_purpose,
      totalOrders: customer.total_orders,
      totalSpend: customer.total_spend,
      createdAt: customer.created_at
    },
    enquiries,
    notes,
    activities
  };

  return new Response(JSON.stringify(exportPayload, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="vinsho_dpdp_export_cust_${id}.json"`
    }
  });
};
