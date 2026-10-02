import { prisma } from './db.js';

export type PipelineStatus = 'New' | 'Contacted' | 'Qualified' | 'Quotation Sent' | 'Negotiation' | 'Converted' | 'Lost';
export type CustomerStatus = 'Lead' | 'New' | 'Active' | 'Repeat' | 'VIP' | 'Inactive';

export interface CustomerRecord {
  id: number;
  name: string;
  email: string | null;
  phone: string;
  city: string | null;
  state: string | null;
  pincode: string | null;
  country: string | null;
  status: CustomerStatus;
  source: string | null;
  first_order_at: Date | null;
  last_order_at: Date | null;
  total_orders: number | null;
  total_spend: any;
  consent_at: Date | null;
  consent_purpose: string | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export interface EnquiryRecord {
  id: number;
  customer_id: number;
  product_id: number | null;
  variant_id: number | null;
  name: string;
  phone: string;
  email: string | null;
  message: string | null;
  source: string;
  status: PipelineStatus;
  assigned_to: number | null;
  value_estimate: any;
  created_at: Date;
  updated_at: Date;
  closed_at: Date | null;
  lost_reason: string | null;
}

/**
 * Calculates customer status based on Section 4 exact rules:
 * - VIP: Set manually by admin only. Never overwritten by rules.
 * - Lead: 0 orders, has enquiry.
 * - New: Exactly 1 order.
 * - Active: >= 2 orders, most recent within 180 days.
 * - Repeat: >= 3 orders.
 * - Inactive: >= 1 order, none in 365 days.
 */
export function computeCustomerStatus(customer: CustomerRecord): CustomerStatus {
  if (customer.status === 'VIP') {
    return 'VIP'; // Preserved permanent manual status
  }

  const totalOrders = customer.total_orders || 0;
  if (totalOrders === 0) {
    return 'Lead';
  }

  if (totalOrders === 1) {
    if (customer.last_order_at) {
      const days = (Date.now() - new Date(customer.last_order_at).getTime()) / (1000 * 60 * 60 * 24);
      if (days > 365) return 'Inactive';
    }
    return 'New';
  }

  if (totalOrders >= 2) {
    if (customer.last_order_at) {
      const days = (Date.now() - new Date(customer.last_order_at).getTime()) / (1000 * 60 * 60 * 24);
      if (days <= 180) {
        return totalOrders >= 3 ? 'Repeat' : 'Active';
      }
      if (days > 365) return 'Inactive';
    }
    return totalOrders >= 3 ? 'Repeat' : 'Active';
  }

  return 'Lead';
}

/**
 * Deduplicate customer on phone first, then email.
 */
export async function findOrCreateCustomer(params: {
  name: string;
  phone: string;
  email?: string | null;
  source?: string;
  consentAt?: string | Date | null;
  consentPurpose?: string | null;
}): Promise<{ customer: CustomerRecord; isNew: boolean }> {
  const cleanPhone = params.phone.trim();
  const cleanEmail = params.email ? params.email.trim().toLowerCase() : null;
  const now = new Date();

  let customer = await prisma.customers.findFirst({
    where: { phone: cleanPhone, deleted_at: null }
  });

  if (!customer && cleanEmail) {
    customer = await prisma.customers.findFirst({
      where: { email: cleanEmail, deleted_at: null }
    });
  }

  if (customer) {
    const updated = await prisma.customers.update({
      where: { id: customer.id },
      data: {
        name: params.name.trim(),
        email: cleanEmail || customer.email,
        updated_at: now
      }
    });

    return { customer: updated as unknown as CustomerRecord, isNew: false };
  }

  const consentDate = params.consentAt ? new Date(params.consentAt) : now;

  const newCustomer = await prisma.customers.create({
    data: {
      name: params.name.trim(),
      email: cleanEmail,
      phone: cleanPhone,
      status: 'Lead',
      source: params.source || 'Website Enquiry',
      consent_at: consentDate,
      consent_purpose: params.consentPurpose || 'Product quotation and customer service under DPDP Act 2023',
      created_at: now,
      updated_at: now
    }
  });

  return { customer: newCustomer as unknown as CustomerRecord, isNew: true };
}

/**
 * Log CRM activity in crm_activities audit timeline
 */
export async function logCrmActivity(params: {
  entityType: 'customer' | 'enquiry';
  entityId: number;
  actorId?: number | null;
  type: string;
  summary: string;
  meta?: any;
}): Promise<void> {
  const now = new Date();
  try {
    await prisma.crmActivities.create({
      data: {
        entity_type: params.entityType,
        entity_id: params.entityId,
        actor_id: params.actorId || null,
        type: params.type,
        summary: params.summary,
        meta: params.meta ? JSON.stringify(params.meta) : null,
        created_at: now
      }
    });
  } catch (err) {
    console.error('Failed to log CRM activity:', err);
  }
}

/**
 * Transition Lead Pipeline Status
 */
export async function transitionEnquiryStatus(params: {
  enquiryId: number;
  newStatus: PipelineStatus;
  actorId?: number | null;
  lostReason?: string | null;
  note?: string | null;
}): Promise<{ success: boolean; enquiry: EnquiryRecord; error?: string }> {
  const enquiry = await prisma.enquiries.findUnique({
    where: { id: params.enquiryId }
  });

  if (!enquiry) {
    return { success: false, enquiry: null as any, error: 'Enquiry not found.' };
  }

  if (params.newStatus === 'Lost' && (!params.lostReason || params.lostReason.trim() === '')) {
    return { success: false, enquiry: enquiry as unknown as EnquiryRecord, error: 'Transition to Lost status requires a valid lost_reason.' };
  }

  const now = new Date();
  const closedAt = (params.newStatus === 'Converted' || params.newStatus === 'Lost') ? now : null;

  const updatedEnquiry = await prisma.enquiries.update({
    where: { id: params.enquiryId },
    data: {
      status: params.newStatus,
      closed_at: closedAt,
      lost_reason: params.lostReason || null,
      updated_at: now
    }
  });

  await logCrmActivity({
    entityType: 'enquiry',
    entityId: params.enquiryId,
    actorId: params.actorId,
    type: 'STATUS_CHANGE',
    summary: `Enquiry status updated from '${enquiry.status}' to '${params.newStatus}'${params.lostReason ? ' (Reason: ' + params.lostReason + ')' : ''}`,
    meta: { before: enquiry.status, after: params.newStatus, lostReason: params.lostReason, note: params.note }
  });

  return { success: true, enquiry: updatedEnquiry as unknown as EnquiryRecord };
}
