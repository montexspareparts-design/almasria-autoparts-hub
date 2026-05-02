// Pure helpers for TeamShortagesView — extracted to keep them unit-testable
// without rendering React or mocking Supabase.

export type StatusKey = "open" | "sourcing" | "fulfilled" | "rejected";
export type DateFilter = "all" | "today" | "yesterday" | "week";
export type TabKey = StatusKey | "all" | "arrived";

export interface ShortageRow {
  id: string;
  status: StatusKey;
  created_at: string;
  reviewed_at: string | null;
}

export interface DateRange {
  from: Date | null;
  to: Date | null;
}

/**
 * Compute the active date window for the given filter, relative to `now`.
 * `to` is exclusive. `from === null` means "no date filter".
 */
export function computeDateRange(dateFilter: DateFilter, now: Date = new Date()): DateRange {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (dateFilter === "today") {
    return { from: startOfToday, to: null };
  }
  if (dateFilter === "yesterday") {
    const startYesterday = new Date(startOfToday);
    startYesterday.setDate(startYesterday.getDate() - 1);
    return { from: startYesterday, to: startOfToday };
  }
  if (dateFilter === "week") {
    const start7 = new Date(startOfToday);
    start7.setDate(start7.getDate() - 6);
    return { from: start7, to: null };
  }
  return { from: null, to: null };
}

/**
 * The reference date used for date filtering: reviewed_at for fulfilled rows
 * (because "arrival" date is what the staff cares about), created_at otherwise.
 */
export function referenceDate<R extends ShortageRow>(row: R): Date {
  if (row.status === "fulfilled" && row.reviewed_at) return new Date(row.reviewed_at);
  return new Date(row.created_at);
}

/** Apply only the date range filter — used for the tab counters. */
export function applyDateRange<R extends ShortageRow>(rows: R[], range: DateRange): R[] {
  if (!range.from) return rows;
  return rows.filter(r => {
    const ref = referenceDate(r);
    if (range.to) return ref >= range.from! && ref < range.to;
    return ref >= range.from!;
  });
}

/** Counts per tab — must match what the user sees after the date filter is applied. */
export function computeCounts<R extends ShortageRow>(dateFilteredRows: R[]): Record<TabKey, number> {
  const c: Record<TabKey, number> = {
    all: dateFilteredRows.length,
    open: 0,
    sourcing: 0,
    fulfilled: 0,
    rejected: 0,
    arrived: 0,
  };
  dateFilteredRows.forEach(r => {
    c[r.status] = (c[r.status] || 0) + 1;
    if (r.status === "fulfilled") c.arrived += 1;
  });
  return c;
}

/** Apply the selected tab filter on top of an already-date-filtered list. */
export function applyTabFilter<R extends ShortageRow>(rows: R[], tab: TabKey): R[] {
  if (tab === "all") return rows;
  if (tab === "arrived") return rows.filter(r => r.status === "fulfilled");
  return rows.filter(r => r.status === tab);
}
