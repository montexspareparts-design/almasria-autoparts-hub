/**
 * Helpers for the "يوم الزيارة" (visit day) matching used by the
 * Viewed-Visitors KPI on /admin/staff-home.
 *
 * Contract:
 * - Matches by *calendar day* (year + month + day) — not by elapsed hours.
 * - Uses the **local timezone** of the device viewing the dashboard,
 *   so a staff member sees "same day" exactly as they perceive it.
 * - Inputs are ISO timestamps (typically `last_visit` and the staff
 *   `viewed_at` from `visitor_session_views`).
 */
export function isSameLocalCalendarDay(a: string | Date, b: string | Date): boolean {
  const da = a instanceof Date ? a : new Date(a);
  const db = b instanceof Date ? b : new Date(b);
  if (Number.isNaN(da.getTime()) || Number.isNaN(db.getTime())) return false;
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

/**
 * Returns true if the staff `viewedAt` happened on the same local calendar day
 * as the visitor's `lastVisit`. Used by the "يوم الزيارة" basis toggle.
 */
export function viewedOnVisitDay(
  viewedAt: string | Date | null | undefined,
  lastVisit: string | Date | null | undefined
): boolean {
  if (!viewedAt || !lastVisit) return false;
  return isSameLocalCalendarDay(viewedAt, lastVisit);
}
