import { useEffect, useState, useRef, useCallback } from "react";

/**
 * useSessionPersistedState
 * ------------------------
 * Drop-in replacement for useState that persists its value to sessionStorage
 * under a stable key. State survives Dialog open/close and even a full page
 * reload — but is cleared automatically when the browser tab closes
 * (sessionStorage scope), so users don't get stale filters next visit.
 *
 * Usage:
 *   const [search, setSearch] = useSessionPersistedState("staff-home:visitors:search", "");
 *
 * Design notes:
 *   - Initial render reads from sessionStorage synchronously (no flash).
 *   - JSON serialization handles strings, numbers, booleans, and plain objects.
 *   - SSR-safe: falls back to the initial value when window is undefined.
 *   - Errors during read/write are swallowed (private mode, quota) — we never
 *     break the UI just because storage is unavailable.
 */
export function useSessionPersistedState<T>(
  key: string,
  initialValue: T
): [T, React.Dispatch<React.SetStateAction<T>>, () => void] {
  const initialRef = useRef(initialValue);

  const read = useCallback((): T => {
    if (typeof window === "undefined") return initialRef.current;
    try {
      const raw = window.sessionStorage.getItem(key);
      if (raw === null) return initialRef.current;
      return JSON.parse(raw) as T;
    } catch {
      return initialRef.current;
    }
  }, [key]);

  const [value, setValue] = useState<T>(read);

  // Persist on every change. Skip writes when the value matches the default
  // (keeps storage clean and avoids growing it for users who never touch a filter).
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const isDefault = JSON.stringify(value) === JSON.stringify(initialRef.current);
      if (isDefault) {
        window.sessionStorage.removeItem(key);
      } else {
        window.sessionStorage.setItem(key, JSON.stringify(value));
      }
    } catch {
      // ignore quota / serialization errors
    }
  }, [key, value]);

  // Imperative reset — useful for "Clear filters" buttons.
  const reset = useCallback(() => {
    setValue(initialRef.current);
    if (typeof window !== "undefined") {
      try {
        window.sessionStorage.removeItem(key);
      } catch {
        /* noop */
      }
    }
  }, [key]);

  return [value, setValue, reset];
}
