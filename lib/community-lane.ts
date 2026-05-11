export type CommunityLane = "latino" | "south_asian";

export function parseCommunityLane(raw: unknown): CommunityLane | null {
  if (raw === "latino" || raw === "south_asian") return raw;
  return null;
}

/** When `categoryLanes` is unset, the category is shown for every lane. When set, only if it includes `lane` or `lane` is unset (anonymous / not chosen). */
export function categoryVisibleForLane(
  lane: CommunityLane | null | undefined,
  categoryLanes: CommunityLane[] | undefined
): boolean {
  if (!categoryLanes?.length) return true;
  if (lane == null) return true;
  return categoryLanes.includes(lane);
}
