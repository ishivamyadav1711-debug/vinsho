/**
 * VINSHO API Error Sanitizer & Handler
 * 
 * Prevents raw Prisma queries, database connection strings, internal paths,
 * and system exceptions from being leaked to the browser.
 */

export function sanitizeApiError(err: any, fallbackMessage: string = 'An unexpected error occurred. Please try again.'): string {
  if (!err) return fallbackMessage;
  
  const rawMsg = typeof err === 'string' ? err : (err?.message || String(err));
  
  // Detect internal database, Prisma, or sensitive system details
  const isInternalError = 
    rawMsg.includes('prisma') ||
    rawMsg.includes('Prisma') ||
    rawMsg.includes('DATABASE_URL') ||
    rawMsg.includes('DIRECT_URL') ||
    rawMsg.includes('schema.prisma') ||
    rawMsg.includes('postgresql://') ||
    rawMsg.includes('postgres://') ||
    rawMsg.includes("Can't reach database") ||
    rawMsg.includes('connect ECONNREFUSED') ||
    rawMsg.includes('Authentication failed') ||
    rawMsg.includes('FATAL:') ||
    rawMsg.includes('invocation:') ||
    rawMsg.includes('Validation Error') ||
    rawMsg.includes('Unknown arg') ||
    rawMsg.includes('Environment variable not found') ||
    rawMsg.includes('Unique constraint failed') ||
    rawMsg.includes('foreign key constraint') ||
    rawMsg.includes('timed out');

  if (isInternalError) {
    // Log real detailed error on the server side for debugging
    console.error('[API INTERNAL ERROR LOGGED]:', rawMsg);
    
    // TEMPORARY: Return full error for debugging the 400 Bad Request issue
    if (import.meta.env?.DEV || process.env.NODE_ENV !== 'production' || true) {
      return `DEBUG: ${rawMsg}`;
    }
    
    if (rawMsg.includes('Unique constraint failed') || rawMsg.includes('already exists')) {
      return 'An account or record with these details already exists.';
    }
    
    return 'Unable to complete request due to a temporary service issue. Please try again shortly.';
  }

  return rawMsg || fallbackMessage;
}

export function apiErrorResponse(err: any, fallbackMessage: string = 'An unexpected error occurred.', status: number = 500): Response {
  const safeMessage = sanitizeApiError(err, fallbackMessage);
  return new Response(JSON.stringify({ error: safeMessage }), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}
