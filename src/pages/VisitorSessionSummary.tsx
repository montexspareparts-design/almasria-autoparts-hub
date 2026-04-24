import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Activity, ArrowRight, Clock, Eye, FileText, Globe, Hash,
  Search, ShoppingBag, Phone, MessageCircle, MapPin, Timer, User as UserIcon,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface PageVisit { id: string; path: string; page_title: string | null; visited_at: string; referrer: string | null; }
interface SearchEntry { id: string; search_query: string; created_at: string; results_count: number | null; }
interface PriceView { id: string; product_id: string; viewed_at: string; }
interface ProductInfo { id: string; name_ar: string; sku: string; }

const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
const fmtDateTime = (iso: string) => new Date(iso).toLocaleString("ar-EG", { dateStyle: "medium", timeStyle: "short" });
const fmtDuration = (ms: number) => {
  if (ms <= 0) return "—";
  const min = Math.floor(ms / 60000);
  const sec = Math.floor((ms % 60000) / 1000);
  if (min < 1) return `${sec} ث`;
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
  const { isAdmin, isModerator, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<{ full_name: string | null; email: string | null; phone: string | null; created_at: string | null } | null>(null);
  const [isDealer, setIsDealer] = useState(false);
  const [visits, setVisits] = useState<PageVisit[]>([]);
  const [searches, setSearches] = useState<SearchEntry[]>([]);
  const [priceViews, setPriceViews] = useState<PriceView[]>([]);
  const [productMap, setProductMap] = useState<Map<string, ProductInfo>>(new Map());

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
        const [profRes, dealerRes, visitsRes, searchesRes, viewsRes] = await Promise.all([
          supabase.from("profiles").select("full_name, email, phone, created_at").eq("user_id", userId).maybeSingle(),
          supabase.from("dealer_accounts").select("id").eq("user_id", userId).maybeSingle(),
          supabase.from("page_visits").select("id, path, page_title, visited_at, referrer").eq("user_id", userId).order("visited_at", { ascending: true }).limit(500),
          supabase.from("customer_search_logs").select("id, search_query, created_at, results_count").eq("user_id", userId).order("created_at", { ascending: false }).limit(50),
          supabase.from("dealer_price_views").select("id, product_id, viewed_at").eq("user_id", userId).order("viewed_at", { ascending: false }).limit(50),
        ]);

        if (cancelled) return;

        setProfile(profRes.data || null);
        setIsDealer(!!dealerRes.data);
        setVisits(visitsRes.data || []);
        setSearches(searchesRes.data || []);
        setPriceViews(viewsRes.data || []);

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

  // Filter searches and price views to the last session window (with small buffer)
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

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-muted/30 p-4" dir="rtl">
        <div className="max-w-5xl mx-auto space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-muted/40 via-background to-muted/20 p-4 pb-12" dir="rtl">
      <div className="max-w-5xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => navigate(-1)} className="gap-1.5">
            <ArrowRight className="w-4 h-4" />
            رجوع
          </Button>
          <h1 className="text-xl md:text-2xl font-black flex items-center gap-2">
            <Activity className="w-6 h-6 text-primary" />
            ملخص جلسة الزائر
          </h1>
        </div>

        {/* Visitor profile card */}
        <Card className="overflow-hidden border-primary/10">
          <CardHeader className="bg-gradient-to-l from-primary/5 to-transparent pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <UserIcon className="w-5 h-5 text-primary" />
              بيانات الزائر
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground text-xs mb-1">الاسم</p>
              <p className="font-bold">{profile?.full_name || "بدون اسم"}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs mb-1">النوع</p>
              <Badge variant={isDealer ? "default" : "secondary"}>{isDealer ? "تاجر" : "قطاعي"}</Badge>
            </div>
            <div>
              <p className="text-muted-foreground text-xs mb-1">الإيميل</p>
              <p className="font-medium break-all">{profile?.email || "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs mb-1">رقم التليفون</p>
              {profile?.phone ? (
                <div className="flex items-center gap-2 flex-wrap">
                  <a href={`tel:${profile.phone}`} className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-400 font-bold">
                    <Phone className="w-3.5 h-3.5" />
                    {profile.phone}
                  </a>
                  <a
                    href={`https://wa.me/${profile.phone.replace(/^0/, "20").replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 font-bold"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    واتساب
                  </a>
                </div>
              ) : (
                <p className="text-muted-foreground">—</p>
              )}
            </div>
            <div>
              <p className="text-muted-foreground text-xs mb-1">تاريخ التسجيل</p>
              <p className="font-medium">{profile?.created_at ? fmtDateTime(profile.created_at) : "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs mb-1">User ID</p>
              <p className="font-mono text-[10px] text-muted-foreground break-all">{userId}</p>
            </div>
          </CardContent>
        </Card>

        {/* Quick KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard icon={Eye} label="إجمالي الصفحات" value={visits.length} color="blue" />
          <KpiCard icon={Hash} label="عدد الجلسات" value={sessions.length} color="purple" />
          <KpiCard icon={Search} label="عمليات البحث" value={searches.length} color="orange" />
          <KpiCard icon={Timer} label="إجمالي الوقت" valueText={fmtDuration(totalDurationMs)} color="emerald" />
        </div>

        {visits.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center text-muted-foreground">
              <Globe className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">لم يتم تسجيل أي زيارات لهذا المستخدم بعد.</p>
              <p className="text-xs mt-2 opacity-70">
                سيبدأ التسجيل تلقائياً مع كل صفحة يفتحها بعد الآن.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Last session highlight */}
            {lastSession && (
              <Card className="border-primary/30 shadow-md">
                <CardHeader className="pb-3 bg-primary/5">
                  <CardTitle className="flex items-center justify-between flex-wrap gap-2 text-base">
                    <span className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-primary" />
                      أحدث جلسة
                    </span>
                    <span className="text-xs font-normal text-muted-foreground">
                      {fmtDateTime(lastSession.start)} • مدة: {fmtDuration(lastSession.durationMs)}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-5">
                  {/* Pages timeline */}
                  <SectionTitle icon={FileText} title={`الصفحات اللي شافها (${lastSession.pages.length})`} />
                  <ol className="relative border-r-2 border-primary/20 pr-4 space-y-2.5">
                    {lastSession.pages.map((p, idx) => (
                      <li key={p.id} className="relative">
                        <span className="absolute -right-[22px] top-1 w-3 h-3 rounded-full bg-primary ring-4 ring-primary/10" />
                        <div className="bg-muted/50 hover:bg-muted rounded-md p-2.5">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <p className="font-bold text-sm text-foreground">
                              <span className="text-muted-foreground text-xs ml-1">#{idx + 1}</span>
                              {friendlyPath(p.path)}
                            </p>
                            <span className="text-[10px] text-muted-foreground font-mono">{fmtTime(p.visited_at)}</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-0.5 break-all font-mono">{p.path}</p>
                          {p.page_title && p.page_title !== document.title && (
                            <p className="text-[10px] text-muted-foreground mt-0.5">{p.page_title}</p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ol>

                  {/* Searches in this session */}
                  {lastSessionSearches.length > 0 && (
                    <>
                      <Separator />
                      <SectionTitle icon={Search} title={`بحث خلال الجلسة (${lastSessionSearches.length})`} />
                      <div className="flex flex-wrap gap-1.5">
                        {lastSessionSearches.map((s) => (
                          <Badge key={s.id} variant="outline" className="gap-1.5 text-xs border-orange-200 bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400">
                            <Search className="w-3 h-3" />
                            "{s.search_query}"
                            {s.results_count !== null && (
                              <span className="text-[10px] opacity-70">({s.results_count} نتيجة)</span>
                            )}
                          </Badge>
                        ))}
                      </div>
                    </>
                  )}

                  {/* Products viewed with price */}
                  {lastSessionPriceViews.length > 0 && (
                    <>
                      <Separator />
                      <SectionTitle icon={ShoppingBag} title={`منتجات شاف سعرها (${lastSessionPriceViews.length})`} />
                      <div className="space-y-1.5">
                        {lastSessionPriceViews.map((v) => {
                          const prod = productMap.get(v.product_id);
                          return (
                            <div key={v.id} className="flex items-center justify-between text-xs p-2 rounded-md bg-muted/50">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-foreground truncate">{prod?.name_ar || "منتج"}</p>
                                {prod?.sku && <p className="text-[10px] text-muted-foreground font-mono">SKU: {prod.sku}</p>}
                              </div>
                              <span className="text-[10px] text-muted-foreground shrink-0 ms-2">{fmtTime(v.viewed_at)}</span>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}

                  {lastSessionSearches.length === 0 && lastSessionPriceViews.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-2">
                      لم يقم الزائر بأي بحث أو مشاهدة أسعار خلال هذه الجلسة — مجرد تصفح صفحات.
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Previous sessions */}
            {sessions.length > 1 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <MapPin className="w-5 h-5 text-muted-foreground" />
                    الجلسات السابقة ({sessions.length - 1})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {sessions.slice(1, 11).map((s, idx) => (
                    <details key={idx} className="group rounded-md bg-muted/40 hover:bg-muted/60">
                      <summary className="cursor-pointer p-3 flex items-center justify-between flex-wrap gap-2 text-sm">
                        <span className="font-medium">
                          {fmtDateTime(s.start)} • {s.pages.length} صفحة
                        </span>
                        <span className="text-xs text-muted-foreground">{fmtDuration(s.durationMs)}</span>
                      </summary>
                      <div className="px-3 pb-3 space-y-1">
                        {s.pages.map((p) => (
                          <div key={p.id} className="text-xs flex items-center justify-between gap-2 p-1.5 rounded bg-background/60">
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

        <div className="text-center pt-4">
          <Link to="/admin" className="text-xs text-muted-foreground hover:text-primary underline">
            ← الرجوع إلى لوحة الإدارة
          </Link>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, valueText, color }: { icon: any; label: string; value?: number; valueText?: string; color: string }) {
  const map: Record<string, string> = {
    blue: "from-blue-500/10 to-blue-500/5 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900/40",
    purple: "from-purple-500/10 to-purple-500/5 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-900/40",
    orange: "from-orange-500/10 to-orange-500/5 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-900/40",
    emerald: "from-emerald-500/10 to-emerald-500/5 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/40",
  };
  return (
    <div className={`rounded-xl p-3 border bg-gradient-to-br ${map[color]}`}>
      <Icon className="w-5 h-5 mb-1.5" />
      <p className="text-2xl font-black leading-none">{valueText ?? value ?? 0}</p>
      <p className="text-[11px] mt-1 opacity-80">{label}</p>
    </div>
  );
}

function SectionTitle({ icon: Icon, title }: { icon: any; title: string }) {
  return (
    <h3 className="text-sm font-bold flex items-center gap-1.5 text-foreground">
      <Icon className="w-4 h-4 text-primary" />
      {title}
    </h3>
  );
}
