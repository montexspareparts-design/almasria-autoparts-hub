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
  Search,
  X,
  Info,
  ChevronDown,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { isNoiseVisit, ENGAGED_DWELL_MS } from "@/lib/visitorAnalytics";
import { viewedOnVisitDay } from "@/lib/visitDayMatch";
import { isViewedUnderBasis as isViewedUnderBasisPure } from "@/lib/viewedUnderBasis";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useSessionPersistedState } from "@/hooks/useSessionPersistedState";
import DailyReportTabCard from "@/components/staff/DailyReportTabCard";
import StaffRemindersPanel from "@/components/staff/StaffRemindersPanel";

// Normalize a string for case-insensitive substring matching.
// Strips Arabic diacritics + tatweel and lowercases the rest so "محمد" matches
// "مُحَمَّد" and "ahmed" matches "Ahmed".
const normalizeSearch = (s: string | null | undefined) =>
  (s || "")
    .toLowerCase()
    .replace(/[\u064B-\u0652\u0670\u0640]/g, "")
    .trim();

// Strip everything except digits — used to compare phone numbers regardless of
// formatting (spaces, dashes, +20 prefix, etc.).
const digitsOnly = (s: string | null | undefined) => (s || "").replace(/\D/g, "");

// Returns true if the contact (name/phone/email) matches the free-text query.
// Empty/whitespace-only queries always match (search is treated as inactive).
const matchesContactQuery = (
  q: string,
  contact: { full_name?: string | null; phone?: string | null; email?: string | null },
) => {
  const norm = normalizeSearch(q);
  if (!norm) return true;
  const name = normalizeSearch(contact.full_name);
  const email = normalizeSearch(contact.email);
  if (name.includes(norm) || email.includes(norm)) return true;
  const qDigits = digitsOnly(q);
  if (qDigits.length >= 3) {
    const phoneDigits = digitsOnly(contact.phone);
    if (phoneDigits.includes(qDigits)) return true;
  }
  return false;
};

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

// First day of the current local month at 00:00.
// Used as the widest "this month" window for per-dialog range overrides.
const monthStartISO = () => {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
};

type RangeKey = "today" | "7d";
// Per-dialog range: each Dialog can override the global KPI range with its own
// time window without re-fetching (we fetch the widest range up-front).
type DialogRangeKey = "today" | "7d" | "month";

// Returns the earliest local timestamp (ms since epoch) for the given dialog range.
const dialogRangeStartMs = (r: DialogRangeKey): number => {
  if (r === "today") return new Date(todayISO()).getTime();
  if (r === "7d") return new Date(sevenDaysISO()).getTime();
  return new Date(monthStartISO()).getTime();
};

const dialogRangeLabel = (r: DialogRangeKey): string =>
  r === "today" ? "اليوم" : r === "7d" ? "آخر 7 أيام" : "هذا الشهر";

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
  // Per-key LAST view timestamp — used by date-based "viewed" basis modes.
  const [viewedAtMap, setViewedAtMap] = useState<Map<string, string>>(new Map());
  // Per-key FIRST view timestamp — used when viewedAnchor === "first".
  const [viewedFirstAtMap, setViewedFirstAtMap] = useState<Map<string, string>>(new Map());
  // All session views performed TODAY by ANY staff member — for the "viewed today" dialog
  // Map key = "u:<user_id>" or "s:<session_key>", value = aggregated view info
  const [todayViewsMap, setTodayViewsMap] = useState<Map<string, { staffIds: Set<string>; viewCount: number; lastViewedAt: string }>>(new Map());
  const [staffNamesMap, setStaffNamesMap] = useState<Map<string, string>>(new Map());
  const [viewedTodayOpen, setViewedTodayOpen] = useState(false);
  const [viewedTodayMethodFilter, setViewedTodayMethodFilter] = useSessionPersistedState<"all" | "by_me" | "by_others" | "multiple">("staffHome:viewedToday:method", "all");
  const [viewedTodaySourceFilter, setViewedTodaySourceFilter] = useSessionPersistedState<"all" | "facebook" | "google" | "instagram" | "tiktok" | "whatsapp" | "direct" | "other">("staffHome:viewedToday:source", "all");
  // Cart users dialog
  const [cartOpen, setCartOpen] = useState(false);
  const [cartList, setCartList] = useState<Array<{ user_id: string; full_name: string | null; phone: string | null; email: string | null; items: number; last_added: string }>>([]);
  const [cartSort, setCartSort] = useSessionPersistedState<"recent" | "items">("staffHome:cart:sort", "recent");
  const [cartContactFilter, setCartContactFilter] = useSessionPersistedState<"all" | "with_phone" | "no_phone">("staffHome:cart:contact", "all");
  // Buyers dialog
  const [buyersOpen, setBuyersOpen] = useState(false);
  const [buyersList, setBuyersList] = useState<Array<{ user_id: string; full_name: string | null; phone: string | null; email: string | null; order_number: string | null; total_amount: number; status: string; created_at: string }>>([]);
  const [buyersSort, setBuyersSort] = useSessionPersistedState<"recent" | "amount">("staffHome:buyers:sort", "recent");
  const [buyersStatusFilter, setBuyersStatusFilter] = useSessionPersistedState<"all" | "pending" | "confirmed" | "shipped" | "delivered" | "cancelled" | "other">("staffHome:buyers:status", "all");
  const [buyersContactFilter, setBuyersContactFilter] = useSessionPersistedState<"all" | "with_phone" | "no_phone">("staffHome:buyers:contact", "all");
  // Hot Leads dialog
  const [hotLeadsOpen, setHotLeadsOpen] = useState(false);
  const [leadsSort, setLeadsSort] = useSessionPersistedState<"score" | "recent">("staffHome:leads:sort", "score");
  const [leadsTierFilter, setLeadsTierFilter] = useSessionPersistedState<"all" | "hot" | "warm" | "cold">("staffHome:leads:tier", "all");
  const [leadsContactFilter, setLeadsContactFilter] = useSessionPersistedState<"all" | "with_phone" | "no_phone">("staffHome:leads:contact", "all");
  // Visitors dialog "engaged only" filter (driven by KPI card click)
  const [visitorEngagedOnly, setVisitorEngagedOnly] = useState(false);
  const [visitorTypeFilter, setVisitorTypeFilter] = useSessionPersistedState<"all" | "registered" | "anon">("staffHome:visitors:type", "all");
  const [visitorDateFilter, setVisitorDateFilter] = useSessionPersistedState<"all" | "today" | "yesterday" | "week" | "month">("staffHome:visitors:date", "today");
  const [visitorViewedFilter, setVisitorViewedFilter] = useSessionPersistedState<"all" | "viewed" | "not_viewed">("staffHome:visitors:viewed", "all");
  // ── New: visitor source / activity / depth filters for comprehensive reporting
  const [visitorSourceFilter, setVisitorSourceFilter] = useSessionPersistedState<"all" | "facebook" | "google" | "instagram" | "tiktok" | "whatsapp" | "direct" | "other">("staffHome:visitors:source", "all");
  const [visitorActivityFilter, setVisitorActivityFilter] = useSessionPersistedState<"all" | "ordered" | "added_cart" | "searched" | "viewed_products" | "browsed_only">("staffHome:visitors:activity", "all");
  const [visitorMinPages, setVisitorMinPages] = useSessionPersistedState<"all" | "2" | "5" | "10">("staffHome:visitors:minPages", "all");
  // Per-visitor activity flags (built from searchesRes/cartRes/ordersRes/viewsRes in fetchData)
  const [visitorActivityMap, setVisitorActivityMap] = useState<Map<string, { searched: boolean; addedToCart: boolean; ordered: boolean; viewedProducts: boolean; searchTerms: string[]; orderCount: number; cartItems: number }>>(new Map());
  // Free-text search inside each dialog (matches name / phone / email).
  // Phone matching ignores formatting (spaces, dashes, +20…), name matching
  // ignores Arabic diacritics & case. See normalizeSearch / matchesContactQuery.
  const [visitorsSearch, setVisitorsSearch] = useSessionPersistedState<string>("staffHome:visitors:search", "");
  const [cartSearch, setCartSearch] = useSessionPersistedState<string>("staffHome:cart:search", "");
  const [buyersSearch, setBuyersSearch] = useSessionPersistedState<string>("staffHome:buyers:search", "");
  const [leadsSearch, setLeadsSearch] = useSessionPersistedState<string>("staffHome:leads:search", "");
  // Per-dialog time range (today / 7d / month). Each Dialog can override the
  // global KPI range without forcing a refetch — lists are pre-fetched at the
  // widest window (this month) and filtered client-side.
  const [visitorsRange, setVisitorsRange] = useSessionPersistedState<DialogRangeKey>("staffHome:visitors:range", "today");
  const [cartRange, setCartRange] = useSessionPersistedState<DialogRangeKey>("staffHome:cart:range", "today");
  const [buyersRange, setBuyersRange] = useSessionPersistedState<DialogRangeKey>("staffHome:buyers:range", "today");
  const [leadsRange, setLeadsRange] = useSessionPersistedState<DialogRangeKey>("staffHome:leads:range", "7d");
  // Toggle: false = "Only Customers" (default, excludes staff). true = "All" (review only — shows staff too).
  const [includeStaff, setIncludeStaff] = useState<boolean>(false);
  const [staffIdsSet, setStaffIdsSet] = useState<Set<string>>(new Set());
  // Collapsible "calculation rules" panel — shows per-KPI rules + raw vs filtered counts
  const [rulesOpen, setRulesOpen] = useState<boolean>(false);
  // "Viewed" KPI time basis:
  //   - "range": viewed within the selected KPI range (today / 7d) — rolling window
  //   - "event_day": viewed on the same calendar day as the visitor's last_visit
  //   - "all_time": any past view counts (legacy behavior)
  const [viewedBasis, setViewedBasis] = useState<"range" | "event_day" | "all_time">("range");
  // Which timestamp drives date-based matching when basis ≠ "all_time":
  //   - "last":  use the LATEST view per visitor (default — answers "هل عاينت العميل مؤخراً؟")
  //   - "first": use the FIRST view per visitor (answers "هل عاينت العميل أصلاً منذ زيارته؟")
  // Only affects "range" + "event_day" modes; "all_time" ignores it.
  const [viewedAnchor, setViewedAnchor] = useState<"last" | "first">("last");

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
      // Widest window we ever need client-side. We fetch lists at this depth
      // so each Dialog can apply its own range (today / 7d / month) without
      // a refetch round-trip. KPI cards still use `start` (the global range).
      const widestStart = monthStartISO();

      // 1) Visitors — always fetch the widest window (this month) so each dialog's
      // own range filter (today / 7d / month) works without a round-trip.
      // KPI counts are still computed against `start` below.
      const visitsStart = widestStart;
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
        .gte("created_at", widestStart)
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
        .gte("created_at", widestStart)
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
        .gte("created_at", widestStart)
        .order("created_at", { ascending: false });
      const buyers = new Set((orders || []).map((o) => o.user_id));

      // Hot leads: pull activity over the widest window so the leads dialog can
      // also offer a month range. Tier classification is unchanged.
      const sevenDaysAgo = widestStart;

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

      // Fetch which visitors the current staff has already viewed (with both timestamps)
      try {
        const { data: views } = await supabase
          .from("visitor_session_views")
          .select("customer_user_id, session_key, first_viewed_at, last_viewed_at")
          .eq("staff_user_id", user!.id);
        const set = new Set<string>();
        const lastMap = new Map<string, string>();
        const firstMap = new Map<string, string>();
        (views || []).forEach((v: any) => {
          const lastAt = v.last_viewed_at as string | null;
          const firstAt = v.first_viewed_at as string | null;
          const apply = (k: string) => {
            set.add(k);
            // last → keep MAX, first → keep MIN
            if (lastAt && (!lastMap.has(k) || lastAt > (lastMap.get(k) as string))) lastMap.set(k, lastAt);
            if (firstAt && (!firstMap.has(k) || firstAt < (firstMap.get(k) as string))) firstMap.set(k, firstAt);
          };
          if (v.customer_user_id) apply(`u:${v.customer_user_id}`);
          if (v.session_key) apply(`s:${v.session_key}`);
        });
        setViewedKeys(set);
        setViewedAtMap(lastMap);
        setViewedFirstAtMap(firstMap);
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

      // Build per-visitor activity map (ordered / cart / search / product views)
      // Used by the visitor-report filters and the CSV export so each row carries
      // a complete picture of what the visitor actually DID on the site.
      const activityMap = new Map<string, { searched: boolean; addedToCart: boolean; ordered: boolean; viewedProducts: boolean; searchTerms: string[]; orderCount: number; cartItems: number }>();
      const ensure = (uid: string) => {
        let cur = activityMap.get(uid);
        if (!cur) {
          cur = { searched: false, addedToCart: false, ordered: false, viewedProducts: false, searchTerms: [], orderCount: 0, cartItems: 0 };
          activityMap.set(uid, cur);
        }
        return cur;
      };
      for (const s of searchesRes.data || []) {
        if (!s.user_id) continue;
        const a = ensure(s.user_id);
        a.searched = true;
        if (s.search_query && a.searchTerms.length < 5 && !a.searchTerms.includes(s.search_query)) {
          a.searchTerms.push(s.search_query);
        }
      }
      for (const c of cartRes.data || []) {
        if (!c.user_id) continue;
        const a = ensure(c.user_id);
        a.addedToCart = true;
        a.cartItems += 1;
      }
      for (const o of ordersRes.data || []) {
        if (!o.user_id) continue;
        const a = ensure(o.user_id);
        a.ordered = true;
        a.orderCount += 1;
      }
      for (const v of viewsRes.data || []) {
        if (!v.user_id) continue;
        ensure(v.user_id).viewedProducts = true;
      }
      setVisitorActivityMap(activityMap);
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

  // Sync each Dialog's range default with the global KPI range so a user that
  // flips the global toggle sees Dialogs follow — but they can still override
  // each Dialog independently after that.
  useEffect(() => {
    setVisitorDateFilter(range === "today" ? "today" : "all");
    const mapped: DialogRangeKey = range === "today" ? "today" : "7d";
    setVisitorsRange(mapped);
    setCartRange(mapped);
    setBuyersRange(mapped);
    // leadsRange stays at its default ("7d") since "today" leads is rarely useful
  }, [range]);

  const rangeSuffix = range === "today" ? "اليوم" : "آخر 7 أيام";

  // Helper: was this visitor "viewed" under the selected time basis?
  // Pure logic lives in src/lib/viewedUnderBasis.ts (covered by viewedUnderBasis.test.ts).
  const isViewedUnderBasis = (v: { user_id: string | null; session_key: string | null; last_visit: string }) =>
    isViewedUnderBasisPure({
      visitor: v,
      basis: viewedBasis,
      anchor: viewedAnchor,
      viewedKeys,
      viewedAtMap,
      viewedFirstAtMap,
      rangeStartISO: range === "today" ? todayISO() : sevenDaysISO(),
    });

  // Count how many of the displayed (non-staff) visitors the current staff has already opened
  const viewedVisitorsCount = useMemo(() => {
    return visitorsList.reduce((acc, v) => {
      if (!includeStaff && v.user_id && staffIdsSet.has(v.user_id)) return acc;
      return isViewedUnderBasis(v) ? acc + 1 : acc;
    }, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visitorsList, viewedKeys, viewedAtMap, viewedFirstAtMap, includeStaff, staffIdsSet, viewedBasis, viewedAnchor, range]);

  // Side-by-side comparison: how many visitors qualify under "last view" vs
  // "first view" anchors — using the SAME range, basis, and staff filter as
  // the active KPI. Helps staff see at a glance whether their choice of anchor
  // is hiding/revealing visits.
  const viewedAnchorBreakdown = useMemo(() => {
    // Reuses the same date logic as isViewedUnderBasis but parameterized by anchor.
    const start = range === "today" ? todayISO() : sevenDaysISO();
    const countFor = (anchor: "last" | "first") => {
      const anchorMap = anchor === "first" ? viewedFirstAtMap : viewedAtMap;
      let n = 0;
      for (const v of visitorsList) {
        if (!includeStaff && v.user_id && staffIdsSet.has(v.user_id)) continue;
        const keys: string[] = [];
        if (v.user_id) keys.push(`u:${v.user_id}`);
        if (v.session_key) keys.push(`s:${v.session_key}`);
        if (keys.length === 0) continue;
        if (!keys.some((k) => viewedKeys.has(k))) continue;
        if (viewedBasis === "all_time") { n++; continue; }

        let viewedAt: string | null = null;
        for (const k of keys) {
          const t = anchorMap.get(k);
          if (!t) continue;
          if (!viewedAt) { viewedAt = t; continue; }
          if (anchor === "first" ? t < viewedAt : t > viewedAt) viewedAt = t;
        }
        if (!viewedAt) continue;
        if (viewedBasis === "range") {
          if (viewedAt >= start) n++;
        } else if (viewedBasis === "event_day") {
          if (viewedOnVisitDay(viewedAt, v.last_visit)) n++;
        }
      }
      return n;
    };
    return { last: countFor("last"), first: countFor("first") };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visitorsList, viewedKeys, viewedAtMap, viewedFirstAtMap, includeStaff, staffIdsSet, viewedBasis, range]);

  // Helpers shared by all KPI memos so badges and cards stay in lockstep
  const isStaffVisitor = (uid: string | null | undefined) => !!uid && staffIdsSet.has(uid);
  const startMs = useMemo(
    () => new Date(range === "today" ? todayISO() : sevenDaysISO()).getTime(),
    [range]
  );

  // Safe timestamp extractor — falls back to first_visit if last_visit missing,
  // and returns -Infinity for completely missing data so it gets excluded from range filters
  // instead of accidentally being counted (NaN comparisons return false → previously dropped silently).
  const visitTs = (v: { last_visit?: string | null; first_visit?: string | null }) => {
    const last = v.last_visit ? new Date(v.last_visit).getTime() : NaN;
    if (Number.isFinite(last)) return last;
    const first = v.first_visit ? new Date(v.first_visit).getTime() : NaN;
    return Number.isFinite(first) ? first : -Infinity;
  };

  // How many KPI-eligible visitors were SEEN (key exists in viewedKeys) but have
  // no timestamp in either viewedAtMap or viewedFirstAtMap — so they get silently
  // excluded from date-based "viewed" basis modes (range / event_day).
  // This surfaces gaps in visitor_session_views (older rows missing the
  // first_viewed_at / last_viewed_at columns).
  const viewedMissingTimestampCount = useMemo(() => {
    if (viewedBasis === "all_time") return 0; // anchor doesn't matter in all_time mode
    let n = 0;
    for (const v of visitorsList) {
      if (!includeStaff && v.user_id && staffIdsSet.has(v.user_id)) continue;
      if (visitTs(v) < startMs) continue; // outside the active KPI range
      const keys: string[] = [];
      if (v.user_id) keys.push(`u:${v.user_id}`);
      if (v.session_key) keys.push(`s:${v.session_key}`);
      if (keys.length === 0) continue;
      // Only count visitors that were actually viewed at least once but lack timestamps
      const seen = keys.some((k) => viewedKeys.has(k));
      if (!seen) continue;
      const hasLast = keys.some((k) => viewedAtMap.has(k));
      const hasFirst = keys.some((k) => viewedFirstAtMap.has(k));
      if (!hasLast && !hasFirst) n++;
    }
    return n;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visitorsList, viewedKeys, viewedAtMap, viewedFirstAtMap, includeStaff, staffIdsSet, viewedBasis, startMs]);

  // Visitor count shown in the dialog title badge — uses the SAME staff exclusion
  // AND the same KPI range as the visitors KPI card, so badge ≡ kpis.visitors.
  const visibleVisitorsCount = useMemo(() => {
    return visitorsList.reduce((acc, v) => {
      if (!includeStaff && v.user_id && staffIdsSet.has(v.user_id)) return acc;
      if (visitTs(v) < startMs) return acc;
      return acc + 1;
    }, 0);
  }, [visitorsList, includeStaff, staffIdsSet, startMs]);

  // Single source of truth for the visitors Dialog list + badge:
  // applies ALL active filters (staff toggle, type, date, viewed, engaged).
  // Both the title badge and the rendered list use this exact array
  // so the count always matches what's visible after any filter change.
  const dialogFilteredVisitors = useMemo(() => {
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const yesterdayStart = new Date(todayStart); yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    const weekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
    return visitorsList.filter((v) => {
      if (!includeStaff && v.user_id && staffIdsSet.has(v.user_id)) return false;
      if (visitorTypeFilter === "registered" && !v.user_id) return false;
      if (visitorTypeFilter === "anon" && v.user_id) return false;
      const t = visitTs(v);
      if (visitorDateFilter === "today" && t < todayStart.getTime()) return false;
      if (visitorDateFilter === "yesterday" && (t < yesterdayStart.getTime() || t >= todayStart.getTime())) return false;
      if (visitorDateFilter === "week" && t < weekStart.getTime()) return false;
      if (visitorDateFilter === "month" && t < monthStart.getTime()) return false;
      const isViewed =
        (v.user_id && viewedKeys.has(`u:${v.user_id}`)) ||
        (v.session_key && viewedKeys.has(`s:${v.session_key}`));
      if (visitorViewedFilter === "viewed" && !isViewed) return false;
      if (visitorViewedFilter === "not_viewed" && isViewed) return false;
      if (visitorEngagedOnly) {
        const firstT = v.first_visit ? new Date(v.first_visit).getTime() : NaN;
        const dwell = Number.isFinite(firstT) && Number.isFinite(t) ? t - (firstT as number) : 0;
        if (!(dwell >= ENGAGED_DWELL_MS || (v.pages ?? 0) >= 2)) return false;
      }
      // Free-text search: name / phone / email. Anonymous visitors (no name,
      // no phone, no email) automatically fall out as soon as a query is typed,
      // which is the expected behavior for a contact-search box.
      if (!matchesContactQuery(visitorsSearch, v)) return false;
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visitorsList, includeStaff, staffIdsSet, visitorTypeFilter, visitorDateFilter, visitorViewedFilter, visitorEngagedOnly, viewedKeys, visitorsSearch]);


  // Unified KPI numbers — computed from raw lists with the SAME staff-exclusion
  // logic as visibleVisitorsCount, so all cards stay consistent with the toggle.
  const kpis = useMemo(() => {
    // Lists are now fetched at the widest window (this month) to power per-dialog
    // ranges. KPI cards still reflect the GLOBAL range toggle, so we filter every
    // list by `startMs` here.
    const visibleVisitors = visitorsList.filter(
      (v) => (includeStaff || !isStaffVisitor(v.user_id)) && visitTs(v) >= startMs
    );
    const engaged = visibleVisitors.filter((v) => {
      const lastT = visitTs(v);
      const firstT = v.first_visit ? new Date(v.first_visit).getTime() : NaN;
      const dwell = Number.isFinite(firstT) && Number.isFinite(lastT) ? lastT - (firstT as number) : 0;
      return dwell >= ENGAGED_DWELL_MS || (v.pages ?? 0) >= 2;
    }).length;
    const signups = newSignups.filter(
      (s) => (includeStaff || !isStaffVisitor(s.user_id)) && new Date(s.created_at).getTime() >= startMs
    ).length;
    const cartUsers = new Set(
      cartList
        .filter((c) => (includeStaff || !isStaffVisitor(c.user_id)) && new Date(c.last_added).getTime() >= startMs)
        .map((c) => c.user_id)
    ).size;
    const buyerUsers = new Set(
      buyersList
        .filter((b) => (includeStaff || !isStaffVisitor(b.user_id)) && new Date(b.created_at).getTime() >= startMs)
        .map((b) => b.user_id)
    ).size;
    const hot = hotLeads.filter(
      (l) => (includeStaff || !isStaffVisitor(l.user_id)) && new Date(l.last_activity).getTime() >= startMs
    ).length;
    return {
      visitors: visibleVisitors.length,
      engagedVisitors: engaged,
      signups,
      addedToCart: cartUsers,
      purchased: buyerUsers,
      hotLeads: hot,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visitorsList, newSignups, cartList, buyersList, hotLeads, includeStaff, staffIdsSet, startMs]);

  // Raw counts BEFORE the staff-exclusion filter — used by the "rules" panel
  // so staff can see exactly how many rows the staff filter is hiding.
  // The range filter (startMs) is still applied so "before/after" compares
  // apples-to-apples within the same time window.
  const kpisRaw = useMemo(() => {
    const visibleVisitors = visitorsList.filter((v) => visitTs(v) >= startMs);
    const engaged = visibleVisitors.filter((v) => {
      const lastT = visitTs(v);
      const firstT = v.first_visit ? new Date(v.first_visit).getTime() : NaN;
      const dwell = Number.isFinite(firstT) && Number.isFinite(lastT) ? lastT - (firstT as number) : 0;
      return dwell >= ENGAGED_DWELL_MS || (v.pages ?? 0) >= 2;
    }).length;
    const signups = newSignups.filter((s) => new Date(s.created_at).getTime() >= startMs).length;
    const cartUsers = new Set(
      cartList.filter((c) => new Date(c.last_added).getTime() >= startMs).map((c) => c.user_id)
    ).size;
    const buyerUsers = new Set(
      buyersList.filter((b) => new Date(b.created_at).getTime() >= startMs).map((b) => b.user_id)
    ).size;
    const hot = hotLeads.filter((l) => new Date(l.last_activity).getTime() >= startMs).length;
    return {
      visitors: visibleVisitors.length,
      engagedVisitors: engaged,
      signups,
      addedToCart: cartUsers,
      purchased: buyerUsers,
      hotLeads: hot,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visitorsList, newSignups, cartList, buyersList, hotLeads, startMs]);

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
            }${
              viewedMissingTimestampCount > 0
                ? ` · مستثنى ${viewedMissingTimestampCount} لنقص توقيت المعاينة`
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
    [kpis, navigate, rangeSuffix, viewedVisitorsCount, viewedBasis, viewedTodayVisitors, cartList, buyersList, hotLeads, viewedMissingTimestampCount]
  );

  // ──────────────────────────────────────────────────────────────────────────
  // Filtered + sorted lists for the Cart / Buyers / Leads dialogs.
  // Each memo applies the dialog-local filters then sorts — keeping the badge
  // count and rendered list in lockstep just like the visitors dialog.
  // ──────────────────────────────────────────────────────────────────────────

  const visibleCart = useMemo(() => {
    const startMsCart = dialogRangeStartMs(cartRange);
    const filtered = cartList.filter((c) => {
      // Per-dialog time window — clipped against the in-memory list which is
      // already pre-fetched at the widest range (this month).
      if (new Date(c.last_added).getTime() < startMsCart) return false;
      if (cartContactFilter === "with_phone" && !c.phone) return false;
      if (cartContactFilter === "no_phone" && c.phone) return false;
      if (!matchesContactQuery(cartSearch, c)) return false;
      return true;
    });
    return [...filtered].sort((a, b) => {
      if (cartSort === "items") return (b.items || 0) - (a.items || 0);
      return (b.last_added || "").localeCompare(a.last_added || "");
    });
  }, [cartList, cartContactFilter, cartSort, cartSearch, cartRange]);

  const visibleBuyers = useMemo(() => {
    const known = new Set(["pending", "confirmed", "shipped", "delivered", "cancelled"]);
    const startMsBuyers = dialogRangeStartMs(buyersRange);
    const filtered = buyersList.filter((b) => {
      if (new Date(b.created_at).getTime() < startMsBuyers) return false;
      if (buyersContactFilter === "with_phone" && !b.phone) return false;
      if (buyersContactFilter === "no_phone" && b.phone) return false;
      if (buyersStatusFilter !== "all") {
        if (buyersStatusFilter === "other") {
          if (known.has(b.status)) return false;
        } else if (b.status !== buyersStatusFilter) return false;
      }
      // Also match against the order number so staff can paste/scan it.
      if (buyersSearch.trim()) {
        const matchesOrder = (b.order_number || "")
          .toLowerCase()
          .includes(buyersSearch.trim().toLowerCase());
        if (!matchesContactQuery(buyersSearch, b) && !matchesOrder) return false;
      }
      return true;
    });
    return [...filtered].sort((a, b) => {
      if (buyersSort === "amount") return (b.total_amount || 0) - (a.total_amount || 0);
      return (b.created_at || "").localeCompare(a.created_at || "");
    });
  }, [buyersList, buyersContactFilter, buyersStatusFilter, buyersSort, buyersSearch, buyersRange]);

  const visibleLeads = useMemo(() => {
    const startMsLeads = dialogRangeStartMs(leadsRange);
    const filtered = hotLeads.filter((l) => {
      if (new Date(l.last_activity).getTime() < startMsLeads) return false;
      if (leadsContactFilter === "with_phone" && !l.phone) return false;
      if (leadsContactFilter === "no_phone" && l.phone) return false;
      if (leadsTierFilter !== "all" && l.tier !== leadsTierFilter) return false;
      if (!matchesContactQuery(leadsSearch, l)) return false;
      return true;
    });
    return [...filtered].sort((a, b) => {
      if (leadsSort === "recent") return (b.last_activity || "").localeCompare(a.last_activity || "");
      return (b.score || 0) - (a.score || 0);
    });
  }, [hotLeads, leadsContactFilter, leadsTierFilter, leadsSort, leadsSearch, leadsRange]);

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
        {/* Reminders panel — top priority for staff workflow */}
        <StaffRemindersPanel staffOnly={true} limit={5} />

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
                title="المطابقة حسب اليوم التقويمي (سنة/شهر/يوم) لتاريخ آخر زيارة للعميل (last_visit)، وبالاعتماد على المنطقة الزمنية لجهازك. مثلاً: زيارة الساعة 11:50م ومعاينة الساعة 12:10ص = يومان مختلفان."
                aria-label="حساب المعاينة في نفس اليوم التقويمي لزيارة العميل بالتوقيت المحلي"
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

            {/* Anchor toggle — only meaningful for date-based modes (range / event_day) */}
            <div
              role="tablist"
              aria-label="اختيار وقت المعاينة المرجعي"
              className={cn(
                "inline-flex items-center bg-muted/60 rounded-lg p-0.5 border border-border/50 transition-opacity",
                viewedBasis === "all_time" && "opacity-50 pointer-events-none"
              )}
              title={
                viewedBasis === "all_time"
                  ? "هذا الخيار غير مفعّل في وضع 'أي وقت' لأن التاريخ لا يهم."
                  : undefined
              }
            >
              <button
                role="tab"
                aria-selected={viewedAnchor === "last"}
                onClick={() => setViewedAnchor("last")}
                title="يستخدم تاريخ آخر مرة فتحت فيها ملف العميل. يجاوب على: هل عاينته مؤخراً ضمن النطاق/اليوم؟"
                aria-label="اعتمد على آخر معاينة"
                className={cn(
                  "px-2.5 py-1 text-[11px] font-medium rounded-md transition-all",
                  viewedAnchor === "last"
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                آخر معاينة
              </button>
              <button
                role="tab"
                aria-selected={viewedAnchor === "first"}
                onClick={() => setViewedAnchor("first")}
                title="يستخدم تاريخ أول مرة فتحت فيها ملف العميل. يجاوب على: هل تواصلت معه أصلاً منذ زيارته؟ (مفيد لو معاينات لاحقة قد تخفي إهمال البداية)"
                aria-label="اعتمد على أول معاينة"
                className={cn(
                  "px-2.5 py-1 text-[11px] font-medium rounded-md transition-all",
                  viewedAnchor === "first"
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                أول معاينة
              </button>
            </div>

            {/* Help popover — explains the SQL semantics behind each anchor
                with concrete timestamp examples. Opens on click; works on touch too. */}
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  aria-label="شرح طريقة حساب آخر/أول معاينة"
                  title="كيف تُحسب آخر/أول معاينة؟"
                  className="inline-flex items-center justify-center w-7 h-7 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <HelpCircle className="w-4 h-4" />
                </button>
              </PopoverTrigger>
              <PopoverContent side="bottom" align="end" className="w-[340px] text-xs leading-relaxed">
                <div className="font-semibold text-sm mb-2">كيف يُحسب وقت المعاينة؟</div>
                <p className="text-muted-foreground mb-3">
                  لكل زائر قد يوجد عدة سجلات معاينة في جدول <code className="font-mono">visitor_session_views</code>.
                  الفلتر يختار توقيتاً واحداً لكل زائر حسب الزر المفعّل:
                </p>

                <div className="space-y-2.5">
                  <div className="rounded-md border border-border/60 bg-muted/30 p-2.5">
                    <div className="font-medium mb-1">
                      🔹 آخر معاينة → <code className="font-mono">MAX(last_viewed_at)</code>
                    </div>
                    <div className="text-muted-foreground">
                      يأخذ أحدث توقيت سجّل فيه أي موظف فتح ملف الزائر.
                    </div>
                  </div>

                  <div className="rounded-md border border-border/60 bg-muted/30 p-2.5">
                    <div className="font-medium mb-1">
                      🔸 أول معاينة → <code className="font-mono">MIN(first_viewed_at)</code>
                    </div>
                    <div className="text-muted-foreground">
                      يأخذ أقدم توقيت سجّل فيه أي موظف فتح ملف الزائر لأول مرة.
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-border/60">
                  <div className="font-medium mb-1.5">مثال — زائر له معاينتان:</div>
                  <ul className="font-mono text-[11px] text-muted-foreground space-y-0.5 mb-2">
                    <li>• 2024-06-14 09:30 (موظف أ — أول مرة)</li>
                    <li>• 2024-06-15 18:45 (موظف ب — آخر مرة)</li>
                  </ul>
                  <ul className="text-[11px] space-y-0.5">
                    <li>
                      <Badge variant="outline" className="font-mono text-[10px] mr-1">آخر</Badge>
                      يستخدم <code className="font-mono">2024-06-15 18:45</code>
                    </li>
                    <li>
                      <Badge variant="outline" className="font-mono text-[10px] mr-1">أول</Badge>
                      يستخدم <code className="font-mono">2024-06-14 09:30</code>
                    </li>
                  </ul>
                  <div className="text-[11px] text-muted-foreground/80 mt-2">
                    لو فلتر "اليوم" مفعّل (يبدأ <code className="font-mono">2024-06-15 00:00</code>) فالزائر يُحسب
                    معايَناً تحت "آخر" فقط، وغير معايَن تحت "أول".
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Side-by-side count: how many visitors qualify under each anchor
              for the SAME range/basis/staff filter. Helps staff understand
              the impact of switching the anchor without toggling back-and-forth. */}
          {viewedBasis !== "all_time" && (
            <div className="flex flex-wrap items-center gap-2 mt-2 text-[11px]">
              <span className="text-muted-foreground">مقارنة المرسي:</span>
              <Badge
                variant={viewedAnchor === "last" ? "default" : "outline"}
                className="font-mono tabular-nums"
              >
                آخر معاينة · {viewedAnchorBreakdown.last}
              </Badge>
              <Badge
                variant={viewedAnchor === "first" ? "default" : "outline"}
                className="font-mono tabular-nums"
              >
                أول معاينة · {viewedAnchorBreakdown.first}
              </Badge>
              {viewedAnchorBreakdown.last !== viewedAnchorBreakdown.first && (
                <span className="text-muted-foreground/80">
                  (فرق {Math.abs(viewedAnchorBreakdown.last - viewedAnchorBreakdown.first)} زائر)
                </span>
              )}
            </div>
          )}

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

        {/* Daily Report — compact tab card; clicking opens the dedicated page */}
        <DailyReportTabCard />

        {/* Calculation rules panel — explains how each KPI is computed
            and shows raw (pre-staff-filter) vs filtered counts. */}
        <section>
          <Card className="overflow-hidden border-border/60">
            <button
              type="button"
              onClick={() => setRulesOpen((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/40 transition-colors"
              aria-expanded={rulesOpen}
              aria-controls="kpi-rules-panel"
            >
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Info className="w-4 h-4 text-primary" />
                قواعد الحساب الحالية
                <Badge variant="outline" className="text-[10px] font-normal">
                  {range === "today" ? "اليوم" : "آخر 7 أيام"}
                  {" · "}
                  {includeStaff ? "يشمل الموظفين" : "بدون الموظفين"}
                </Badge>
              </div>
              <ChevronDown
                className={cn(
                  "w-4 h-4 text-muted-foreground transition-transform",
                  rulesOpen && "rotate-180"
                )}
              />
            </button>

            {rulesOpen && (
              <div id="kpi-rules-panel" className="border-t border-border/60 p-4 space-y-3 bg-muted/20">
                <div className="text-[11px] text-muted-foreground leading-relaxed">
                  كل رقم يتم حسابه بنفس النطاق الزمني المختار في الأعلى (<b>{range === "today" ? "اليوم فقط" : "آخر 7 أيام"}</b>)،
                  ثم تُستثنى صفوف الموظفين تلقائياً ما لم يكن فلتر "الكل" مفعّل.
                  العمود <b>قبل</b> = ما قبل استثناء الموظفين، <b>بعد</b> = الرقم الظاهر في البطاقات.
                </div>

                {(() => {
                  const rows: Array<{
                    label: string;
                    rule: string;
                    raw: number;
                    filtered: number;
                  }> = [
                    {
                      label: "الزوار",
                      rule: "كل صف من visitor_sessions ضمن النطاق (يستبعد ضوضاء lovable/preview/bots).",
                      raw: kpisRaw.visitors,
                      filtered: kpis.visitors,
                    },
                    {
                      label: "زوار متفاعلين",
                      rule: `زائر مدة جلسته ≥ ${Math.round(ENGAGED_DWELL_MS / 1000)}ث أو شاهد ≥2 صفحة.`,
                      raw: kpisRaw.engagedVisitors,
                      filtered: kpis.engagedVisitors,
                    },
                    {
                      label: "تسجيلات جديدة",
                      rule: "حسابات أُنشئت ضمن النطاق (created_at).",
                      raw: kpisRaw.signups,
                      filtered: kpis.signups,
                    },
                    {
                      label: "أضافوا للسلة",
                      rule: "عدد المستخدمين الفريدين الذين أضافوا للسلة (last_added ضمن النطاق).",
                      raw: kpisRaw.addedToCart,
                      filtered: kpis.addedToCart,
                    },
                    {
                      label: "اشتروا",
                      rule: "عدد المستخدمين الفريدين الذين أنشأوا طلباً ضمن النطاق (created_at).",
                      raw: kpisRaw.purchased,
                      filtered: kpis.purchased,
                    },
                    {
                      label: "Leads ساخنة",
                      rule: "Leads بآخر نشاط ضمن النطاق ودرجة ≥ عتبة hot/warm.",
                      raw: kpisRaw.hotLeads,
                      filtered: kpis.hotLeads,
                    },
                  ];
                  return (
                    <div className="overflow-x-auto rounded-lg border border-border/60 bg-background">
                      <table className="w-full text-xs">
                        <thead className="bg-muted/40 text-muted-foreground">
                          <tr>
                            <th className="text-right px-3 py-2 font-medium">المؤشر</th>
                            <th className="text-right px-3 py-2 font-medium">قاعدة الحساب</th>
                            <th className="text-center px-3 py-2 font-medium w-16">قبل</th>
                            <th className="text-center px-3 py-2 font-medium w-16">بعد</th>
                            <th className="text-center px-3 py-2 font-medium w-20">مستثنى</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((r) => {
                            const excluded = Math.max(0, r.raw - r.filtered);
                            return (
                              <tr key={r.label} className="border-t border-border/40">
                                <td className="px-3 py-2 font-medium whitespace-nowrap">{r.label}</td>
                                <td className="px-3 py-2 text-muted-foreground leading-relaxed">{r.rule}</td>
                                <td className="px-3 py-2 text-center font-mono tabular-nums text-muted-foreground">
                                  {r.raw}
                                </td>
                                <td className="px-3 py-2 text-center font-mono tabular-nums font-bold">
                                  {r.filtered}
                                </td>
                                <td className="px-3 py-2 text-center">
                                  {excluded > 0 ? (
                                    <Badge variant="secondary" className="font-mono tabular-nums text-[10px]">
                                      −{excluded}
                                    </Badge>
                                  ) : (
                                    <span className="text-muted-foreground/50">—</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}

                <div className="text-[11px] text-muted-foreground/80 flex items-start gap-1.5">
                  <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  <span>
                    "مستثنى" = عدد الصفوف التي حُذفت بسبب فلتر الموظفين فقط ضمن نفس النطاق.
                    لمشاهدتهم ضمن الأرقام، بدّل الفلتر إلى "الكل".
                  </span>
                </div>
              </div>
            )}
          </Card>
        </section>

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
              زوار {visitorDateFilter === "today" ? "اليوم" : visitorDateFilter === "yesterday" ? "أمس" : visitorDateFilter === "week" ? "آخر 7 أيام" : visitorDateFilter === "month" ? "هذا الشهر" : "كل التواريخ"}
              <Badge variant="secondary" className="text-xs">{dialogFilteredVisitors.length}</Badge>
              {dialogFilteredVisitors.length !== visitorsList.length && (
                <span
                  className="text-[10px] text-muted-foreground font-normal"
                  title="العدد بعد تطبيق الفلاتر النشطة من إجمالي الزوار"
                >
                  من أصل {visitorsList.length}
                </span>
              )}
            </DialogTitle>
            <DialogDescription className="text-xs">
              قائمة بكل زوار الموقع — المسجلين بأسمائهم وأرقامهم وإيميلاتهم، والزوار غير المسجلين كـ "زائر مجهول". اضغط "تفاصيل" لعرض كل نشاط الزائر.
            </DialogDescription>
          </DialogHeader>

          {/* Search bar — name / phone / email (matches normalized values) */}
          <div className="relative pt-2">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 mt-1 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              value={visitorsSearch}
              onChange={(e) => setVisitorsSearch(e.target.value)}
              placeholder="ابحث بالاسم أو رقم الهاتف أو الإيميل…"
              className="h-9 text-xs pr-9 pl-8"
              dir="rtl"
            />
            {visitorsSearch && (
              <button
                type="button"
                onClick={() => setVisitorsSearch("")}
                className="absolute left-2 top-1/2 -translate-y-1/2 mt-1 p-1 rounded hover:bg-muted text-muted-foreground"
                aria-label="مسح البحث"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2 pt-2 pb-1 border-b">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Filter className="w-3.5 h-3.5" />
              فلترة:
            </div>
            <Select value={visitorTypeFilter} onValueChange={(v) => setVisitorTypeFilter(v as any)}>
              <SelectTrigger className="h-8 w-[140px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent position="popper" className="z-[100]">
                <SelectItem value="all">كل الزوار</SelectItem>
                <SelectItem value="registered">مسجّل (له بيانات)</SelectItem>
                <SelectItem value="anon">زائر مجهول</SelectItem>
              </SelectContent>
            </Select>
            <Select value={visitorDateFilter} onValueChange={(v) => setVisitorDateFilter(v as any)}>
              <SelectTrigger className="h-8 w-[130px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent position="popper" className="z-[100]">
                <SelectItem value="all">كل التواريخ</SelectItem>
                <SelectItem value="today">اليوم</SelectItem>
                <SelectItem value="yesterday">أمس</SelectItem>
                <SelectItem value="week">آخر 7 أيام</SelectItem>
                <SelectItem value="month">هذا الشهر</SelectItem>
              </SelectContent>
            </Select>
            <Select value={visitorViewedFilter} onValueChange={(v) => setVisitorViewedFilter(v as any)}>
              <SelectTrigger className="h-8 w-[150px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent position="popper" className="z-[100]">
                <SelectItem value="all">معاين/غير معاين</SelectItem>
                <SelectItem value="not_viewed">لم تتم معاينته</SelectItem>
                <SelectItem value="viewed">تمت المعاينة</SelectItem>
              </SelectContent>
            </Select>
            {/* All / Only Customers toggle — default hides staff; "All" is for admin review */}
            <Select value={includeStaff ? "all" : "customers"} onValueChange={(v) => setIncludeStaff(v === "all")}>
              <SelectTrigger className="h-8 w-[170px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent position="popper" className="z-[100]">
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
            {(visitorTypeFilter !== "all" || visitorDateFilter !== "all" || visitorViewedFilter !== "all" || visitorEngagedOnly || includeStaff || visitorsSearch) && (
              <Button
                size="sm"
                variant="ghost"
                className="h-8 text-xs"
                onClick={() => {
                  setVisitorTypeFilter("all");
                  setVisitorDateFilter("all");
                  setVisitorViewedFilter("all");
                  setVisitorEngagedOnly(false);
                  setIncludeStaff(false);
                  setVisitorsSearch("");
                }}
              >
                مسح الفلاتر
              </Button>
            )}
          </div>

          {(() => {
            // Use the shared dialogFilteredVisitors memo so the title badge ("X من أصل Y")
            // and this list are guaranteed to stay in sync as filters change.
            const filtered = dialogFilteredVisitors;
            const hasAnyVisitor = visitorsList.length > 0;
            const hasActiveFilter =
              visitorTypeFilter !== "all" ||
              visitorDateFilter !== "all" ||
              visitorViewedFilter !== "all" ||
              visitorEngagedOnly ||
              !includeStaff ||
              !!visitorsSearch;

            if (filtered.length === 0) {
              return (
                <div className="text-center py-10 text-sm text-muted-foreground space-y-3">
                  {loading ? (
                    <p>جاري تحميل بيانات الزوار…</p>
                  ) : !hasAnyVisitor ? (
                    <>
                      <p>لم يتم تحميل أي زوار من قاعدة البيانات بعد.</p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => fetchData()}
                        className="text-xs h-8"
                      >
                        إعادة المحاولة
                      </Button>
                    </>
                  ) : (
                    <>
                      <p>مفيش زوار مطابقين للفلاتر <span className="text-[11px]">(الإجمالي: {visitorsList.length})</span></p>
                      {hasActiveFilter && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setVisitorTypeFilter("all");
                            setVisitorDateFilter("all");
                            setVisitorViewedFilter("all");
                            setVisitorEngagedOnly(false);
                            setIncludeStaff(false);
                            setVisitorsSearch("");
                          }}
                          className="text-xs h-8"
                        >
                          مسح كل الفلاتر
                        </Button>
                      )}
                    </>
                  )}
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
                  const lastDate = new Date(v.last_visit);
                  const last = lastDate.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
                  const fullDateTime = lastDate.toLocaleString("ar-EG", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
                  const dayLabel = fmtDay(v.last_visit);
                  const showHeader = dayLabel !== lastDayLabel;
                  lastDayLabel = dayLabel;
                  // First visit + session duration
                  const firstDate = v.first_visit ? new Date(v.first_visit) : null;
                  const firstTime = firstDate ? firstDate.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }) : null;
                  const firstFull = firstDate ? firstDate.toLocaleString("ar-EG", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : null;
                  const durationMin = firstDate ? Math.max(0, Math.round((lastDate.getTime() - firstDate.getTime()) / 60000)) : 0;
                  const durationLabel = durationMin >= 60
                    ? `${Math.floor(durationMin / 60)}س ${durationMin % 60}د`
                    : durationMin > 0
                    ? `${durationMin} دقيقة`
                    : "أقل من دقيقة";
                  // "منذ كذا" relative time
                  const diffMs = Date.now() - lastDate.getTime();
                  const diffMin = Math.floor(diffMs / 60000);
                  const diffHr = Math.floor(diffMin / 60);
                  const diffDay = Math.floor(diffHr / 24);
                  const relative = diffMin < 1 ? "الآن" : diffMin < 60 ? `منذ ${diffMin}د` : diffHr < 24 ? `منذ ${diffHr}س` : `منذ ${diffDay}ي`;
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
                      </div>
                      {/* Visit timeline — clear dates for staff */}
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap text-[11px]">
                        <span
                          className="inline-flex items-center gap-1 font-semibold text-foreground bg-primary/5 border border-primary/20 px-1.5 py-0.5 rounded"
                          title={`آخر زيارة: ${fullDateTime}`}
                        >
                          🕒 آخر زيارة: {last}
                          <span className="text-muted-foreground font-normal">({relative})</span>
                        </span>
                        {firstTime && firstDate && lastDate.getTime() - firstDate.getTime() > 60000 && (
                          <span
                            className="inline-flex items-center gap-1 text-muted-foreground bg-muted/40 px-1.5 py-0.5 rounded"
                            title={`أول زيارة: ${firstFull}`}
                          >
                            🚪 دخل: {firstTime}
                          </span>
                        )}
                        {durationMin > 0 && (
                          <span className="inline-flex items-center gap-1 text-muted-foreground bg-muted/40 px-1.5 py-0.5 rounded">
                            ⏱️ مدة الجلسة: {durationLabel}
                          </span>
                        )}
                        <span
                          className="inline-flex items-center gap-1 text-muted-foreground/80 text-[10px]"
                          title="التاريخ الكامل بالميلادي"
                        >
                          📅 {fullDateTime}
                        </span>
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
              أضافوا للسلة ({dialogRangeLabel(cartRange)})
              <Badge variant="secondary" className="text-xs">{visibleCart.length}</Badge>
              {visibleCart.length !== cartList.length && (
                <span className="text-[10px] text-muted-foreground font-normal" title="العدد بعد تطبيق الفلاتر من إجمالي العملاء">
                  من أصل {cartList.length}
                </span>
              )}
            </DialogTitle>
            <DialogDescription className="text-xs">
              عملاء أضافوا منتجات للسلة لكن لسه ما أتموا الطلب — فرصة متابعة قوية.
            </DialogDescription>
          </DialogHeader>

          {/* Search bar — name / phone / email */}
          <div className="relative pt-2">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 mt-1 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              value={cartSearch}
              onChange={(e) => setCartSearch(e.target.value)}
              placeholder="ابحث بالاسم أو رقم الهاتف أو الإيميل…"
              className="h-9 text-xs pr-9 pl-8"
              dir="rtl"
            />
            {cartSearch && (
              <button
                type="button"
                onClick={() => setCartSearch("")}
                className="absolute left-2 top-1/2 -translate-y-1/2 mt-1 p-1 rounded hover:bg-muted text-muted-foreground"
                aria-label="مسح البحث"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Sort + filter bar */}
          <div className="flex flex-wrap items-center gap-2 pt-2 pb-1 border-b">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Filter className="w-3.5 h-3.5" />
              فرز/فلترة:
            </div>
            <Select value={cartRange} onValueChange={(v) => setCartRange(v as DialogRangeKey)}>
              <SelectTrigger className="h-8 w-[140px] text-xs" title="نطاق الوقت لهذا الـDialog فقط — مستقل عن مؤشرات الـKPI"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="today">اليوم</SelectItem>
                <SelectItem value="7d">آخر 7 أيام</SelectItem>
                <SelectItem value="month">هذا الشهر</SelectItem>
              </SelectContent>
            </Select>
            <Select value={cartSort} onValueChange={(v) => setCartSort(v as any)}>
              <SelectTrigger className="h-8 w-[160px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">الأحدث إضافة أولاً</SelectItem>
                <SelectItem value="items">الأكثر منتجات أولاً</SelectItem>
              </SelectContent>
            </Select>
            <Select value={cartContactFilter} onValueChange={(v) => setCartContactFilter(v as any)}>
              <SelectTrigger className="h-8 w-[160px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل العملاء</SelectItem>
                <SelectItem value="with_phone">عنده هاتف</SelectItem>
                <SelectItem value="no_phone">بدون هاتف</SelectItem>
              </SelectContent>
            </Select>
            {(cartSort !== "recent" || cartContactFilter !== "all") && (
              <Button size="sm" variant="ghost" className="h-8 text-xs"
                onClick={() => { setCartSort("recent"); setCartContactFilter("all"); }}>
                مسح
              </Button>
            )}
          </div>

          {visibleCart.length === 0 ? (
            <div className="text-center py-10 text-sm text-muted-foreground">
              {cartList.length === 0 ? "مفيش عملاء أضافوا للسلة في هذا النطاق" : "مفيش عملاء مطابقين للفلاتر"}
            </div>
          ) : (
            <div className="space-y-2 mt-2">
              {visibleCart.map((c) => {
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
              طلبات {dialogRangeLabel(buyersRange)}
              <Badge variant="secondary" className="text-xs">{visibleBuyers.length}</Badge>
              {visibleBuyers.length !== buyersList.length && (
                <span className="text-[10px] text-muted-foreground font-normal" title="العدد بعد الفلاتر من إجمالي الطلبات">
                  من أصل {buyersList.length}
                </span>
              )}
              {visibleBuyers.length > 0 && (
                <span className="text-[11px] text-muted-foreground font-normal">
                  · إجمالي {visibleBuyers.reduce((s, b) => s + b.total_amount, 0).toLocaleString("ar-EG")} ج
                </span>
              )}
            </DialogTitle>
            <DialogDescription className="text-xs">
              قائمة الطلبات اللي وصلت في النطاق المختار — مع حالتها والمبلغ والعميل.
            </DialogDescription>
          </DialogHeader>

          {/* Search bar — name / phone / email / order number */}
          <div className="relative pt-2">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 mt-1 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              value={buyersSearch}
              onChange={(e) => setBuyersSearch(e.target.value)}
              placeholder="ابحث بالاسم/الهاتف/الإيميل/رقم الطلب…"
              className="h-9 text-xs pr-9 pl-8"
              dir="rtl"
            />
            {buyersSearch && (
              <button
                type="button"
                onClick={() => setBuyersSearch("")}
                className="absolute left-2 top-1/2 -translate-y-1/2 mt-1 p-1 rounded hover:bg-muted text-muted-foreground"
                aria-label="مسح البحث"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Sort + filter bar */}
          <div className="flex flex-wrap items-center gap-2 pt-2 pb-1 border-b">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Filter className="w-3.5 h-3.5" />
              فرز/فلترة:
            </div>
            <Select value={buyersRange} onValueChange={(v) => setBuyersRange(v as DialogRangeKey)}>
              <SelectTrigger className="h-8 w-[140px] text-xs" title="نطاق الوقت لهذا الـDialog فقط — مستقل عن مؤشرات الـKPI"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="today">اليوم</SelectItem>
                <SelectItem value="7d">آخر 7 أيام</SelectItem>
                <SelectItem value="month">هذا الشهر</SelectItem>
              </SelectContent>
            </Select>
            <Select value={buyersSort} onValueChange={(v) => setBuyersSort(v as any)}>
              <SelectTrigger className="h-8 w-[150px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">الأحدث أولاً</SelectItem>
                <SelectItem value="amount">الأعلى مبلغاً</SelectItem>
              </SelectContent>
            </Select>
            <Select value={buyersStatusFilter} onValueChange={(v) => setBuyersStatusFilter(v as any)}>
              <SelectTrigger className="h-8 w-[150px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الحالات</SelectItem>
                <SelectItem value="pending">قيد الانتظار</SelectItem>
                <SelectItem value="confirmed">مؤكد</SelectItem>
                <SelectItem value="shipped">تم الشحن</SelectItem>
                <SelectItem value="delivered">تم التسليم</SelectItem>
                <SelectItem value="cancelled">ملغي</SelectItem>
                <SelectItem value="other">حالات أخرى</SelectItem>
              </SelectContent>
            </Select>
            <Select value={buyersContactFilter} onValueChange={(v) => setBuyersContactFilter(v as any)}>
              <SelectTrigger className="h-8 w-[150px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل العملاء</SelectItem>
                <SelectItem value="with_phone">عنده هاتف</SelectItem>
                <SelectItem value="no_phone">بدون هاتف</SelectItem>
              </SelectContent>
            </Select>
            {(buyersSort !== "recent" || buyersStatusFilter !== "all" || buyersContactFilter !== "all") && (
              <Button size="sm" variant="ghost" className="h-8 text-xs"
                onClick={() => { setBuyersSort("recent"); setBuyersStatusFilter("all"); setBuyersContactFilter("all"); }}>
                مسح
              </Button>
            )}
          </div>

          {visibleBuyers.length === 0 ? (
            <div className="text-center py-10 text-sm text-muted-foreground">
              {buyersList.length === 0 ? "مفيش طلبات في هذا النطاق" : "مفيش طلبات مطابقة للفلاتر"}
            </div>
          ) : (
            <div className="space-y-2 mt-2">
              {visibleBuyers.map((b, i) => {
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
              Leads ساخنة ({dialogRangeLabel(leadsRange)})
              <Badge variant="secondary" className="text-xs">{visibleLeads.length}</Badge>
              {visibleLeads.length !== hotLeads.length && (
                <span className="text-[10px] text-muted-foreground font-normal" title="العدد بعد الفلاتر من إجمالي الـLeads">
                  من أصل {hotLeads.length}
                </span>
              )}
            </DialogTitle>
            <DialogDescription className="text-xs">
              العملاء اللي ظهر منهم نية شراء قوية (بحث + معاينة + إضافة للسلة) ولسه ما اشتروش — رتبهم بالأولوية وكلّمهم.
            </DialogDescription>
          </DialogHeader>

          {/* Search bar — name / phone / email */}
          <div className="relative pt-2">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 mt-1 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              value={leadsSearch}
              onChange={(e) => setLeadsSearch(e.target.value)}
              placeholder="ابحث بالاسم أو رقم الهاتف أو الإيميل…"
              className="h-9 text-xs pr-9 pl-8"
              dir="rtl"
            />
            {leadsSearch && (
              <button
                type="button"
                onClick={() => setLeadsSearch("")}
                className="absolute left-2 top-1/2 -translate-y-1/2 mt-1 p-1 rounded hover:bg-muted text-muted-foreground"
                aria-label="مسح البحث"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Sort + filter bar */}
          <div className="flex flex-wrap items-center gap-2 pt-2 pb-1 border-b">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Filter className="w-3.5 h-3.5" />
              فرز/فلترة:
            </div>
            <Select value={leadsRange} onValueChange={(v) => setLeadsRange(v as DialogRangeKey)}>
              <SelectTrigger className="h-8 w-[140px] text-xs" title="نطاق الوقت لهذا الـDialog فقط — مستقل عن مؤشرات الـKPI"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="today">اليوم</SelectItem>
                <SelectItem value="7d">آخر 7 أيام</SelectItem>
                <SelectItem value="month">هذا الشهر</SelectItem>
              </SelectContent>
            </Select>
            <Select value={leadsSort} onValueChange={(v) => setLeadsSort(v as any)}>
              <SelectTrigger className="h-8 w-[150px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="score">الأعلى نقاطاً</SelectItem>
                <SelectItem value="recent">الأحدث نشاطاً</SelectItem>
              </SelectContent>
            </Select>
            <Select value={leadsTierFilter} onValueChange={(v) => setLeadsTierFilter(v as any)}>
              <SelectTrigger className="h-8 w-[150px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل التصنيفات</SelectItem>
                <SelectItem value="hot">🟢 جاهز يشتري</SelectItem>
                <SelectItem value="warm">🟡 مهتم</SelectItem>
                <SelectItem value="cold">🔴 بارد</SelectItem>
              </SelectContent>
            </Select>
            <Select value={leadsContactFilter} onValueChange={(v) => setLeadsContactFilter(v as any)}>
              <SelectTrigger className="h-8 w-[150px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل العملاء</SelectItem>
                <SelectItem value="with_phone">عنده هاتف</SelectItem>
                <SelectItem value="no_phone">بدون هاتف</SelectItem>
              </SelectContent>
            </Select>
            {(leadsSort !== "score" || leadsTierFilter !== "all" || leadsContactFilter !== "all") && (
              <Button size="sm" variant="ghost" className="h-8 text-xs"
                onClick={() => { setLeadsSort("score"); setLeadsTierFilter("all"); setLeadsContactFilter("all"); }}>
                مسح
              </Button>
            )}
          </div>

          {visibleLeads.length === 0 ? (
            <div className="text-center py-10 text-sm text-muted-foreground">
              {hotLeads.length === 0 ? "مفيش Leads ساخنة حالياً" : "مفيش Leads مطابقة للفلاتر"}
            </div>
          ) : (
            <div className="space-y-2 mt-2">
              {visibleLeads.map((l) => {
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
