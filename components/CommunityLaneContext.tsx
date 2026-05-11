"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { CommunityLane } from "@/lib/community-lane";
import { parseCommunityLane } from "@/lib/community-lane";

type CommunityLaneCtx = {
  lane: CommunityLane | null;
  refresh: () => void;
};

const CommunityLaneContext = createContext<CommunityLaneCtx>({
  lane: null,
  refresh: () => {},
});

export function CommunityLaneProvider({ children }: { children: React.ReactNode }) {
  const [lane, setLane] = useState<CommunityLane | null>(null);

  const refresh = useCallback(() => {
    void fetch("/api/auth/me", { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { user?: { community_lane?: unknown } } | null) => {
        setLane(parseCommunityLane(d?.user?.community_lane));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <CommunityLaneContext.Provider value={{ lane, refresh }}>{children}</CommunityLaneContext.Provider>
  );
}

export function useCommunityLane() {
  return useContext(CommunityLaneContext);
}
