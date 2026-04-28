import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Search, ShoppingBag, Eye, Heart, Package, Clock, Phone, MessageCircle, Activity, FileText, Timer } from "lucide-react";
import WhatsAppQuickChat from "./WhatsAppQuickChat";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string | null;
  customerName?: string;
  customerPhone?: string | null;
  isDealer?: boolean;
}

interface SearchEntry { query: string; created_at: string; results_count: number | null; }
interface OrderEntry { id: string; order_number: string; total_amount: number; status: string; created_at: string; }
interface FavoriteEntry { product_id: string; created_at: string; product_name?: string; product_sku?: string; }
interface PriceViewEntry { product_id: string; viewed_at: string; product_name?: string; product_sku?: string; }

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  const diffMin = Math.floor((Date.now() - d.getTime()) / 60000);
  if (diffMin < 60) return `منذ ${diffMin}د`;
  if (diffMin < 1440) return `منذ ${Math.floor(diffMin / 60)}س`;
  if (diffMin < 10080) return `منذ ${Math.floor(diffMin / 1440)}ي`;
  return d.toLocaleDateString("ar-EG");
};

const statusLabel = (s: string) => {
  const map: Record<string, string> = {
    pending: "بانتظار", confirmed: "مؤكد", awaiting_payment: "بانتظار الدفع",
    processing: "تجهيز", ready: "جاهز", shipped: "شُحن", delivered: "مُسلم", cancelled: "ملغى",
  };
  return map[s] || s;
};

export default function CustomerActivitySummary({ open, onOpenChange, userId, customerName, customerPhone, isDealer }: Props) {
  const [loading, setLoading] = useState(true);
  const [searches, setSearches] = useState<SearchEntry[]>([]);
  const [orders, setOrders] = useState<OrderEntry[]>([]);
  const [favorites, setFavorites] = useState<FavoriteEntry[]>([]);
  const [priceViews, setPriceViews] = useState<PriceViewEntry[]>([]);
  const [sessions, setSessions] = useState<{ session_date: string; page_views: number; last_seen_at: string }[]>([]);

  useEffect(() => {
    if (!open || !userId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [searchRes, ordersRes, favRes, viewRes, sessRes] = await Promise.all([
          supabase.from("customer_search_logs").select("search_query, created_at, results_count").eq("user_id", userId).order("created_at", { ascending: false }).limit(20),
          supabase.from("orders").select("id, order_number, total_amount, status, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(10),
          supabase.from("dealer_favorites").select("product_id, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(15),
          supabase.from("dealer_price_views").select("product_id, viewed_at").eq("user_id", userId).order("viewed_at", { ascending: false }).limit(15),
          supabase.from("customer_sessions").select("session_date, page_views, last_seen_at").eq("user_id", userId).order("session_date", { ascending: false }).limit(7),
        ]);

        if (cancelled) return;

        const productIds = [
          ...new Set([...(favRes.data || []).map((f: any) => f.product_id), ...(viewRes.data || []).map((v: any) => v.product_id)]),
        ];
        let productMap = new Map<string, { name: string; sku: string }>();
        if (productIds.length > 0) {
          const { data: products } = await supabase.from("products").select("id, name_ar, sku").in("id", productIds);
          productMap = new Map((products || []).map((p: any) => [p.id, { name: p.name_ar, sku: p.sku }]));
        }

        setSearches((searchRes.data || []).map((s: any) => ({ query: s.search_query, created_at: s.created_at, results_count: s.results_count })));
        setOrders(ordersRes.data || []);
        setFavorites((favRes.data || []).map((f: any) => ({ ...f, product_name: productMap.get(f.product_id)?.name, product_sku: productMap.get(f.product_id)?.sku })));
        setPriceViews((viewRes.data || []).map((v: any) => ({ ...v, product_name: productMap.get(v.product_id)?.name, product_sku: productMap.get(v.product_id)?.sku })));
        setSessions(sessRes.data || []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, userId]);

  const topSearches = (() => {
    const map: Record<string, number> = {};
    for (const s of searches) {
      const q = s.query.trim().toLowerCase();
      if (!q) continue;
      map[q] = (map[q] || 0) + 1;
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5);
  })();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-full sm:max-w-md overflow-hidden p-0 flex flex-col" dir="rtl">
        <SheetHeader className="p-4 border-b bg-gradient-to-l from-primary/5 to-transparent shrink-0">
          <SheetTitle className="flex items-center gap-2 text-base">
            <Activity className="w-5 h-5 text-primary" />
            ملخص نشاط العميل
          </SheetTitle>
          <SheetDescription className="text-start">
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="font-bold text-foreground">{customerName || "عميل"}</span>
              <Badge variant={isDealer ? "default" : "secondary"} className="text-[10px] h-5">
                {isDealer ? "تاجر" : "قطاعي"}
              </Badge>
            </div>
            {customerPhone && (
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <a href={`tel:${customerPhone}`} className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-400 font-medium">
                  <Phone className="w-3 h-3" />
                  اتصال {customerPhone}
                </a>
                <WhatsAppQuickChat phone={customerPhone} customerName={customerName || "عميل"} context="" size="sm" />
              </div>
            )}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-5">
            {loading ? (
              <>
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
              </>
            ) : (
              <>
                {/* Quick stats */}
                <div className="grid grid-cols-3 gap-2">
                  <StatCard icon={Search} label="بحث" value={searches.length} color="orange" />
                  <StatCard icon={ShoppingBag} label="طلب" value={orders.length} color="emerald" />
                  <StatCard icon={Eye} label="مشاهدة" value={priceViews.length + favorites.length} color="blue" />
                </div>

                {/* Top searches */}
                {topSearches.length > 0 && (
                  <Section icon={Search} title="أكثر ما بحث عنه" color="orange">
                    <div className="flex flex-wrap gap-1.5">
                      {topSearches.map(([q, count]) => (
                        <Badge key={q} variant="outline" className="gap-1 text-xs border-orange-200 bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400">
                          {q}
                          <span className="font-bold">×{count}</span>
                        </Badge>
                      ))}
                    </div>
                  </Section>
                )}

                {/* Recent searches timeline */}
                {searches.length > 0 && (
                  <Section icon={Clock} title="آخر عمليات البحث" color="orange">
                    <div className="space-y-1.5">
                      {searches.slice(0, 8).map((s, i) => (
                        <div key={i} className="flex items-center justify-between text-xs p-2 rounded-md bg-muted/50 hover:bg-muted">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground truncate">"{s.query}"</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {s.results_count !== null ? `${s.results_count} نتيجة` : "بحث"} • {fmtDate(s.created_at)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Section>
                )}

                {/* Orders */}
                {orders.length > 0 && (
                  <Section icon={ShoppingBag} title="آخر الطلبات" color="emerald">
                    <div className="space-y-1.5">
                      {orders.map((o) => (
                        <div key={o.id} className="flex items-center justify-between text-xs p-2 rounded-md bg-muted/50">
                          <div>
                            <p className="font-bold text-foreground">{o.order_number}</p>
                            <p className="text-[10px] text-muted-foreground">{fmtDate(o.created_at)}</p>
                          </div>
                          <div className="text-end">
                            <p className="font-bold text-primary">{Number(o.total_amount).toLocaleString("ar-EG")} ج.م</p>
                            <Badge variant="outline" className="text-[9px] h-4 mt-0.5">{statusLabel(o.status)}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Section>
                )}

                {/* Viewed products */}
                {priceViews.length > 0 && (
                  <Section icon={Eye} title="منتجات شاهد سعرها" color="blue">
                    <div className="space-y-1">
                      {priceViews.slice(0, 8).map((v, i) => (
                        <div key={i} className="flex items-center justify-between text-xs p-2 rounded-md bg-muted/50">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground truncate">{v.product_name || "منتج"}</p>
                            {v.product_sku && <p className="text-[10px] text-muted-foreground">SKU: {v.product_sku}</p>}
                          </div>
                          <span className="text-[10px] text-muted-foreground shrink-0 ms-2">{fmtDate(v.viewed_at)}</span>
                        </div>
                      ))}
                    </div>
                  </Section>
                )}

                {/* Favorites */}
                {favorites.length > 0 && (
                  <Section icon={Heart} title="المنتجات المفضلة" color="pink">
                    <div className="space-y-1">
                      {favorites.slice(0, 6).map((f, i) => (
                        <div key={i} className="flex items-center justify-between text-xs p-2 rounded-md bg-muted/50">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground truncate">{f.product_name || "منتج"}</p>
                            {f.product_sku && <p className="text-[10px] text-muted-foreground">SKU: {f.product_sku}</p>}
                          </div>
                          <span className="text-[10px] text-muted-foreground shrink-0 ms-2">{fmtDate(f.created_at)}</span>
                        </div>
                      ))}
                    </div>
                  </Section>
                )}

                {/* Recent sessions */}
                {sessions.length > 0 && (
                  <Section icon={Package} title="آخر الزيارات" color="purple">
                    <div className="grid grid-cols-2 gap-1.5">
                      {sessions.map((s, i) => (
                        <div key={i} className="text-xs p-2 rounded-md bg-muted/50 text-center">
                          <p className="font-medium text-foreground">{new Date(s.session_date).toLocaleDateString("ar-EG", { weekday: "short", day: "numeric", month: "short" })}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{s.page_views} مشاهدة</p>
                        </div>
                      ))}
                    </div>
                  </Section>
                )}

                {searches.length === 0 && orders.length === 0 && favorites.length === 0 && priceViews.length === 0 && sessions.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Activity className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">لا يوجد نشاط مسجل لهذا العميل بعد</p>
                  </div>
                )}
              </>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  const colorMap: Record<string, string> = {
    orange: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400",
    blue: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400",
  };
  return (
    <div className={`rounded-lg p-2.5 text-center border ${colorMap[color]}`}>
      <Icon className="w-4 h-4 mx-auto mb-1" />
      <p className="text-lg font-black leading-none">{value}</p>
      <p className="text-[10px] mt-0.5 opacity-80">{label}</p>
    </div>
  );
}

function Section({ icon: Icon, title, color, children }: { icon: any; title: string; color: string; children: React.ReactNode }) {
  const colorMap: Record<string, string> = {
    orange: "text-orange-600 dark:text-orange-400",
    emerald: "text-emerald-600 dark:text-emerald-400",
    blue: "text-blue-600 dark:text-blue-400",
    pink: "text-pink-600 dark:text-pink-400",
    purple: "text-purple-600 dark:text-purple-400",
  };
  return (
    <div>
      <h3 className={`text-xs font-bold mb-2 flex items-center gap-1.5 ${colorMap[color]}`}>
        <Icon className="w-3.5 h-3.5" />
        {title}
      </h3>
      {children}
    </div>
  );
}
