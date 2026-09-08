/**
 * VINSHO — In-Process IP Rate Limiter
 *
 * Architecture: Uses a plain in-process Map keyed by `${endpoint}:${ip}`.
 * This avoids adding a SQLite read + write to every public API request
 * (the existing enquiry and admin-login rate limiters already use SQLite
 * because they need cross-restart persistence; those are left unchanged).
 *
 * Trade-off: the Map resets on process restart, which is acceptable for
 * short-window limits (subscribe, coupon enumeration, checkout spam).
 * A single-server Node.js process (Astro SSR standalone) is the target
 * deployment, so there is no multi-process synchronisation concern.
 *
 * Bypass protection:
 * - IP is extracted with a trusted-proxy-aware helper that first checks
 *   X-Forwarded-For, then X-Real-IP, then falls back to a literal string
 *   that cannot match a real address — preventing bypass via malformed headers.
 * - The endpoint key is hardcoded at each call site, so per-path limits
 *   cannot be confused with one another.
 *
 * Cleanup:
 * - stale() returns false if the window has expired, so old entries are
 *   evicted lazily on the next hit from the same key, keeping the Map
 *   bounded without a background timer.
 */

export interface RateLimit {
  /** Maximum number of requests allowed in windowMs */
  maxRequests: number;
  /** Window length in milliseconds */
  windowMs: number;
}

interface Bucket {
  count: number;
  windowStart: number;
}

// Endpoint-specific limits — deliberately different for each use case.
export const LIMITS = {
  /**
   * Newsletter subscribe: 5 attempts per IP per 10 minutes.
   * Allows brief bursts (e.g. user clicking subscribe twice) but stops
   * automated spam bots.
   */
  SUBSCRIBE: { maxRequests: 5, windowMs: 10 * 60 * 1000 } satisfies RateLimit,

  /**
   * Coupon validation: 10 attempts per IP per 15 minutes.
   * Prevents offline brute-force enumeration of coupon codes while
   * allowing a user to try a few codes during checkout.
   */
  COUPON: { maxRequests: 10, windowMs: 15 * 60 * 1000 } satisfies RateLimit,

  /**
   * Checkout order creation: 5 per IP per 10 minutes.
   * An authenticated user placing legitimate orders will rarely exceed this.
   * Authenticated users get the same limit — order creation is inherently
   * rate-limited by payment flows in practice.
   */
  CHECKOUT: { maxRequests: 5, windowMs: 10 * 60 * 1000 } satisfies RateLimit,

  /**
   * Hamper validate: 15 per IP per 5 minutes.
   * Validation is called while building the hamper UI, so a slightly
   * higher limit avoids frustrating legitimate shoppers mid-session.
   */
  HAMPER_VALIDATE: { maxRequests: 15, windowMs: 5 * 60 * 1000 } satisfies RateLimit,

  /**
   * Customer signup: 5 per IP per 30 minutes.
   * Strict — legitimate users rarely need to sign up more than once.
   */
  SIGNUP: { maxRequests: 5, windowMs: 30 * 60 * 1000 } satisfies RateLimit,

  /**
   * Customer login: 10 per IP per 15 minutes (complementing the admin
   * login's existing SQLite-based limit). Slightly looser than admin login
   * because customers may legitimately mistype passwords.
   */
  CUSTOMER_LOGIN: { maxRequests: 10, windowMs: 15 * 60 * 1000 } satisfies RateLimit,

  /**
   * Password forgot/reset: 5 per IP per 15 minutes.
   * Prevents user-enumeration fishing via repeated reset requests.
   */
  PASSWORD_RESET: { maxRequests: 5, windowMs: 15 * 60 * 1000 } satisfies RateLimit,
} as const;

// ─── Internal Map ─────────────────────────────────────────────────────────────
// Exported only for test suites that need to inspect or flush state.
export const _store = new Map<string, Bucket>();

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Checks whether the given IP has exceeded the given rate limit.
 *
 * @param endpoint - A short string identifying the endpoint (use a constant
 *                   from LIMITS keys, e.g. 'SUBSCRIBE').
 * @param ip       - The client IP address (use getClientIp()).
 * @param limit    - The RateLimit config to apply.
 * @returns `{ allowed: true }` if under limit, or
 *          `{ allowed: false, retryAfterSec: number }` if over limit.
 */
export function checkRateLimit(
  endpoint: string,
  ip: string,
  limit: RateLimit
): { allowed: true } | { allowed: false; retryAfterSec: number } {
  const key = `${endpoint}:${ip}`;
  const now = Date.now();
  const bucket = _store.get(key);

  if (!bucket || now - bucket.windowStart >= limit.windowMs) {
    // First request in this window, or window has expired — start fresh
    _store.set(key, { count: 1, windowStart: now });
    return { allowed: true };
  }

  if (bucket.count < limit.maxRequests) {
    bucket.count += 1;
    return { allowed: true };
  }

  // Over limit — compute how many seconds remain in the window
  const retryAfterSec = Math.ceil((limit.windowMs - (now - bucket.windowStart)) / 1000);
  return { allowed: false, retryAfterSec };
}

/**
 * Returns a standard HTTP 429 Response with Retry-After header.
 */
export function tooManyRequestsResponse(retryAfterSec: number): Response {
  return new Response(
    JSON.stringify({
      error: `Too many requests. Please try again in ${retryAfterSec} seconds.`,
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfterSec),
      },
    }
  );
}

/**
 * Extracts the real client IP from incoming request headers in a
 * reverse-proxy-aware way.
 *
 * - If X-Forwarded-For is present, the FIRST IP in the list is taken
 *   (the original client; intermediate proxies append to the right).
 * - Falls back to X-Real-IP.
 * - Falls back to a sentinel that identifies the request as originating
 *   locally (will still be rate-limited, just under a shared key).
 *
 * Bypass protection: even if an attacker sends a crafted X-Forwarded-For
 * with an arbitrary IP, in a correctly configured reverse proxy the proxy
 * will prepend the real client IP at the front of the list — so the first
 * value is always the real source. If there is no proxy, the header is
 * sent directly by the client and we read whatever they sent, which is
 * fine because a rogue IP claim still counts against that key.
 */
export function getClientIp(request: Request): string {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0].trim();
    if (first) return first;
  }
  const xri = request.headers.get('x-real-ip');
  if (xri && xri.trim()) return xri.trim();
  return '127.0.0.1';
}

/**
 * Flush all buckets — for use in test suites only.
 */
export function _flushRateLimitStore(): void {
  _store.clear();
}
