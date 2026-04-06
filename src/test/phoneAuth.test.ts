import { describe, expect, it } from "vitest";

import { getPhoneAuthEmailCandidates, isPhoneLike, phoneToInternalEmail } from "@/lib/phoneAuth";

describe("phoneAuth", () => {
  it("normalizes Egyptian phone variants to one internal email", () => {
    const expectedEmail = "01119392239@phone.almasria.local";

    expect(phoneToInternalEmail("01119392239")).toBe(expectedEmail);
    expect(phoneToInternalEmail("+20 111 939 2239")).toBe(expectedEmail);
    expect(phoneToInternalEmail("00201119392239")).toBe(expectedEmail);
    expect(phoneToInternalEmail("٠١١١٩٣٩٢٢٣٩")).toBe(expectedEmail);
  });

  it("keeps legacy auth email variants for fallback login", () => {
    expect(getPhoneAuthEmailCandidates("+20 111 939 2239")).toEqual(
      expect.arrayContaining([
        "01119392239@phone.almasria.local",
        "201119392239@phone.almasria.local",
      ]),
    );
  });

  it("recognizes phone input even with hidden direction marks", () => {
    expect(isPhoneLike("\u200E+20 111 939 2239")).toBe(true);
  });
});