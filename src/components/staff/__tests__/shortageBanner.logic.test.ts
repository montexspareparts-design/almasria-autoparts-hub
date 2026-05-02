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

describe("Shortage banner — تغيرات القائمة في نفس الجلسة", () => {
  it("سيناريو 1: تظهر أصناف متعددة → markAllSeen → يختفي البانر", () => {
    let seen = new Set<string>();
    const rows = [{ id: "a" }, { id: "b" }, { id: "c" }];

    expect(computeBannerDismissed(rows, seen)).toBe(false);
    expect(computeNewly(rows, seen)).toHaveLength(3);

    seen = markAllSeen(rows, seen);
    expect(computeBannerDismissed(rows, seen)).toBe(true);
    expect(computeNewly(rows, seen)).toHaveLength(0);
  });

  it("سيناريو 2: بعد الإخفاء يظهر صنف جديد واحد → البانر يرجع و1 جديد فقط", () => {
    let seen = new Set<string>();
    let rows = [{ id: "a" }, { id: "b" }];
    seen = markAllSeen(rows, seen);
    expect(computeBannerDismissed(rows, seen)).toBe(true);

    rows = [...rows, { id: "c" }];
    expect(computeBannerDismissed(rows, seen)).toBe(false);
    expect(computeNewly(rows, seen)).toEqual([{ id: "c" }]);
  });

  it("سيناريو 3: يظهرون 3 أصناف جديدة دفعة واحدة بعد الإخفاء", () => {
    let seen = new Set<string>();
    let rows = [{ id: "a" }];
    seen = markAllSeen(rows, seen);
    expect(computeBannerDismissed(rows, seen)).toBe(true);

    rows = [...rows, { id: "b" }, { id: "c" }, { id: "d" }];
    expect(computeBannerDismissed(rows, seen)).toBe(false);
    expect(computeNewly(rows, seen).map(r => r.id)).toEqual(["b", "c", "d"]);

    seen = markAllSeen(rows, seen);
    expect(computeBannerDismissed(rows, seen)).toBe(true);
  });

  it("سيناريو 4: صنف يخرج من القائمة (انتهت 14 يوم) لا يؤثر على الإخفاء", () => {
    let seen = new Set<string>();
    let rows = [{ id: "a" }, { id: "b" }, { id: "c" }];
    seen = markAllSeen(rows, seen);

    // "a" خرج من نافذة الـ 14 يوم
    rows = [{ id: "b" }, { id: "c" }];
    expect(computeBannerDismissed(rows, seen)).toBe(true);
    expect(computeNewly(rows, seen)).toHaveLength(0);
  });

  it("سيناريو 5: تذبذب — يظهر, يُخفى, يظهر جديد, يُخفى تاني, يظهر جديد آخر", () => {
    let seen = new Set<string>();
    let rows: Row[] = [{ id: "a" }];

    // ظهور أول
    expect(computeBannerDismissed(rows, seen)).toBe(false);
    seen = markAllSeen(rows, seen);
    expect(computeBannerDismissed(rows, seen)).toBe(true);

    // وصل b
    rows = [...rows, { id: "b" }];
    expect(computeBannerDismissed(rows, seen)).toBe(false);
    expect(computeNewly(rows, seen)).toEqual([{ id: "b" }]);
    seen = markAllSeen(rows, seen);
    expect(computeBannerDismissed(rows, seen)).toBe(true);

    // وصل c
    rows = [...rows, { id: "c" }];
    expect(computeBannerDismissed(rows, seen)).toBe(false);
    expect(computeNewly(rows, seen)).toEqual([{ id: "c" }]);
  });

  it("سيناريو 6: التراجع وسط الجلسة بعد ظهور جديد لا يفقد العلامات الأقدم", () => {
    let seen = new Set<string>();
    let rows: Row[] = [{ id: "a" }, { id: "b" }];

    // علّم a و b
    const beforeFirstMark = new Set(seen);
    seen = markAllSeen(rows, seen);
    expect(computeBannerDismissed(rows, seen)).toBe(true);

    // ظهر c
    rows = [...rows, { id: "c" }];
    const beforeSecondMark = new Set(seen);
    seen = markAllSeen(rows, seen);
    expect(computeBannerDismissed(rows, seen)).toBe(true);

    // تراجع عن العلامة الثانية فقط (يرجع لـ {a, b})
    seen = beforeSecondMark;
    expect(seen.has("a")).toBe(true);
    expect(seen.has("b")).toBe(true);
    expect(seen.has("c")).toBe(false);
    expect(computeBannerDismissed(rows, seen)).toBe(false);
    expect(computeNewly(rows, seen)).toEqual([{ id: "c" }]);

    // التراجع للحالة الأولى يرجّع كل شيء جديد
    seen = beforeFirstMark;
    expect(computeNewly(rows, seen)).toHaveLength(3);
  });

  it("سيناريو 7: ترتيب الأصناف لا يهم — markAllSeen idempotent", () => {
    let seen = new Set<string>();
    const rows1 = [{ id: "a" }, { id: "b" }, { id: "c" }];
    const rows2 = [{ id: "c" }, { id: "a" }, { id: "b" }];

    seen = markAllSeen(rows1, seen);
    expect(computeBannerDismissed(rows2, seen)).toBe(true);

    // استدعاء ثاني مالوش تأثير
    const before = Array.from(seen).sort();
    seen = markAllSeen(rows1, seen);
    expect(Array.from(seen).sort()).toEqual(before);
  });
});


/**
 * محاكاة المزامنة عبر Supabase بين جهازين لنفس الموظف:
 * - "الـ DB" عبارة عن مصدر مشترك (sharedDB) يحفظ seen IDs لكل (user, item).
 * - كل جهاز عنده نسخة محلية (localSeen) يقرأها من الـ DB عند التحميل/الـ realtime.
 */

type DBRow = { user_id: string; item_id: string };

class FakeSupabaseSync {
  private rows: DBRow[] = [];
  private listeners: Array<(rows: DBRow[]) => void> = [];

  upsert(user_id: string, item_ids: string[]) {
    item_ids.forEach((item_id) => {
      if (!this.rows.find((r) => r.user_id === user_id && r.item_id === item_id)) {
        this.rows.push({ user_id, item_id });
      }
    });
    this.listeners.forEach((fn) => fn([...this.rows]));
  }

  fetch(user_id: string): Set<string> {
    return new Set(this.rows.filter((r) => r.user_id === user_id).map((r) => r.item_id));
  }

  subscribe(fn: (rows: DBRow[]) => void) {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    };
  }

  reset() {
    this.rows = [];
    this.listeners = [];
  }
}

describe("Shortage banner — مزامنة الإخفاء عبر Supabase بين جهازين", () => {
  it("سيناريو 1: جهاز A يعلّم → جهاز B يستلم تحديث realtime → البانر يختفي عنده", () => {
    const db = new FakeSupabaseSync();
    const userId = "staff-1";
    const rows = [{ id: "x" }, { id: "y" }];

    // جهاز A وجهاز B يفتحان نفس اللحظة — لا شيء معلَّم
    let seenA = db.fetch(userId);
    let seenB = db.fetch(userId);
    expect(computeBannerDismissed(rows, seenA)).toBe(false);
    expect(computeBannerDismissed(rows, seenB)).toBe(false);

    // B يشترك في الـ realtime
    db.subscribe(() => {
      seenB = db.fetch(userId);
    });

    // A يضغط "تمام شفتها" → upsert للـ DB
    db.upsert(userId, rows.map((r) => r.id));
    seenA = db.fetch(userId);

    expect(computeBannerDismissed(rows, seenA)).toBe(true);
    expect(computeBannerDismissed(rows, seenB)).toBe(true); // ← اتزامن
  });

  it("سيناريو 2: B يعلّم بعد A — لا تكرار في الـ DB (idempotent upsert)", () => {
    const db = new FakeSupabaseSync();
    const userId = "staff-2";
    const rows = [{ id: "a" }, { id: "b" }];

    db.upsert(userId, rows.map((r) => r.id)); // من A
    db.upsert(userId, rows.map((r) => r.id)); // من B (نفس العناصر)

    expect(db.fetch(userId).size).toBe(2);
  });

  it("سيناريو 3: صنف جديد يظهر بعد الإخفاء — يظهر البانر على الجهازين", () => {
    const db = new FakeSupabaseSync();
    const userId = "staff-3";
    let rows = [{ id: "a" }];

    db.upsert(userId, ["a"]);
    let seenA = db.fetch(userId);
    let seenB = db.fetch(userId);
    expect(computeBannerDismissed(rows, seenA)).toBe(true);
    expect(computeBannerDismissed(rows, seenB)).toBe(true);

    // وصل صنف جديد للقائمة (من ERP sync)
    rows = [...rows, { id: "b" }];
    expect(computeBannerDismissed(rows, seenA)).toBe(false);
    expect(computeBannerDismissed(rows, seenB)).toBe(false);
    expect(computeNewly(rows, seenA)).toEqual([{ id: "b" }]);
  });

  it("سيناريو 4: عزل بين موظفين — staff-1 يعلّم لا يؤثر على staff-2", () => {
    const db = new FakeSupabaseSync();
    const rows = [{ id: "a" }, { id: "b" }];

    db.upsert("staff-1", ["a", "b"]);

    expect(computeBannerDismissed(rows, db.fetch("staff-1"))).toBe(true);
    expect(computeBannerDismissed(rows, db.fetch("staff-2"))).toBe(false);
  });

  it("سيناريو 5: A و B يعلّمان أصناف مختلفة بالتوازي — الاتحاد يُحفظ", () => {
    const db = new FakeSupabaseSync();
    const userId = "staff-5";
    const rows = [{ id: "a" }, { id: "b" }, { id: "c" }];

    // A شاف a, b فقط (الـ realtime لسه ما وصلش لـ B)
    db.upsert(userId, ["a", "b"]);
    // B في نفس اللحظة كان شايف c كمان وضغط (عنده snapshot أحدث)
    db.upsert(userId, ["c"]);

    const finalSeen = db.fetch(userId);
    expect(finalSeen.size).toBe(3);
    expect(computeBannerDismissed(rows, finalSeen)).toBe(true);
  });

  it("سيناريو 6: جهاز جديد يفتح الصفحة → يقرأ الحالة من DB ولا يظهر البانر", () => {
    const db = new FakeSupabaseSync();
    const userId = "staff-6";
    const rows = [{ id: "a" }, { id: "b" }];

    // جهاز A علّم من قبل
    db.upsert(userId, ["a", "b"]);

    // جهاز C يفتح أول مرة — initial fetch
    const seenC = db.fetch(userId);
    expect(computeBannerDismissed(rows, seenC)).toBe(true);
    expect(computeNewly(rows, seenC)).toHaveLength(0);
  });
});
