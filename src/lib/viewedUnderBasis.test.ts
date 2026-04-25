import { describe, it, expect } from "vitest";
import { isViewedUnderBasis, type VisitorRef } from "./viewedUnderBasis";

// ─── Fixtures ────────────────────────────────────────────────────────────────
// A visitor with both user_id and session_key, last_visit on 2024-06-15 local.
const visitor: VisitorRef = {
  user_id: "user-123",
  session_key: "sess-abc",
  last_visit: "2024-06-15T10:00:00.000Z",
};

const KEY_U = "u:user-123";
const KEY_S = "s:sess-abc";

// Anchor timestamps spanning two calendar days — "first" is on 2024-06-14,
// "last" is on 2024-06-15 (matches visitor.last_visit's local day).
const FIRST_ISO = "2024-06-14T08:00:00.000Z";
const LAST_ISO = "2024-06-15T18:00:00.000Z";

const baseDeps = {
  viewedKeys: new Set<string>([KEY_U]),
  viewedAtMap: new Map<string, string>([[KEY_U, LAST_ISO]]),
  viewedFirstAtMap: new Map<string, string>([[KEY_U, FIRST_ISO]]),
  rangeStartISO: "2024-06-15T00:00:00.000Z", // "today" cutoff
};

// ─── all_time ────────────────────────────────────────────────────────────────
describe("isViewedUnderBasis — all_time", () => {
  it("returns true as long as any key is in viewedKeys (anchor irrelevant)", () => {
    for (const anchor of ["first", "last"] as const) {
      expect(
        isViewedUnderBasis({ visitor, basis: "all_time", anchor, ...baseDeps })
      ).toBe(true);
    }
  });

  it("ignores missing anchor timestamps in all_time mode", () => {
    expect(
      isViewedUnderBasis({
        visitor,
        basis: "all_time",
        anchor: "first",
        ...baseDeps,
        viewedAtMap: new Map(),
        viewedFirstAtMap: new Map(), // no timestamps at all — still true
      })
    ).toBe(true);
  });

  it("returns false when neither key has been viewed", () => {
    expect(
      isViewedUnderBasis({
        visitor,
        basis: "all_time",
        anchor: "last",
        ...baseDeps,
        viewedKeys: new Set(),
      })
    ).toBe(false);
  });
});

// ─── range ───────────────────────────────────────────────────────────────────
describe("isViewedUnderBasis — range", () => {
  it("LAST anchor passes when most-recent view is within the range window", () => {
    expect(
      isViewedUnderBasis({ visitor, basis: "range", anchor: "last", ...baseDeps })
    ).toBe(true); // LAST_ISO (06-15) >= rangeStart (06-15)
  });

  it("FIRST anchor fails when earliest view predates the range window", () => {
    expect(
      isViewedUnderBasis({ visitor, basis: "range", anchor: "first", ...baseDeps })
    ).toBe(false); // FIRST_ISO (06-14) < rangeStart (06-15)
  });

  it("returns false when basis=range but no anchor timestamp exists", () => {
    expect(
      isViewedUnderBasis({
        visitor,
        basis: "range",
        anchor: "last",
        ...baseDeps,
        viewedAtMap: new Map(), // viewed but no timestamp recorded
      })
    ).toBe(false);
  });

  it("uses the LATEST timestamp across multiple keys when anchor=last", () => {
    const earlier = "2024-06-14T05:00:00.000Z";
    const later = "2024-06-15T20:00:00.000Z";
    expect(
      isViewedUnderBasis({
        visitor,
        basis: "range",
        anchor: "last",
        ...baseDeps,
        viewedKeys: new Set([KEY_U, KEY_S]),
        viewedAtMap: new Map([
          [KEY_U, earlier], // would fail on its own
          [KEY_S, later], // qualifies
        ]),
      })
    ).toBe(true);
  });

  it("uses the EARLIEST timestamp across multiple keys when anchor=first", () => {
    const earlier = "2024-06-14T05:00:00.000Z";
    const later = "2024-06-15T20:00:00.000Z";
    expect(
      isViewedUnderBasis({
        visitor,
        basis: "range",
        anchor: "first",
        ...baseDeps,
        viewedKeys: new Set([KEY_U, KEY_S]),
        viewedFirstAtMap: new Map([
          [KEY_U, later], // would qualify on its own
          [KEY_S, earlier], // earliest wins → falls outside the window
        ]),
      })
    ).toBe(false);
  });
});

// ─── event_day ───────────────────────────────────────────────────────────────
describe("isViewedUnderBasis — event_day", () => {
  it("LAST anchor passes when most-recent view is on the same local day as last_visit", () => {
    expect(
      isViewedUnderBasis({ visitor, basis: "event_day", anchor: "last", ...baseDeps })
    ).toBe(true); // LAST_ISO and last_visit are both on 2024-06-15
  });

  it("FIRST anchor fails when earliest view is on a different calendar day", () => {
    expect(
      isViewedUnderBasis({ visitor, basis: "event_day", anchor: "first", ...baseDeps })
    ).toBe(false); // FIRST_ISO is 2024-06-14, last_visit is 2024-06-15
  });

  it("FIRST anchor passes when first view also lands on the visit day", () => {
    expect(
      isViewedUnderBasis({
        visitor,
        basis: "event_day",
        anchor: "first",
        ...baseDeps,
        viewedFirstAtMap: new Map([[KEY_U, "2024-06-15T03:00:00.000Z"]]),
      })
    ).toBe(true);
  });

  it("returns false when no anchor timestamp is available", () => {
    expect(
      isViewedUnderBasis({
        visitor,
        basis: "event_day",
        anchor: "last",
        ...baseDeps,
        viewedAtMap: new Map(),
      })
    ).toBe(false);
  });
});

// ─── Edge cases ──────────────────────────────────────────────────────────────
describe("isViewedUnderBasis — edge cases", () => {
  it("returns false when visitor has neither user_id nor session_key", () => {
    expect(
      isViewedUnderBasis({
        visitor: { user_id: null, session_key: null, last_visit: visitor.last_visit },
        basis: "all_time",
        anchor: "last",
        ...baseDeps,
      })
    ).toBe(false);
  });

  it("session-key-only visitor still resolves correctly", () => {
    expect(
      isViewedUnderBasis({
        visitor: { user_id: null, session_key: "sess-only", last_visit: visitor.last_visit },
        basis: "range",
        anchor: "last",
        ...baseDeps,
        viewedKeys: new Set(["s:sess-only"]),
        viewedAtMap: new Map([["s:sess-only", LAST_ISO]]),
      })
    ).toBe(true);
  });
});
