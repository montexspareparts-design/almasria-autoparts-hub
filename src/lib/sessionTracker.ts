import { supabase } from "@/integrations/supabase/client";

/**
 * Records activity for the current user.
 *
 * - Customers (no staff role): upsert into `customer_sessions` (one row per day, increments page_views).
 *   Trigger `trg_reject_staff_customer_sessions` defensively drops staff inserts at the DB layer.
 * - Staff (admin/moderator/reporter): logged separately into `staff_session_activity` via
 *   the `tick_staff_session(path)` RPC. Customers' analytics never include staff noise.
 */
export async function trackCustomerSession(options?: { countPageView?: boolean }) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Detect role once per call (cheap RLS-friendly query)
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    const isStaff = (roles ?? []).some((r) =>
      r.role === "admin" || r.role === "moderator" || r.role === "reporter"
    );

    if (isStaff) {
      // Record staff activity in a dedicated, admin-only table
      const path = typeof window !== "undefined" ? window.location.pathname : "/";
      await supabase.rpc("tick_staff_session", { _path: path });
      return;
    }

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
