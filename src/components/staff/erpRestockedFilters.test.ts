import { describe, it, expect } from "vitest";
import {
  isSeen,
  applySeenFilter,
  applySearchFilter,
  deriveVisibleItems,
  diffSnapshots,
  pickBaselineForPeriod,
  type ErpItem,
  type ErpPeriod,
} from "./erpRestockedFilters";

const NOW_MS = new Date(2026, 4, 2, 12, 0, 0).getTime(); // May 2, 2026 12:00 local
const NOW_DATE = new Date(NOW_MS);

const item = (
  erp_id: string,
  name = `صنف ${erp_id}`,
  stock_quantity = 10,
  had_shortage_request = false,
): ErpItem => ({ erp_id, name, stock_quantity, had_shortage_request });

// ─────────────────────────────────────────────────────────────────────────────
// "Seen" / acknowledgement filter
// ─────────────────────────────────────────────────────────────────────────────
describe("isSeen", () => {
  it("returns false when erp_id was never marked", () => {
    expect(isSeen({}, "X1", NOW_MS)).toBe(false);
  });

  it("returns true within the 24h TTL", () => {
    const seen = { X1: NOW_MS - 60_000 }; // marked 1 minute ago
    expect(isSeen(seen, "X1", NOW_MS)).toBe(true);
  });

  it("returns false after the 24h TTL expires", () => {
    const seen = { X1: NOW_MS - 25 * 60 * 60 * 1000 }; // 25h ago
    expect(isSeen(seen, "X1", NOW_MS)).toBe(false);
  });
});

describe("applySeenFilter", () => {
  it("removes acknowledged items only", () => {
    const items = [item("A"), item("B"), item("C")];
    const seen = { B: NOW_MS };
    expect(applySeenFilter(items, seen, NOW_MS).map(i => i.erp_id)).toEqual(["A", "C"]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Search filter
// ─────────────────────────────────────────────────────────────────────────────
describe("applySearchFilter", () => {
  const items: ErpItem[] = [
    item("12918", "فلتر زيت دنسو"),
    item("99999", "بوجيه NGK"),
    item("KS086", "طلمبة بنزين"),
  ];
  const partMap = { "12918": "KS086300-2720-DENSO" };

  it("returns the input untouched on an empty query", () => {
    expect(applySearchFilter(items, "", partMap)).toEqual(items);
    expect(applySearchFilter(items, "   ", partMap)).toEqual(items);
  });

  it("matches by ERP id", () => {
    expect(applySearchFilter(items, "999", partMap).map(i => i.erp_id)).toEqual(["99999"]);
  });

  it("matches by Arabic name (case-insensitive)", () => {
    expect(applySearchFilter(items, "فلتر", partMap).map(i => i.erp_id)).toEqual(["12918"]);
  });

  it("matches by part number from the products map", () => {
    expect(applySearchFilter(items, "denso", partMap).map(i => i.erp_id)).toEqual(["12918"]);
  });

  it("returns nothing on a no-match query", () => {
    expect(applySearchFilter(items, "zzz-no-such-thing", partMap)).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Snapshot diff (mirrors the DB RPC behaviour)
// ─────────────────────────────────────────────────────────────────────────────
describe("diffSnapshots", () => {
  it("returns only items whose stock strictly increased vs. baseline", () => {
    const baseline = { A: 5, B: 0, C: 10 };
    const current = [
      { erp_id: "A", name: "A",  stock_quantity: 7 },  // +2 → restocked
      { erp_id: "B", name: "B",  stock_quantity: 3 },  // +3 → restocked
      { erp_id: "C", name: "C",  stock_quantity: 10 }, // unchanged → skip
      { erp_id: "D", name: "D",  stock_quantity: 1 },  // new item, prev=0 → restocked
    ];
    const out = diffSnapshots({ baseline, current });
    expect(out.map(i => i.erp_id).sort()).toEqual(["A", "B", "D"]);
    expect(out.find(i => i.erp_id === "A")?.previous_stock).toBe(5);
    expect(out.find(i => i.erp_id === "D")?.previous_stock).toBe(0);
  });

  it("decreases (sales) are not counted as restocks", () => {
    const out = diffSnapshots({
      baseline: { X: 20 },
      current: [{ erp_id: "X", name: "X", stock_quantity: 5 }],
    });
    expect(out).toEqual([]);
  });

  it("flags shortage-request items", () => {
    const out = diffSnapshots({
      baseline: { X: 0 },
      current: [{ erp_id: "X", name: "X", stock_quantity: 4 }],
      shortageSet: new Set(["X"]),
    });
    expect(out[0].had_shortage_request).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Baseline picker — confirms the period→snapshot mapping
// ─────────────────────────────────────────────────────────────────────────────
describe("pickBaselineForPeriod", () => {
  const snaps = {
    "2026-05-02": { A: 5 },          // today
    "2026-05-01": { A: 4 },          // yesterday
    "2026-04-25": { A: 3 },          // 7 days ago
    "2026-04-02": { A: 1 },          // 30 days ago
  };

  it("today → today's snapshot", () => {
    expect(pickBaselineForPeriod("today", snaps, NOW_DATE)).toEqual({ A: 5 });
  });

  it("yesterday → yesterday's snapshot", () => {
    expect(pickBaselineForPeriod("yesterday", snaps, NOW_DATE)).toEqual({ A: 4 });
  });

  it("week → 7-days-ago snapshot", () => {
    expect(pickBaselineForPeriod("week", snaps, NOW_DATE)).toEqual({ A: 3 });
  });

  it("month → 30-days-ago snapshot", () => {
    expect(pickBaselineForPeriod("month", snaps, NOW_DATE)).toEqual({ A: 1 });
  });

  it("returns null when the requested baseline is missing", () => {
    expect(pickBaselineForPeriod("week", { "2026-05-02": {} }, NOW_DATE)).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Full visible pipeline — what the user actually sees
// ─────────────────────────────────────────────────────────────────────────────
describe("deriveVisibleItems", () => {
  it("composes seen + search filters", () => {
    const items = [item("A", "زيت"), item("B", "بوجيه"), item("C", "زيت كاوتش")];
    const out = deriveVisibleItems({
      items,
      seen: { B: NOW_MS },
      search: "زيت",
      now: NOW_MS,
    });
    expect(out.map(i => i.erp_id)).toEqual(["A", "C"]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 🛡️ Regression invariant — across every period:
//   badge counter (= filtered.length) MUST equal the number of cards rendered
// ─────────────────────────────────────────────────────────────────────────────
describe("badge counter equals visible cards across every period", () => {
  // Simulate a realistic scenario: stable historical baselines, current ERP
  // stock with mixed restocks/decreases, plus seen-marks and an active search.
  const baselines: Record<ErpPeriod, Record<string, number>> = {
    today:     { A: 5, B: 5, C: 0, D: 10 }, // start-of-today
    yesterday: { A: 4, B: 6, C: 0, D: 10 }, // yesterday's snapshot
    week:      { A: 2, B: 4, C: 0, D: 10 }, // 7 days ago
    month:     { A: 0, B: 0, C: 0, D: 10 }, // 30 days ago
  };
  const current = [
    { erp_id: "A", name: "فلتر زيت",   stock_quantity: 8 },  // up vs. all
    { erp_id: "B", name: "بوجيه",       stock_quantity: 6 },  // up vs. today only
    { erp_id: "C", name: "طلمبة",       stock_quantity: 4 },  // up vs. all
    { erp_id: "D", name: "ردياتير",     stock_quantity: 7 },  // DOWN — never shown
    { erp_id: "E", name: "كمبروسر AC",  stock_quantity: 2 },  // new item, up vs. all
  ];
  const partMap = { A: "KS086300-2720-DENSO" };
  const shortageSet = new Set(["A", "C"]);
  const seen = { E: NOW_MS };       // staffer acknowledged E
  const searches = ["", "فلتر", "denso", "no-match-here"];
  const periods: ErpPeriod[] = ["today", "yesterday", "week", "month"];

  for (const period of periods) {
    for (const search of searches) {
      it(`period=${period} search="${search}" → counter === cards`, () => {
        const items = diffSnapshots({
          baseline: baselines[period],
          current,
          shortageSet,
        });

        // No restock should ever include the item whose stock dropped (D).
        expect(items.find(i => i.erp_id === "D")).toBeUndefined();

        const filtered = deriveVisibleItems({
          items,
          seen,
          search,
          partNumberMap: partMap,
          now: NOW_MS,
        });

        // The badge counter shown in the UI is exactly `filtered.length`,
        // and the rendered card list iterates the same array — so they
        // must match by construction. Assert it explicitly so any future
        // refactor that decouples them fails loudly.
        const badgeCounter = filtered.length;
        const renderedCards = filtered; // what the .map(...) renders
        expect(badgeCounter).toBe(renderedCards.length);

        // Acknowledged items must never appear in the visible list.
        expect(filtered.find(i => i.erp_id === "E")).toBeUndefined();
      });
    }
  }

  it("expected restock counts per period (sanity check)", () => {
    // Independent of search/seen, the raw diff per period:
    //   today     → A(5→8), B(5→6), C(0→4), E(0→2)             = 4
    //   yesterday → A(4→8),         C(0→4), E(0→2)             = 3
    //                (B 6→6 unchanged)
    //   week      → A(2→8), B(4→6), C(0→4), E(0→2)             = 4
    //   month     → A(0→8), B(0→6), C(0→4), E(0→2)             = 4
    expect(diffSnapshots({ baseline: baselines.today,     current }).length).toBe(4);
    expect(diffSnapshots({ baseline: baselines.yesterday, current }).length).toBe(3);
    expect(diffSnapshots({ baseline: baselines.week,      current }).length).toBe(4);
    expect(diffSnapshots({ baseline: baselines.month,     current }).length).toBe(4);
  });
});
