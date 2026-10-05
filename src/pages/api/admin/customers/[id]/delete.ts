import type { APIRoute } from 'astro';
import { prisma } from '../../../../../lib/db.js';
import { getSessionUser } from '../../../../../lib/auth.js';
import { logCrmActivity } from '../../../../../lib/crm.js';

export const DELETE: APIRoute = async ({ request, params }) => {
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

  const now = new Date();

  // Section 8 DPDP Rule: Erase PII while preserving anonymized aggregate counts & orders
  await prisma.$transaction(async (tx) => {
    await tx.customers.update({
      where: { id },
      data: {
        name: 'Anonymized User (DPDP Right to Erasure)',
        email: null,
        phone: `ANONYMIZED_${id}`,
        city: '',
        state: '',
        pincode: '',
        deleted_at: now,
        updated_at: now
      }
    });

    // Anonymize Linked Enquiries
    await tx.enquiries.updateMany({
      where: { customer_id: id },
      data: {
        name: 'Anonymized User',
        email: null,
        phone: 'ANONYMIZED',
        message: '[Erased per DPDP Act 2023 Request]',
        updated_at: now
      }
    });
  });

  await logCrmActivity({
    entityType: 'customer',
    entityId: id,
    actorId: user.id,
    type: 'DPDP_ERASURE',
    summary: `Personal data erased under DPDP Act 2023 Right to Erasure request by ${user.name}`
  });

  return new Response(JSON.stringify({
    success: true,
    message: 'Customer personal data successfully erased per DPDP Act 2023 request. Aggregate order counts retained.'
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};
