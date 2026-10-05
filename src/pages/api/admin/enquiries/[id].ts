import type { APIRoute } from 'astro';
import { prisma } from '../../../../lib/db.js';
import { getSessionUser } from '../../../../lib/auth.js';
import { transitionEnquiryStatus, type PipelineStatus } from '../../../../lib/crm.js';

export const GET: APIRoute = async ({ request, params }) => {
  const user = await getSessionUser(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized admin access.' }), { status: 401 });
  }

  const id = parseInt(params.id || '0', 10);
  const found = await prisma.enquiries.findUnique({
    where: { id },
    include: {
      customer: { select: { name: true, email: true, phone: true } }
    }
  });

  if (!found) {
    return new Response(JSON.stringify({ error: 'Enquiry not found.' }), { status: 404 });
  }

  let productName = null;
  if (found.product_id) {
    const p = await prisma.products.findUnique({ where: { id: found.product_id }, select: { name: true } });
    if (p) productName = p.name;
  }

  const enquiry = {
    ...found,
    customer_name: found.customer?.name,
    customer_email: found.customer?.email,
    customer_phone: found.customer?.phone,
    product_name: productName
  };

  const activities = await prisma.crmActivities.findMany({
    where: { entity_type: 'enquiry', entity_id: id },
    orderBy: { created_at: 'desc' }
  });

  const rawNotes = await prisma.crmNotes.findMany({
    where: { entity_type: 'enquiry', entity_id: id },
    include: {
      author: { select: { name: true } }
    },
    orderBy: { created_at: 'desc' }
  });

  const notes = rawNotes.map((n: any) => ({
    ...n,
    author_name: n.admin_users?.name || 'Admin'
  }));

  return new Response(JSON.stringify({
    success: true,
    enquiry,
    activities,
    notes
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};

export const PUT: APIRoute = async ({ request, params }) => {
  const user = await getSessionUser(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized admin access.' }), { status: 401 });
  }

  const id = parseInt(params.id || '0', 10);
  try {
    const body = await request.json();
    const { status, lostReason, note, assignedTo, valueEstimate } = body;

    if (status) {
      const res = await transitionEnquiryStatus({
        enquiryId: id,
        newStatus: status as PipelineStatus,
        actorId: user.id,
        lostReason,
        note
      });

      if (!res.success) {
        return new Response(JSON.stringify({ error: res.error }), { status: 400 });
      }
    }

    if (assignedTo !== undefined || valueEstimate !== undefined) {
      const now = new Date();
      await prisma.enquiries.update({
        where: { id },
        data: {
          assigned_to: assignedTo !== undefined ? (assignedTo ? parseInt(assignedTo, 10) : null) : undefined,
          value_estimate: valueEstimate !== undefined ? (valueEstimate !== null ? parseFloat(valueEstimate) : null) : undefined,
          updated_at: now
        }
      });
    }

    const updated = await prisma.enquiries.findUnique({
      where: { id }
    });

    return new Response(JSON.stringify({ success: true, enquiry: updated }), { status: 200 });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Failed to update enquiry.' }), { status: 500 });
  }
};
