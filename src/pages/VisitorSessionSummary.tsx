import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { flushPendingVisits } from "@/lib/pageVisitTracker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Activity, ArrowRight, Clock, Eye, FileText, Globe, Hash,
  Search, ShoppingBag, Phone, MessageCircle, Timer, User as UserIcon,
  Calendar, Sparkles, TrendingUp, MousePointerClick, History,
  ExternalLink, Quote, Flame, StickyNote, Loader2,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface PageVisit { id: string; path: string; page_title: string | null; visited_at: string; referrer: string | null; }
interface SearchEntry { id: string; search_query: string; created_at: string; results_count: number | null; }
interface PriceView { id: string; product_id: string; viewed_at: string; }
interface ProductInfo { id: string; name_ar: string; sku: string; }

const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
const fmtDateTime = (iso: string) => new Date(iso).toLocaleString("ar-EG", { dateStyle: "medium", timeStyle: "short" });
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("ar-EG", { dateStyle: "medium" });
const fmtDuration = (ms: number) => {
  if (ms <= 0) return "أقل من ثانية";
  const min = Math.floor(ms / 60000);
  const sec = Math.floor((ms % 60000) / 1000);
  if (min < 1) return `${sec} ثانية`;
  if (min < 60) return `${min} د ${sec} ث`;
  const h = Math.floor(min / 60);
  return `${h} س ${min % 60} د`;
};

const friendlyPath = (path: string): string => {
  const p = path.split("?")[0];
  const map: Record<string, string> = {
    "/": "الصفحة الرئيسية",
    "/products": "كل المنتجات",
    "/cart": "السلة",
    "/checkout": "إتمام الطلب",
    "/contact": "تواصل معنا",
    "/about": "من نحن",
    "/auth": "تسجيل الدخول",
    "/dealer": "بوابة التاجر",
    "/dealer-apply": "طلب فتح حساب تاجر",
    "/dealer-register": "تسجيل تاجر",
    "/client-register": "تسجيل عميل",
    "/policies": "السياسات",
    "/catalogs": "الكتالوجات",
    "/track-order": "تتبع الطلب",
    "/my-profile": "الملف الشخصي",
    "/payment": "الدفع",
    "/payment-callback": "تأكيد الدفع",
  };
  if (map[p]) return map[p];
  if (p.startsWith("/products/")) return `منتجات: ${decodeURIComponent(p.split("/")[2] || "")}`;
  if (p.startsWith("/parts-by-model/")) return `قطع موديل: ${decodeURIComponent(p.split("/")[2] || "")}`;
  if (p.startsWith("/parts-by-type/")) return `قطع نوع: ${decodeURIComponent(p.split("/")[2] || "")}`;
  if (p.startsWith("/dealer/product/")) return "تفاصيل منتج (تاجر)";
  return p;
};

export default function VisitorSessionSummary() {
  const { userId = "" } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user, isAdmin, isModerator, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<{ full_name: string | null; email: string | null; phone: string | null; created_at: string | null } | null>(null);
  const [isDealer, setIsDealer] = useState(false);
  const [visits, setVisits] = useState<PageVisit[]>([]);
  const [searches, setSearches] = useState<SearchEntry[]>([]);
  const [priceViews, setPriceViews] = useState<PriceView[]>([]);
  const [productMap, setProductMap] = useState<Map<string, ProductInfo>>(new Map());
  const [hasOrders, setHasOrders] = useState(false);
  const [hasCart, setHasCart] = useState(false);

  // Note dialog
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!isAdmin && !isModerator) {
      navigate("/", { replace: true });
    }
  }, [authLoading, isAdmin, isModerator, navigate]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        // Flush any visits that were queued in this admin's own browser before fetching
        await flushPendingVisits().catch(() => 0);

        const [profRes, dealerRes, visitsRes, searchesRes, viewsRes, ordersRes, cartRes] = await Promise.all([
          supabase.from("profiles").select("full_name, email, phone, created_at").eq("user_id", userId).maybeSingle(),
          supabase.from("dealer_accounts").select("id").eq("user_id", userId).maybeSingle(),
          supabase.from("page_visits").select("id, path, page_title, visited_at, referrer").eq("user_id", userId).order("visited_at", { ascending: true }).limit(500),
          supabase.from("customer_search_logs").select("id, search_query, created_at, results_count").eq("user_id", userId).order("created_at", { ascending: false }).limit(50),
          supabase.from("dealer_price_views").select("id, product_id, viewed_at").eq("user_id", userId).order("viewed_at", { ascending: false }).limit(50),
          supabase.from("orders").select("id", { count: "exact", head: true }).eq("user_id", userId),
          supabase.from("dealer_cart_items").select("id", { count: "exact", head: true }).eq("user_id", userId),
        ]);

        if (cancelled) return;

        setProfile(profRes.data || null);
        setIsDealer(!!dealerRes.data);
        setVisits(visitsRes.data || []);
        setSearches(searchesRes.data || []);
        setPriceViews(viewsRes.data || []);
        setHasOrders((ordersRes.count || 0) > 0);
        setHasCart((cartRes.count || 0) > 0);

        const productIds = [...new Set((viewsRes.data || []).map((v: any) => v.product_id))];
        if (productIds.length > 0) {
          const { data: products } = await supabase
            .from("products")
            .select("id, name_ar, sku")
            .in("id", productIds);
          if (!cancelled) {
            setProductMap(new Map((products || []).map((p: any) => [p.id, p])));
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [userId]);

  // Group visits into sessions (gap > 30 min = new session)
  const sessions = useMemo(() => {
    if (visits.length === 0) return [] as { start: string; end: string; durationMs: number; pages: PageVisit[] }[];
    const SESSION_GAP_MS = 30 * 60 * 1000;
    const groups: PageVisit[][] = [];
    let current: PageVisit[] = [];
    let lastTime = 0;
    for (const v of visits) {
      const t = new Date(v.visited_at).getTime();
      if (current.length === 0 || t - lastTime > SESSION_GAP_MS) {
        if (current.length > 0) groups.push(current);
        current = [v];
      } else {
        current.push(v);
      }
      lastTime = t;
    }
    if (current.length > 0) groups.push(current);
    return groups
      .map((pages) => {
        const start = pages[0].visited_at;
        const end = pages[pages.length - 1].visited_at;
        const durationMs = new Date(end).getTime() - new Date(start).getTime();
        return { start, end, durationMs, pages };
      })
      .reverse(); // newest first
  }, [visits]);

  const lastSession = sessions[0];
  const lastSessionStart = lastSession ? new Date(lastSession.start).getTime() - 60_000 : 0;
  const lastSessionEnd = lastSession ? new Date(lastSession.end).getTime() + 60_000 : 0;
  const lastSessionSearches = searches.filter((s) => {
    const t = new Date(s.created_at).getTime();
    return t >= lastSessionStart && t <= lastSessionEnd;
  });
  const lastSessionPriceViews = priceViews.filter((v) => {
    const t = new Date(v.viewed_at).getTime();
    return t >= lastSessionStart && t <= lastSessionEnd;
  });

  const totalDurationMs = sessions.reduce((sum, s) => sum + s.durationMs, 0);
  const avgPagesPerSession = sessions.length > 0 ? Math.round(visits.length / sessions.length) : 0;
  const initials = (profile?.full_name || "?").trim().split(" ").map(s => s[0]).slice(0, 2).join("").toUpperCase();

  // Top viewed products (aggregated from price views)
  const topProducts = useMemo(() => {
    const counts = new Map<string, { count: number; lastAt: string }>();
    for (const v of priceViews) {
      const cur = counts.get(v.product_id);
      if (cur) {
        cur.count += 1;
        if (v.viewed_at > cur.lastAt) cur.lastAt = v.viewed_at;
      } else {
        counts.set(v.product_id, { count: 1, lastAt: v.viewed_at });
      }
    }
    return Array.from(counts.entries())
      .map(([product_id, { count, lastAt }]) => ({
        product_id,
        count,
        lastAt,
        product: productMap.get(product_id),
      }))
      .sort((a, b) => b.count - a.count || (b.lastAt > a.lastAt ? 1 : -1))
      .slice(0, 5);
  }, [priceViews, productMap]);

  // Top search queries (aggregated)
  const topSearches = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of searches) {
      const q = s.search_query.trim();
      if (!q) continue;
      counts.set(q, (counts.get(q) || 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([query, count]) => ({ query, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [searches]);

  const buildQuoteWhatsApp = (productLabel: string) => {
    const phone = "201027815696"; // WhatsMeta CRM number
    const customer = profile?.full_name || "العميل";
    const text = encodeURIComponent(
      `طلب عرض سعر للعميل: ${customer}\nالمنتج: ${productLabel}\n${profile?.phone ? `هاتف العميل: ${profile.phone}` : ""}`
    );
    return `https://wa.me/${phone}?text=${text}`;
  };

  // Lead scoring (visit=5, search=10, repeat product view=20, cart=40)
  const leadScore = useMemo(() => {
    let score = 0;
    if (visits.length > 0) score += 5;
    score += Math.min(searches.length, 5) * 10;
    const dupViews = topProducts.filter(p => p.count > 1).length;
    score += dupViews * 20;
    if (hasCart) score += 40;
    return score;
  }, [visits.length, searches.length, topProducts, hasCart]);

  const leadTier: "hot" | "warm" | "cold" = hasOrders
    ? "warm"
    : leadScore >= 70 ? "hot" : leadScore >= 30 ? "warm" : "cold";

  const lastActivityLabel = useMemo(() => {
    if (lastSessionPriceViews.length > 0) return `شاف سعر منتج (${lastSessionPriceViews.length})`;
    if (lastSessionSearches.length > 0) return `بحث: "${lastSessionSearches[0].search_query}"`;
    if (lastSession?.pages?.length) return `زار: ${friendlyPath(lastSession.pages[lastSession.pages.length - 1].path)}`;
    return "لا يوجد نشاط حديث";
  }, [lastSession, lastSessionPriceViews, lastSessionSearches]);

  const saveNote = async () => {
    if (!noteText.trim() || !user?.id) return;
    setSavingNote(true);
    try {
      const { error } = await supabase.from("customer_notes").insert({
        customer_user_id: userId,
        staff_user_id: user.id,
        note: noteText.trim(),
      });
      if (error) throw error;
      toast({ title: "✅ تم حفظ الملاحظة" });
      setNoteText("");
      setNoteOpen(false);
    } catch (e: any) {
      toast({ title: "فشل الحفظ", description: e.message, variant: "destructive" });
    } finally {
      setSavingNote(false);
    }
  };

  const callPhone = () => { if (profile?.phone) window.location.href = `tel:${profile.phone}`; };
  const openWhatsApp = () => {
    if (!profile?.phone) return;
    const cleaned = profile.phone.replace(/\D/g, "").replace(/^0/, "20");
    const msg = encodeURIComponent(`أهلاً ${profile.full_name || ""}، معاك المصرية جروب 🚗 — حابب أساعدك في طلبك؟`);
    window.open(`https://wa.me/${cleaned}?text=${msg}`, "_blank");
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-background to-slate-100 dark:from-slate-950 dark:via-background dark:to-slate-900 p-4" dir="rtl">
        <div className="max-w-6xl mx-auto space-y-4">
          <Skeleton className="h-44 w-full rounded-2xl" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
          </div>
          <Skeleton className="h-96 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-background to-slate-100/60 dark:from-slate-950 dark:via-background dark:to-slate-900/60 p-3 md:p-6 pb-12" dir="rtl">
      <div className="max-w-6xl mx-auto space-y-5">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-1.5 hover:bg-background/80">
            <ArrowRight className="w-4 h-4" />
            رجوع
          </Button>
          <Badge variant="outline" className="gap-1.5 bg-background/60 backdrop-blur">
            <Activity className="w-3 h-3" />
            ملخص جلسة الزائر
          </Badge>
        </div>

        {/* Hero / Visitor profile */}
        <Card className="overflow-hidden border-0 shadow-xl bg-gradient-to-br from-primary/95 via-primary to-primary/80 text-primary-foreground">
          <CardContent className="p-5 md:p-7">
            <div className="flex flex-col md:flex-row md:items-center gap-5">
              {/* Avatar */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-white/15 backdrop-blur ring-4 ring-white/10 flex items-center justify-center shrink-0">
                  <span className="text-2xl md:text-3xl font-black tracking-wide">{initials}</span>
                </div>
                <div className="md:hidden">
                  <h1 className="text-xl font-black">{profile?.full_name || "زائر بدون اسم"}</h1>
                  <p className="text-xs opacity-80 mt-0.5">{isDealer ? "حساب تاجر" : "عميل قطاعي"}</p>
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="hidden md:block">
                  <h1 className="text-2xl md:text-3xl font-black leading-tight">{profile?.full_name || "زائر بدون اسم"}</h1>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <Badge className={
                      leadTier === "hot"
                        ? "bg-red-500 text-white border-0 hover:bg-red-600"
                        : leadTier === "warm"
                        ? "bg-amber-500 text-white border-0 hover:bg-amber-600"
                        : "bg-white/20 text-primary-foreground border-white/20 backdrop-blur"
                    }>
                      {leadTier === "hot" ? "🔥 جاهز يشتري" : leadTier === "warm" ? "🟡 مهتم" : "🔴 بارد"}
                      <span className="opacity-80 mr-1">· {leadScore}</span>
                    </Badge>
                    <Badge className="bg-white/20 hover:bg-white/30 text-primary-foreground border-white/20 backdrop-blur">
                      {isDealer ? "🏢 حساب تاجر" : "👤 عميل قطاعي"}
                    </Badge>
                    <Badge variant="outline" className="border-white/30 text-primary-foreground/90 bg-white/5 backdrop-blur gap-1">
                      <Activity className="w-3 h-3" />
                      {lastActivityLabel}
                    </Badge>
                    {profile?.created_at && (
                      <Badge variant="outline" className="border-white/30 text-primary-foreground/90 bg-white/5 backdrop-blur gap-1">
                        <Calendar className="w-3 h-3" />
                        مسجّل من {fmtDate(profile.created_at)}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-4">
                  {profile?.phone && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <a href={`tel:${profile.phone}`} className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 backdrop-blur font-bold transition">
                        <Phone className="w-3.5 h-3.5" />
                        {profile.phone}
                      </a>
                      <a
                        href={`https://wa.me/${profile.phone.replace(/^0/, "20").replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white font-bold transition shadow-md"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        واتساب
                      </a>
                    </div>
                  )}
                  {profile?.email && !profile.email.includes("@phone.almasria.local") && (
                    <p className="text-xs opacity-80 truncate">📧 {profile.email}</p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard icon={Eye} label="إجمالي الصفحات المشاهدة" value={visits.length} sub={`${avgPagesPerSession || 0} صفحة/جلسة`} color="blue" />
          <KpiCard icon={Hash} label="عدد الجلسات" value={sessions.length} sub={sessions.length > 1 ? "زائر عائد" : "زيارة واحدة"} color="purple" />
          <KpiCard icon={Search} label="عمليات البحث" value={searches.length} sub={searches.length > 0 ? "نشاط بحث" : "لم يبحث"} color="orange" />
          <KpiCard icon={Timer} label="إجمالي الوقت" valueText={fmtDuration(totalDurationMs)} sub={lastSession ? `آخر زيارة: ${fmtDate(lastSession.start)}` : "—"} color="emerald" />
        </div>

        {/* Top Searched Products & Queries */}
        {(topProducts.length > 0 || topSearches.length > 0) && (
          <Card className="border-orange-200/60 dark:border-orange-900/40 shadow-md overflow-hidden">
            <CardHeader className="pb-3 bg-gradient-to-l from-orange-500/10 via-orange-500/5 to-transparent border-b">
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="w-9 h-9 rounded-xl bg-orange-500/15 flex items-center justify-center">
                  <Flame className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                </div>
                المنتجات الأكثر اهتمامًا
                <Badge variant="secondary" className="text-[10px]">{topProducts.length + topSearches.length}</Badge>
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1.5 mr-11">
                ملخص لأكثر ما بحث وشاف سعره — اضغط لفتح المنتج أو إرسال عرض سعر فورًا.
              </p>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {topProducts.length > 0 && (
                <div>
                  <SectionTitle icon={ShoppingBag} title="منتجات شاف سعرها أكثر" count={topProducts.length} />
                  <div className="space-y-2 mt-3">
                    {topProducts.map((tp, idx) => {
                      const label = tp.product?.name_ar || `منتج ${tp.product_id.slice(0, 8)}`;
                      const sku = tp.product?.sku;
                      return (
                        <div
                          key={tp.product_id}
                          className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/40 hover:bg-muted/70 transition flex-wrap"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <span className="w-7 h-7 rounded-lg bg-orange-100 dark:bg-orange-950/50 text-orange-700 dark:text-orange-400 flex items-center justify-center text-xs font-black shrink-0">
                              {idx + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-sm text-foreground truncate">{label}</p>
                              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                {sku && (
                                  <span className="text-[10px] text-muted-foreground font-mono">SKU: {sku}</span>
                                )}
                                <span className="text-[10px] text-orange-700 dark:text-orange-400 font-bold">
                                  شاف السعر {tp.count}× • آخر مرة {fmtTime(tp.lastAt)}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-1.5 shrink-0">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 gap-1 text-xs"
                              onClick={() => window.open(`/dealer/product/${tp.product_id}`, "_blank")}
                            >
                              <ExternalLink className="w-3 h-3" />
                              فتح المنتج
                            </Button>
                            <Button
                              size="sm"
                              className="h-8 gap-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                              onClick={() => window.open(buildQuoteWhatsApp(`${label}${sku ? ` (${sku})` : ""}`), "_blank")}
                            >
                              <Quote className="w-3 h-3" />
                              عرض سعر
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {topSearches.length > 0 && (
                <div>
                  <SectionTitle icon={Search} title="أكثر كلمات البحث تكرارًا" count={topSearches.length} />
                  <div className="space-y-2 mt-3">
                    {topSearches.map((ts, idx) => (
                      <div
                        key={ts.query}
                        className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/40 hover:bg-muted/70 transition flex-wrap"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <span className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 flex items-center justify-center text-xs font-black shrink-0">
                            {idx + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm text-foreground truncate">"{ts.query}"</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">بحث {ts.count}×</p>
                          </div>
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 gap-1 text-xs"
                            onClick={() => window.open(`/products?search=${encodeURIComponent(ts.query)}`, "_blank")}
                          >
                            <Search className="w-3 h-3" />
                            عرض النتائج
                          </Button>
                          <Button
                            size="sm"
                            className="h-8 gap-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={() => window.open(buildQuoteWhatsApp(ts.query), "_blank")}
                          >
                            <Quote className="w-3 h-3" />
                            عرض سعر
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {visits.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-20 text-center">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-muted flex items-center justify-center mb-4">
                <Globe className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-base font-bold text-foreground">لا يوجد نشاط مسجّل بعد</p>
              <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
                لم يفتح هذا الزائر أي صفحة بعد. سيبدأ التسجيل تلقائياً مع أول صفحة يدخلها.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Latest Session — main highlight */}
            {lastSession && (
              <Card className="border-primary/20 shadow-lg overflow-hidden">
                <CardHeader className="pb-4 bg-gradient-to-l from-primary/8 via-primary/4 to-transparent border-b">
                  <div className="flex items-start justify-between flex-wrap gap-3">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center">
                          <Sparkles className="w-5 h-5 text-primary" />
                        </div>
                        أحدث جلسة
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-2 mr-11">
                        {fmtDateTime(lastSession.start)}
                      </p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Badge variant="secondary" className="gap-1.5 px-2.5 py-1">
                        <FileText className="w-3 h-3" />
                        {lastSession.pages.length} صفحة
                      </Badge>
                      <Badge variant="secondary" className="gap-1.5 px-2.5 py-1">
                        <Timer className="w-3 h-3" />
                        {fmtDuration(lastSession.durationMs)}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-5 space-y-6">
                  {/* Quick session insights */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                    <InsightChip
                      icon={MousePointerClick}
                      label="بدأ من"
                      value={friendlyPath(lastSession.pages[0].path)}
                      tone="blue"
                    />
                    <InsightChip
                      icon={TrendingUp}
                      label="آخر صفحة"
                      value={friendlyPath(lastSession.pages[lastSession.pages.length - 1].path)}
                      tone="purple"
                    />
                    <InsightChip
                      icon={lastSessionSearches.length > 0 ? Search : ShoppingBag}
                      label={lastSessionSearches.length > 0 ? "أهم بحث" : "نشاط الأسعار"}
                      value={lastSessionSearches[0]?.search_query || (lastSessionPriceViews.length > 0 ? `${lastSessionPriceViews.length} منتج` : "بدون")}
                      tone="orange"
                    />
                  </div>

                  {/* Pages timeline */}
                  <div>
                    <SectionTitle icon={FileText} title="رحلة الصفحات" count={lastSession.pages.length} />
                    <ol className="relative border-r-2 border-primary/15 pr-5 mt-3 space-y-2">
                      {lastSession.pages.map((p, idx) => (
                        <li key={p.id} className="relative">
                          <span className="absolute -right-[26px] top-3 w-3.5 h-3.5 rounded-full bg-primary ring-4 ring-primary/15 shadow" />
                          <div className="bg-muted/40 hover:bg-muted/70 rounded-lg p-3 transition group">
                            <div className="flex items-center justify-between gap-3 flex-wrap">
                              <p className="font-bold text-sm flex items-center gap-2">
                                <span className="text-[10px] font-mono text-muted-foreground bg-background rounded px-1.5 py-0.5">#{idx + 1}</span>
                                {friendlyPath(p.path)}
                              </p>
                              <span className="text-[11px] text-muted-foreground font-mono shrink-0">{fmtTime(p.visited_at)}</span>
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-1 break-all font-mono opacity-70 group-hover:opacity-100">{p.path}</p>
                          </div>
                        </li>
                      ))}
                    </ol>
                  </div>

                  {/* Searches */}
                  {lastSessionSearches.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <SectionTitle icon={Search} title="عمليات البحث" count={lastSessionSearches.length} />
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {lastSessionSearches.map((s) => (
                            <Badge key={s.id} variant="outline" className="gap-1.5 text-xs px-2.5 py-1.5 border-orange-200 bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-900/50">
                              <Search className="w-3 h-3" />
                              "{s.search_query}"
                              {s.results_count !== null && (
                                <span className="text-[10px] opacity-70 mr-1">({s.results_count})</span>
                              )}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Price views */}
                  {lastSessionPriceViews.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <SectionTitle icon={ShoppingBag} title="منتجات شاف سعرها" count={lastSessionPriceViews.length} />
                        <div className="space-y-1.5 mt-3">
                          {lastSessionPriceViews.map((v) => {
                            const prod = productMap.get(v.product_id);
                            return (
                              <div key={v.id} className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-muted/40 hover:bg-muted/70 transition">
                                <div className="flex-1 min-w-0">
                                  <p className="font-bold text-foreground truncate">{prod?.name_ar || "منتج"}</p>
                                  {prod?.sku && <p className="text-[10px] text-muted-foreground font-mono mt-0.5">SKU: {prod.sku}</p>}
                                </div>
                                <span className="text-[10px] text-muted-foreground shrink-0 ms-2 font-mono">{fmtTime(v.viewed_at)}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  )}

                  {lastSessionSearches.length === 0 && lastSessionPriceViews.length === 0 && (
                    <div className="rounded-lg border border-dashed bg-muted/20 p-4 text-center">
                      <p className="text-xs text-muted-foreground">
                        💡 الزائر تصفح صفحات فقط بدون بحث أو مشاهدة أسعار خلال هذه الجلسة.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Previous sessions */}
            {sessions.length > 1 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <History className="w-5 h-5 text-muted-foreground" />
                    الجلسات السابقة
                    <Badge variant="secondary" className="text-xs">{sessions.length - 1}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {sessions.slice(1, 11).map((s, idx) => (
                    <details key={idx} className="group rounded-lg bg-muted/30 hover:bg-muted/60 transition">
                      <summary className="cursor-pointer p-3 flex items-center justify-between flex-wrap gap-2 text-sm list-none">
                        <span className="font-bold flex items-center gap-2">
                          <span className="w-6 h-6 rounded-md bg-background flex items-center justify-center text-[10px] font-mono text-muted-foreground">{idx + 2}</span>
                          {fmtDateTime(s.start)}
                        </span>
                        <div className="flex gap-1.5">
                          <Badge variant="outline" className="text-[10px] gap-1">
                            <FileText className="w-2.5 h-2.5" />
                            {s.pages.length}
                          </Badge>
                          <Badge variant="outline" className="text-[10px] gap-1">
                            <Timer className="w-2.5 h-2.5" />
                            {fmtDuration(s.durationMs)}
                          </Badge>
                        </div>
                      </summary>
                      <div className="px-3 pb-3 space-y-1">
                        {s.pages.map((p) => (
                          <div key={p.id} className="text-xs flex items-center justify-between gap-2 p-2 rounded bg-background/60">
                            <span className="truncate">{friendlyPath(p.path)}</span>
                            <span className="text-[10px] text-muted-foreground font-mono shrink-0">{fmtTime(p.visited_at)}</span>
                          </div>
                        ))}
                      </div>
                    </details>
                  ))}
                </CardContent>
              </Card>
            )}
          </>
        )}

        <div className="text-center pt-4 pb-24">
          <Link to="/admin" className="text-xs text-muted-foreground hover:text-primary underline">
            ← الرجوع إلى لوحة الإدارة
          </Link>
          <p className="text-[10px] text-muted-foreground/60 mt-2 font-mono">UID: {userId}</p>
        </div>
      </div>

      {/* Sticky Action Bar — اتصال / واتساب / ملاحظة */}
      <div className="fixed bottom-0 inset-x-0 z-50 bg-background/95 backdrop-blur-xl border-t border-border shadow-2xl">
        <div className="max-w-6xl mx-auto px-3 py-2.5 grid grid-cols-3 gap-2">
          <Button
            onClick={callPhone}
            disabled={!profile?.phone}
            className="h-12 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md"
          >
            <Phone className="w-5 h-5" />
            اتصال
          </Button>
          <Button
            onClick={openWhatsApp}
            disabled={!profile?.phone}
            className="h-12 gap-2 bg-green-600 hover:bg-green-700 text-white font-bold shadow-md"
          >
            <MessageCircle className="w-5 h-5" />
            واتساب
          </Button>
          <Button
            onClick={() => setNoteOpen(true)}
            variant="outline"
            className="h-12 gap-2 border-2 border-primary/40 text-primary hover:bg-primary/10 font-bold"
          >
            <StickyNote className="w-5 h-5" />
            تسجيل ملاحظة
          </Button>
        </div>
      </div>

      {/* Quick Note Dialog */}
      <Dialog open={noteOpen} onOpenChange={setNoteOpen}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <StickyNote className="w-5 h-5 text-primary" />
              تسجيل ملاحظة عن {profile?.full_name || "العميل"}
            </DialogTitle>
          </DialogHeader>
          <Textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="اكتب تفاصيل المكالمة، اهتمامات العميل، أو خطوة المتابعة القادمة..."
            rows={5}
            className="resize-none"
            autoFocus
          />
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setNoteOpen(false)} disabled={savingNote}>
              إلغاء
            </Button>
            <Button onClick={saveNote} disabled={!noteText.trim() || savingNote} className="gap-2">
              {savingNote ? <Loader2 className="w-4 h-4 animate-spin" /> : <StickyNote className="w-4 h-4" />}
              حفظ الملاحظة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, valueText, sub, color, onClick }: { icon: any; label: string; value?: number; valueText?: string; sub?: string; color: string; onClick?: () => void }) {
  const map: Record<string, string> = {
    blue: "from-blue-500/15 to-blue-500/5 text-blue-700 dark:text-blue-400 border-blue-200/60 dark:border-blue-900/40",
    purple: "from-purple-500/15 to-purple-500/5 text-purple-700 dark:text-purple-400 border-purple-200/60 dark:border-purple-900/40",
    orange: "from-orange-500/15 to-orange-500/5 text-orange-700 dark:text-orange-400 border-orange-200/60 dark:border-orange-900/40",
    emerald: "from-emerald-500/15 to-emerald-500/5 text-emerald-700 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-900/40",
  };
  const interactive = !!onClick;
  return (
    <div
      onClick={onClick}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={interactive ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick?.(); } } : undefined}
      className={`rounded-2xl p-4 border bg-gradient-to-br ${map[color]} shadow-sm transition ${interactive ? "cursor-pointer hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-current/40" : "hover:shadow-md"}`}
    >
      <div className="flex items-center justify-between mb-2">
        <Icon className="w-5 h-5" />
        {interactive && <span className="text-[9px] opacity-60 font-bold">اضغط للتفاصيل ↓</span>}
      </div>
      <p className="text-2xl md:text-3xl font-black leading-none">{valueText ?? value ?? 0}</p>
      <p className="text-[11px] mt-2 font-bold opacity-90">{label}</p>
      {sub && <p className="text-[10px] mt-1 opacity-70">{sub}</p>}
    </div>
  );
}

function SectionTitle({ icon: Icon, title, count }: { icon: any; title: string; count?: number }) {
  return (
    <h3 className="text-sm font-black flex items-center gap-2 text-foreground">
      <Icon className="w-4 h-4 text-primary" />
      {title}
      {typeof count === "number" && <Badge variant="secondary" className="text-[10px] h-5">{count}</Badge>}
    </h3>
  );
}

function InsightChip({ icon: Icon, label, value, tone }: { icon: any; label: string; value: string; tone: string }) {
  const map: Record<string, string> = {
    blue: "bg-blue-50 text-blue-900 dark:bg-blue-950/30 dark:text-blue-300 border-blue-100 dark:border-blue-900/40",
    purple: "bg-purple-50 text-purple-900 dark:bg-purple-950/30 dark:text-purple-300 border-purple-100 dark:border-purple-900/40",
    orange: "bg-orange-50 text-orange-900 dark:bg-orange-950/30 dark:text-orange-300 border-orange-100 dark:border-orange-900/40",
  };
  return (
    <div className={`rounded-xl border p-3 ${map[tone]}`}>
      <div className="flex items-center gap-1.5 text-[10px] font-bold opacity-80 mb-1">
        <Icon className="w-3 h-3" />
        {label}
      </div>
      <p className="text-xs font-black truncate" title={value}>{value}</p>
    </div>
  );
}
