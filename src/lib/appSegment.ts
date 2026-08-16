/**
 * Which "door" the user picked in the native app: wholesale, retail, or just
 * browsing as a guest. Purely a UI preference — it never gates the session,
 * tokens, or any auth logic. Guests can switch later from the account screen.
 */
export type AppSegment = "dealer" | "retail" | "guest";

const KEY = "almasria_app_segment";

export const getAppSegment = (): AppSegment | null => {
  try {
    const v = localStorage.getItem(KEY);
    return v === "dealer" || v === "retail" || v === "guest" ? v : null;
  } catch {
    return null;
  }
};

export const setAppSegment = (segment: AppSegment) => {
  try {
    localStorage.setItem(KEY, segment);
  } catch {
    /* ignore */
  }
};

export const isGuestBrowsing = () => getAppSegment() === "guest";
