import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  Users,
  UserPlus,
  ShoppingCart,
  CheckCircle2,
  Flame,
  Phone,
  MessageCircle,
  Eye,
  ArrowLeft,
  Activity,
  ClipboardList,
  TrendingUp,
  CheckCheck,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { isNoiseVisit, ENGAGED_DWELL_MS } from "@/lib/visitorAnalytics";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface KPI {
  label: string;
  value: number;
  icon: any;
  color: string;
  bg: string;
  onClick?: () => void;
  /** Optional smaller stat shown under the main value (e.g. "تمت معاينة 3") */
  subText?: string;
}

interface HotLead {
  user_id: string;
  full_name: string | null;
  phone: string | null;
  score: number;
  reasons: string[];
  last_activity: string;
  tier: "hot" | "warm" | "cold";
}

const todayISO = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
};

const sevenDaysISO = () => {
  return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
};

type RangeKey = "today" | "7d";

const StaffHome = () => {
  const { user, isAdmin, isModerator, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  // Raw KPI inputs only — actual displayed numbers are computed via memos that
  // react to the All/Only-Customers toggle for full consistency with visibleVisitorsCount.
  const [hotLeadsCount, setHotLeadsCount] = useState(0);
  const [hotLeads, setHotLeads] = useState<HotLead[]>([]);
  const [range, setRange] = useState<RangeKey>("today");
  const [newSignups, setNewSignups] = useState<Array<{ user_id: string; full_name: string | null; phone: string | null; email: string | null; created_at: string; duplicates?: number; duplicateIds?: string[] }>>([]);
  const [signupsOpen, setSignupsOpen] = useState(false);
  const [visitorsOpen, setVisitorsOpen] = useState(false);
  const [visitorsList, setVisitorsList] = useState<Array<{ user_id: string | null; session_key: string | null; full_name: string | null; phone: string | null; email: string | null; pages: number; last_visit: string; first_visit?: string; first_path?: string | null; referrer?: string | null; searches?: string[] }>>([]);
  const [viewedKeys, setViewedKeys] = useState<Set<string>>(new Set());
  // Per-key earliest view timestamp — used to compute "viewed" under different time-basis modes.
  const [viewedAtMap, setViewedAtMap] = useState<Map<string, string>>(new Map());
  // All session views performed TODAY by ANY staff member — for the "viewed today" dialog
  // Map key = "u:<user_id>" or "s:<session_key>", value = aggregated view info
  const [todayViewsMap, setTodayViewsMap] = useState<Map<string, { staffIds: Set<string>; viewCount: number; lastViewedAt: string }>>(new Map());
  const [staffNamesMap, setStaffNamesMap] = useState<Map<string, string>>(new Map());
  const [viewedTodayOpen, setViewedTodayOpen] = useState(false);
  const [viewedTodayMethodFilter, setViewedTodayMethodFilter] = useState<"all" | "by_me" | "by_others" | "multiple">("all");
  const [viewedTodaySourceFilter, setViewedTodaySourceFilter] = useState<"all" | "facebook" | "google" | "instagram" | "tiktok" | "whatsapp" | "direct" | "other">("all");
  // Cart users dialog
  const [cartOpen, setCartOpen] = useState(false);
  const [cartList, setCartList] = useState<Array<{ user_id: string; full_name: string | null; phone: string | null; email: string | null; items: number; last_added: string }>>([]);
  // Buyers dialog
  const [buyersOpen, setBuyersOpen] = useState(false);
  const [buyersList, setBuyersList] = useState<Array<{ user_id: string; full_name: string | null; phone: string | null; email: string | null; order_number: string | null; total_amount: number; status: string; created_at: string }>>([]);
  // Hot Leads dialog
  const [hotLeadsOpen, setHotLeadsOpen] = useState(false);
  // Visitors dialog "engaged only" filter (driven by KPI card click)
  const [visitorEngagedOnly, setVisitorEngagedOnly] = useState(false);
  const [visitorTypeFilter, setVisitorTypeFilter] = useState<"all" | "registered" | "anon">("all");
  const [visitorDateFilter, setVisitorDateFilter] = useState<"all" | "today" | "yesterday" | "week">("today");
  const [visitorViewedFilter, setVisitorViewedFilter] = useState<"all" | "viewed" | "not_viewed">("all");
  // Toggle: false = "Only Customers" (default, excludes staff). true = "All" (review only — shows staff too).
  const [includeStaff, setIncludeStaff] = useState<boolean>(false);
  const [staffIdsSet, setStaffIdsSet] = useState<Set<string>>(new Set());
  // "Viewed" KPI time basis:
  //   - "range": viewed within the selected KPI range (today / 7d) — rolling window
  //   - "event_day": viewed on the same calendar day as the visitor's last_visit
  //   - "all_time": any past view counts (legacy behavior)
  const [viewedBasis, setViewedBasis] = useState<"range" | "event_day" | "all_time">("range");

  // Guard
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
      return;
    }
    if (!authLoading && user && !isAdmin && !isModerator) {
      navigate("/");
    }
  }, [authLoading, user, isAdmin, isModerator, navigate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const start = range === "today" ? todayISO() : sevenDaysISO();

      // 1) Visitors — always fetch last 7 days so the dialog's date filter (today/yesterday/week) is meaningful.
      // KPI counts are computed against `start` below.
      const visitsStart = sevenDaysISO();
      const { data: visits } = await supabase
        .from("page_visits")
        .select("session_key, user_id, visited_at, path, referrer")
        .gte("visited_at", visitsStart)
        .order("visited_at", { ascending: false });
      const cleanVisits = (visits || []).filter((v) => !isNoiseVisit(v));
      const visitorKeys = new Set(
        cleanVisits.map((v) => v.session_key || v.user_id || "")
          .filter(Boolean)
      );

      // Aggregate visitors: group by user_id (or session_key for anon) → page count + last visit + first entry
      const visitorAgg = new Map<string, { user_id: string | null; session_key: string | null; pages: number; last_visit: string; first_visit: string; first_path: string | null; referrer: string | null }>();
      for (const v of cleanVisits) {
        const key = v.session_key || v.user_id || "";
        if (!key) continue;
        const cur = visitorAgg.get(key);
        if (cur) {
          cur.pages += 1;
          if (!cur.user_id && v.user_id) cur.user_id = v.user_id;
          if (v.visited_at > cur.last_visit) cur.last_visit = v.visited_at;
          if (v.visited_at < cur.first_visit) {
            cur.first_visit = v.visited_at;
            cur.first_path = v.path;
            cur.referrer = v.referrer || cur.referrer;
          }
        } else {
          visitorAgg.set(key, {
            user_id: v.user_id || null,
            session_key: v.session_key || null,
            pages: 1,
            last_visit: v.visited_at,
            first_visit: v.visited_at,
            first_path: v.path,
            referrer: v.referrer || null,
          });
        }
      }

      // 1b) Search queries per anonymous session (helps staff understand intent)
      const anonSessionKeys = Array.from(visitorAgg.values())
        .filter(v => !v.user_id && v.session_key)
        .map(v => v.session_key as string);
      const searchesBySession = new Map<string, string[]>();
      // (search logs aren't tied to session_key directly; only by user_id — anon searches are not linkable)
      // Future: add session_key to customer_search_logs if needed


      // 2) Signups within range — fetch full list (for the popup) + count
      const { data: signupRows, count: signupCount } = await supabase
        .from("profiles")
        .select("user_id, full_name, phone, email, created_at", { count: "exact" })
        .gte("created_at", start)
        .order("created_at", { ascending: false })
        .limit(100);

      // Deduplicate by normalized phone (or email fallback) — keep latest, count duplicates
      const normalizePhone = (p: string | null) => (p || "").replace(/[^\d]/g, "").replace(/^20/, "0");
      const dedupMap = new Map<string, typeof signupRows[number] & { duplicates: number; duplicateIds: string[] }>();
      for (const s of signupRows || []) {
        const phoneKey = normalizePhone(s.phone);
        const emailKey = (s.email || "").toLowerCase().trim();
        const key = phoneKey || emailKey || s.user_id;
        const existing = dedupMap.get(key);
        if (existing) {
          existing.duplicates += 1;
          existing.duplicateIds.push(s.user_id);
        } else {
          dedupMap.set(key, { ...s, duplicates: 1, duplicateIds: [s.user_id] });
        }
      }
      const dedupedSignups = Array.from(dedupMap.values()).sort((a, b) =>
        b.created_at.localeCompare(a.created_at)
      );
      setNewSignups(dedupedSignups);

      // 3) Users who added to cart today (distinct) — keep latest add time per user
      const { data: cartItems } = await supabase
        .from("dealer_cart_items")
        .select("user_id, created_at, quantity")
        .gte("created_at", start)
        .order("created_at", { ascending: false });
      const cartUsers = new Set((cartItems || []).map((c) => c.user_id));
      const cartAggMap = new Map<string, { user_id: string; last_added: string; items: number }>();
      (cartItems || []).forEach((c: any) => {
        const cur = cartAggMap.get(c.user_id);
        if (cur) {
          cur.items += 1;
          if (c.created_at > cur.last_added) cur.last_added = c.created_at;
        } else {
          cartAggMap.set(c.user_id, { user_id: c.user_id, last_added: c.created_at, items: 1 });
        }
      });

      // 4) Users who purchased today (distinct) — keep order info
      const { data: orders } = await supabase
        .from("orders")
        .select("user_id, order_number, total_amount, status, created_at")
        .gte("created_at", start)
        .order("created_at", { ascending: false });
      const buyers = new Set((orders || []).map((o) => o.user_id));

      // 5) Hot leads — compute scoring
      // Pull last 7 days of activity
      const sevenDaysAgo = new Date(
        Date.now() - 7 * 24 * 60 * 60 * 1000
      ).toISOString();

      const [searchesRes, viewsRes, cartRes, ordersRes, profilesRes] =
        await Promise.all([
          supabase
            .from("customer_search_logs")
            .select("user_id, search_query, created_at")
            .gte("created_at", sevenDaysAgo)
            .not("user_id", "is", null),
          supabase
            .from("dealer_price_views")
            .select("user_id, product_id, viewed_at")
            .gte("viewed_at", sevenDaysAgo),
          supabase
            .from("dealer_cart_items")
            .select("user_id, updated_at")
            .gte("updated_at", sevenDaysAgo),
          supabase
            .from("orders")
            .select("user_id, created_at")
            .gte("created_at", sevenDaysAgo),
          supabase
            .from("profiles")
            .select("user_id, full_name, phone, email"),
        ]);

      const orderedUserIds = new Set(
        (ordersRes.data || []).map((o) => o.user_id)
      );

      const scoreMap = new Map<
        string,
        { score: number; reasons: string[]; lastActivity: string }
      >();

      const bump = (uid: string, points: number, reason: string, ts: string) => {
        if (!uid) return;
        const cur = scoreMap.get(uid) || {
          score: 0,
          reasons: [],
          lastActivity: ts,
        };
        cur.score += points;
        if (!cur.reasons.includes(reason)) cur.reasons.push(reason);
        if (ts > cur.lastActivity) cur.lastActivity = ts;
        scoreMap.set(uid, cur);
      };

      // Login/visit = +5 (per distinct visitor session)
      for (const v of visits || []) {
        if (v.user_id) bump(v.user_id, 5, "زار الموقع", new Date().toISOString());
      }

      // Search = +10
      for (const s of searchesRes.data || []) {
        if (s.user_id)
          bump(s.user_id, 10, `بحث: ${s.search_query}`, s.created_at);
      }

      // Repeated product view = +20 (count duplicates)
      const viewCounts = new Map<string, number>();
      for (const v of viewsRes.data || []) {
        const key = `${v.user_id}::${v.product_id}`;
        viewCounts.set(key, (viewCounts.get(key) || 0) + 1);
      }
      for (const [key, count] of viewCounts.entries()) {
        const [uid] = key.split("::");
        if (count > 1)
          bump(uid, 20, "فتح نفس المنتج أكتر من مرة", new Date().toISOString());
      }

      // Added to cart = +40
      for (const c of cartRes.data || []) {
        bump(c.user_id, 40, "أضاف للسلة", c.updated_at);
      }

      // Purchased = also tracked but lowers urgency (already converted)
      // We'll filter them out from hot leads list

      const profileMap = new Map(
        (profilesRes.data || []).map((p) => [p.user_id, p])
      );

      const leads: HotLead[] = [];
      for (const [uid, info] of scoreMap.entries()) {
        if (orderedUserIds.has(uid)) continue; // skip buyers
        const tier: "hot" | "warm" | "cold" =
          info.score >= 70 ? "hot" : info.score >= 30 ? "warm" : "cold";
        const profile = profileMap.get(uid);
        leads.push({
          user_id: uid,
          full_name: profile?.full_name || null,
          phone: profile?.phone || null,
          score: info.score,
          reasons: info.reasons.slice(0, 3),
          last_activity: info.lastActivity,
          tier,
        });
      }
      leads.sort((a, b) => b.score - a.score);

      const hotCount = leads.filter((l) => l.tier === "hot").length;

      // Fetch staff (admins + moderators) — used to optionally exclude from visitors
      const { data: staffRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .in("role", ["admin", "moderator"]);
      const staffIds = new Set<string>((staffRoles || []).map((r: any) => r.user_id));
      setStaffIdsSet(staffIds);

      // Build full visitors list — keep staff in the raw list; UI toggle decides whether to show them
      const visitorsArr = Array.from(visitorAgg.values())
        .map((v) => {
          const profile = v.user_id ? profileMap.get(v.user_id) : null;
          const emailRaw = (profile as any)?.email as string | undefined;
          const email = emailRaw && !emailRaw.includes("@phone.almasria.local") ? emailRaw : null;
          return {
            user_id: v.user_id,
            session_key: v.session_key,
            full_name: profile?.full_name || null,
            phone: profile?.phone || null,
            email,
            pages: v.pages,
            last_visit: v.last_visit,
            first_visit: v.first_visit,
            first_path: v.first_path,
            referrer: v.referrer,
          };
        });
      // Sort strictly by last_visit desc — latest visitor first
      visitorsArr.sort((a, b) => b.last_visit.localeCompare(a.last_visit));
      setVisitorsList(visitorsArr);

      // Fetch which visitors the current staff has already viewed (with timestamp)
      try {
        const { data: views } = await supabase
          .from("visitor_session_views")
          .select("customer_user_id, session_key, last_viewed_at")
          .eq("staff_user_id", user!.id);
        const set = new Set<string>();
        const tsMap = new Map<string, string>();
        (views || []).forEach((v: any) => {
          const at = v.last_viewed_at as string | null;
          if (v.customer_user_id) {
            const k = `u:${v.customer_user_id}`;
            set.add(k);
            if (at && (!tsMap.has(k) || at > (tsMap.get(k) as string))) tsMap.set(k, at);
          }
          if (v.session_key) {
            const k = `s:${v.session_key}`;
            set.add(k);
            if (at && (!tsMap.has(k) || at > (tsMap.get(k) as string))) tsMap.set(k, at);
          }
        });
        setViewedKeys(set);
        setViewedAtMap(tsMap);
      } catch (e) {
        console.warn("[StaffHome] viewed keys fetch failed", e);
      }

      // Fetch ALL staff views performed TODAY (any staff) — powers the "Viewed Today" dialog
      try {
        const todayStartIso = todayISO();
        const { data: allViews } = await supabase
          .from("visitor_session_views")
          .select("staff_user_id, customer_user_id, session_key, last_viewed_at, view_count")
          .gte("last_viewed_at", todayStartIso);
        const map = new Map<string, { staffIds: Set<string>; viewCount: number; lastViewedAt: string }>();
        const staffIdsToFetch = new Set<string>();
        (allViews || []).forEach((v: any) => {
          const k = v.customer_user_id ? `u:${v.customer_user_id}` : (v.session_key ? `s:${v.session_key}` : null);
          if (!k) return;
          staffIdsToFetch.add(v.staff_user_id);
          const cur = map.get(k);
          const at = v.last_viewed_at as string;
          const vc = (v.view_count as number) || 1;
          if (cur) {
            cur.staffIds.add(v.staff_user_id);
            cur.viewCount += vc;
            if (at > cur.lastViewedAt) cur.lastViewedAt = at;
          } else {
            map.set(k, { staffIds: new Set([v.staff_user_id]), viewCount: vc, lastViewedAt: at });
          }
        });
        setTodayViewsMap(map);
        // Resolve staff names
        if (staffIdsToFetch.size > 0) {
          const { data: staffProfiles } = await supabase
            .from("profiles")
            .select("user_id, full_name")
            .in("user_id", Array.from(staffIdsToFetch));
          const nMap = new Map<string, string>();
          (staffProfiles || []).forEach((p: any) => nMap.set(p.user_id, p.full_name || "موظف"));
          setStaffNamesMap(nMap);
        } else {
          setStaffNamesMap(new Map());
        }
      } catch (e) {
        console.warn("[StaffHome] today views fetch failed", e);
      }

      // Note: KPI counts (visitors / engaged / cart / purchased) are derived via
      // useMemos below from visitorsList / cartList / buyersList so they react live
      // to the All/Only-Customers toggle exactly like visibleVisitorsCount.
      // We only persist the raw "hot leads" count here since hotLeads list is already stored.
      setHotLeadsCount(hotCount);
      setHotLeads(leads.slice(0, 12));

      // Build cart users list (with profiles) — sorted by latest add
      const cartArr = Array.from(cartAggMap.values())
        .map((c) => {
          const p = profileMap.get(c.user_id);
          const emailRaw = (p as any)?.email as string | undefined;
          const email = emailRaw && !emailRaw.includes("@phone.almasria.local") ? emailRaw : null;
          return {
            user_id: c.user_id,
            full_name: p?.full_name || null,
            phone: p?.phone || null,
            email,
            items: c.items,
            last_added: c.last_added,
          };
        })
        .sort((a, b) => b.last_added.localeCompare(a.last_added));
      setCartList(cartArr);

      // Build buyers list — one row per order (recent orders today)
      const buyersArr = (orders || []).map((o: any) => {
        const p = profileMap.get(o.user_id);
        const emailRaw = (p as any)?.email as string | undefined;
        const email = emailRaw && !emailRaw.includes("@phone.almasria.local") ? emailRaw : null;
        return {
          user_id: o.user_id,
          full_name: p?.full_name || null,
          phone: p?.phone || null,
          email,
          order_number: o.order_number || null,
          total_amount: Number(o.total_amount) || 0,
          status: o.status || "pending",
          created_at: o.created_at,
        };
      });
      setBuyersList(buyersArr);
    } catch (e) {
      console.error("[StaffHome] fetch error", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && (isAdmin || isModerator)) fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isAdmin, isModerator, range]);

  // Sync the dialog's date filter with the KPI range toggle so users see what they expect.
  useEffect(() => {
    setVisitorDateFilter(range === "today" ? "today" : "all");
  }, [range]);

  const rangeSuffix = range === "today" ? "اليوم" : "آخر 7 أيام";

  // Helper: was this visitor "viewed" under the selected time basis?
  const isViewedUnderBasis = (v: { user_id: string | null; session_key: string | null; last_visit: string }) => {
    const keys: string[] = [];
    if (v.user_id) keys.push(`u:${v.user_id}`);
    if (v.session_key) keys.push(`s:${v.session_key}`);
    if (keys.length === 0) return false;
    const baseHit = keys.some((k) => viewedKeys.has(k));
    if (!baseHit) return false;
    if (viewedBasis === "all_time") return true;

    // Latest view timestamp across this visitor's keys
    let viewedAt: string | null = null;
    for (const k of keys) {
      const t = viewedAtMap.get(k);
      if (t && (!viewedAt || t > viewedAt)) viewedAt = t;
    }
    if (!viewedAt) return false; // no timestamp known → can't qualify under date-based modes

    if (viewedBasis === "range") {
      // Match the KPI range (today vs last 7d) using the same start used in fetchData
      const start = range === "today" ? todayISO() : sevenDaysISO();
      return viewedAt >= start;
    }
    if (viewedBasis === "event_day") {
      // Same calendar day (local) as the visitor's last visit
      const sameDay = (a: string, b: string) => {
        const da = new Date(a); const db = new Date(b);
        return da.getFullYear() === db.getFullYear()
          && da.getMonth() === db.getMonth()
          && da.getDate() === db.getDate();
      };
      return sameDay(viewedAt, v.last_visit);
    }
    return baseHit;
  };

  // Count how many of the displayed (non-staff) visitors the current staff has already opened
  const viewedVisitorsCount = useMemo(() => {
    return visitorsList.reduce((acc, v) => {
      if (!includeStaff && v.user_id && staffIdsSet.has(v.user_id)) return acc;
      return isViewedUnderBasis(v) ? acc + 1 : acc;
    }, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visitorsList, viewedKeys, viewedAtMap, includeStaff, staffIdsSet, viewedBasis, range]);

  // Count after the All/Only-Customers toggle (staff exclusion only — independent of date/type/viewed filters).
  // This is what the badge in the dialog title shows so users see the effect of the toggle live.
  // Visitor count shown in the dialog title badge — uses the SAME staff exclusion
  // AND the same KPI range as the visitors KPI card, so badge ≡ kpis.visitors.
  const visibleVisitorsCount = useMemo(() => {
    return visitorsList.reduce((acc, v) => {
      if (!includeStaff && v.user_id && staffIdsSet.has(v.user_id)) return acc;
      if (new Date(v.last_visit).getTime() < startMs) return acc;
      return acc + 1;
    }, 0);
  }, [visitorsList, includeStaff, staffIdsSet, startMs]);

  // Helpers to apply the same staff-exclusion + range filters everywhere KPIs are derived
  const isStaffVisitor = (uid: string | null | undefined) => !!uid && staffIdsSet.has(uid);
  const startMs = useMemo(
    () => new Date(range === "today" ? todayISO() : sevenDaysISO()).getTime(),
    [range]
  );

  // Unified KPI numbers — computed from raw lists with the SAME staff-exclusion
  // logic as visibleVisitorsCount, so all cards stay consistent with the toggle.
  const kpis = useMemo(() => {
    const visibleVisitors = visitorsList.filter(
      (v) => (includeStaff || !isStaffVisitor(v.user_id)) && new Date(v.last_visit).getTime() >= startMs
    );
    const engaged = visibleVisitors.filter((v) => {
      const dwell = v.first_visit ? new Date(v.last_visit).getTime() - new Date(v.first_visit).getTime() : 0;
      return dwell >= ENGAGED_DWELL_MS || v.pages >= 2;
    }).length;
    const signups = newSignups.filter((s) => includeStaff || !isStaffVisitor(s.user_id)).length;
    const cartUsers = new Set(
      cartList.filter((c) => includeStaff || !isStaffVisitor(c.user_id)).map((c) => c.user_id)
    ).size;
    const buyerUsers = new Set(
      buyersList.filter((b) => includeStaff || !isStaffVisitor(b.user_id)).map((b) => b.user_id)
    ).size;
    const hot = hotLeads.filter((l) => includeStaff || !isStaffVisitor(l.user_id)).length || hotLeadsCount;
    return {
      visitors: visibleVisitors.length,
      engagedVisitors: engaged,
      signups,
      addedToCart: cartUsers,
      purchased: buyerUsers,
      hotLeads: hot,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visitorsList, newSignups, cartList, buyersList, hotLeads, hotLeadsCount, includeStaff, staffIdsSet, startMs]);

  // Detect traffic source for a visitor (used as the "reason" filter in Viewed Today dialog)
  const detectSource = (firstPath: string | null, referrer: string | null) => {
    const hay = ((firstPath || "") + " " + (referrer || "")).toLowerCase();
    if (hay.includes("fbclid") || hay.includes("facebook") || hay.includes("utm_source=fb")) return "facebook";
    if (hay.includes("instagram") || hay.includes("ig_")) return "instagram";
    if (hay.includes("google") || hay.includes("gclid")) return "google";
    if (hay.includes("tiktok") || hay.includes("ttclid")) return "tiktok";
    if (hay.includes("whatsapp") || hay.includes("wa.me")) return "whatsapp";
    if (!referrer) return "direct";
    return "other";
  };

  const sourceLabel: Record<string, string> = {
    facebook: "📘 فيسبوك",
    instagram: "📷 إنستجرام",
    google: "🔍 جوجل",
    tiktok: "🎵 تيك توك",
    whatsapp: "💬 واتساب",
    direct: "🌐 مباشر",
    other: "🔗 موقع آخر",
  };

  // Visitors viewed TODAY by any staff — joined with visitor data + view metadata
  const viewedTodayVisitors = useMemo(() => {
    const items: Array<{
      v: typeof visitorsList[number];
      viewInfo: { staffIds: Set<string>; viewCount: number; lastViewedAt: string };
      key: string;
    }> = [];
    visitorsList.forEach((v) => {
      const k = v.user_id ? `u:${v.user_id}` : (v.session_key ? `s:${v.session_key}` : null);
      if (!k) return;
      const info = todayViewsMap.get(k);
      if (!info) return;
      items.push({ v, viewInfo: info, key: k });
    });
    items.sort((a, b) => b.viewInfo.lastViewedAt.localeCompare(a.viewInfo.lastViewedAt));
    return items;
  }, [visitorsList, todayViewsMap]);

  const kpiCards: KPI[] = useMemo(
    () => [
      {
        label: `زوار ${rangeSuffix}`,
        value: kpis.visitors,
        icon: Users,
        color: "text-blue-600",
        bg: "from-blue-500/10 to-blue-500/5",
        onClick: () => setVisitorsOpen(true),
        subText: kpis.visitors > 0
          ? `تمت معاينة ${viewedVisitorsCount} / ${kpis.visitors}${
              viewedBasis === "event_day"
                ? " · بنفس يوم الزيارة"
                : viewedBasis === "all_time"
                ? " · أي وقت"
                : ""
            }`
          : undefined,
      },
      {
        label: "تمت معاينتهم اليوم",
        value: viewedTodayVisitors.length,
        icon: CheckCheck,
        color: "text-violet-600",
        bg: "from-violet-500/10 to-violet-500/5",
        onClick: () => setViewedTodayOpen(true),
        subText: viewedTodayVisitors.length > 0
          ? `إجمالي ${viewedTodayVisitors.reduce((s, x) => s + x.viewInfo.viewCount, 0)} معاينة`
          : undefined,
      },
      {
        label: `زوار متفاعلين (${rangeSuffix})`,
        value: kpis.engagedVisitors,
        icon: Activity,
        color: "text-cyan-600",
        bg: "from-cyan-500/10 to-cyan-500/5",
        onClick: () => { setVisitorEngagedOnly(true); setVisitorsOpen(true); },
        subText: kpis.engagedVisitors > 0 ? "اضغط لرؤية القائمة (مدة ≥15ث أو ≥2 صفحة)" : undefined,
      },
      {
        label: `تسجيلات جديدة (${rangeSuffix})`,
        value: kpis.signups,
        icon: UserPlus,
        color: "text-emerald-600",
        bg: "from-emerald-500/10 to-emerald-500/5",
        onClick: () => setSignupsOpen(true),
      },
      {
        label: `أضافوا للسلة (${rangeSuffix})`,
        value: kpis.addedToCart,
        icon: ShoppingCart,
        color: "text-amber-600",
        bg: "from-amber-500/10 to-amber-500/5",
        onClick: () => setCartOpen(true),
        subText: cartList.length > 0 ? `${cartList.reduce((s, c) => s + c.items, 0)} منتج بالسلال` : undefined,
      },
      {
        label: `اشتروا (${rangeSuffix})`,
        value: kpis.purchased,
        icon: CheckCircle2,
        color: "text-green-600",
        bg: "from-green-500/10 to-green-500/5",
        onClick: () => setBuyersOpen(true),
        subText: buyersList.length > 0
          ? `إجمالي ${buyersList.reduce((s, b) => s + b.total_amount, 0).toLocaleString("ar-EG")} ج`
          : undefined,
      },
      {
        label: "Leads ساخنة 🔥",
        value: kpis.hotLeads,
        icon: Flame,
        color: "text-red-600",
        bg: "from-red-500/15 to-orange-500/10",
        onClick: () => setHotLeadsOpen(true),
        subText: hotLeads.length > 0 ? `${hotLeads.filter(l => l.tier === "hot").length} hot · ${hotLeads.filter(l => l.tier === "warm").length} warm` : undefined,
      },
    ],
    [kpis, navigate, rangeSuffix, viewedVisitorsCount, viewedBasis, viewedTodayVisitors, cartList, buyersList, hotLeads]
  );

  const tierBadge = (tier: HotLead["tier"]) => {
    if (tier === "hot")
      return (
        <Badge className="bg-red-500 text-white hover:bg-red-600">
          🟢 جاهز يشتري
        </Badge>
      );
    if (tier === "warm")
      return (
        <Badge className="bg-amber-500 text-white hover:bg-amber-600">
          🟡 مهتم
        </Badge>
      );
    return (
      <Badge variant="outline" className="text-muted-foreground">
        🔴 بارد
      </Badge>
    );
  };

  const callLead = (phone: string | null) => {
    if (!phone) return;
    window.location.href = `tel:${phone}`;
  };
  const waLead = (phone: string | null, name: string | null) => {
    if (!phone) return;
    const cleaned = phone.replace(/\D/g, "").replace(/^0/, "20");
    const msg = encodeURIComponent(
      `أهلاً ${name || ""}، لاحظنا اهتمامك بمنتجاتنا. حابب أساعدك بعرض خاص؟ — المصرية جروب 🚗`
    );
    window.open(`https://wa.me/${cleaned}?text=${msg}`, "_blank");
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg">
              <Activity className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold">مركز قيادة الموظف</h1>
              <p className="text-xs text-muted-foreground">
                نظرة شاملة على نشاط اليوم
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate("/admin/visitor-leads")}
              className="border-primary/40 text-primary hover:bg-primary/10"
            >
              📞 Leads واتساب
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => fetchData()}
              disabled={loading}
            >
              تحديث
            </Button>
            <Button
              size="sm"
              variant="default"
              onClick={() => navigate("/admin")}
            >
              لوحة الإدارة
              <ArrowLeft className="w-4 h-4 mr-1" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* KPI Cards */}
        <section>
          <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
            <h2 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              {range === "today" ? "مؤشرات اليوم" : "مؤشرات آخر 7 أيام"}
            </h2>
            <div
              role="tablist"
              aria-label="فلتر النطاق الزمني"
              className="inline-flex items-center bg-muted/60 rounded-lg p-0.5 border border-border/50"
            >
              <button
                role="tab"
                aria-selected={range === "today"}
                onClick={() => setRange("today")}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                  range === "today"
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                اليوم
              </button>
              <button
                role="tab"
                aria-selected={range === "7d"}
                onClick={() => setRange("7d")}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                  range === "7d"
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                آخر 7 أيام
              </button>
            </div>
          </div>

          {/* Viewed-KPI time-basis selector — controls how "تمت معاينة X / Y" is computed */}
          <div className="flex items-center justify-end gap-2 mb-3 flex-wrap">
            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" />
              أساس "تمت المعاينة":
            </span>
            <div
              role="tablist"
              aria-label="أساس احتساب المعاينة"
              className="inline-flex items-center bg-muted/60 rounded-lg p-0.5 border border-border/50"
            >
              <button
                role="tab"
                aria-selected={viewedBasis === "range"}
                onClick={() => setViewedBasis("range")}
                title="تُحتسب المعاينة فقط لو حصلت ضمن نفس النطاق المختار (اليوم / آخر 7 أيام)"
                className={cn(
                  "px-2.5 py-1 text-[11px] font-medium rounded-md transition-all",
                  viewedBasis === "range"
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                نطاق KPI
              </button>
              <button
                role="tab"
                aria-selected={viewedBasis === "event_day"}
                onClick={() => setViewedBasis("event_day")}
                title="تُحتسب المعاينة فقط لو حصلت في نفس يوم زيارة العميل"
                className={cn(
                  "px-2.5 py-1 text-[11px] font-medium rounded-md transition-all",
                  viewedBasis === "event_day"
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                يوم الزيارة
              </button>
              <button
                role="tab"
                aria-selected={viewedBasis === "all_time"}
                onClick={() => setViewedBasis("all_time")}
                title="أي معاينة سابقة تُحتسب بغض النظر عن التاريخ"
                className={cn(
                  "px-2.5 py-1 text-[11px] font-medium rounded-md transition-all",
                  viewedBasis === "all_time"
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                أي وقت
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {kpiCards.map((kpi, i) => (
              <button
                key={i}
                onClick={kpi.onClick}
                className={cn(
                  "group text-right p-4 rounded-2xl border border-border/50",
                  "bg-gradient-to-br",
                  kpi.bg,
                  "hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98] transition-all",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                )}
              >
                <div className="flex items-start justify-between mb-3">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-xl bg-background/80 flex items-center justify-center shadow-sm",
                      kpi.color
                    )}
                  >
                    <kpi.icon className="w-5 h-5" />
                  </div>
                </div>
                {loading ? (
                  <Skeleton className="h-8 w-16 mb-1" />
                ) : (
                  <div className="text-3xl font-bold leading-none">{kpi.value}</div>
                )}
                {!loading && kpi.subText && (
                  <div className="text-[11px] font-medium text-muted-foreground/90 mt-1.5">
                    {kpi.subText}
                  </div>
                )}
                <div className="text-xs text-muted-foreground mt-1">
                  {kpi.label}
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Hot Leads */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
              <Flame className="w-4 h-4 text-red-500" />
              Leads محتاجة متابعة فورًا
            </h2>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => navigate("/admin?section=customer-intel")}
            >
              عرض الكل
              <ArrowLeft className="w-3 h-3 mr-1" />
            </Button>
          </div>

          {loading ? (
            <div className="grid gap-2">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-xl" />
              ))}
            </div>
          ) : hotLeads.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">
              <ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-50" />
              لا توجد Leads نشطة حالياً
            </Card>
          ) : (
            <div className="grid gap-2">
              {hotLeads.map((lead) => (
                <Card
                  key={lead.user_id}
                  className={cn(
                    "p-3 flex items-center justify-between gap-3 hover:shadow-md transition-all border",
                    lead.tier === "hot" &&
                      "border-red-200 bg-gradient-to-l from-red-50/50 to-transparent dark:from-red-950/20"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div
                      className={cn(
                        "shrink-0 w-12 h-12 rounded-xl flex items-center justify-center font-bold text-sm",
                        lead.tier === "hot"
                          ? "bg-red-500 text-white"
                          : lead.tier === "warm"
                          ? "bg-amber-500 text-white"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {lead.score}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold truncate">
                          {lead.full_name || "عميل بدون اسم"}
                        </span>
                        {tierBadge(lead.tier)}
                      </div>
                      <div className="text-xs text-muted-foreground truncate mt-0.5">
                        {lead.reasons.join(" • ") || "نشاط متعدد"}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="w-8 h-8 text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-900/30"
                      onClick={() => callLead(lead.phone)}
                      disabled={!lead.phone}
                      title="اتصال"
                    >
                      <Phone className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="w-8 h-8 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30"
                      onClick={() => waLead(lead.phone, lead.full_name)}
                      disabled={!lead.phone}
                      title="واتساب"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="w-8 h-8"
                      onClick={() =>
                        navigate(`/admin/visitor/${lead.user_id}`)
                      }
                      title="عرض التفاصيل"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Quick links */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">
            انتقال سريع
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Button
              variant="outline"
              className="h-auto py-3 justify-start"
              onClick={() => navigate("/admin?section=orders")}
            >
              <ShoppingCart className="w-4 h-4 ml-2" />
              الطلبات
            </Button>
            <Button
              variant="outline"
              className="h-auto py-3 justify-start"
              onClick={() => navigate("/admin?section=customer-intel")}
            >
              <Users className="w-4 h-4 ml-2" />
              ذكاء العملاء
            </Button>
            <Button
              variant="outline"
              className="h-auto py-3 justify-start"
              onClick={() => navigate("/admin?section=leads")}
            >
              <Flame className="w-4 h-4 ml-2" />
              Leads
            </Button>
            <Button
              variant="outline"
              className="h-auto py-3 justify-start"
              onClick={() => navigate("/admin?section=analytics")}
            >
              <TrendingUp className="w-4 h-4 ml-2" />
              التحليلات
            </Button>
          </div>
        </section>
      </main>

      {/* New Signups Dialog */}
      <Dialog open={signupsOpen} onOpenChange={setSignupsOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <UserPlus className="w-5 h-5 text-emerald-600" />
              التسجيلات الجديدة ({rangeSuffix})
              <Badge variant="secondary" className="text-xs">{newSignups.length}</Badge>
            </DialogTitle>
            <DialogDescription className="text-xs">
              قائمة بأحدث الحسابات اللي اتفتحت — اضغط على أي عميل لعرض تفاصيله الكاملة، أو تواصل معاه مباشرة.
            </DialogDescription>
          </DialogHeader>

          {newSignups.length === 0 ? (
            <div className="text-center py-10 text-sm text-muted-foreground">
              مفيش تسجيلات جديدة في الفترة دي 👌
            </div>
          ) : (
            <div className="space-y-2 mt-2">
              {newSignups.map((s) => {
                const name = s.full_name || (s.email && !s.email.includes("@phone.almasria.local") ? s.email : null) || "بدون اسم";
                const created = new Date(s.created_at).toLocaleString("ar-EG", { dateStyle: "short", timeStyle: "short" });
                return (
                  <div key={s.user_id} className={cn(
                    "flex items-center justify-between gap-3 p-3 rounded-lg border transition flex-wrap",
                    (s.duplicates && s.duplicates > 1) ? "bg-amber-50 border-amber-300 hover:bg-amber-100" : "bg-muted/30 hover:bg-muted/60"
                  )}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-sm truncate">{name}</p>
                        {s.duplicates && s.duplicates > 1 && (
                          <Badge className="bg-amber-500 hover:bg-amber-600 text-white text-[10px] h-5">
                            ⚠️ مكرر ×{s.duplicates}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap text-[11px] text-muted-foreground">
                        {s.phone && <span className="font-mono">📱 {s.phone}</span>}
                        <span>🕒 {created}</span>
                      </div>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      {s.phone && (
                        <>
                          <Button asChild size="sm" variant="outline" className="h-8 gap-1 text-xs">
                            <a href={`tel:${s.phone}`}>
                              <Phone className="w-3 h-3" />
                              اتصال
                            </a>
                          </Button>
                          <Button asChild size="sm" className="h-8 gap-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white">
                            <a
                              href={`https://wa.me/${s.phone.replace(/^0/, "20").replace(/[^\d]/g, "")}?text=${encodeURIComponent(`أهلاً ${s.full_name || ""}، معاك المصرية جروب — شكرًا لتسجيلك معانا، حابب أساعدك في طلبك؟`)}`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              <MessageCircle className="w-3 h-3" />
                              واتساب
                            </a>
                          </Button>
                        </>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 gap-1 text-xs"
                        onClick={() => {
                          setSignupsOpen(false);
                          navigate(`/admin/visitor/${s.user_id}`);
                        }}
                      >
                        <Eye className="w-3 h-3" />
                        تفاصيل
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Visitors Dialog */}
      <Dialog open={visitorsOpen} onOpenChange={setVisitorsOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Users className="w-5 h-5 text-blue-600" />
              زوار {rangeSuffix}
              <Badge variant="secondary" className="text-xs">{visibleVisitorsCount}</Badge>
              {!includeStaff && visibleVisitorsCount !== visitorsList.length && (
                <span
                  className="text-[10px] text-muted-foreground font-normal"
                  title="إجمالي الزوار قبل استبعاد الموظفين"
                >
                  من أصل {visitorsList.length}
                </span>
              )}
            </DialogTitle>
            <DialogDescription className="text-xs">
              قائمة بكل زوار الموقع — المسجلين بأسمائهم وأرقامهم وإيميلاتهم، والزوار غير المسجلين كـ "زائر مجهول". اضغط "تفاصيل" لعرض كل نشاط الزائر.
            </DialogDescription>
          </DialogHeader>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2 pt-2 pb-1 border-b">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Filter className="w-3.5 h-3.5" />
              فلترة:
            </div>
            <Select value={visitorTypeFilter} onValueChange={(v) => setVisitorTypeFilter(v as any)}>
              <SelectTrigger className="h-8 w-[140px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الزوار</SelectItem>
                <SelectItem value="registered">مسجّل (له بيانات)</SelectItem>
                <SelectItem value="anon">زائر مجهول</SelectItem>
              </SelectContent>
            </Select>
            <Select value={visitorDateFilter} onValueChange={(v) => setVisitorDateFilter(v as any)}>
              <SelectTrigger className="h-8 w-[130px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل التواريخ</SelectItem>
                <SelectItem value="today">اليوم</SelectItem>
                <SelectItem value="yesterday">أمس</SelectItem>
                <SelectItem value="week">آخر 7 أيام</SelectItem>
              </SelectContent>
            </Select>
            <Select value={visitorViewedFilter} onValueChange={(v) => setVisitorViewedFilter(v as any)}>
              <SelectTrigger className="h-8 w-[150px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">معاين/غير معاين</SelectItem>
                <SelectItem value="not_viewed">لم تتم معاينته</SelectItem>
                <SelectItem value="viewed">تمت المعاينة</SelectItem>
              </SelectContent>
            </Select>
            {/* All / Only Customers toggle — default hides staff; "All" is for admin review */}
            <Select value={includeStaff ? "all" : "customers"} onValueChange={(v) => setIncludeStaff(v === "all")}>
              <SelectTrigger className="h-8 w-[170px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="customers">العملاء فقط (افتراضي)</SelectItem>
                <SelectItem value="all">الكل (يشمل الموظفين)</SelectItem>
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant={visitorEngagedOnly ? "default" : "outline"}
              className="h-8 text-xs gap-1"
              onClick={() => setVisitorEngagedOnly((p) => !p)}
              title="إظهار الزوار المتفاعلين فقط (مدة ≥15ث أو ≥2 صفحة)"
            >
              <Activity className="w-3.5 h-3.5" />
              متفاعلين فقط
            </Button>
            {(visitorTypeFilter !== "all" || visitorDateFilter !== "all" || visitorViewedFilter !== "all" || visitorEngagedOnly) && (
              <Button
                size="sm"
                variant="ghost"
                className="h-8 text-xs"
                onClick={() => { setVisitorTypeFilter("all"); setVisitorDateFilter("all"); setVisitorViewedFilter("all"); setVisitorEngagedOnly(false); }}
              >
                مسح الفلاتر
              </Button>
            )}
          </div>

          {(() => {
            // Apply filters
            const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
            const yesterdayStart = new Date(todayStart); yesterdayStart.setDate(yesterdayStart.getDate() - 1);
            const weekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            const filtered = visitorsList.filter((v) => {
              if (!includeStaff && v.user_id && staffIdsSet.has(v.user_id)) return false;
              if (visitorTypeFilter === "registered" && !v.user_id) return false;
              if (visitorTypeFilter === "anon" && v.user_id) return false;
              const t = new Date(v.last_visit).getTime();
              if (visitorDateFilter === "today" && t < todayStart.getTime()) return false;
              if (visitorDateFilter === "yesterday" && (t < yesterdayStart.getTime() || t >= todayStart.getTime())) return false;
              if (visitorDateFilter === "week" && t < weekStart.getTime()) return false;
              const isViewed = (v.user_id && viewedKeys.has(`u:${v.user_id}`)) || (v.session_key && viewedKeys.has(`s:${v.session_key}`));
              if (visitorViewedFilter === "viewed" && !isViewed) return false;
              if (visitorViewedFilter === "not_viewed" && isViewed) return false;
              if (visitorEngagedOnly) {
                const dwell = v.first_visit ? (new Date(v.last_visit).getTime() - new Date(v.first_visit).getTime()) : 0;
                if (!(dwell >= ENGAGED_DWELL_MS || v.pages >= 2)) return false;
              }
              return true;
            });

            if (filtered.length === 0) {
              return (
                <div className="text-center py-10 text-sm text-muted-foreground">
                  مفيش زوار مطابقين للفلاتر
                </div>
              );
            }
            return (
            <div className="space-y-2 mt-2">
              {(() => {
                let lastDayLabel = "";
                const today = new Date(); today.setHours(0,0,0,0);
                const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
                const fmtDay = (iso: string) => {
                  const d = new Date(iso); d.setHours(0,0,0,0);
                  if (d.getTime() === today.getTime()) return "اليوم";
                  if (d.getTime() === yesterday.getTime()) return "أمس";
                  return new Date(iso).toLocaleDateString("ar-EG", { weekday: "long", day: "numeric", month: "long" });
                };
                return filtered.map((v, idx) => {
                  const isAnon = !v.user_id;
                  const name = v.full_name || (isAnon ? "زائر مجهول" : "بدون اسم");
                  const last = new Date(v.last_visit).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
                  const dayLabel = fmtDay(v.last_visit);
                  const showHeader = dayLabel !== lastDayLabel;
                  lastDayLabel = dayLabel;
                  const detailKey = v.user_id || v.session_key || `anon-${idx}`;
                  const isViewed = (v.user_id && viewedKeys.has(`u:${v.user_id}`)) || (v.session_key && viewedKeys.has(`s:${v.session_key}`));
                  return (
                    <div key={detailKey + "-wrap"}>
                      {showHeader && (
                        <div className="flex items-center gap-2 pt-3 pb-1 sticky top-0 bg-background z-10">
                          <div className="h-px flex-1 bg-border" />
                          <span className="text-[11px] font-bold text-muted-foreground px-2">{dayLabel}</span>
                          <div className="h-px flex-1 bg-border" />
                        </div>
                      )}
                      <div
                        key={detailKey}
                        className={cn(
                          "flex items-center justify-between gap-3 p-3 rounded-lg border transition flex-wrap",
                          isAnon ? "bg-muted/20 hover:bg-muted/40" : "bg-muted/30 hover:bg-muted/60",
                          isViewed && "opacity-60 saturate-50"
                        )}
                      >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-sm truncate">{name}</p>
                        {isAnon ? (
                          <Badge variant="outline" className="text-[10px] h-5 bg-amber-50 text-amber-700 border-amber-200">
                            👤 لم يسجّل بعد
                          </Badge>
                        ) : (
                          <Badge className="bg-blue-500/15 text-blue-700 hover:bg-blue-500/20 text-[10px] h-5">مسجّل</Badge>
                        )}
                        {isViewed && (
                          <Badge variant="outline" className="text-[10px] h-5 bg-emerald-50 text-emerald-700 border-emerald-200 gap-1">
                            <CheckCheck className="w-3 h-3" />
                            تمت المعاينة
                          </Badge>
                        )}
                        {isAnon && (() => {
                          const fp = v.first_path || "";
                          const ref = v.referrer || "";
                          const hay = (fp + " " + ref).toLowerCase();
                          let source = "";
                          if (hay.includes("fbclid") || hay.includes("facebook") || hay.includes("utm_source=fb")) source = "📘 فيسبوك";
                          else if (hay.includes("instagram") || hay.includes("ig_")) source = "📷 إنستجرام";
                          else if (hay.includes("google") || hay.includes("gclid")) source = "🔍 جوجل";
                          else if (hay.includes("tiktok") || hay.includes("ttclid")) source = "🎵 تيك توك";
                          else if (hay.includes("whatsapp") || hay.includes("wa.me")) source = "💬 واتساب";
                          else if (ref) source = "🔗 موقع آخر";
                          else source = "🌐 مباشر";
                          return <Badge variant="outline" className="text-[10px] h-5">{source}</Badge>;
                        })()}
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap text-[11px] text-muted-foreground">
                        {v.phone && <span className="font-mono">📱 {v.phone}</span>}
                        {v.email && <span className="truncate max-w-[200px]">✉️ {v.email}</span>}
                        <span>👁️ {v.pages} صفحة</span>
                        <span className="font-bold text-foreground">🕒 {last}</span>
                      </div>
                      {isAnon && !v.phone && !v.email && (
                        <p className="text-[10px] text-muted-foreground/80 mt-1 italic leading-relaxed">
                          ⚠️ هذا زائر دخل الموقع من إعلان/رابط ولم يُنشئ حساباً بعد — لذا لا توجد بيانات تواصل. يمكنك مشاهدة الصفحات اللي تصفحها من زر "تفاصيل الجلسة".
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      {v.phone && (
                        <>
                          <Button asChild size="sm" variant="outline" className="h-8 gap-1 text-xs">
                            <a href={`tel:${v.phone}`}>
                              <Phone className="w-3 h-3" />
                              اتصال
                            </a>
                          </Button>
                          <Button asChild size="sm" className="h-8 gap-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white">
                            <a
                              href={`https://wa.me/${v.phone.replace(/^0/, "20").replace(/[^\d]/g, "")}?text=${encodeURIComponent(`أهلاً ${v.full_name || ""}، معاك المصرية جروب — حابب أساعدك في طلبك؟`)}`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              <MessageCircle className="w-3 h-3" />
                              واتساب
                            </a>
                          </Button>
                        </>
                      )}
                      {v.user_id ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 gap-1 text-xs"
                          onClick={() => {
                            setVisitorsOpen(false);
                            navigate(`/admin/visitor/${v.user_id}`);
                          }}
                        >
                          <Eye className="w-3 h-3" />
                          تفاصيل
                        </Button>
                      ) : v.session_key ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 gap-1 text-xs"
                          onClick={() => {
                            setVisitorsOpen(false);
                            navigate(`/admin/visitor/${v.session_key}`);
                          }}
                        >
                          <Eye className="w-3 h-3" />
                          تفاصيل الجلسة
                        </Button>
                      ) : null}
                    </div>
                      </div>
                  </div>
                );
                });
              })()}
            </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Viewed Today Dialog */}
      <Dialog open={viewedTodayOpen} onOpenChange={setViewedTodayOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <CheckCheck className="w-5 h-5 text-violet-600" />
              تمت معاينتهم اليوم
              <Badge variant="secondary" className="text-xs">{viewedTodayVisitors.length}</Badge>
            </DialogTitle>
            <DialogDescription className="text-xs">
              قائمة بكل الزوار اللي فتح ملفهم أي موظف اليوم — مع تفاصيل مين عاين وكام مرة، وفلترة سريعة حسب طريقة المعاينة أو مصدر الزائر.
            </DialogDescription>
          </DialogHeader>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2 pt-2 pb-1 border-b">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Filter className="w-3.5 h-3.5" />
              فلترة:
            </div>
            <Select value={viewedTodayMethodFilter} onValueChange={(v) => setViewedTodayMethodFilter(v as any)}>
              <SelectTrigger className="h-8 w-[160px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل طرق المعاينة</SelectItem>
                <SelectItem value="by_me">عاينتهم أنا</SelectItem>
                <SelectItem value="by_others">عاينهم موظف آخر فقط</SelectItem>
                <SelectItem value="multiple">مُعاين أكثر من مرة</SelectItem>
              </SelectContent>
            </Select>
            <Select value={viewedTodaySourceFilter} onValueChange={(v) => setViewedTodaySourceFilter(v as any)}>
              <SelectTrigger className="h-8 w-[160px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل المصادر (السبب)</SelectItem>
                <SelectItem value="facebook">📘 فيسبوك</SelectItem>
                <SelectItem value="google">🔍 جوجل</SelectItem>
                <SelectItem value="instagram">📷 إنستجرام</SelectItem>
                <SelectItem value="tiktok">🎵 تيك توك</SelectItem>
                <SelectItem value="whatsapp">💬 واتساب</SelectItem>
                <SelectItem value="direct">🌐 مباشر</SelectItem>
                <SelectItem value="other">🔗 موقع آخر</SelectItem>
              </SelectContent>
            </Select>
            {(viewedTodayMethodFilter !== "all" || viewedTodaySourceFilter !== "all") && (
              <Button
                size="sm"
                variant="ghost"
                className="h-8 text-xs"
                onClick={() => { setViewedTodayMethodFilter("all"); setViewedTodaySourceFilter("all"); }}
              >
                مسح الفلاتر
              </Button>
            )}
          </div>

          {(() => {
            const meId = user?.id;
            const filtered = viewedTodayVisitors.filter(({ v, viewInfo }) => {
              // method filter
              if (viewedTodayMethodFilter === "by_me" && (!meId || !viewInfo.staffIds.has(meId))) return false;
              if (viewedTodayMethodFilter === "by_others" && (!meId || viewInfo.staffIds.has(meId))) return false;
              if (viewedTodayMethodFilter === "multiple" && viewInfo.viewCount < 2) return false;
              // source filter
              if (viewedTodaySourceFilter !== "all") {
                const src = detectSource(v.first_path || null, v.referrer || null);
                if (src !== viewedTodaySourceFilter) return false;
              }
              return true;
            });

            if (filtered.length === 0) {
              return (
                <div className="text-center py-10 text-sm text-muted-foreground">
                  مفيش زوار مطابقين للفلاتر المختارة
                </div>
              );
            }

            return (
              <div className="space-y-2 mt-2">
                {filtered.map(({ v, viewInfo, key }) => {
                  const isAnon = !v.user_id;
                  const name = v.full_name || (isAnon ? "زائر مجهول" : "بدون اسم");
                  const lastView = new Date(viewInfo.lastViewedAt).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
                  const src = detectSource(v.first_path || null, v.referrer || null);
                  const viewedByMe = meId ? viewInfo.staffIds.has(meId) : false;
                  const otherStaffNames = Array.from(viewInfo.staffIds)
                    .filter((id) => id !== meId)
                    .map((id) => staffNamesMap.get(id) || "موظف")
                    .slice(0, 3);
                  return (
                    <div
                      key={key}
                      className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-muted/30 hover:bg-muted/60 transition flex-wrap"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-sm truncate">{name}</p>
                          {isAnon ? (
                            <Badge variant="outline" className="text-[10px] h-5 bg-amber-50 text-amber-700 border-amber-200">👤 لم يسجّل</Badge>
                          ) : (
                            <Badge className="bg-blue-500/15 text-blue-700 hover:bg-blue-500/20 text-[10px] h-5">مسجّل</Badge>
                          )}
                          <Badge variant="outline" className="text-[10px] h-5">{sourceLabel[src]}</Badge>
                          <Badge variant="outline" className="text-[10px] h-5 bg-violet-50 text-violet-700 border-violet-200 gap-1">
                            <Eye className="w-3 h-3" />
                            {viewInfo.viewCount} معاينة
                          </Badge>
                          {viewedByMe && (
                            <Badge variant="outline" className="text-[10px] h-5 bg-emerald-50 text-emerald-700 border-emerald-200">عاينتها أنا</Badge>
                          )}
                          {otherStaffNames.length > 0 && (
                            <Badge variant="outline" className="text-[10px] h-5 bg-slate-50 text-slate-700 border-slate-200">
                              + {otherStaffNames.join("، ")}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap text-[11px] text-muted-foreground">
                          {v.phone && <span className="font-mono">📱 {v.phone}</span>}
                          {v.email && <span className="truncate max-w-[200px]">✉️ {v.email}</span>}
                          <span>👁️ {v.pages} صفحة</span>
                          <span className="font-bold text-foreground">🕒 آخر معاينة {lastView}</span>
                        </div>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        {v.phone && (
                          <Button asChild size="sm" className="h-8 gap-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white">
                            <a
                              href={`https://wa.me/${v.phone.replace(/^0/, "20").replace(/[^\d]/g, "")}`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              <MessageCircle className="w-3 h-3" />
                              واتساب
                            </a>
                          </Button>
                        )}
                        {(v.user_id || v.session_key) && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 gap-1 text-xs"
                            onClick={() => {
                              setViewedTodayOpen(false);
                              navigate(`/admin/visitor/${v.user_id || v.session_key}`);
                            }}
                          >
                            <Eye className="w-3 h-3" />
                            تفاصيل
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Cart Users Dialog — اللي أضافوا للسلة */}
      <Dialog open={cartOpen} onOpenChange={setCartOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <ShoppingCart className="w-5 h-5 text-amber-600" />
              أضافوا للسلة ({rangeSuffix})
              <Badge variant="secondary" className="text-xs">{cartList.length}</Badge>
            </DialogTitle>
            <DialogDescription className="text-xs">
              عملاء أضافوا منتجات للسلة لكن لسه ما أتموا الطلب — فرصة متابعة قوية.
            </DialogDescription>
          </DialogHeader>
          {cartList.length === 0 ? (
            <div className="text-center py-10 text-sm text-muted-foreground">مفيش عملاء أضافوا للسلة في هذا النطاق</div>
          ) : (
            <div className="space-y-2 mt-2">
              {cartList.map((c) => {
                const last = new Date(c.last_added).toLocaleString("ar-EG", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" });
                return (
                  <div key={c.user_id} className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-amber-500/5 hover:bg-amber-500/10 transition flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-sm truncate">{c.full_name || "بدون اسم"}</p>
                        <Badge className="bg-amber-500/15 text-amber-700 hover:bg-amber-500/20 text-[10px] h-5 gap-1">
                          <ShoppingCart className="w-3 h-3" />
                          {c.items} منتج
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap text-[11px] text-muted-foreground">
                        {c.phone && <span className="font-mono">📱 {c.phone}</span>}
                        {c.email && <span className="truncate max-w-[200px]">✉️ {c.email}</span>}
                        <span className="font-bold text-foreground">🕒 آخر إضافة {last}</span>
                      </div>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      {c.phone && (
                        <Button asChild size="sm" className="h-8 gap-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white">
                          <a
                            href={`https://wa.me/${c.phone.replace(/^0/, "20").replace(/[^\d]/g, "")}?text=${encodeURIComponent(`أهلاً ${c.full_name || ""}، شفت إنك أضفت منتجات للسلة — محتاج مساعدة في إتمام الطلب؟`)}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <MessageCircle className="w-3 h-3" />
                            واتساب
                          </a>
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 gap-1 text-xs"
                        onClick={() => { setCartOpen(false); navigate(`/admin/visitor/${c.user_id}`); }}
                      >
                        <Eye className="w-3 h-3" />
                        تفاصيل
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Buyers Dialog — اللي اشتروا */}
      <Dialog open={buyersOpen} onOpenChange={setBuyersOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              طلبات {rangeSuffix}
              <Badge variant="secondary" className="text-xs">{buyersList.length}</Badge>
              {buyersList.length > 0 && (
                <span className="text-[11px] text-muted-foreground font-normal">
                  · إجمالي {buyersList.reduce((s, b) => s + b.total_amount, 0).toLocaleString("ar-EG")} ج
                </span>
              )}
            </DialogTitle>
            <DialogDescription className="text-xs">
              قائمة الطلبات اللي وصلت في النطاق المختار — مع حالتها والمبلغ والعميل.
            </DialogDescription>
          </DialogHeader>
          {buyersList.length === 0 ? (
            <div className="text-center py-10 text-sm text-muted-foreground">مفيش طلبات في هذا النطاق</div>
          ) : (
            <div className="space-y-2 mt-2">
              {buyersList.map((b, i) => {
                const at = new Date(b.created_at).toLocaleString("ar-EG", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" });
                const statusColor =
                  b.status === "delivered" ? "bg-green-500/15 text-green-700"
                  : b.status === "cancelled" ? "bg-red-500/15 text-red-700"
                  : b.status === "shipped" ? "bg-blue-500/15 text-blue-700"
                  : "bg-amber-500/15 text-amber-700";
                return (
                  <div key={`${b.order_number || b.user_id}-${i}`} className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-green-500/5 hover:bg-green-500/10 transition flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-sm truncate">{b.full_name || "بدون اسم"}</p>
                        {b.order_number && <Badge variant="outline" className="text-[10px] h-5 font-mono">#{b.order_number}</Badge>}
                        <Badge className={cn("text-[10px] h-5", statusColor)}>{b.status}</Badge>
                        <Badge variant="outline" className="text-[10px] h-5 font-bold">
                          {b.total_amount.toLocaleString("ar-EG")} ج
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap text-[11px] text-muted-foreground">
                        {b.phone && <span className="font-mono">📱 {b.phone}</span>}
                        {b.email && <span className="truncate max-w-[200px]">✉️ {b.email}</span>}
                        <span className="font-bold text-foreground">🕒 {at}</span>
                      </div>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      {b.phone && (
                        <Button asChild size="sm" className="h-8 gap-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white">
                          <a href={`https://wa.me/${b.phone.replace(/^0/, "20").replace(/[^\d]/g, "")}`} target="_blank" rel="noreferrer">
                            <MessageCircle className="w-3 h-3" />
                            واتساب
                          </a>
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 gap-1 text-xs"
                        onClick={() => { setBuyersOpen(false); navigate("/admin?section=orders"); }}
                      >
                        <ClipboardList className="w-3 h-3" />
                        إدارة الطلبات
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Hot Leads Dialog */}
      <Dialog open={hotLeadsOpen} onOpenChange={setHotLeadsOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Flame className="w-5 h-5 text-red-600" />
              Leads ساخنة
              <Badge variant="secondary" className="text-xs">{hotLeads.length}</Badge>
            </DialogTitle>
            <DialogDescription className="text-xs">
              العملاء اللي ظهر منهم نية شراء قوية (بحث + معاينة + إضافة للسلة) ولسه ما اشتروش — رتبهم بالأولوية وكلّمهم.
            </DialogDescription>
          </DialogHeader>
          {hotLeads.length === 0 ? (
            <div className="text-center py-10 text-sm text-muted-foreground">مفيش Leads ساخنة حالياً</div>
          ) : (
            <div className="space-y-2 mt-2">
              {hotLeads.map((l) => {
                const at = new Date(l.last_activity).toLocaleString("ar-EG", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" });
                return (
                  <div key={l.user_id} className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-red-500/5 hover:bg-red-500/10 transition flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-sm truncate">{l.full_name || "بدون اسم"}</p>
                        {tierBadge(l.tier)}
                        <Badge variant="outline" className="text-[10px] h-5 font-bold">{l.score} نقطة</Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap text-[11px] text-muted-foreground">
                        {l.phone && <span className="font-mono">📱 {l.phone}</span>}
                        <span className="font-bold text-foreground">🕒 {at}</span>
                      </div>
                      {l.reasons.length > 0 && (
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {l.reasons.slice(0, 3).map((r, i) => (
                            <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                              {r}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      {l.phone && (
                        <>
                          <Button asChild size="sm" variant="outline" className="h-8 gap-1 text-xs">
                            <a href={`tel:${l.phone}`}>
                              <Phone className="w-3 h-3" />
                              اتصال
                            </a>
                          </Button>
                          <Button asChild size="sm" className="h-8 gap-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white">
                            <a
                              href={`https://wa.me/${l.phone.replace(/^0/, "20").replace(/[^\d]/g, "")}?text=${encodeURIComponent(`أهلاً ${l.full_name || ""}، معاك المصرية جروب — حابب أساعدك في طلبك؟`)}`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              <MessageCircle className="w-3 h-3" />
                              واتساب
                            </a>
                          </Button>
                        </>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 gap-1 text-xs"
                        onClick={() => { setHotLeadsOpen(false); navigate(`/admin/visitor/${l.user_id}`); }}
                      >
                        <Eye className="w-3 h-3" />
                        تفاصيل
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StaffHome;
