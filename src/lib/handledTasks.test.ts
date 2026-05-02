import { describe, it, expect } from "vitest";
import {
  buildHandledEntries,
  groupByStaff,
  summarizeHandled,
  isTaskVisibleInAllTab,
  type HandledRecord,
} from "./handledTasks";

const profiles = [
  { user_id: "u1", full_name: "أحمد" },
  { user_id: "u2", full_name: "سارة" },
];

const sampleMeta: Record<string, HandledRecord> = {
  "u1:followup": {
    action: "call",
    byName: "محمد",
    at: "2026-05-02T08:00:00Z",
  },
  "u2:cart_abandon": {
    action: "whatsapp",
    byName: "سارة",
    at: "2026-05-02T10:30:00Z",
  },
  "u1:price_quote": {
    action: "done",
    byName: "محمد",
    at: "2026-05-02T09:15:00Z",
    note: "اتفقنا على السعر",
  },
  "u3:welcome": {
    action: "outcome",
    at: "2026-05-02T07:00:00Z", // no byName -> falls back
  },
};

describe("buildHandledEntries", () => {
  it("returns empty array when no handled records exist", () => {
    expect(buildHandledEntries({}, profiles)).toEqual([]);
  });

  it("handles null/undefined profiles gracefully", () => {
    const out = buildHandledEntries(sampleMeta, null);
    expect(out).toHaveLength(4);
    expect(out.every((e) => e.profile === undefined)).toBe(true);
  });

  it("parses customerUserId and taskKind from compound taskId", () => {
    const out = buildHandledEntries(sampleMeta, profiles);
    const entry = out.find((e) => e.taskId === "u1:price_quote")!;
    expect(entry.customerUserId).toBe("u1");
    expect(entry.taskKind).toBe("price_quote");
  });

  it("supports taskKind with embedded colons", () => {
    const meta = {
      "u1:nested:kind:value": { action: "done", at: "2026-05-02T08:00:00Z" },
    };
    const [entry] = buildHandledEntries(meta, profiles);
    expect(entry.customerUserId).toBe("u1");
    expect(entry.taskKind).toBe("nested:kind:value");
  });

  it("attaches profile when one matches", () => {
    const out = buildHandledEntries(sampleMeta, profiles);
    const u1Entry = out.find((e) => e.customerUserId === "u1")!;
    expect(u1Entry.profile?.full_name).toBe("أحمد");

    const u3Entry = out.find((e) => e.customerUserId === "u3")!;
    expect(u3Entry.profile).toBeUndefined();
  });

  it("sorts entries by `at` descending (newest first)", () => {
    const out = buildHandledEntries(sampleMeta, profiles);
    const timestamps = out.map((e) => e.rec.at);
    expect(timestamps).toEqual([
      "2026-05-02T10:30:00Z",
      "2026-05-02T09:15:00Z",
      "2026-05-02T08:00:00Z",
      "2026-05-02T07:00:00Z",
    ]);
  });

  it("includes ALL handled records (independent of any hide-completed filter)", () => {
    // The "تمت اليوم" tab must show records regardless of the
    // global showCompletedTasks toggle — this is enforced by the fact
    // that buildHandledEntries does not accept that flag at all.
    const out = buildHandledEntries(sampleMeta, profiles);
    expect(out).toHaveLength(Object.keys(sampleMeta).length);
  });
});

describe("groupByStaff", () => {
  it("groups entries by byName", () => {
    const entries = buildHandledEntries(sampleMeta, profiles);
    const grouped = groupByStaff(entries);
    expect(grouped.get("محمد")).toHaveLength(2);
    expect(grouped.get("سارة")).toHaveLength(1);
  });

  it("falls back to «موظف» when byName is missing", () => {
    const entries = buildHandledEntries(sampleMeta, profiles);
    const grouped = groupByStaff(entries);
    expect(grouped.get("موظف")).toHaveLength(1);
    expect(grouped.get("موظف")![0].taskId).toBe("u3:welcome");
  });

  it("returns empty map for no entries", () => {
    expect(groupByStaff([]).size).toBe(0);
  });
});

describe("summarizeHandled", () => {
  it("counts tasks and distinct staff", () => {
    const entries = buildHandledEntries(sampleMeta, profiles);
    expect(summarizeHandled(entries)).toEqual({
      taskCount: 4,
      staffCount: 3, // محمد، سارة، موظف(fallback)
    });
  });

  it("returns zeros for empty input", () => {
    expect(summarizeHandled([])).toEqual({ taskCount: 0, staffCount: 0 });
  });

  it("staffCount is 1 when all actions are by the same staff", () => {
    const meta: Record<string, HandledRecord> = {
      "u1:a": { action: "call", byName: "أحمد", at: "2026-05-02T08:00:00Z" },
      "u2:b": { action: "done", byName: "أحمد", at: "2026-05-02T09:00:00Z" },
    };
    const entries = buildHandledEntries(meta, profiles);
    expect(summarizeHandled(entries)).toEqual({ taskCount: 2, staffCount: 1 });
  });
});

describe("isTaskVisibleInAllTab", () => {
  const completed = new Set(["u1:done-task"]);

  it("hides locally completed tasks when filter is active", () => {
    expect(isTaskVisibleInAllTab("u1:done-task", {}, completed, false)).toBe(
      false,
    );
  });

  it("shows locally completed tasks when filter is disabled", () => {
    expect(isTaskVisibleInAllTab("u1:done-task", {}, completed, true)).toBe(
      true,
    );
  });

  it("ALWAYS shows handled tasks even when filter hides completed", () => {
    const meta: Record<string, HandledRecord> = {
      "u1:done-task": { action: "done", at: "2026-05-02T08:00:00Z" },
    };
    expect(
      isTaskVisibleInAllTab("u1:done-task", meta, completed, false),
    ).toBe(true);
  });

  it("shows untouched tasks", () => {
    expect(isTaskVisibleInAllTab("u9:fresh", {}, completed, false)).toBe(true);
  });
});
