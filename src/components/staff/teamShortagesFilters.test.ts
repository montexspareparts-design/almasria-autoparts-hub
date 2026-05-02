import { describe, it, expect } from "vitest";
import {
  computeDateRange,
  applyDateRange,
  computeCounts,
  applyTabFilter,
  type ShortageRow,
} from "./teamShortagesFilters";

// نثبّت "الآن" عند منتصف الظهر يوم 2026-05-02 عشان الحسبة تبقى ديتيرمنستيك
const NOW = new Date(2026, 4, 2, 12, 0, 0); // May 2, 2026 12:00 local

const iso = (y: number, m: number, d: number, h = 12) =>
  new Date(y, m, d, h, 0, 0).toISOString();

const row = (
  id: string,
  status: ShortageRow["status"],
  created: string,
  reviewed: string | null = null,
): ShortageRow => ({ id, status, created_at: created, reviewed_at: reviewed });

describe("computeDateRange", () => {
  it("returns null bounds for 'all'", () => {
    const r = computeDateRange("all", NOW);
    expect(r.from).toBeNull();
    expect(r.to).toBeNull();
  });

  it("'today' starts at midnight today, no upper bound", () => {
    const r = computeDateRange("today", NOW);
    expect(r.from).toEqual(new Date(2026, 4, 2));
    expect(r.to).toBeNull();
  });

  it("'yesterday' is the [start-of-yesterday, start-of-today) window", () => {
    const r = computeDateRange("yesterday", NOW);
    expect(r.from).toEqual(new Date(2026, 4, 1));
    expect(r.to).toEqual(new Date(2026, 4, 2));
  });

  it("'week' starts 6 days before today, no upper bound", () => {
    const r = computeDateRange("week", NOW);
    expect(r.from).toEqual(new Date(2026, 3, 26)); // Apr 26
    expect(r.to).toBeNull();
  });
});

describe("applyDateRange", () => {
  const rows: ShortageRow[] = [
    row("a", "open",      iso(2026, 4, 2)),                   // today
    row("b", "open",      iso(2026, 4, 1)),                   // yesterday
    row("c", "fulfilled", iso(2026, 3, 20), iso(2026, 4, 2)), // reviewed today
    row("d", "fulfilled", iso(2026, 3, 20), iso(2026, 3, 28)),// reviewed last week
    row("e", "rejected",  iso(2026, 3, 10)),                  // old
  ];

  it("returns all rows when no date filter", () => {
    expect(applyDateRange(rows, computeDateRange("all", NOW))).toHaveLength(5);
  });

  it("uses reviewed_at for fulfilled rows when filtering by 'today'", () => {
    const out = applyDateRange(rows, computeDateRange("today", NOW));
    // a (created today) + c (reviewed today)
    expect(out.map(r => r.id).sort()).toEqual(["a", "c"]);
  });

  it("'yesterday' is exclusive on the upper bound (today is excluded)", () => {
    const out = applyDateRange(rows, computeDateRange("yesterday", NOW));
    expect(out.map(r => r.id)).toEqual(["b"]);
  });

  it("'week' includes the last 7 days (today inclusive)", () => {
    const out = applyDateRange(rows, computeDateRange("week", NOW));
    // a, b, c (reviewed today), d (reviewed Apr 28 — within last 7 days)
    expect(out.map(r => r.id).sort()).toEqual(["a", "b", "c", "d"]);
  });
});

describe("computeCounts matches the visible cards", () => {
  it("counts each status and treats 'arrived' as fulfilled", () => {
    const rows: ShortageRow[] = [
      row("1", "open",      iso(2026, 4, 2)),
      row("2", "open",      iso(2026, 4, 2)),
      row("3", "sourcing",  iso(2026, 4, 2)),
      row("4", "fulfilled", iso(2026, 4, 2), iso(2026, 4, 2)),
      row("5", "fulfilled", iso(2026, 4, 2), iso(2026, 4, 2)),
      row("6", "rejected",  iso(2026, 4, 2)),
    ];
    const c = computeCounts(rows);
    expect(c).toEqual({ all: 6, open: 2, sourcing: 1, fulfilled: 2, rejected: 1, arrived: 2 });
  });

  it("returns zeros for an empty list", () => {
    expect(computeCounts([])).toEqual({ all: 0, open: 0, sourcing: 0, fulfilled: 0, rejected: 0, arrived: 0 });
  });

  // 🛡️ هذا هو الـ regression test الرئيسي للمشكلة اللي حصلت قبل كده
  // ("تم توفير 3 برغم ان موجود 2 صنف فقط")
  it("counters never exceed the number of cards visible after the date filter", () => {
    const rows: ShortageRow[] = [
      row("today-1",     "fulfilled", iso(2026, 3, 1),  iso(2026, 4, 2)),
      row("today-2",     "fulfilled", iso(2026, 3, 1),  iso(2026, 4, 2)),
      row("yesterday",   "fulfilled", iso(2026, 3, 1),  iso(2026, 4, 1)), // مش ضمن النهاردة
      row("very-old",    "fulfilled", iso(2026, 1, 1),  iso(2026, 1, 1)),
    ];
    const dateFiltered = applyDateRange(rows, computeDateRange("today", NOW));
    const counts = computeCounts(dateFiltered);
    const arrivedCards = applyTabFilter(dateFiltered, "arrived");

    // العدّاد لازم يطابق عدد الكروت بالظبط
    expect(counts.arrived).toBe(arrivedCards.length);
    expect(counts.arrived).toBe(2);
    expect(counts.fulfilled).toBe(2);
    expect(counts.all).toBe(2);
  });
});

describe("applyTabFilter", () => {
  const rows: ShortageRow[] = [
    row("o1", "open",      iso(2026, 4, 2)),
    row("o2", "open",      iso(2026, 4, 2)),
    row("s1", "sourcing",  iso(2026, 4, 2)),
    row("f1", "fulfilled", iso(2026, 4, 2), iso(2026, 4, 2)),
    row("r1", "rejected",  iso(2026, 4, 2)),
  ];

  it("'all' returns the input untouched", () => {
    expect(applyTabFilter(rows, "all")).toHaveLength(5);
  });

  it("'arrived' returns only fulfilled rows", () => {
    expect(applyTabFilter(rows, "arrived").map(r => r.id)).toEqual(["f1"]);
  });

  it("returns only rows matching the chosen status", () => {
    expect(applyTabFilter(rows, "open").map(r => r.id)).toEqual(["o1", "o2"]);
    expect(applyTabFilter(rows, "sourcing").map(r => r.id)).toEqual(["s1"]);
    expect(applyTabFilter(rows, "rejected").map(r => r.id)).toEqual(["r1"]);
  });
});

describe("counters always equal the cards shown for every tab × dateFilter combo", () => {
  const rows: ShortageRow[] = [
    row("a", "open",      iso(2026, 4, 2)),                   // today
    row("b", "open",      iso(2026, 4, 1)),                   // yesterday
    row("c", "sourcing",  iso(2026, 3, 28)),                  // within week
    row("d", "fulfilled", iso(2026, 3, 1), iso(2026, 4, 2)),  // arrived today
    row("e", "fulfilled", iso(2026, 3, 1), iso(2026, 3, 28)), // arrived within week
    row("f", "rejected",  iso(2026, 4, 2)),                   // today
    row("g", "open",      iso(2026, 1, 1)),                   // very old
  ];

  const dateFilters = ["all", "today", "yesterday", "week"] as const;
  const tabs = ["all", "open", "sourcing", "fulfilled", "rejected", "arrived"] as const;

  for (const df of dateFilters) {
    for (const tab of tabs) {
      it(`dateFilter=${df} tab=${tab} → counter === cards`, () => {
        const range = computeDateRange(df, NOW);
        const dateFiltered = applyDateRange(rows, range);
        const counts = computeCounts(dateFiltered);
        const cards = applyTabFilter(dateFiltered, tab);
        expect(counts[tab]).toBe(cards.length);
      });
    }
  }
});
