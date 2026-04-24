/**
 * Content-Security-Policy (Report-Only) for gradual tightening.
 * Does not block; logs violations in browser DevTools.
 * Next.js needs script-src with unsafe-inline/unsafe-eval for bundled client JS in production.
 * connect-src is permissive (https: wss:) to avoid breaking Supabase, APIs, and Stripe redirects.
 */
export const CSP_REPORT_ONLY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https: wss:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");
