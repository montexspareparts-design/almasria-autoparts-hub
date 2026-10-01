import { useSyncExternalStore } from "react";

// Lets the 404 page tell the global <SEOHead> to drop canonical/hreflang
// and switch to noindex, so unknown URLs never look like the homepage.
let active = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const markNotFound = () => {
  active += 1;
  emit();
  return () => {
    active -= 1;
    emit();
  };
};

export const useIsNotFound = () =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => active > 0,
    () => false,
  );
