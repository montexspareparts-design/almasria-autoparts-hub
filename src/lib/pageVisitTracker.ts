import { supabase } from "@/integrations/supabase/client";
import { markHeartbeatTitle, shouldTrackBrowserVisit } from "@/lib/visitorAnalytics";

const SESSION_KEY_STORAGE = "visitor_session_key";
const PENDING_KEY = "visitor_pending_visits";

function getSessionKey(): string {
  try {
    let key = sessionStorage.getItem(SESSION_KEY_STORAGE) || localStorage.getItem(SESSION_KEY_STORAGE);
    if (!key) {
      key = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      sessionStorage.setItem(SESSION_KEY_STORAGE, key);
      localStorage.setItem(SESSION_KEY_STORAGE, key);
    } else {
      sessionStorage.setItem(SESSION_KEY_STORAGE, key);
      localStorage.setItem(SESSION_KEY_STORAGE, key);
    }
    return key;
  } catch {
    return `${Date.now()}`;
  }
}

interface PendingVisit {
  path: string;
  page_title: string | null;
  referrer: string | null;
  session_key: string;
  visited_at: string;
}

function readPending(): PendingVisit[] {
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writePending(items: PendingVisit[]) {
  try {
    localStorage.setItem(PENDING_KEY, JSON.stringify(items.slice(-50)));
  } catch {
    /* quota */
  }
}

/** Flush any pending visits that failed to insert previously (e.g. user closed tab). */
export async function flushPendingVisits(): Promise<number> {
  const pending = readPending();
  if (pending.length === 0) return 0;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const rows = pending.map((p) => ({
      user_id: user?.id ?? null,
      session_key: p.session_key,
      path: p.path,
      page_title: p.page_title,
      referrer: p.referrer,
      visited_at: p.visited_at,
    }));
    const { error } = await supabase.from("page_visits").insert(rows);
    if (!error) {
      writePending([]);
      return rows.length;
    }
  } catch {
    /* keep pending for next try */
  }
  return 0;
}

let lastTrackedPath: string | null = null;
let lastTrackedAt = 0;

/** Records a page visit for both authenticated and anonymous visitors. */
export async function trackPageVisit(path: string, title?: string) {
  if (typeof window !== "undefined" && !shouldTrackBrowserVisit(path, window.location.hostname)) return;
  // de-dupe rapid identical calls (StrictMode / double effects)
  const now = Date.now();
  if (path === lastTrackedPath && now - lastTrackedAt < 2000) return;
  lastTrackedPath = path;
  lastTrackedAt = now;

  const sessionKey = getSessionKey();
  const visit: PendingVisit = {
    path,
    page_title: title ?? document.title ?? null,
    referrer: document.referrer || null,
    session_key: sessionKey,
    visited_at: new Date().toISOString(),
  };

  // Optimistically queue so we never lose a visit if the request is interrupted
  const pending = readPending();
  pending.push(visit);
  writePending(pending);

  try {
    const { data: { user } } = await supabase.auth.getUser();

    // الموظفون (admin/moderator/reporter) لا يُسجَّلون كزوار/عملاء
    // بدلاً من ذلك نسجّل نشاطهم في staff_activity_events + staff_session_activity
    if (user?.id) {
      const { data: roleRow } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .in("role", ["admin", "moderator", "reporter"])
        .maybeSingle();
      if (roleRow) {
        // اسحبه من قائمة الـ pending الخاصة بالزوار
        const remaining = readPending().filter(
          (p) => !(p.path === visit.path && p.visited_at === visit.visited_at)
        );
        writePending(remaining);

        // سجّل event للمخطط بالساعة
        try {
          await supabase.from("staff_activity_events").insert({
            user_id: user.id,
            path: visit.path,
            event_at: visit.visited_at,
          });
        } catch { /* silent */ }

        // upsert في staff_session_activity (تجميعة اليوم)
        try {
          const today = new Date().toISOString().slice(0, 10);
          const { data: existing } = await supabase
            .from("staff_session_activity")
            .select("id, page_views, paths")
            .eq("user_id", user.id)
            .eq("session_date", today)
            .maybeSingle();
          if (existing) {
            const newPaths = Array.from(new Set([...(existing.paths || []), visit.path])).slice(0, 50);
            await supabase
              .from("staff_session_activity")
              .update({
                page_views: (existing.page_views || 0) + 1,
                last_seen_at: visit.visited_at,
                paths: newPaths,
              })
              .eq("id", existing.id);
          } else {
            await supabase.from("staff_session_activity").insert({
              user_id: user.id,
              session_date: today,
              first_seen_at: visit.visited_at,
              last_seen_at: visit.visited_at,
              page_views: 1,
              paths: [visit.path],
            });
          }
        } catch { /* silent */ }

        return;
      }
    }

    const { error } = await supabase.from("page_visits").insert({
      user_id: user?.id ?? null,
      session_key: visit.session_key,
      path: visit.path,
      page_title: visit.page_title,
      referrer: visit.referrer,
      visited_at: visit.visited_at,
    });
    if (!error) {
      // Drop this visit from the pending queue
      const remaining = readPending().filter(
        (p) => !(p.path === visit.path && p.visited_at === visit.visited_at)
      );
      writePending(remaining);
      // Opportunistically flush anything else that was stuck
      if (remaining.length > 0) flushPendingVisits();
    }
  } catch {
    /* will be retried via flushPendingVisits */
  }
}

export async function trackHeartbeatVisit(path: string, title?: string) {
  return trackPageVisit(path, markHeartbeatTitle(title ?? document.title ?? null));
}
