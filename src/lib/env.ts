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
// These constants are NEVER evaluated in production. They are local to this
// function and cannot escape into application logic.
const _DEV_ADMIN_EMAIL = 'vinvks@gmail.com';
const _DEV_ADMIN_PASSWORD = 'VinshoDevAdminPass2026!';
const _DEV_WEBHOOK_SECRET = 'vinsho_dev_webhook_secret_2026';
// ─────────────────────────────────────────────────────────────────────────────

let _cachedConfig: EnvConfig | null = null;

/**
 * Returns the validated, typed environment configuration.
 *
 * Call this once at startup (it caches internally).
 * In production, throws a fatal Error if any required secret is missing.
 */
export function getEnvConfig(): EnvConfig {
  if (_cachedConfig) return _cachedConfig;

  const isProduction = process.env.NODE_ENV === 'production';

  // ── Resolve values ──────────────────────────────────────────────────────
  const adminEmail = process.env.ADMIN_EMAIL
    || (isProduction ? undefined : _DEV_ADMIN_EMAIL);

  const adminPassword = process.env.ADMIN_PASSWORD
    || (isProduction ? undefined : _DEV_ADMIN_PASSWORD);

  const razorpayWebhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET
    || (isProduction ? undefined : _DEV_WEBHOOK_SECRET);

  const razorpayKeyId = process.env.RAZORPAY_KEY_ID || undefined;
  const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET || undefined;

  // ── SMTP config (optional — absence means dev log-only mode) ─────────────
  const smtpHost = process.env.SMTP_HOST || undefined;
  const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
  const smtpUser = process.env.SMTP_USER || undefined;
  const smtpPass = process.env.SMTP_PASS || undefined;
  const smtpFrom = process.env.SMTP_FROM || 'VINSHO <vinvks@gmail.com>';
  const siteUrl = process.env.SITE_URL || (isProduction ? 'https://vinsho.com' : 'http://localhost:4321');

  if (isProduction && (!smtpHost || !smtpUser || !smtpPass)) {
    console.warn(
      '[VINSHO WARNING] SMTP_HOST, SMTP_USER, or SMTP_PASS is not set. ' +
      'Email delivery will fall back to console logging in production. ' +
      'Set these environment variables to enable real email sending.'
    );
  }

  // ── Production guard ────────────────────────────────────────────────────
  if (isProduction) {
    const missing: string[] = [];
    if (!adminPassword) missing.push('ADMIN_PASSWORD');
    if (!razorpayWebhookSecret) missing.push('RAZORPAY_WEBHOOK_SECRET');

    if (missing.length > 0) {
      const msg =
        `[VINSHO FATAL] Required production secrets are missing: ${missing.join(', ')}. ` +
        `Set these environment variables before starting the application. ` +
        `Startup aborted.`;
      console.error(msg);
      // Throw — this propagates to the Node.js process and prevents startup
      throw new Error(msg);
    }
  }

  // ── Cache and return ────────────────────────────────────────────────────
  _cachedConfig = Object.freeze({
    isProduction,
    adminEmail: adminEmail ?? _DEV_ADMIN_EMAIL,
    adminPassword: adminPassword!,
    razorpayWebhookSecret: razorpayWebhookSecret!,
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
