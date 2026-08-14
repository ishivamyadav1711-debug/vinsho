import { db } from './db.js';

export type PipelineStatus = 'New' | 'Contacted' | 'Qualified' | 'Quotation Sent' | 'Negotiation' | 'Converted' | 'Lost';
export type CustomerStatus = 'Lead' | 'New' | 'Active' | 'Repeat' | 'VIP' | 'Inactive';

export interface CustomerRecord {
  id: number;
  name: string;
  email: string | null;
  phone: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  status: CustomerStatus;
  source: string;
  first_order_at: string | null;
  last_order_at: string | null;
  total_orders: number;
  total_spend: number;
  consent_at: string | null;
  consent_purpose: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface EnquiryRecord {
  id: number;
  customer_id: number;
  product_id: number | null;
  variant_id: number | null;
  name: string;
  phone: string;
  email: string | null;
  message: string;
  source: string;
  status: PipelineStatus;
  assigned_to: number | null;
  value_estimate: number | null;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
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
export function findOrCreateCustomer(params: {
  name: string;
  phone: string;
  email?: string | null;
  source?: string;
  consentAt?: string | null;
  consentPurpose?: string | null;
}): { customer: CustomerRecord; isNew: boolean } {
  const cleanPhone = params.phone.trim();
  const cleanEmail = params.email ? params.email.trim().toLowerCase() : null;
  const now = new Date().toISOString();

  let customer = db.prepare('SELECT * FROM customers WHERE phone = ? AND deleted_at IS NULL').get(cleanPhone) as CustomerRecord | undefined;

  if (!customer && cleanEmail) {
    customer = db.prepare('SELECT * FROM customers WHERE email = ? AND deleted_at IS NULL').get(cleanEmail) as CustomerRecord | undefined;
  }

  if (customer) {
    // Update existing customer info if provided
    db.prepare(`
      UPDATE customers SET
        name = ?,
        email = COALESCE(?, email),
        updated_at = ?
      WHERE id = ?
    `).run(params.name.trim(), cleanEmail, now, customer.id);

    const updatedCustomer = db.prepare('SELECT * FROM customers WHERE id = ?').get(customer.id) as CustomerRecord;
    return { customer: updatedCustomer, isNew: false };
  }

  // Create new Customer
  const result = db.prepare(`
    INSERT INTO customers (
      name, email, phone, status, source, consent_at, consent_purpose, created_at, updated_at
    ) VALUES (?, ?, ?, 'Lead', ?, ?, ?, ?, ?)
  `).run(
    params.name.trim(),
    cleanEmail,
    cleanPhone,
    params.source || 'Website Enquiry',
    params.consentAt || now,
    params.consentPurpose || 'Product quotation and customer service under DPDP Act 2023',
    now,
    now
  );

  const newCustomer = db.prepare('SELECT * FROM customers WHERE id = ?').get(result.lastInsertRowid) as CustomerRecord;
  return { customer: newCustomer, isNew: true };
}

/**
 * Log CRM activity in crm_activities audit timeline
 */
export function logCrmActivity(params: {
  entityType: 'customer' | 'enquiry';
  entityId: number;
  actorId?: number | null;
  type: string;
  summary: string;
  meta?: any;
}) {
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO crm_activities (entity_type, entity_id, actor_id, type, summary, meta, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    params.entityType,
    params.entityId,
    params.actorId || null,
    params.type,
    params.summary,
    params.meta ? JSON.stringify(params.meta) : null,
    now
  );
}

/**
 * Transition Lead Pipeline Status
 */
export function transitionEnquiryStatus(params: {
  enquiryId: number;
  newStatus: PipelineStatus;
  actorId?: number | null;
  lostReason?: string | null;
  note?: string | null;
}): { success: boolean; enquiry: EnquiryRecord; error?: string } {
  const enquiry = db.prepare('SELECT * FROM enquiries WHERE id = ?').get(params.enquiryId) as EnquiryRecord | undefined;
  if (!enquiry) {
    return { success: false, enquiry: null as any, error: 'Enquiry not found.' };
  }

  if (params.newStatus === 'Lost' && (!params.lostReason || params.lostReason.trim() === '')) {
    return { success: false, enquiry, error: 'Transition to Lost status requires a valid lost_reason.' };
  }

  const now = new Date().toISOString();
  const closedAt = (params.newStatus === 'Converted' || params.newStatus === 'Lost') ? now : null;

  db.prepare(`
    UPDATE enquiries SET
      status = ?,
      closed_at = ?,
      lost_reason = ?,
      updated_at = ?
    WHERE id = ?
  `).run(params.newStatus, closedAt, params.lostReason || null, now, params.enquiryId);

  logCrmActivity({
    entityType: 'enquiry',
    entityId: params.enquiryId,
    actorId: params.actorId,
    type: 'STATUS_CHANGE',
    summary: `Enquiry status updated from '${enquiry.status}' to '${params.newStatus}'${params.lostReason ? ' (Reason: ' + params.lostReason + ')' : ''}`,
    meta: { before: enquiry.status, after: params.newStatus, lostReason: params.lostReason, note: params.note }
  });

  const updatedEnquiry = db.prepare('SELECT * FROM enquiries WHERE id = ?').get(params.enquiryId) as EnquiryRecord;
  return { success: true, enquiry: updatedEnquiry };
}
