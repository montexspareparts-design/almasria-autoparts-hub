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
} from "lucide-react";
import { cn } from "@/lib/utils";

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
    signups: 0,
    addedToCart: 0,
    purchased: 0,
    hotLeads: 0,
  });
  const [hotLeads, setHotLeads] = useState<HotLead[]>([]);
  const [range, setRange] = useState<RangeKey>("today");
  const [newSignups, setNewSignups] = useState<Array<{ user_id: string; full_name: string | null; phone: string | null; email: string | null; created_at: string }>>([]);
  const [signupsOpen, setSignupsOpen] = useState(false);

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

      // 1) Visitors (distinct sessions/users from page_visits)
      const { data: visits } = await supabase
        .from("page_visits")
        .select("session_key, user_id")
        .gte("visited_at", start);
      const visitorKeys = new Set(
        (visits || []).map((v) => v.session_key || v.user_id || "")
          .filter(Boolean)
      );

      // 2) Signups within range — fetch full list (for the popup) + count
      const { data: signupRows, count: signupCount } = await supabase
        .from("profiles")
        .select("user_id, full_name, phone, email, created_at", { count: "exact" })
        .gte("created_at", start)
        .order("created_at", { ascending: false })
        .limit(100);
      setNewSignups(signupRows || []);

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
            .select("user_id, full_name, phone"),
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

      setKpis({
        visitors: visitorKeys.size,
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
        onClick: () => navigate("/admin?section=analytics"),
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
                  <div key={s.user_id} className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-muted/30 hover:bg-muted/60 transition flex-wrap">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate">{name}</p>
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
    </div>
  );
};

export default StaffHome;
