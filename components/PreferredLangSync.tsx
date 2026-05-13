"use client";

import { Suspense, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { parseCommunityLane } from "@/lib/community-lane";
import { clampLangForLane, parseUiLang } from "@/lib/lang-for-lane";
import { DEFAULT_LANG, hrefWithLang, langFromParam, readStoredLang, writeStoredLang } from "@/lib/i18n-lang";
import { useCommunityLane } from "@/components/CommunityLaneContext";

function currentHref(pathname: string, params: URLSearchParams): string {
  const q = params.toString();
  return q ? `${pathname}?${q}` : pathname;
}

/**
 * Keeps UI language in sync: explicit `?lang=` wins.
 * Else logged-in user's `ui_lang` + community lane clamps; else localStorage; else English.
 */
function PreferredLangSyncInner() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { lane, ready, bootstrapped } = useCommunityLane();

  useEffect(() => {
    if (!ready || !bootstrapped) return;

    const langParam = params.get("lang");

    void (async () => {
      const curHref = () => currentHref(pathname, params);

      if (langParam != null && langParam.trim() !== "") {
        let r = langFromParam(langParam);
        r = clampLangForLane(r, lane);
        writeStoredLang(r);
        const target = hrefWithLang(pathname, r, params);
        if (target !== curHref()) router.replace(target);
        return;
      }

      try {
        const r = await fetch("/api/auth/me", { credentials: "same-origin" });
        if (r.ok) {
          const d = (await r.json()) as { user?: { ui_lang?: unknown; community_lane?: unknown } };
          const serverLane = parseCommunityLane(d?.user?.community_lane) ?? lane;
          const parsed = parseUiLang(d?.user?.ui_lang) ?? DEFAULT_LANG;
          const want = clampLangForLane(parsed, serverLane);

          writeStoredLang(want);
          const target = hrefWithLang(pathname, want, params);
          if (target !== curHref()) router.replace(target);
          return;
        }
      } catch {
        /* ignore */
      }

      const stored = readStoredLang();
      if (!stored || stored === DEFAULT_LANG) return;
      const want = clampLangForLane(stored, lane);
      writeStoredLang(want);
      const target = hrefWithLang(pathname, want, params);
      if (target !== curHref()) router.replace(target);
    })();
  }, [ready, bootstrapped, lane, pathname, params, router]);

  return null;
}

export default function PreferredLangSync() {
  return (
    <Suspense fallback={null}>
      <PreferredLangSyncInner />
    </Suspense>
  );
}
