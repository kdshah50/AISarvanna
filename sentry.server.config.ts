import * as Sentry from "@sentry/nextjs";
import { SENTRY_ACTIVE, SENTRY_DSN } from "./lib/sentry-config";

Sentry.init({
  dsn: SENTRY_DSN || undefined,
  enabled: SENTRY_ACTIVE,
  tracesSampleRate: 0.05,
  environment: process.env.VERCEL_ENV || process.env.NODE_ENV,
});
