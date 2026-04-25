import { describe, it, expect } from "vitest";
import { normalizePhoneSearch, phoneMatches } from "./phoneSearch";

describe("normalizePhoneSearch", () => {
  it("returns empty result for empty / non-numeric input", () => {
    expect(normalizePhoneSearch("").variants).toEqual([]);
    expect(normalizePhoneSearch("   ").variants).toEqual([]);
    expect(normalizePhoneSearch("---").variants).toEqual([]);
    expect(normalizePhoneSearch("abc").variants).toEqual([]);
  });

  it("strips spaces, dashes, parentheses, and plus signs", () => {
    const r = normalizePhoneSearch("+20 (102) 781-5696");
    expect(r.digits).toBe("201027815696");
    expect(r.core).toBe("1027815696");
  });

  it("derives the same core from local, +20, 0020, and bare formats", () => {
    const local = normalizePhoneSearch("01027815696");
    const intl = normalizePhoneSearch("+201027815696");
    const intl2 = normalizePhoneSearch("00201027815696");
    const bare = normalizePhoneSearch("1027815696");
    expect(local.core).toBe("1027815696");
    expect(intl.core).toBe("1027815696");
    expect(intl2.core).toBe("1027815696");
    expect(bare.core).toBe("1027815696");
  });

  it("includes local, international, and prefixed variants", () => {
    const r = normalizePhoneSearch("01027815696");
    expect(r.variants).toEqual(
      expect.arrayContaining([
        "1027815696",
        "01027815696",
        "201027815696",
        "+201027815696",
      ])
    );
  });

  it("supports partial digits (last N digits) above min length", () => {
    const r = normalizePhoneSearch("7815696");
    expect(r.variants.length).toBeGreaterThan(0);
    // core unchanged because it's too short to look like a country-coded number
    expect(r.core).toBe("7815696");
  });

  it("ignores fragments shorter than 4 digits", () => {
    const r = normalizePhoneSearch("12");
    expect(r.variants).toEqual([]);
  });

  it("buildOrFilter generates a valid Postgres .or() string for the given column", () => {
    const r = normalizePhoneSearch("01027815696");
    const f = r.buildOrFilter("phone");
    expect(f).toContain("phone.ilike.%1027815696%");
    expect(f).toContain("phone.ilike.%01027815696%");
    expect(f).toContain("phone.ilike.%201027815696%");
    // comma-separated, no trailing comma
    expect(f.endsWith(",")).toBe(false);
  });

  it("buildOrFilter returns empty string when no variants", () => {
    expect(normalizePhoneSearch("").buildOrFilter("phone")).toBe("");
  });
});

describe("phoneMatches", () => {
  it("returns true when query is empty (no filtering)", () => {
    expect(phoneMatches("01027815696", "")).toBe(true);
  });

  it("matches stored local number when user types international", () => {
    expect(phoneMatches("01027815696", "+201027815696")).toBe(true);
    expect(phoneMatches("01027815696", "00201027815696")).toBe(true);
  });

  it("matches stored international number when user types local", () => {
    expect(phoneMatches("+201027815696", "01027815696")).toBe(true);
    expect(phoneMatches("201027815696", "01027815696")).toBe(true);
  });

  it("matches messy stored number with spaces and dashes", () => {
    expect(phoneMatches("+20 102-781-5696", "01027815696")).toBe(true);
  });

  it("matches partial digits", () => {
    expect(phoneMatches("01027815696", "7815696")).toBe(true);
  });

  it("returns false for unrelated number", () => {
    expect(phoneMatches("01111111111", "01027815696")).toBe(false);
  });

  it("returns false for null / empty stored value", () => {
    expect(phoneMatches(null, "01027815696")).toBe(false);
    expect(phoneMatches("", "01027815696")).toBe(false);
  });
});
