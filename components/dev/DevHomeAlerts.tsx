"use client";

/**
 * Dev-only callouts on the home page. Props are computed on the server so the
 * banner is stable across SSR + hydration (avoids env inlining mismatches).
 */
export function DevHomeAlerts({
  missingSupabase,
  pendingServices,
}: {
  missingSupabase: boolean;
  pendingServices: boolean;
}) {
  if (!missingSupabase && !pendingServices) return null;

  return (
    <>
      {missingSupabase && (
        <div className="max-w-5xl mx-auto px-4 pt-4">
          <div
            translate="no"
            className="notranslate rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950"
          >
            <strong>Local setup:</strong> Add <code className="text-xs">.env.local</code> with{" "}
            <code className="text-xs">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
            <code className="text-xs">SUPABASE_SERVICE_ROLE_KEY</code> (see <code className="text-xs">.env.example</code>
            ). Then run <code className="text-xs">npm run dev</code> — not <code className="text-xs">npm dev</code>.
          </div>
        </div>
      )}
      {pendingServices && (
        <div className="max-w-5xl mx-auto px-4 pt-4">
          <div
            translate="no"
            className="notranslate rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-950"
          >
            <strong>Dev only:</strong> <code className="text-xs">SHOW_PENDING_SERVICES=true</code> — listings in{" "}
            <strong>service</strong> categories (Beauty, Childcare, Tutoring, etc.) may include <em>unverified</em> rows.
            Production still requires admin verification.
          </div>
        </div>
      )}
    </>
  );
}
