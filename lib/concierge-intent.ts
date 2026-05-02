/**
 * Structured concierge / booking-intent extracted from NL search queries.
 * Search still uses keyword_sparse + price; this is additive for booking flows later.
 */

export type ConciergeWindowHint = {
  source: "llm" | "regex" | "none" | "merged";
  /** Phrase inferred from text, e.g. "this Saturday" */
  rawPhrase?: string;
  /** Lowercase weekday name when known */
  weekdayName?: string;
  /** Matches `Date.prototype.getDay()` (0 Sun … 6 Sat) */
  weekdayIndex?: number;
};

export type ConciergeRequest = {
  /** Which layer(s) populated the object */
  source: "none" | "llm" | "regex" | "merged";
  /** Short staffing label ("house cleaning", "personal trainer"), not necessarily tokens for ILIKE */
  serviceHint?: string;
  /** Mirrors parsed price ceiling (USD cents, same column as listings.price_mxn) */
  budgetMaxCents?: number;
  budgetMinCents?: number;
  preferredWindow?: ConciergeWindowHint;
};

const WEEKDAY_TO_INDEX: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

const DAY_PATTERN =
  "sunday|monday|tuesday|wednesday|thursday|friday|saturday";

function weekdayFromMatch(m: RegExpExecArray): ConciergeWindowHint {
  const g = (m[1] ?? m[2] ?? "").toLowerCase();
  const idx = WEEKDAY_TO_INDEX[g];
  const source: ConciergeWindowHint["source"] = "regex";
  if (typeof idx === "number") {
    return { source, rawPhrase: m[0].trim(), weekdayName: g, weekdayIndex: idx };
  }
  return { source: "regex", rawPhrase: m[0].trim() };
}

/** Heuristic weekday / weekend cues + common service wording (regex-only path). */
export function regexExtractConciergeHints(query: string): Partial<ConciergeRequest> {
  const q = query.trim();
  if (!q) return {};

  const out: Partial<ConciergeRequest> = {};
  const lower = q.toLowerCase();

  const serviceMatch =
    lower.match(
      /\b(house|home|deep|move-?out)\s+clean(ing|er)?\b|\bmaid\s+service\b|\b(limpieza|limpiar)\s+(casa|hogar|departamento)\b/i,
    ) ||
    lower.match(/\bhouse\s+cleaner\b/) ||
    lower.match(/\bdomestic\s+clean(ing)?\b/);
  if (serviceMatch) {
    out.serviceHint = "house cleaning";
  }

  let window: ConciergeWindowHint | undefined;

  const weekend = q.match(new RegExp(`\\b(this|next)\\s+weekend\\b`, "i"));
  if (weekend) {
    window = {
      source: "regex",
      rawPhrase: weekend[0].trim(),
      weekdayName: "saturday",
      weekdayIndex: 6,
    };
  }

  const thisDay = new RegExp(`\\bthis\\s+(${DAY_PATTERN})\\b`, "i").exec(q);
  if (thisDay) {
    window = weekdayFromMatch(thisDay);
  }

  const nextDay = new RegExp(`\\bnext\\s+(${DAY_PATTERN})\\b`, "i").exec(q);
  if (nextDay) {
    window = weekdayFromMatch(nextDay);
  }

  const onDay = new RegExp(`\\bon\\s+(${DAY_PATTERN})\\b`, "i").exec(q);
  if (!window && onDay) {
    window = weekdayFromMatch(onDay);
  }

  const bareDay = new RegExp(`\\b(${DAY_PATTERN})\\b`, "i").exec(q);
  if (!window && bareDay && /\b(today|tomorrow|this|next|on)\b/i.test(q)) {
    window = weekdayFromMatch(bareDay);
  }

  if (window) out.preferredWindow = window;
  return out;
}

function normWeekday(raw: string | null | undefined): { name: string; index: number } | undefined {
  if (raw == null || typeof raw !== "string") return undefined;
  const n = raw.trim().toLowerCase();
  if (!n) return undefined;
  const idx = WEEKDAY_TO_INDEX[n];
  if (typeof idx !== "number") return undefined;
  return { name: n, index: idx };
}

export type LlmConciergeFields = {
  concierge_service_hint?: string | null;
  concierge_time_hint?: string | null;
  preferred_weekday?: string | null;
};

export function conciergeFromLlmFields(f: LlmConciergeFields): ConciergeRequest {
  const service =
    typeof f.concierge_service_hint === "string" && f.concierge_service_hint.trim()
      ? f.concierge_service_hint.trim()
      : undefined;
  const timeRaw =
    typeof f.concierge_time_hint === "string" && f.concierge_time_hint.trim()
      ? f.concierge_time_hint.trim()
      : undefined;
  const wd = normWeekday(f.preferred_weekday ?? undefined);

  let preferredWindow: ConciergeWindowHint | undefined;
  if (timeRaw || wd) {
    preferredWindow = {
      source: "llm",
      rawPhrase: timeRaw ?? wd?.name,
      weekdayName: wd?.name,
      weekdayIndex: wd?.index,
    };
  }

  const hasAny = !!(service || preferredWindow);
  return {
    source: hasAny ? "llm" : "none",
    serviceHint: service,
    ...(preferredWindow ? { preferredWindow } : {}),
  };
}

/** Prefer LLM service/time; fill gaps from regex. Always attach budget from parsed filters. */
export function finalizeConciergeRequest(
  fromLlm: ConciergeRequest | undefined,
  regexPartial: Partial<ConciergeRequest>,
  budgetMaxCents?: number,
  budgetMinCents?: number,
): ConciergeRequest | undefined {
  const hasRegex =
    !!regexPartial.serviceHint ||
    !!regexPartial.preferredWindow?.rawPhrase ||
    regexPartial.preferredWindow?.weekdayIndex != null;
  const hasLlm =
    fromLlm != null &&
    fromLlm.source !== "none" &&
    !!(fromLlm.serviceHint ||
      fromLlm.preferredWindow?.rawPhrase ||
      fromLlm.preferredWindow?.weekdayIndex != null);

  if (!hasLlm && !hasRegex && budgetMaxCents == null && budgetMinCents == null) {
    return undefined;
  }

  let source: ConciergeRequest["source"] = "none";
  if (hasLlm && hasRegex) source = "merged";
  else if (hasLlm) source = "llm";
  else if (hasRegex) source = "regex";

  const rw = regexPartial.preferredWindow;
  const lw = fromLlm?.preferredWindow;

  const preferredWindow: ConciergeWindowHint | undefined = (() => {
    if (lw?.rawPhrase || lw?.weekdayIndex != null) {
      if (rw && !lw.weekdayIndex && rw.weekdayIndex != null) {
        return {
          source: "merged",
          rawPhrase: lw.rawPhrase ?? rw.rawPhrase,
          weekdayName: lw.weekdayName ?? rw.weekdayName,
          weekdayIndex: lw.weekdayIndex ?? rw.weekdayIndex,
        };
      }
      return { ...lw, source: lw.source === "none" ? "llm" : lw.source };
    }
    if (rw) return { ...rw, source: "regex" };
    return undefined;
  })();

  return {
    source,
    serviceHint: fromLlm?.serviceHint ?? regexPartial.serviceHint,
    budgetMaxCents: budgetMaxCents ?? fromLlm?.budgetMaxCents,
    budgetMinCents: budgetMinCents ?? fromLlm?.budgetMinCents,
    ...(preferredWindow ? { preferredWindow } : {}),
  };
}
