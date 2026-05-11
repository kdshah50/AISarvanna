import type { CommunityLane } from "@/lib/community-lane";
import { parseCommunityLane } from "@/lib/community-lane";

/** Survives sessions; merged with `users.community_lane` when logged in. */
export const COMMUNITY_LANE_STORAGE_KEY = "aisaravanna_community_lane";

export function readStoredCommunityLane(): CommunityLane | null {
  if (typeof window === "undefined") return null;
  try {
    return parseCommunityLane(localStorage.getItem(COMMUNITY_LANE_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function writeStoredCommunityLane(lane: CommunityLane): void {
  try {
    localStorage.setItem(COMMUNITY_LANE_STORAGE_KEY, lane);
  } catch {
    /* ignore quota / private mode */
  }
}
