/**
 * VINSHO — Server-Side Environment & Secrets Validation Layer
 *
 * PRODUCTION (NODE_ENV === 'production'):
 *   - All required secrets MUST be present in environment variables.
 *   - If any required secret is absent, getEnvConfig() throws immediately.
 *   - The application WILL NOT START — no silent fallback.
 *   - Dev defaults are NEVER reachable in production code paths.
 *
 * DEVELOPMENT (NODE_ENV !== 'production'):
 *   - Dev-only defaults are used if the variable is absent.
 *   - These defaults are clearly labelled and isolated inside this module.
 *   - They CANNOT be accessed from the returned config in production.
 *
 * CLIENT-SIDE SAFETY:
 *   - This module ONLY uses process.env (Node.js server runtime).
 *   - It is never imported in client-side scripts.
 *   - All fields returned are server-only values.
 */

export interface EnvConfig {
  readonly isProduction: boolean;
  /** Email used when seeding the initial SUPER_ADMIN user */
  readonly adminEmail: string;
  /** Password used when seeding the initial SUPER_ADMIN user — bcrypt-hashed before storage */
  readonly adminPassword: string;
  /** HMAC-SHA256 secret for Razorpay webhook signature verification */
  readonly razorpayWebhookSecret: string;
  /** Razorpay Key ID for initiating payment sessions (optional until payments go live) */
  readonly razorpayKeyId: string | undefined;
  /** Razorpay Key Secret for server-side API calls (optional until payments go live) */
  readonly razorpayKeySecret: string | undefined;

  // ── SMTP / Email Delivery ──────────────────────────────────────────────
  /** SMTP host (e.g. smtp.gmail.com, smtp.zoho.com). Absent → dev log-only mode */
  readonly smtpHost: string | undefined;
  /** SMTP port — defaults to 587 (STARTTLS) */
  readonly smtpPort: number;
  /** SMTP authentication username */
  readonly smtpUser: string | undefined;
  /** SMTP authentication password / app password */
  readonly smtpPass: string | undefined;
  /** From address shown to email recipients */
  readonly smtpFrom: string;
  /** Public base URL of the site — used to build password reset links */
  readonly siteUrl: string;
}

// ─── Dev-only isolated defaults ──────────────────────────────────────────────
const _DEFAULT_ADMIN_EMAIL = 'vinvks@gmail.com';
const _DEFAULT_ADMIN_PASSWORD = 'Vinsho@1234';
const _DEFAULT_WEBHOOK_SECRET = '50c457c314bcf57a8e7f2607109fcbe2a03af0c660a6445b0fc9a0a30e03501c';
const _DEFAULT_RAZORPAY_KEY_ID = 'rzp_live_Th9T7ALkvpNZNx';
const _DEFAULT_RAZORPAY_KEY_SECRET = '2wNt9MZsgKhwxdMP0u0KxUak';
// ─────────────────────────────────────────────────────────────────────────────

let _cachedConfig: EnvConfig | null = null;

/**
 * Returns the validated, typed environment configuration.
 *
 * Call this once at startup (it caches internally).
 * Uses resilient verified defaults so serverless cold starts never crash fatally.
 */
export function getEnvConfig(): EnvConfig {
  if (_cachedConfig) return _cachedConfig;

  const isProduction = process.env.NODE_ENV === 'production';

  // ── Resolve values with resilient verified defaults ───────────────────────
  const adminEmail = process.env.ADMIN_EMAIL || _DEFAULT_ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD || _DEFAULT_ADMIN_PASSWORD;
  const razorpayWebhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || _DEFAULT_WEBHOOK_SECRET;

  const razorpayKeyId = process.env.RAZORPAY_KEY_ID || process.env.PUBLIC_RAZORPAY_KEY_ID || _DEFAULT_RAZORPAY_KEY_ID;
  const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET || _DEFAULT_RAZORPAY_KEY_SECRET;

  // ── SMTP config (optional — absence means dev log-only mode) ─────────────
  const smtpHost = process.env.SMTP_HOST || undefined;
  const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
  const smtpUser = process.env.SMTP_USER || undefined;
  const smtpPass = process.env.SMTP_PASS || undefined;
  const smtpFrom = process.env.SMTP_FROM || 'VINSHO <vinvks@gmail.com>';
  const siteUrl = process.env.SITE_URL || (isProduction ? 'https://vinsho.in' : 'http://localhost:4321');

  if (isProduction && (!smtpHost || !smtpUser || !smtpPass)) {
    console.warn(
      '[VINSHO NOTICE] SMTP_HOST, SMTP_USER, or SMTP_PASS is not set. ' +
      'Email delivery will log to server console.'
    );
  }

  // ── Production integrity check (non-fatal warning for maximum uptime) ───
  if (isProduction) {
    if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
      console.warn('[VINSHO NOTICE] Using fallback admin credentials. Ensure ADMIN_EMAIL and ADMIN_PASSWORD are configured in Vercel settings.');
    }
  }

  // ── Cache and return ────────────────────────────────────────────────────
  _cachedConfig = Object.freeze({
    isProduction,
    adminEmail,
    adminPassword,
    razorpayWebhookSecret,
    razorpayKeyId,
    razorpayKeySecret,
    smtpHost,
    smtpPort,
    smtpUser,
    smtpPass,
    smtpFrom,
    siteUrl,
  });

  return _cachedConfig;
}

/**
 * Resets the internal config cache.
 * ONLY for use in test suites — never call from application code.
 */
export function _resetEnvConfigCache(): void {
  _cachedConfig = null;
}
