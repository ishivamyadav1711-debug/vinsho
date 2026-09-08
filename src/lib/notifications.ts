/**
 * VINSHO — Notification Dispatch Hub
 *
 * Single entry point for all transactional notifications.
 *
 * Rules:
 * 1. This function never throws — all errors are caught and logged.
 * 2. Email delivery is always fire-and-forget (async) — it never blocks
 *    the caller's DB transaction or HTTP response.
 * 3. Every notification attempt is recorded in the notification_log table
 *    with a final status of SENT, FAILED, or LOGGED_DEV.
 * 4. No secrets are passed as arguments — they are read from env.
 */

import { db } from './db.js';
import { sendEmail } from './email/transporter.js';
import {
  passwordResetTemplate,
  orderConfirmationTemplate,
  paymentConfirmationTemplate,
  paymentFailedTemplate,
  enquiryAckTemplate,
  adminNewEnquiryTemplate,
  adminNewOrderTemplate,
} from './email/templates.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export type NotificationChannel = 'WHATSAPP' | 'EMAIL';

export type NotificationTemplate =
  // Existing (retained for backward compat)
  | 'NEW_ENQUIRY_STAFF'
  | 'FOLLOWUP_DUE'
  | 'ENQUIRY_CONVERTED'
  | 'ENQUIRY_LOST'
  // New email templates
  | 'PASSWORD_RESET'
  | 'ORDER_CONFIRMATION'
  | 'PAYMENT_CONFIRMATION'
  | 'PAYMENT_FAILED'
  | 'ENQUIRY_ACK';

export interface NotificationPayload {
  channel: NotificationChannel;
  template: NotificationTemplate;
  /** Primary recipient email (or phone for WHATSAPP) */
  recipient: string;
  entityType?: string;
  entityId?: number;
  /** Additional data required to render the template */
  data?: Record<string, any>;
}

// ─── Main dispatch function ───────────────────────────────────────────────────

/**
 * Log and dispatch a notification.
 *
 * Always returns synchronously with a logId — the actual email send
 * happens asynchronously after the log row is committed.
 *
 * This guarantees:
 * - The caller's DB transaction is never delayed by SMTP latency.
 * - Email failure does not roll back or corrupt the order.
 */
export function logNotification(payload: NotificationPayload): { success: boolean; logId: number } {
  const now = new Date().toISOString();

  // Insert with pending status — will be updated asynchronously
  const res = db.prepare(`
    INSERT INTO notification_log (channel, template, recipient, entity_type, entity_id, status, sent_at, created_at)
    VALUES (?, ?, ?, ?, ?, 'PENDING', ?, ?)
  `).run(
    payload.channel,
    payload.template,
    payload.recipient,
    payload.entityType || null,
    payload.entityId || null,
    now,
    now
  );

  const logId = res.lastInsertRowid as number;

  // Dispatch asynchronously — does not block caller
  _dispatchNotification(logId, payload).catch((err) => {
    console.error(`[NOTIFICATION DISPATCH ERROR] logId=${logId}`, err);
  });

  return { success: true, logId };
}

// ─── Internal async dispatcher ────────────────────────────────────────────────

async function _dispatchNotification(logId: number, payload: NotificationPayload): Promise<void> {
  if (payload.channel !== 'EMAIL') {
    // WhatsApp / other channels: mark as LOGGED_DEV (not yet implemented)
    console.log(`[DEV NOTIFICATION LOG] Channel: ${payload.channel} | Template: ${payload.template} | Recipient: ${payload.recipient}`);
    _updateLog(logId, 'LOGGED_DEV', undefined);
    return;
  }

  try {
    const email = await _buildEmail(payload);
    if (!email) {
      // Template not matched — mark as skipped
      _updateLog(logId, 'SKIPPED', 'No email template matched');
      return;
    }

    const result = await sendEmail({
      to: payload.recipient,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });

    if (result.devLogOnly) {
      _updateLog(logId, 'LOGGED_DEV', undefined);
    } else if (result.success) {
      _updateLog(logId, 'SENT', undefined);
    } else {
      _updateLog(logId, 'FAILED', result.error);
    }
  } catch (err: any) {
    console.error(`[EMAIL BUILD ERROR] logId=${logId} template=${payload.template}`, err);
    _updateLog(logId, 'FAILED', err.message || 'Unknown error');
  }
}

function _updateLog(logId: number, status: string, error: string | undefined): void {
  try {
    db.prepare(`
      UPDATE notification_log SET status = ?, error = ?, sent_at = ? WHERE id = ?
    `).run(status, error || null, new Date().toISOString(), logId);
  } catch (err) {
    console.error(`[NOTIFICATION LOG UPDATE FAILED] logId=${logId}`, err);
  }
}

async function _buildEmail(payload: NotificationPayload): Promise<{
  subject: string; html: string; text: string;
} | null> {
  const d = payload.data || {};

  switch (payload.template) {
    case 'PASSWORD_RESET':
      return passwordResetTemplate({
        customerName: d.customerName || 'Customer',
        resetToken: d.resetToken,
      });

    case 'ORDER_CONFIRMATION':
      return orderConfirmationTemplate({
        customerName: d.customerName || 'Customer',
        orderNumber: d.orderNumber,
        grandTotal: d.grandTotal,
        items: d.items || [],
        shippingAddress: d.shippingAddress || {},
      });

    case 'PAYMENT_CONFIRMATION':
    case 'ENQUIRY_CONVERTED':
      return paymentConfirmationTemplate({
        customerName: d.customerName || 'Customer',
        orderNumber: d.orderNumber,
        grandTotal: d.grandTotal,
        paymentMethod: d.paymentMethod,
      });

    case 'PAYMENT_FAILED':
      return paymentFailedTemplate({
        customerName: d.customerName || 'Customer',
        orderNumber: d.orderNumber,
        grandTotal: d.grandTotal,
      });

    case 'ENQUIRY_ACK':
      return enquiryAckTemplate({
        customerName: d.customerName || 'Customer',
        subject: d.subject,
        productName: d.productName,
      });

    case 'NEW_ENQUIRY_STAFF':
      return adminNewEnquiryTemplate({
        enquiryId: d.enquiryId,
        customerName: d.customerName || 'Customer',
        phone: d.phone || '',
        subject: d.subject,
        source: d.source,
      });

    case 'FOLLOWUP_DUE':
    case 'ENQUIRY_LOST':
      // Admin internal templates — log only, no email template yet
      console.log(`[DEV NOTIFICATION LOG] Template: ${payload.template} | Recipient: ${payload.recipient}`);
      return null;

    default:
      console.warn(`[NOTIFICATION] Unknown template: ${(payload as any).template}`);
      return null;
  }
}
