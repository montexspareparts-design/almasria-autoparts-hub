/**
 * Parity tests: the "تمت اليوم" badge counter MUST equal the number of
 * cards rendered in the "تمت اليوم — تابعها موظف" section, in every case.
 *
 * Both sides are computed from the same pure helpers (`countDoneToday` /
 * `selectDoneTodayTasks`), which themselves go through `isTaskTouchedToday`.
 * These tests lock that contract in.
 */
import { describe, it, expect } from "vitest";
import {
  countDoneToday,
  selectDoneTodayTasks,
  isTaskTouchedToday,
  type CustomerTouch,
  type HandledRecord,
  type TaskLike,
} from "./handledTasks";

const tasks: TaskLike[] = [
  { id: "u1:followup" },
  { id: "u1:price_quote" },
  { id: "u2:cart_abandon" },
  { id: "u3:welcome" },
  { id: "u4:reorder" },
];

const today = "2026-05-03T10:00:00Z";

function touchMap(entries: Record<string, CustomerTouch>) {
  return new Map(Object.entries(entries));
}

describe("countDoneToday ↔ selectDoneTodayTasks parity", () => {
  it("both return 0 when nothing is touched", () => {
    const meta: Record<string, HandledRecord> = {};
    const touched = new Map<string, CustomerTouch>();
    expect(countDoneToday(tasks, meta, touched)).toBe(0);
    expect(selectDoneTodayTasks(tasks, meta, touched)).toHaveLength(0);
  });

  it("counts a single per-task handling record", () => {
    const meta: Record<string, HandledRecord> = {
      "u1:followup": { action: "call", at: today, byName: "ياسمين" },
    };
    const touched = touchMap({
      u1: { at: today, source: "task_handling", action: "call", byName: "ياسمين" },
    });
    expect(countDoneToday(tasks, meta, touched)).toBe(
      selectDoneTodayTasks(tasks, meta, touched).length,
    );
    // Both u1:* tasks count because the customer is touched.
    expect(countDoneToday(tasks, meta, touched)).toBe(2);
  });

  it("counts every task of a customer when the customer is touched", () => {
    // Even with no per-task record, a communication touch on u1 should
    // mark BOTH u1:followup and u1:price_quote as done.
    const meta: Record<string, HandledRecord> = {};
    const touched = touchMap({
      u1: { at: today, source: "communication", action: "comm" },
    });
    const cards = selectDoneTodayTasks(tasks, meta, touched);
    expect(cards.map((t) => t.id).sort()).toEqual([
      "u1:followup",
      "u1:price_quote",
    ]);
    expect(countDoneToday(tasks, meta, touched)).toBe(cards.length);
  });

  it("ignores stale handledMeta entries that are not in todayTasks", () => {
    // This is the exact bug the user reported: handledMeta carries records
    // from the last 30 days, but only tasks present in todayTasks should be
    // counted. The helper trivially enforces this because it iterates
    // `todayTasks`, not `handledMeta`.
    const meta: Record<string, HandledRecord> = {
      "uX:old_task_not_today": { action: "done", at: "2026-04-01T08:00:00Z" },
      "uY:another_old": { action: "call", at: "2026-04-15T08:00:00Z" },
      "u2:cart_abandon": { action: "whatsapp", at: today, byName: "سارة" },
    };
    const touched = touchMap({
      u2: { at: today, source: "task_handling", action: "whatsapp" },
    });
    expect(countDoneToday(tasks, meta, touched)).toBe(1);
    expect(selectDoneTodayTasks(tasks, meta, touched)).toHaveLength(1);
  });

  it("matches when ALL tasks are touched", () => {
    const touched = touchMap({
      u1: { at: today, source: "task_handling", action: "call" },
      u2: { at: today, source: "communication", action: "comm" },
      u3: { at: today, source: "task_handling", action: "done" },
      u4: { at: today, source: "communication", action: "comm" },
    });
    expect(countDoneToday(tasks, {}, touched)).toBe(tasks.length);
    expect(selectDoneTodayTasks(tasks, {}, touched)).toHaveLength(tasks.length);
  });

  it("badge==cards holds for many random scenarios (property-style)", () => {
    const ids = tasks.map((t) => t.id.split(":")[0]);
    // Exhaustively try every subset of customers being touched
    const customers = Array.from(new Set(ids));
    const total = 1 << customers.length;
    for (let mask = 0; mask < total; mask++) {
      const touched = new Map<string, CustomerTouch>();
      customers.forEach((c, i) => {
        if (mask & (1 << i)) {
          touched.set(c, { at: today, source: "communication", action: "comm" });
        }
      });
      const count = countDoneToday(tasks, {}, touched);
      const cards = selectDoneTodayTasks(tasks, {}, touched);
      expect(count).toBe(cards.length);
    }
  });

  it("handles taskKind containing colons", () => {
    const t: TaskLike[] = [{ id: "u1:nested:kind:value" }];
    const touched = touchMap({
      u1: { at: today, source: "task_handling", action: "done" },
    });
    expect(countDoneToday(t, {}, touched)).toBe(1);
    expect(selectDoneTodayTasks(t, {}, touched)).toHaveLength(1);
  });
});

describe("isTaskTouchedToday", () => {
  it("returns true for direct handledMeta hit even if customer touch missing", () => {
    const meta: Record<string, HandledRecord> = {
      "u9:x": { action: "call", at: today },
    };
    expect(isTaskTouchedToday("u9:x", meta, new Map())).toBe(true);
  });

  it("returns true for customer-level touch even without per-task record", () => {
    const touched = touchMap({
      u9: { at: today, source: "communication", action: "comm" },
    });
    expect(isTaskTouchedToday("u9:any", {}, touched)).toBe(true);
  });

  it("returns false when neither source has a record", () => {
    expect(isTaskTouchedToday("u9:x", {}, new Map())).toBe(false);
  });
});
