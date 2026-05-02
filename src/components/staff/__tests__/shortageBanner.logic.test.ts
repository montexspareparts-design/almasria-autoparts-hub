import { describe, it, expect } from "vitest";

/**
 * المنطق المستخرج من StaffShortageRequests للبانر:
 * - bannerDismissed = true فقط لو كل عنصر حالي موجود في seenIds
 * - newlyFulfilled = العناصر اللي مش في seenIds
 * - markAllSeen يضيف كل الـ IDs الحالية للـ seen set
 */

type Row = { id: string };

const computeBannerDismissed = (rows: Row[], seen: Set<string>): boolean =>
  rows.length > 0 && rows.every((r) => seen.has(r.id));

const computeNewly = (rows: Row[], seen: Set<string>): Row[] =>
  rows.filter((r) => !seen.has(r.id));

const markAllSeen = (rows: Row[], prev: Set<string>): Set<string> => {
  const next = new Set(prev);
  rows.forEach((r) => next.add(r.id));
  return next;
};

describe("Shortage banner dismissal logic", () => {
  it("لا يخفي البانر إذا لم تُعلَّم كل الأصناف", () => {
    const rows = [{ id: "a" }, { id: "b" }, { id: "c" }];
    const seen = new Set(["a", "b"]);
    expect(computeBannerDismissed(rows, seen)).toBe(false);
    expect(computeNewly(rows, seen)).toEqual([{ id: "c" }]);
  });

  it("يخفي البانر فقط بعد علامة كل الأصناف الحالية", () => {
    const rows = [{ id: "a" }, { id: "b" }, { id: "c" }];
    const after = markAllSeen(rows, new Set());
    expect(computeBannerDismissed(rows, after)).toBe(true);
    expect(computeNewly(rows, after)).toEqual([]);
  });

  it("لا يخفي البانر لو ظهر صنف جديد بعد العلامة", () => {
    const rows = [{ id: "a" }, { id: "b" }];
    const seen = markAllSeen(rows, new Set());
    expect(computeBannerDismissed(rows, seen)).toBe(true);

    const updated = [...rows, { id: "c" }];
    expect(computeBannerDismissed(updated, seen)).toBe(false);
    expect(computeNewly(updated, seen)).toEqual([{ id: "c" }]);
  });

  it("لا يخفي البانر إذا كانت القائمة فارغة (لا يوجد ما يخفى أصلاً)", () => {
    expect(computeBannerDismissed([], new Set())).toBe(false);
    expect(computeBannerDismissed([], new Set(["x"]))).toBe(false);
  });

  it("التراجع: استرجاع seen السابق يعيد البانر", () => {
    const rows = [{ id: "a" }, { id: "b" }];
    const previous = new Set<string>();
    const afterMark = markAllSeen(rows, previous);
    expect(computeBannerDismissed(rows, afterMark)).toBe(true);

    // محاكاة زر "تراجع"
    const restored = previous;
    expect(computeBannerDismissed(rows, restored)).toBe(false);
    expect(computeNewly(rows, restored)).toEqual(rows);
  });

  it("markAllSeen لا يفقد علامات سابقة لأصناف خرجت من القائمة", () => {
    const rowsOld = [{ id: "a" }];
    const seen1 = markAllSeen(rowsOld, new Set());
    const rowsNew = [{ id: "b" }];
    const seen2 = markAllSeen(rowsNew, seen1);
    expect(seen2.has("a")).toBe(true);
    expect(seen2.has("b")).toBe(true);
  });
});
