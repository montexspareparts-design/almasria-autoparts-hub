import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSessionPersistedState } from "./useSessionPersistedState";

describe("useSessionPersistedState", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("returns the initial value when storage is empty", () => {
    const { result } = renderHook(() => useSessionPersistedState("test:k1", "hello"));
    expect(result.current[0]).toBe("hello");
  });

  it("persists string updates to sessionStorage", () => {
    const { result } = renderHook(() => useSessionPersistedState("test:k2", ""));
    act(() => result.current[1]("apple"));
    expect(result.current[0]).toBe("apple");
    expect(sessionStorage.getItem("test:k2")).toBe(JSON.stringify("apple"));
  });

  it("rehydrates from sessionStorage on remount", () => {
    sessionStorage.setItem("test:k3", JSON.stringify("restored"));
    const { result } = renderHook(() => useSessionPersistedState("test:k3", "default"));
    expect(result.current[0]).toBe("restored");
  });

  it("removes the key from storage when value matches default (no junk)", () => {
    const { result } = renderHook(() => useSessionPersistedState("test:k4", "default"));
    act(() => result.current[1]("changed"));
    expect(sessionStorage.getItem("test:k4")).not.toBeNull();
    act(() => result.current[1]("default"));
    expect(sessionStorage.getItem("test:k4")).toBeNull();
  });

  it("supports complex object values via JSON serialization", () => {
    type Filter = { tier: "all" | "hot"; sort: "score" | "recent" };
    const initial: Filter = { tier: "all", sort: "score" };
    const { result } = renderHook(() => useSessionPersistedState<Filter>("test:k5", initial));
    act(() => result.current[1]({ tier: "hot", sort: "recent" }));
    expect(result.current[0]).toEqual({ tier: "hot", sort: "recent" });
    expect(JSON.parse(sessionStorage.getItem("test:k5")!)).toEqual({ tier: "hot", sort: "recent" });
  });

  it("reset() restores the initial value and clears storage", () => {
    const { result } = renderHook(() => useSessionPersistedState("test:k6", "default"));
    act(() => result.current[1]("modified"));
    expect(sessionStorage.getItem("test:k6")).not.toBeNull();
    act(() => result.current[2]());
    expect(result.current[0]).toBe("default");
    expect(sessionStorage.getItem("test:k6")).toBeNull();
  });

  it("isolates state between different keys", () => {
    const { result: a } = renderHook(() => useSessionPersistedState("test:kA", ""));
    const { result: b } = renderHook(() => useSessionPersistedState("test:kB", ""));
    act(() => a.current[1]("alpha"));
    act(() => b.current[1]("beta"));
    expect(a.current[0]).toBe("alpha");
    expect(b.current[0]).toBe("beta");
  });

  it("survives a remount cycle (Dialog close/reopen scenario)", () => {
    const { result: first, unmount } = renderHook(() =>
      useSessionPersistedState("test:dialog:search", "")
    );
    act(() => first.current[1]("ahmed"));
    unmount();
    // remount as if Dialog just reopened
    const { result: second } = renderHook(() =>
      useSessionPersistedState("test:dialog:search", "")
    );
    expect(second.current[0]).toBe("ahmed");
  });

  it("handles malformed JSON in storage by falling back to initial", () => {
    sessionStorage.setItem("test:bad", "not json {");
    const { result } = renderHook(() => useSessionPersistedState("test:bad", "fallback"));
    expect(result.current[0]).toBe("fallback");
  });
});
