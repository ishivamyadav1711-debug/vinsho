import { prisma } from './db.js';
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
  | 'NEW_ENQUIRY_STAFF'
  | 'FOLLOWUP_DUE'
  | 'ENQUIRY_CONVERTED'
  | 'ENQUIRY_LOST'
  | 'PASSWORD_RESET'
  | 'ORDER_CONFIRMATION'
  | 'PAYMENT_CONFIRMATION'
  | 'PAYMENT_FAILED'
  | 'ENQUIRY_ACK';

export interface NotificationPayload {
  channel: NotificationChannel;
  template: NotificationTemplate;
  recipient: string;
  entityType?: string;
  entityId?: number;
  data?: Record<string, any>;
}

// ─── Main dispatch function ───────────────────────────────────────────────────

export function logNotification(payload: NotificationPayload): { success: boolean } {
  const now = new Date();

  // Dispatch asynchronously — never blocks caller
  (async () => {
    try {
      const record = await prisma.notificationLog.create({
        data: {
          channel: payload.channel,
          template: payload.template,
          recipient: payload.recipient,
          entity_type: payload.entityType || null,
          entity_id: payload.entityId || null,
          status: 'PENDING',
          sent_at: now,
          created_at: now
        }
      });

      await _dispatchNotification(record.id, payload);
    } catch (err) {
      console.error('[NOTIFICATION LOG INSERT ERROR]', err);
    }
  })().catch(err => console.error('[UNHANDLED NOTIFICATION DISPATCH ERROR]', err));

  return { success: true };
}

// ─── Internal async dispatcher ────────────────────────────────────────────────

async function _dispatchNotification(logId: number, payload: NotificationPayload): Promise<void> {
  if (payload.channel !== 'EMAIL') {
    console.log(`[DEV NOTIFICATION LOG] Channel: ${payload.channel} | Template: ${payload.template} | Recipient: ${payload.recipient}`);
    await _updateLog(logId, 'LOGGED_DEV', undefined);
    return;
  }

  try {
    const email = await _buildEmail(payload);
    if (!email) {
      await _updateLog(logId, 'SKIPPED', 'No email template matched');
      return;
    }

    const result = await sendEmail({
      to: payload.recipient,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });

    if (result.devLogOnly) {
      await _updateLog(logId, 'LOGGED_DEV', undefined);
    } else if (result.success) {
      await _updateLog(logId, 'SENT', undefined);
    } else {
      await _updateLog(logId, 'FAILED', result.error);
    }
  } catch (err: any) {
    console.error(`[EMAIL BUILD ERROR] logId=${logId} template=${payload.template}`, err);
    await _updateLog(logId, 'FAILED', err.message || 'Unknown error');
  }
}

async function _updateLog(logId: number, status: string, error: string | undefined): Promise<void> {
  try {
    await prisma.notificationLog.update({
      where: { id: logId },
      data: {
        status,
        error: error || null,
        sent_at: new Date()
      }
    });
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
      console.log(`[DEV NOTIFICATION LOG] Template: ${payload.template} | Recipient: ${payload.recipient}`);
      return null;

    default:
      console.warn(`[NOTIFICATION] Unknown template: ${(payload as any).template}`);
      return null;
  }
}
