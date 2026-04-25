/**
 * Pure version of the "isViewedUnderBasis" decision used by the
 * Viewed-Visitors KPI on /admin/staff-home.
 *
 * Extracted from StaffHome.tsx so it can be unit-tested in isolation
 * (no React, no Supabase, no time-of-day side effects beyond `rangeStartISO`
 * which is injected explicitly by the caller).
 *
 * Contract:
 * - "all_time": qualifies as soon as ANY view exists for one of the visitor's keys.
 * - "range":    qualifies if the chosen anchor timestamp >= rangeStartISO.
 * - "event_day": qualifies if the chosen anchor timestamp falls on the same
 *                local calendar day as the visitor's last_visit.
 *
 * Anchor selection:
 * - "last":  uses the LATEST timestamp across the visitor's keys (lexicographic
 *            max on ISO strings — works because ISO 8601 sorts chronologically).
 * - "first": uses the EARLIEST timestamp.
 *
 * Returns false if a date-based mode is requested but no anchor timestamp
 * is known for the visitor (matches the production behavior — these visitors
 * are surfaced separately via the "missing timestamp" KPI sub-text).
 */
import { viewedOnVisitDay } from "./visitDayMatch";

export type ViewedBasis = "range" | "event_day" | "all_time";
export type ViewedAnchor = "first" | "last";

export interface VisitorRef {
  user_id: string | null;
  session_key: string | null;
  last_visit: string;
}

export interface ViewedUnderBasisInput {
  visitor: VisitorRef;
  basis: ViewedBasis;
  anchor: ViewedAnchor;
  /** Set of `u:<user_id>` / `s:<session_key>` strings that have been viewed at least once. */
  viewedKeys: Set<string>;
  /** Per-key LAST view timestamp (ISO). */
  viewedAtMap: Map<string, string>;
  /** Per-key FIRST view timestamp (ISO). */
  viewedFirstAtMap: Map<string, string>;
  /** ISO timestamp marking the inclusive start of the "range" mode window. */
  rangeStartISO: string;
}

export function isViewedUnderBasis(input: ViewedUnderBasisInput): boolean {
  const { visitor, basis, anchor, viewedKeys, viewedAtMap, viewedFirstAtMap, rangeStartISO } = input;

  const keys: string[] = [];
  if (visitor.user_id) keys.push(`u:${visitor.user_id}`);
  if (visitor.session_key) keys.push(`s:${visitor.session_key}`);
  if (keys.length === 0) return false;

  const baseHit = keys.some((k) => viewedKeys.has(k));
  if (!baseHit) return false;
  if (basis === "all_time") return true;

  const anchorMap = anchor === "first" ? viewedFirstAtMap : viewedAtMap;
  let viewedAt: string | null = null;
  for (const k of keys) {
    const t = anchorMap.get(k);
    if (!t) continue;
    if (!viewedAt) { viewedAt = t; continue; }
    if (anchor === "first" ? t < viewedAt : t > viewedAt) viewedAt = t;
  }
  if (!viewedAt) return false;

  if (basis === "range") return viewedAt >= rangeStartISO;
  if (basis === "event_day") return viewedOnVisitDay(viewedAt, visitor.last_visit);
  return baseHit;
}
