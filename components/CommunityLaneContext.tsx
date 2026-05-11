"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { CommunityLane } from "@/lib/community-lane";
import { parseCommunityLane } from "@/lib/community-lane";
import { readStoredCommunityLane, writeStoredCommunityLane } from "@/lib/community-lane-storage";

type CommunityLaneCtx = {
  lane: CommunityLane | null;
  /** Client hydrated `localStorage` (and started first merge). */
  ready: boolean;
  /** First `/api/auth/me` merge finished — avoids home modal flash for logged-in users. */
  bootstrapped: boolean;
  savingChoice: boolean;
  refresh: () => void;
  /** Persists to `localStorage` always; PATCHes profile when session exists (401 ignored). */
  saveCommunityLane: (lane: CommunityLane) => Promise<void>;
};

const CommunityLaneContext = createContext<CommunityLaneCtx>({
  lane: null,
  ready: false,
  bootstrapped: false,
  savingChoice: false,
  refresh: () => {},
  saveCommunityLane: async () => {},
});

export function CommunityLaneProvider({ children }: { children: React.ReactNode }) {
  const [lane, setLane] = useState<CommunityLane | null>(null);
  const [ready, setReady] = useState(false);
  const [bootstrapped, setBootstrapped] = useState(false);
  const [savingChoice, setSavingChoice] = useState(false);

  useEffect(() => {
    const stored = readStoredCommunityLane();
    if (stored) setLane(stored);
    setReady(true);
  }, []);

  const refresh = useCallback(() => {
    void (async () => {
      try {
        const r = await fetch("/api/auth/me", { credentials: "same-origin" });
        if (r.status === 401) return;
        if (!r.ok) return;

        const d = (await r.json()) as { user?: { community_lane?: unknown } };
        const server = parseCommunityLane(d?.user?.community_lane);
        const stored = readStoredCommunityLane();

        if (server) {
          writeStoredCommunityLane(server);
          setLane(server);
          return;
        }

        if (stored) {
          setLane(stored);
          await fetch("/api/auth/me", {
            method: "PATCH",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ community_lane: stored }),
          }).catch(() => {});
          return;
        }

        setLane(null);
      } catch {
        /* ignore */
      } finally {
        setBootstrapped(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!ready) return;
    refresh();
  }, [ready, refresh]);

  const saveCommunityLane = useCallback(async (choice: CommunityLane) => {
    setSavingChoice(true);
    try {
      writeStoredCommunityLane(choice);
      setLane(choice);
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ community_lane: choice }),
      });
      if (!res.ok && res.status !== 401) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "Could not save to profile");
      }
    } finally {
      setSavingChoice(false);
    }
  }, []);

  return (
    <CommunityLaneContext.Provider value={{ lane, ready, bootstrapped, savingChoice, refresh, saveCommunityLane }}>
      {children}
    </CommunityLaneContext.Provider>
  );
}

export function useCommunityLane() {
  return useContext(CommunityLaneContext);
}
