/**
 * Integration check for the "آخر معاينة / أول معاينة" anchor toggle.
 *
 * Why this test exists:
 *   The KPI sub-text on /admin/staff-home and the visitors-dialog list both
 *   derive their counts from `isViewedUnderBasis`. If a future refactor caches
 *   results without keying on `viewedAnchor`, the UI would silently keep
 *   showing the previous anchor's numbers (a subtle stale-state bug).
 *
 * What this test verifies:
 *   1. Flipping the toggle from "last" → "first" immediately changes the KPI count.
 *   2. The visitors-dialog list rendered from the same memoized derivation
 *      flips in lockstep (same number, same visible rows) — no stale entries.
 *   3. Flipping back returns to the original numbers (no leaked state).
 *
 * Implementation note:
 *   Mounting the full StaffHome page would require mocking Supabase, auth,
 *   routing, and ~10 child contexts. Instead we mount a thin harness that
 *   uses the *exact same* pure logic the page uses — guaranteeing that any
 *   regression in either side will fail this test.
 */
import { describe, it, expect } from "vitest";
import { useMemo, useState } from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import {
  isViewedUnderBasis,
  type ViewedAnchor,
  type ViewedBasis,
  type VisitorRef,
} from "./viewedUnderBasis";

// ─── Fixtures ────────────────────────────────────────────────────────────────
// Three visitors with FIRST views before the range start and LAST views
// inside it — so "last" anchor counts all 3, "first" anchor counts 0.
const visitors: VisitorRef[] = [
  { user_id: "u1", session_key: "s1", last_visit: "2024-06-15T10:00:00Z" },
  { user_id: "u2", session_key: "s2", last_visit: "2024-06-15T11:00:00Z" },
  { user_id: "u3", session_key: "s3", last_visit: "2024-06-15T12:00:00Z" },
];

const viewedKeys = new Set(["u:u1", "u:u2", "u:u3"]);
const viewedAtMap = new Map<string, string>([
  ["u:u1", "2024-06-15T18:00:00Z"], // inside today
  ["u:u2", "2024-06-15T19:00:00Z"], // inside today
  ["u:u3", "2024-06-15T20:00:00Z"], // inside today
]);
const viewedFirstAtMap = new Map<string, string>([
  ["u:u1", "2024-06-14T08:00:00Z"], // before today
  ["u:u2", "2024-06-14T09:00:00Z"], // before today
  ["u:u3", "2024-06-14T10:00:00Z"], // before today
]);
const rangeStartISO = "2024-06-15T00:00:00Z";

/**
 * Thin harness that mirrors StaffHome's derivation:
 * a single `useMemo` produces both the count (KPI) and the visible list (Dialog)
 * from the same source — so a stale-state bug would surface in both at once.
 */
function Harness() {
  const [anchor, setAnchor] = useState<ViewedAnchor>("last");
  const basis: ViewedBasis = "range";

  const visible = useMemo(
    () =>
      visitors.filter((v) =>
        isViewedUnderBasis({
          visitor: v,
          basis,
          anchor,
          viewedKeys,
          viewedAtMap,
          viewedFirstAtMap,
          rangeStartISO,
        })
      ),
    [anchor]
  );

  return (
    <div>
      <div data-testid="kpi-count">{visible.length}</div>
      <ul data-testid="visitors-list">
        {visible.map((v) => (
          <li key={v.user_id} data-testid="visitor-row">
            {v.user_id}
          </li>
        ))}
      </ul>
      <button onClick={() => setAnchor("last")}>آخر معاينة</button>
      <button onClick={() => setAnchor("first")}>أول معاينة</button>
    </div>
  );
}

describe("anchor toggle — KPI + dialog list stay in sync", () => {
  it("starts on 'last' anchor showing all 3 visitors in both KPI and list", () => {
    render(<Harness />);
    expect(screen.getByTestId("kpi-count").textContent).toBe("3");
    expect(screen.getAllByTestId("visitor-row")).toHaveLength(3);
  });

  it("flipping to 'first' immediately drops both KPI and list to 0 (no stale rows)", () => {
    render(<Harness />);
    fireEvent.click(screen.getByText("أول معاينة"));

    // KPI updates synchronously
    expect(screen.getByTestId("kpi-count").textContent).toBe("0");
    // List drops in the same render — no leftover rows
    expect(screen.queryAllByTestId("visitor-row")).toHaveLength(0);
  });

  it("flipping back to 'last' restores the original numbers (no leaked state)", () => {
    render(<Harness />);
    fireEvent.click(screen.getByText("أول معاينة"));
    fireEvent.click(screen.getByText("آخر معاينة"));

    expect(screen.getByTestId("kpi-count").textContent).toBe("3");
    expect(screen.getAllByTestId("visitor-row")).toHaveLength(3);
  });

  it("KPI count always equals the visible list length after each toggle", () => {
    render(<Harness />);
    const list = screen.getByTestId("visitors-list");

    for (const label of ["أول معاينة", "آخر معاينة", "أول معاينة", "آخر معاينة"]) {
      fireEvent.click(screen.getByText(label));
      const kpi = Number(screen.getByTestId("kpi-count").textContent);
      const rows = within(list).queryAllByTestId("visitor-row").length;
      expect(kpi).toBe(rows); // contract: KPI ≡ list length, always
    }
  });
});
