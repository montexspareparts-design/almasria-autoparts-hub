import { describe, it, expect } from "vitest";
import {
  cairoToday,
  cairoDaysAgo,
  cairoDayBoundsUTC,
  isWithinCairoToday,
} from "./handledTasks";

describe("Cairo-day helpers (single source of truth for 'today')", () => {
  it("cairoToday returns YYYY-MM-DD shape", () => {
    expect(cairoToday()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("cairoDaysAgo returns an earlier or equal date", () => {
    const today = cairoToday();
    const ago30 = cairoDaysAgo(30);
    expect(ago30).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(ago30 <= today).toBe(true);
  });

  it("cairoDayBoundsUTC: a known Cairo date starts at 22:00 UTC the previous day", () => {
    // 2026-05-03 in Cairo = 2026-05-02T22:00:00Z (Cairo is UTC+2 year-round)
    const { startMs, endMs } = cairoDayBoundsUTC("2026-05-03");
    expect(new Date(startMs).toISOString()).toBe("2026-05-02T22:00:00.000Z");
    expect(new Date(endMs).toISOString()).toBe("2026-05-03T22:00:00.000Z");
    expect(endMs - startMs).toBe(24 * 60 * 60 * 1000);
  });

  it("isWithinCairoToday picks today and rejects yesterday/tomorrow", () => {
    const now = new Date();
    const today = cairoToday(now);
    const { startMs, endMs } = cairoDayBoundsUTC(today);
    // Inside the window
    expect(isWithinCairoToday(new Date(startMs).toISOString(), now)).toBe(true);
    expect(isWithinCairoToday(new Date(startMs + 5 * 3600_000).toISOString(), now)).toBe(true);
    expect(isWithinCairoToday(new Date(endMs - 1).toISOString(), now)).toBe(true);
    // Just before / just after
    expect(isWithinCairoToday(new Date(startMs - 1).toISOString(), now)).toBe(false);
    expect(isWithinCairoToday(new Date(endMs).toISOString(), now)).toBe(false);
  });

  it("isWithinCairoToday handles malformed/empty input", () => {
    expect(isWithinCairoToday(null)).toBe(false);
    expect(isWithinCairoToday(undefined)).toBe(false);
    expect(isWithinCairoToday("")).toBe(false);
    expect(isWithinCairoToday("not-a-date")).toBe(false);
  });

  it("BUG REGRESSION: 01:30 Cairo (= 23:30 UTC prev day) counts as TODAY", () => {
    // The old code used `new Date(\`${todayDate}T00:00:00.000Z\`)` which would
    // exclude anything before 02:00 Cairo. Verify the new helper includes it.
    const cairoNow = new Date("2026-05-03T03:00:00Z"); // 05:00 Cairo on 2026-05-03
    expect(cairoToday(cairoNow)).toBe("2026-05-03");
    // 01:30 Cairo on 2026-05-03 = 23:30 UTC on 2026-05-02
    const earlyMorningCairo = "2026-05-02T23:30:00.000Z";
    expect(isWithinCairoToday(earlyMorningCairo, cairoNow)).toBe(true);
  });
});
