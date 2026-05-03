/**
 * Pure helpers for the "تمت اليوم" (Handled Today) tab logic in AdminCustomerIntelligence.
 * Extracted to be testable in isolation from the React component.
 */

export interface HandledRecord {
  action: "call" | "whatsapp" | "note" | "outcome" | "done" | string;
  by?: string;
  byName?: string;
  at: string; // ISO timestamp
  note?: string;
}

export interface HandledEntry {
  taskId: string;
  taskKind: string;
  customerUserId: string;
  profile: any | undefined;
  rec: HandledRecord;
}

/**
 * Build sorted entries directly from the handledMeta map.
 * Independent of any "hide completed" UI filter — this is the source of
 * truth for what shows up in the "تمت اليوم" tab.
 *
 * Sorted DESC by record `at` timestamp (newest first).
 */
export function buildHandledEntries(
  handledMeta: Record<string, HandledRecord>,
  profiles: Array<{ user_id: string; [k: string]: any }> | null | undefined,
): HandledEntry[] {
  const profileById = new Map((profiles || []).map((p) => [p.user_id, p]));

  return Object.entries(handledMeta)
    .map(([taskId, rec]) => {
      const parts = taskId.split(":");
      const customerUserId = parts[0];
      const taskKind = parts.slice(1).join(":") || "";
      return {
        taskId,
        taskKind,
        customerUserId,
        profile: profileById.get(customerUserId),
        rec,
      };
    })
    .sort(
      (a, b) => new Date(b.rec.at).getTime() - new Date(a.rec.at).getTime(),
    );
}

/**
 * Group handled entries by the staff member who performed the action.
 * Falls back to "موظف" when byName is missing.
 */
export function groupByStaff(
  entries: HandledEntry[],
): Map<string, HandledEntry[]> {
  const byStaff = new Map<string, HandledEntry[]>();
  entries.forEach((e) => {
    const key = e.rec.byName || "موظف";
    if (!byStaff.has(key)) byStaff.set(key, []);
    byStaff.get(key)!.push(e);
  });
  return byStaff;
}

/**
 * Counters shown in the "تمت اليوم" header.
 *  - taskCount: number of unique handled task records (post-filter)
 *  - staffCount: distinct staff members involved
 */
export function summarizeHandled(entries: HandledEntry[]): {
  taskCount: number;
  staffCount: number;
} {
  const byStaff = groupByStaff(entries);
  return { taskCount: entries.length, staffCount: byStaff.size };
}

/**
 * Decide whether a task should be visible in the "All Customers" tab when the
 * "Hide Completed" filter is active.
 *
 * Rules (mirrors the existing `.filter(...)` at line ~1543):
 *   - Always visible if a handled record exists (so admin can see what staff did).
 *   - Always visible if showCompletedTasks is true.
 *   - Otherwise, hidden when locally marked completed.
 */
export function isTaskVisibleInAllTab(
  taskId: string,
  handledMeta: Record<string, HandledRecord>,
  completedTasks: Set<string>,
  showCompletedTasks: boolean,
): boolean {
  if (handledMeta[taskId]) return true;
  if (showCompletedTasks) return true;
  return !completedTasks.has(taskId);
}

// =====================================================================
// "تمت اليوم — تابعها موظف" — counter ↔ visible cards parity helpers
// =====================================================================

export interface TaskLike {
  id: string; // "<customerUserId>:<kind>"
}

export interface CustomerTouch {
  at: string;
  byName?: string | null;
  source: "task_handling" | "communication";
  action: string;
}

/**
 * Returns the customerUserId portion of a compound task id ("<userId>:<kind>").
 */
export function getTaskCustomerId(taskId: string): string {
  return String(taskId).split(":")[0];
}

/**
 * Decide whether a task in `todayTasks` is "touched today" — i.e., should
 * appear in the "تمت اليوم — تابعها موظف" section AND be counted by the
 * "X تمت اليوم" badge.
 *
 * A task is considered touched if EITHER:
 *   - The same task id has a record in `handledMeta`, OR
 *   - The customer has any entry in `customerTouchedToday` (any other task
 *     by any staff, or a generic communication touch today).
 *
 * This is the single source of truth used both by the badge counter and the
 * cards-rendering filter, guaranteeing they always agree.
 */
export function isTaskTouchedToday(
  taskId: string,
  handledMeta: Record<string, HandledRecord>,
  customerTouchedToday: Map<string, CustomerTouch>,
): boolean {
  if (handledMeta[taskId]) return true;
  return customerTouchedToday.has(getTaskCustomerId(taskId));
}

/**
 * Counts how many of `todayTasks` are touched today. This MUST match the
 * number of cards rendered in the "تمت اليوم" tab when computed from the
 * same inputs — the parity is enforced by both call-sites going through
 * `isTaskTouchedToday`.
 */
export function countDoneToday(
  todayTasks: TaskLike[],
  handledMeta: Record<string, HandledRecord>,
  customerTouchedToday: Map<string, CustomerTouch>,
): number {
  return todayTasks.filter((t) =>
    isTaskTouchedToday(t.id, handledMeta, customerTouchedToday),
  ).length;
}

/**
 * Returns the actual list of tasks shown in the "تمت اليوم — تابعها موظف"
 * section. Pure & deterministic so unit tests can assert that
 * `countDoneToday === selectDoneTodayTasks.length` for any input.
 */
export function selectDoneTodayTasks<T extends TaskLike>(
  todayTasks: T[],
  handledMeta: Record<string, HandledRecord>,
  customerTouchedToday: Map<string, CustomerTouch>,
): T[] {
  return todayTasks.filter((t) =>
    isTaskTouchedToday(t.id, handledMeta, customerTouchedToday),
  );
}

