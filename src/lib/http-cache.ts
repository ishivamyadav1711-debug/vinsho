/**
 * Lets Vercel's edge cache keep a server-rendered public page for a short time, so most
 * visitors get a cached copy instead of a fresh render (and its database round trips).
 *
 * Only for pages with nothing per-visitor rendered on the server (no session, no cookies).
 * `Vercel-CDN-Cache-Control` applies to Vercel's edge only; browsers keep the default
 * (always revalidate), so a visitor never holds a stale copy themselves.
 *
 * Edits made in the CRM show up within ~60s; after that the first request triggers a
 * background refresh while still being answered from the cache.
 */
export function cachePublicPage(response: { headers: Headers }, seconds = 60): void {
  response.headers.set('Vercel-CDN-Cache-Control', `s-maxage=${seconds}, stale-while-revalidate=600`);
}
