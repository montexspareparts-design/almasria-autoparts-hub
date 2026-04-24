import { supabase } from "@/integrations/supabase/client";

/** Records that the current user visited the site today (upsert per day). */
export async function trackCustomerSession(options?: { countPageView?: boolean }) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const shouldCountPageView = options?.countPageView ?? true;
    const today = new Date().toISOString().slice(0, 10);
    // Try update first
    const { data: existing } = await supabase
      .from("customer_sessions")
      .select("id, page_views")
      .eq("user_id", user.id)
      .eq("session_date", today)
      .maybeSingle();
    if (existing) {
      await supabase
        .from("customer_sessions")
        .update({
          last_seen_at: new Date().toISOString(),
          page_views: shouldCountPageView ? (existing.page_views || 0) + 1 : existing.page_views || 0,
        })
        .eq("id", existing.id);
    } else {
      await supabase
        .from("customer_sessions")
        .insert({ user_id: user.id, session_date: today });
    }
  } catch {
    /* silent */
  }
}
