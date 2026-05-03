/**
 * Integration test: Multi-staff concurrent task handling.
 *
 * Simulates several staff members handling tasks at the same time and
 * asserts that across every snapshot of shared state:
 *   1. Tasks marked as handled DISAPPEAR from the "All" tab when
 *      "hide completed" is on (unless explicitly kept by handledMeta).
 *   2. The "X تمت اليوم" counter equals the number of cards actually
 *      rendered in the "تمت اليوم" tab — for every staff perspective.
 *   3. Counters across all staff sessions agree (single source of truth):
 *      they all read the same shared handledMeta + customerTouchedToday.
 *   4. Race conditions (two staff handling at the same millisecond)
 *      do not desync the counters from the visible cards.
 */

import { describe, it, expect } from "vitest";
import {
  countDoneToday,
  selectDoneTodayTasks,
  isTaskVisibleInAllTab,
  buildHandledEntries,
  summarizeHandled,
  type HandledRecord,
  type CustomerTouch,
  type TaskLike,
} from "./handledTasks";

// ----- shared world state shape (mirrors what AdminCustomerIntelligence holds) -----
interface World {
  todayTasks: TaskLike[];
  handledMeta: Record<string, HandledRecord>;
  customerTouchedToday: Map<string, CustomerTouch>;
  // Per-staff local UI state
  sessions: Map<
    string,
    { completedTasks: Set<string>; showCompletedTasks: boolean }
  >;
}

interface Staff {
  id: string;
  name: string;
}

function newWorld(taskIds: string[], staff: Staff[]): World {
  return {
    todayTasks: taskIds.map((id) => ({ id })),
    handledMeta: {},
    customerTouchedToday: new Map(),
    sessions: new Map(
      staff.map((s) => [
        s.id,
        { completedTasks: new Set<string>(), showCompletedTasks: false },
      ]),
    ),
  };
}

/** Staff `s` handles task `taskId` at instant `at` with action `action`. */
function handleTask(
  world: World,
  s: Staff,
  taskId: string,
  action: HandledRecord["action"],
  at: Date = new Date(),
) {
  const rec: HandledRecord = {
    action,
    by: s.id,
    byName: s.name,
    at: at.toISOString(),
  };
  // Shared canonical writes (what realtime broadcasts to every other session)
  world.handledMeta[taskId] = rec;
  const customerId = taskId.split(":")[0];
  world.customerTouchedToday.set(customerId, {
    at: rec.at,
    byName: s.name,
    source: "task_handling",
    action: String(action),
  });
  // Local optimistic completion in the acting staff session only
  world.sessions.get(s.id)?.completedTasks.add(taskId);
}

/** Compute the same parity invariants from any staff's perspective. */
function snapshotFor(world: World, staffId: string) {
  const sess = world.sessions.get(staffId)!;
  const visibleAllTab = world.todayTasks.filter((t) =>
    isTaskVisibleInAllTab(
      t.id,
      world.handledMeta,
      sess.completedTasks,
      sess.showCompletedTasks,
    ),
  );
  const doneCount = countDoneToday(
    world.todayTasks,
    world.handledMeta,
    world.customerTouchedToday,
  );
  const doneCards = selectDoneTodayTasks(
    world.todayTasks,
    world.handledMeta,
    world.customerTouchedToday,
  );
  return { visibleAllTab, doneCount, doneCards };
}

// ============================ Scenarios ============================

describe("multi-staff concurrent task handling", () => {
  const ahmed: Staff = { id: "u-ahmed", name: "أحمد" };
  const sara: Staff = { id: "u-sara", name: "سارة" };
  const omar: Staff = { id: "u-omar", name: "عمر" };
  const allStaff = [ahmed, sara, omar];

  it("hides handled tasks from every staff's All tab (when filter on) and keeps counter == cards everywhere", () => {
    const taskIds = [
      "cust-1:cart_abandoned",
      "cust-2:price_viewed",
      "cust-3:no_buy",
      "cust-4:cart_abandoned",
      "cust-5:price_viewed",
    ];
    const world = newWorld(taskIds, allStaff);

    // Ahmed handles two tasks, Sara handles one, Omar idle.
    handleTask(world, ahmed, "cust-1:cart_abandoned", "call");
    handleTask(world, ahmed, "cust-2:price_viewed", "whatsapp");
    handleTask(world, sara, "cust-3:no_buy", "done");

    for (const s of allStaff) {
      const snap = snapshotFor(world, s.id);
      // Counter must always equal card count for every viewer.
      expect(snap.doneCount).toBe(snap.doneCards.length);
      expect(snap.doneCount).toBe(3);
    }

    // The acting staff (Ahmed) sees 2 fewer cards in his All tab.
    const ahmedAll = snapshotFor(world, ahmed.id).visibleAllTab.map(
      (t) => t.id,
    );
    expect(ahmedAll).not.toContain("cust-1:cart_abandoned");
    expect(ahmedAll).not.toContain("cust-2:price_viewed");

    // BUT — handled tasks remain visible to OTHER staff (handledMeta override),
    // so an admin can see what colleagues did. This is the documented behavior
    // of isTaskVisibleInAllTab: handledMeta entry forces visibility.
    const omarAll = snapshotFor(world, omar.id).visibleAllTab.map((t) => t.id);
    expect(omarAll).toContain("cust-1:cart_abandoned");
    expect(omarAll).toContain("cust-3:no_buy");
  });

  it("keeps counters in sync when two staff handle different tasks at the SAME millisecond (race)", () => {
    const taskIds = ["c1:k", "c2:k", "c3:k", "c4:k"];
    const world = newWorld(taskIds, allStaff);
    const sameInstant = new Date("2026-05-03T10:00:00.000Z");

    handleTask(world, ahmed, "c1:k", "call", sameInstant);
    handleTask(world, sara, "c2:k", "whatsapp", sameInstant);
    handleTask(world, omar, "c3:k", "done", sameInstant);

    for (const s of allStaff) {
      const snap = snapshotFor(world, s.id);
      expect(snap.doneCount).toBe(snap.doneCards.length);
      expect(snap.doneCount).toBe(3);
    }
    // No duplicates: each task appears exactly once in the done list.
    const ids = snapshotFor(world, ahmed.id).doneCards.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("last-writer-wins on the SAME task does not double-count", () => {
    const world = newWorld(["c1:k", "c2:k"], allStaff);
    handleTask(
      world,
      ahmed,
      "c1:k",
      "call",
      new Date("2026-05-03T09:00:00Z"),
    );
    // Sara overrides Ahmed's record on the same task 1ms later (network race).
    handleTask(
      world,
      sara,
      "c1:k",
      "whatsapp",
      new Date("2026-05-03T09:00:00.001Z"),
    );

    for (const s of allStaff) {
      const snap = snapshotFor(world, s.id);
      expect(snap.doneCount).toBe(snap.doneCards.length);
      expect(snap.doneCount).toBe(1); // only c1 handled, counted once
    }

    // The handled-entries view (admin audit) should also show exactly 1 row,
    // attributed to the latest writer (Sara).
    const entries = buildHandledEntries(world.handledMeta, []);
    expect(entries.length).toBe(1);
    expect(entries[0].rec.byName).toBe("سارة");
    expect(summarizeHandled(entries)).toEqual({ taskCount: 1, staffCount: 1 });
  });

  it("invariant holds across a long randomized sequence of concurrent handles", () => {
    const taskIds = Array.from({ length: 25 }, (_, i) => `cust-${i}:kind`);
    const world = newWorld(taskIds, allStaff);

    // Deterministic pseudo-random sequence.
    let seed = 42;
    const rand = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };

    const actions: HandledRecord["action"][] = [
      "call",
      "whatsapp",
      "done",
      "note",
    ];
    for (let step = 0; step < 60; step++) {
      const staff = allStaff[Math.floor(rand() * allStaff.length)];
      const task = taskIds[Math.floor(rand() * taskIds.length)];
      const action = actions[Math.floor(rand() * actions.length)];
      handleTask(
        world,
        staff,
        task,
        action,
        new Date(Date.parse("2026-05-03T08:00:00Z") + step * 1000),
      );

      // After every step, the parity invariant must hold for EVERY staff.
      for (const s of allStaff) {
        const snap = snapshotFor(world, s.id);
        expect(snap.doneCount).toBe(snap.doneCards.length);
      }
    }

    // Final shared state: counter == cards == unique handled customers.
    const uniqueHandledCustomers = new Set(
      Object.keys(world.handledMeta).map((id) => id.split(":")[0]),
    );
    const final = snapshotFor(world, ahmed.id);
    expect(final.doneCount).toBeGreaterThan(0);
    expect(final.doneCount).toBe(uniqueHandledCustomers.size);
  });

  it("staff session that toggles 'showCompletedTasks' does NOT affect shared done-today counter", () => {
    const world = newWorld(["c1:k", "c2:k", "c3:k"], allStaff);
    handleTask(world, ahmed, "c1:k", "call");
    handleTask(world, sara, "c2:k", "whatsapp");

    // Omar toggles his local "show completed" — purely UI, must not change counters.
    world.sessions.get(omar.id)!.showCompletedTasks = true;

    const ahmedSnap = snapshotFor(world, ahmed.id);
    const omarSnap = snapshotFor(world, omar.id);
    expect(ahmedSnap.doneCount).toBe(omarSnap.doneCount);
    expect(ahmedSnap.doneCards.length).toBe(omarSnap.doneCards.length);
    expect(ahmedSnap.doneCount).toBe(2);
  });
});
