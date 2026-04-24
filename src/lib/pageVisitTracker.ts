import { supabase } from "@/integrations/supabase/client";

const SESSION_KEY_STORAGE = "visitor_session_key";

function getSessionKey(): string {
  try {
    let key = sessionStorage.getItem(SESSION_KEY_STORAGE);
    if (!key) {
      key = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      sessionStorage.setItem(SESSION_KEY_STORAGE, key);
    }
    return key;
  } catch {
    return `${Date.now()}`;
  }
}

let lastTrackedPath: string | null = null;
let lastTrackedAt = 0;

/** Records a page visit for both authenticated and anonymous visitors. */
export async function trackPageVisit(path: string, title?: string) {
  try {
    // de-dupe rapid identical calls (StrictMode / double effects)
    const now = Date.now();
    if (path === lastTrackedPath && now - lastTrackedAt < 2000) return;
    lastTrackedPath = path;
    lastTrackedAt = now;

    const { data: { user } } = await supabase.auth.getUser();
    const sessionKey = getSessionKey();

    await supabase.from("page_visits").insert({
      user_id: user?.id ?? null,
      session_key: sessionKey,
      path,
      page_title: title ?? document.title ?? null,
      referrer: document.referrer || null,
    });
  } catch {
    /* silent */
  }
}
