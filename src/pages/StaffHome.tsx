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
  const [kpis, setKpis] = useState({
    visitors: 0,
    engagedVisitors: 0,
    signups: 0,
    addedToCart: 0,
    purchased: 0,
    hotLeads: 0,
  });
  const [hotLeads, setHotLeads] = useState<HotLead[]>([]);
  const [range, setRange] = useState<RangeKey>("today");
  const [newSignups, setNewSignups] = useState<Array<{ user_id: string; full_name: string | null; phone: string | null; email: string | null; created_at: string; duplicates?: number; duplicateIds?: string[] }>>([]);
  const [signupsOpen, setSignupsOpen] = useState(false);
  const [visitorsOpen, setVisitorsOpen] = useState(false);
  const [visitorsList, setVisitorsList] = useState<Array<{ user_id: string | null; session_key: string | null; full_name: string | null; phone: string | null; email: string | null; pages: number; last_visit: string; first_path?: string | null; referrer?: string | null; searches?: string[] }>>([]);
  const [viewedKeys, setViewedKeys] = useState<Set<string>>(new Set());
  const [visitorTypeFilter, setVisitorTypeFilter] = useState<"all" | "registered" | "anon">("all");
  const [visitorDateFilter, setVisitorDateFilter] = useState<"all" | "today" | "yesterday" | "week">("all");
  const [visitorViewedFilter, setVisitorViewedFilter] = useState<"all" | "viewed" | "not_viewed">("all");

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

      // 1) Visitors (distinct sessions/users from page_visits) — with details
      const { data: visits } = await supabase
        .from("page_visits")
        .select("session_key, user_id, visited_at, path, referrer")
        .gte("visited_at", start)
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

      // 3) Users who added to cart today (distinct)
      const { data: cartItems } = await supabase
        .from("dealer_cart_items")
        .select("user_id")
        .gte("created_at", start);
      const cartUsers = new Set((cartItems || []).map((c) => c.user_id));

      // 4) Users who purchased today (distinct)
      const { data: orders } = await supabase
        .from("orders")
        .select("user_id")
        .gte("created_at", start);
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

      // Build visitors list with profile details
      const visitorsArr = Array.from(visitorAgg.values()).map((v) => {
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
          first_path: v.first_path,
          referrer: v.referrer,
        };
      });
      // Sort strictly by last_visit desc — latest visitor first
      visitorsArr.sort((a, b) => b.last_visit.localeCompare(a.last_visit));
      setVisitorsList(visitorsArr);

      // Fetch which visitors the current staff has already viewed
      try {
        const { data: views } = await supabase
          .from("visitor_session_views")
          .select("customer_user_id, session_key")
          .eq("staff_user_id", user!.id);
        const set = new Set<string>();
        (views || []).forEach((v: any) => {
          if (v.customer_user_id) set.add(`u:${v.customer_user_id}`);
          if (v.session_key) set.add(`s:${v.session_key}`);
        });
        setViewedKeys(set);
      } catch (e) {
        console.warn("[StaffHome] viewed keys fetch failed", e);
      }

      // Engaged visitors = sessions with dwell ≥ ENGAGED_DWELL_MS OR ≥ 2 distinct pages
      const engagedCount = Array.from(visitorAgg.values()).filter((v) => {
        const dwell = new Date(v.last_visit).getTime() - new Date(v.first_visit).getTime();
        return dwell >= ENGAGED_DWELL_MS || v.pages >= 2;
      }).length;

      setKpis({
        visitors: visitorKeys.size,
        engagedVisitors: engagedCount,
        signups: signupCount || 0,
        addedToCart: cartUsers.size,
        purchased: buyers.size,
        hotLeads: hotCount,
      });
      setHotLeads(leads.slice(0, 12));
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

  const rangeSuffix = range === "today" ? "اليوم" : "آخر 7 أيام";

  const kpiCards: KPI[] = useMemo(
    () => [
      {
        label: `زوار ${rangeSuffix}`,
        value: kpis.visitors,
        icon: Users,
        color: "text-blue-600",
        bg: "from-blue-500/10 to-blue-500/5",
        onClick: () => setVisitorsOpen(true),
      },
      {
        label: `زوار متفاعلين (${rangeSuffix})`,
        value: kpis.engagedVisitors,
        icon: Activity,
        color: "text-cyan-600",
        bg: "from-cyan-500/10 to-cyan-500/5",
        onClick: () => setVisitorsOpen(true),
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
        onClick: () => navigate("/admin?section=customer-intel"),
      },
      {
        label: `اشتروا (${rangeSuffix})`,
        value: kpis.purchased,
        icon: CheckCircle2,
        color: "text-green-600",
        bg: "from-green-500/10 to-green-500/5",
        onClick: () => navigate("/admin?section=orders"),
      },
      {
        label: "Leads ساخنة 🔥",
        value: kpis.hotLeads,
        icon: Flame,
        color: "text-red-600",
        bg: "from-red-500/15 to-orange-500/10",
        onClick: () => navigate("/admin?section=customer-intel"),
      },
    ],
    [kpis, navigate, rangeSuffix]
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
                  <div className="text-3xl font-bold">{kpi.value}</div>
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
              <Badge variant="secondary" className="text-xs">{visitorsList.length}</Badge>
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
            {(visitorTypeFilter !== "all" || visitorDateFilter !== "all" || visitorViewedFilter !== "all") && (
              <Button
                size="sm"
                variant="ghost"
                className="h-8 text-xs"
                onClick={() => { setVisitorTypeFilter("all"); setVisitorDateFilter("all"); setVisitorViewedFilter("all"); }}
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
              // type
              if (visitorTypeFilter === "registered" && !v.user_id) return false;
              if (visitorTypeFilter === "anon" && v.user_id) return false;
              // date
              const t = new Date(v.last_visit).getTime();
              if (visitorDateFilter === "today" && t < todayStart.getTime()) return false;
              if (visitorDateFilter === "yesterday" && (t < yesterdayStart.getTime() || t >= todayStart.getTime())) return false;
              if (visitorDateFilter === "week" && t < weekStart.getTime()) return false;
              // viewed
              const isViewed = (v.user_id && viewedKeys.has(`u:${v.user_id}`)) || (v.session_key && viewedKeys.has(`s:${v.session_key}`));
              if (visitorViewedFilter === "viewed" && !isViewed) return false;
              if (visitorViewedFilter === "not_viewed" && isViewed) return false;
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
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StaffHome;
