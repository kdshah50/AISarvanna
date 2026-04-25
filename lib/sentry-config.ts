/** Shared Sentry init options — only sends when DSN is set in production (Vercel). */
export const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN?.trim() ?? "";
export const SENTRY_ACTIVE =
  Boolean(SENTRY_DSN) && process.env.NODE_ENV === "production";
