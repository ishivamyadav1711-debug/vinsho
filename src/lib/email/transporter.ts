/**
 * VINSHO — Email Transporter
 *
 * Builds a nodemailer transport from environment config.
 *
 * Behaviour:
 * - If SMTP_HOST / SMTP_USER / SMTP_PASS are configured → real SMTP delivery.
 * - If any are absent → console-only dev-log mode (no mail sent, no crash).
 *
 * This module is imported ONLY from server-side code (Node.js).
 * It must never be bundled into client-side scripts.
 */

import nodemailer from 'nodemailer';
import type { Transporter, SendMailOptions } from 'nodemailer';
import { getEnvConfig } from '../env.js';

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  /** True when SMTP is not configured and the email was only logged locally */
  devLogOnly?: boolean;
}

let _transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (_transporter) return _transporter;

  const cfg = getEnvConfig();

  if (!cfg.smtpHost || !cfg.smtpUser || !cfg.smtpPass) {
    // No SMTP config — dev log-only mode
    return null;
  }

  _transporter = nodemailer.createTransport({
    host: cfg.smtpHost,
    port: cfg.smtpPort,
    secure: cfg.smtpPort === 465, // TLS for port 465, STARTTLS for 587 / 25
    auth: {
      user: cfg.smtpUser,
      pass: cfg.smtpPass,
    },
    // Respect a proxy / reverse-proxy env if needed
    tls: {
      rejectUnauthorized: cfg.isProduction, // strict TLS in production
    },
  });

  return _transporter;
}

/**
 * Sends a transactional email.
 *
 * Never throws — always returns a result object.
 * Email failures are logged but must not corrupt or block the calling workflow.
 */
export async function sendEmail(options: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<SendEmailResult> {
  const cfg = getEnvConfig();
  const transporter = getTransporter();

  if (!transporter) {
    // Dev log-only mode: log the email to console for local inspection
    console.log(
      `[DEV EMAIL LOG]\n` +
      `  To:      ${options.to}\n` +
      `  Subject: ${options.subject}\n` +
      `  Body preview: ${options.html.replace(/<[^>]+>/g, '').trim().slice(0, 200)}...`
    );
    return { success: true, devLogOnly: true };
  }

  const mailOptions: SendMailOptions = {
    from: cfg.smtpFrom,
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text || options.html.replace(/<[^>]+>/g, ''),
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (err: any) {
    console.error(`[EMAIL DELIVERY FAILURE] To: ${options.to} | Subject: ${options.subject} | Error: ${err.message}`);
    return { success: false, error: err.message };
  }
}

/**
 * Resets the cached transporter — for test suites only.
 */
export function _resetTransporter(): void {
  _transporter = null;
}
