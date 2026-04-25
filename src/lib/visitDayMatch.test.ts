import { describe, it, expect } from "vitest";
import { isSameLocalCalendarDay, viewedOnVisitDay } from "./visitDayMatch";

describe("visitDayMatch — يوم الزيارة (calendar-day, local TZ)", () => {
  it("returns true for two timestamps on the same local calendar day", () => {
    const visit = new Date(2026, 3, 25, 9, 15, 0); // Apr 25 2026, 09:15 local
    const view = new Date(2026, 3, 25, 23, 59, 0); // same local day, late evening
    expect(isSameLocalCalendarDay(visit, view)).toBe(true);
    expect(viewedOnVisitDay(view, visit)).toBe(true);
  });

  it("returns false when timestamps fall on different local calendar days", () => {
    const visit = new Date(2026, 3, 25, 23, 30, 0); // Apr 25, late
    const view = new Date(2026, 3, 26, 0, 5, 0); // Apr 26, just after midnight
    expect(isSameLocalCalendarDay(visit, view)).toBe(false);
    expect(viewedOnVisitDay(view, visit)).toBe(false);
  });

  it("matches by calendar day, not by elapsed hours", () => {
    // Only ~1 hour apart but across midnight → DIFFERENT days
    const visit = new Date(2026, 3, 25, 23, 30, 0);
    const view = new Date(2026, 3, 26, 0, 30, 0);
    expect(viewedOnVisitDay(view, visit)).toBe(false);

    // ~14 hours apart but within the same day → SAME day
    const visit2 = new Date(2026, 3, 25, 8, 0, 0);
    const view2 = new Date(2026, 3, 25, 22, 0, 0);
    expect(viewedOnVisitDay(view2, visit2)).toBe(true);
  });

  it("handles ISO strings the same way as Date objects", () => {
    // Build local-time ISO so the test is timezone-agnostic
    const visit = new Date(2026, 3, 25, 12, 0, 0);
    const view = new Date(2026, 3, 25, 18, 30, 0);
    expect(viewedOnVisitDay(view.toISOString(), visit.toISOString())).toBe(true);
  });

  it("returns false on null/undefined or invalid inputs", () => {
    expect(viewedOnVisitDay(null, new Date())).toBe(false);
    expect(viewedOnVisitDay(new Date(), undefined)).toBe(false);
    expect(viewedOnVisitDay("not-a-date", new Date().toISOString())).toBe(false);
  });
});
