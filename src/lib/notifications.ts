import { db } from './db.js';

export interface NotificationPayload {
  channel: 'WHATSAPP' | 'EMAIL';
  template: 'NEW_ENQUIRY_STAFF' | 'FOLLOWUP_DUE' | 'ENQUIRY_CONVERTED' | 'ENQUIRY_LOST';
  recipient: string;
  entityType?: string;
  entityId?: number;
}

export function logNotification(payload: NotificationPayload): { success: boolean; logId: number } {
  const now = new Date().toISOString();

  const res = db.prepare(`
    INSERT INTO notification_log (channel, template, recipient, entity_type, entity_id, status, sent_at, created_at)
    VALUES (?, ?, ?, ?, ?, 'LOGGED_DEV', ?, ?)
  `).run(
    payload.channel,
    payload.template,
    payload.recipient,
    payload.entityType || null,
    payload.entityId || null,
    now,
    now
  );

  console.log(`[DEV NOTIFICATION LOG] Channel: ${payload.channel} | Template: ${payload.template} | Recipient: ${payload.recipient}`);

  return {
    success: true,
    logId: res.lastInsertRowid as number
  };
}
