"use client";

import { useEffect } from "react";

const PING_MS = 12_000;

/**
 * Ping while any tab stays open against this origin. Paired with `/api/dev/heartbeat`:
 * once you close every tab (idle past threshold), Next dev exits and frees `:3006`.
 */
export default function DevBrowserHeartbeat() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    if (process.env.NEXT_PUBLIC_DEV_DISABLE_BROWSER_AUTOKILL === "1") return;

    const ping = () => {
      fetch("/api/dev/heartbeat", { method: "POST", keepalive: true }).catch(() => {});
    };
    ping();
    const id = setInterval(ping, PING_MS);
    const onHidden = () => {
      /** Best-effort: tab/window closing (not reliable everywhere). */
      ping();
    };
    window.addEventListener("pagehide", onHidden);

    return () => {
      clearInterval(id);
      window.removeEventListener("pagehide", onHidden);
    };
  }, []);

  return null;
}
