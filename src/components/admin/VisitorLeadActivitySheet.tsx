import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Eye, Search as SearchIcon, FileText, Clock, Globe, ShoppingBag, Sparkles, Copy, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

type Props = {
  open: boolean;
  onClose: () => void;
  lead: {
    id: string;
    phone: string;
    session_key: string | null;
    user_id: string | null;
    first_path: string | null;
    referrer: string | null;
    source: string | null;
    created_at: string;
  } | null;
};

type Visit = { path: string; page_title: string | null; visited_at: string };
type SearchLog = { search_query: string; results_count: number | null; created_at: string };
type PriceView = { product_id: string; viewed_at: string; product_name?: string };

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleString("ar-EG", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: true });

const VisitorLeadActivitySheet = ({ open, onClose, lead }: Props) => {
  const [loading, setLoading] = useState(false);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [searches, setSearches] = useState<SearchLog[]>([]);
  const [priceViews, setPriceViews] = useState<PriceView[]>([]);
  const [sessionDuration, setSessionDuration] = useState<number>(0);
  const { toast } = useToast();

  useEffect(() => {
    if (!open || !lead) return;
    const load = async () => {
      setLoading(true);
      try {
        // 1) page_visits — by session_key OR user_id
        let visitsData: Visit[] = [];
        if (lead.session_key || lead.user_id) {
          let q = supabase.from("page_visits").select("path, page_title, visited_at").order("visited_at", { ascending: true }).limit(200);
          if (lead.user_id && lead.session_key) {
            q = q.or(`session_key.eq.${lead.session_key},user_id.eq.${lead.user_id}`);
          } else if (lead.session_key) {
            q = q.eq("session_key", lead.session_key);
          } else if (lead.user_id) {
            q = q.eq("user_id", lead.user_id);
          }
          const { data } = await q;
          visitsData = (data || []) as Visit[];
        }
        setVisits(visitsData);

        // Session duration = first → last visit
        if (visitsData.length >= 2) {
          const first = new Date(visitsData[0].visited_at).getTime();
          const last = new Date(visitsData[visitsData.length - 1].visited_at).getTime();
          setSessionDuration(Math.round((last - first) / 1000));
        } else {
          setSessionDuration(0);
        }

        // 2) searches — only if registered
        if (lead.user_id) {
          const { data: sData } = await supabase
            .from("customer_search_logs")
            .select("search_query, results_count, created_at")
            .eq("user_id", lead.user_id)
            .order("created_at", { ascending: false })
            .limit(50);
          setSearches((sData || []) as SearchLog[]);

          // 3) price views (registered dealers only)
          const { data: pvData } = await supabase
            .from("dealer_price_views")
            .select("product_id, viewed_at")
            .eq("user_id", lead.user_id)
            .order("viewed_at", { ascending: false })
            .limit(30);

          if (pvData && pvData.length > 0) {
            const ids = [...new Set(pvData.map((p: any) => p.product_id))];
            const { data: prods } = await supabase
              .from("products")
              .select("id, name_ar, name_en")
              .in("id", ids);
            const nameMap = new Map((prods || []).map((p: any) => [p.id, p.name_ar || p.name_en]));
            setPriceViews(pvData.map((p: any) => ({ ...p, product_name: nameMap.get(p.product_id) || "—" })));
          } else {
            setPriceViews([]);
          }
        } else {
          setSearches([]);
          setPriceViews([]);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [open, lead]);

  if (!lead) return null;

  // Smart summary: top categories from paths
  const pathCategories: Record<string, number> = {};
  visits.forEach((v) => {
    if (v.path.includes("/products")) pathCategories["تصفح المنتجات"] = (pathCategories["تصفح المنتجات"] || 0) + 1;
    else if (v.path.includes("/cart")) pathCategories["السلة"] = (pathCategories["السلة"] || 0) + 1;
    else if (v.path.includes("/checkout")) pathCategories["الدفع"] = (pathCategories["الدفع"] || 0) + 1;
    else if (v.path.includes("/auth") || v.path.includes("/dealer-login")) pathCategories["صفحة التسجيل"] = (pathCategories["صفحة التسجيل"] || 0) + 1;
    else if (v.path === "/" || v.path === "") pathCategories["الرئيسية"] = (pathCategories["الرئيسية"] || 0) + 1;
    else pathCategories["صفحات أخرى"] = (pathCategories["صفحات أخرى"] || 0) + 1;
  });

  const topSearch = searches[0]?.search_query || null;
  const reachedCheckout = visits.some((v) => v.path.includes("/checkout"));
  const reachedCart = visits.some((v) => v.path.includes("/cart"));

  // Suggested action
  let suggestedAction = "ابدأ بتحية ودودة واسأله عن احتياجه";
  if (reachedCheckout) suggestedAction = "🔥 وصل للدفع — ساعده يكمّل الطلب فوراً";
  else if (reachedCart) suggestedAction = "🛒 ضاف للسلة — اقترح إنه يكمّل أو اعرض خصم";
  else if (topSearch) suggestedAction = `🔍 بحث عن "${topSearch}" — اعرض عليه السعر والتوافر`;
  else if (visits.length >= 5) suggestedAction = "👀 تصفّح كتير — اسأله عن السيارة بتاعته";

  const buildWhatsAppMsg = () => {
    let msg = `السلام عليكم، شكراً لاهتمامكم بالمصرية جروب لقطع غيار تويوتا.`;
    if (topSearch) msg += `\n\nشفت إنك بتدور على *${topSearch}*، تحب أساعدك أعرفك السعر والتوافر؟`;
    else if (reachedCart) msg += `\n\nلاحظت إن في منتجات في السلة، تحب أساعدك تكمّل طلبك؟`;
    else msg += `\n\nكيف يمكنني مساعدتك؟`;
    return encodeURIComponent(msg);
  };

  const sendWhatsApp = () => {
    const cleaned = lead.phone.startsWith("0") ? `2${lead.phone}` : lead.phone;
    window.open(`https://wa.me/${cleaned}?text=${buildWhatsAppMsg()}`, "_blank");
  };

  const copySummary = () => {
    const text = [
      `📞 ${lead.phone}`,
      `🌐 المصدر: ${lead.source || "مباشر"}`,
      `📅 وصل: ${fmtTime(lead.created_at)}`,
      `⏱️ مدة الجلسة: ${sessionDuration > 60 ? `${Math.floor(sessionDuration / 60)}د ${sessionDuration % 60}ث` : `${sessionDuration}ث`}`,
      `📄 صفحات شافها: ${visits.length}`,
      topSearch ? `🔍 أهم بحث: ${topSearch}` : null,
      reachedCheckout ? `🔥 وصل للدفع` : reachedCart ? `🛒 ضاف للسلة` : null,
      `💡 الإجراء: ${suggestedAction}`,
    ].filter(Boolean).join("\n");
    navigator.clipboard.writeText(text);
    toast({ title: "تم نسخ الملخص ✅" });
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent dir="rtl" side="left" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-primary" />
            ملخص زيارة العميل
          </SheetTitle>
          <SheetDescription className="flex items-center gap-2">
            <span className="font-mono text-base text-foreground" dir="ltr">{lead.phone}</span>
            <Button size="sm" variant="ghost" onClick={copySummary} className="h-7 gap-1">
              <Copy className="w-3 h-3" /> نسخ الملخص
            </Button>
          </SheetDescription>
        </SheetHeader>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">جاري التحميل...</div>
        ) : (
          <div className="mt-6 space-y-5">
            {/* Smart Action Card */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-2 border-primary/30"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="text-xs text-muted-foreground mb-1">الإجراء المقترح</div>
                  <p className="font-bold text-foreground">{suggestedAction}</p>
                </div>
              </div>
              <Button onClick={sendWhatsApp} className="w-full mt-3 bg-green-600 hover:bg-green-700">
                <Sparkles className="w-4 h-4 ml-2" /> ابعت رسالة واتساب جاهزة
              </Button>
            </motion.div>

            {/* Quick Stats */}
            <div className="grid grid-cols-4 gap-2">
              <StatCard icon="📄" value={visits.length} label="صفحة" />
              <StatCard icon="🔍" value={searches.length} label="بحث" />
              <StatCard icon="💰" value={priceViews.length} label="سعر شاف" />
              <StatCard
                icon="⏱️"
                value={sessionDuration > 60 ? `${Math.floor(sessionDuration / 60)}د` : `${sessionDuration}ث`}
                label="مدة"
              />
            </div>

            {/* Source / Entry */}
            <Section icon={<Globe className="w-4 h-4" />} title="معلومات الدخول">
              <Row label="المصدر" value={lead.source || "مباشر"} />
              <Row label="أول صفحة" value={lead.first_path || "—"} mono />
              <Row label="الإحالة (referrer)" value={lead.referrer || "—"} mono />
              <Row label="وقت ترك الرقم" value={fmtTime(lead.created_at)} />
            </Section>

            {/* Top categories */}
            {Object.keys(pathCategories).length > 0 && (
              <Section icon={<ShoppingBag className="w-4 h-4" />} title="نشاطه على الموقع">
                <div className="flex flex-wrap gap-2">
                  {Object.entries(pathCategories).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
                    <Badge key={k} variant="outline" className="bg-muted/50">{k} · {v}</Badge>
                  ))}
                </div>
              </Section>
            )}

            {/* Searches */}
            {searches.length > 0 && (
              <Section icon={<SearchIcon className="w-4 h-4" />} title={`عمليات البحث (${searches.length})`}>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {searches.slice(0, 15).map((s, i) => (
                    <div key={i} className="flex items-center justify-between text-sm bg-muted/30 px-3 py-1.5 rounded-lg">
                      <span className="font-medium">{s.search_query}</span>
                      <span className="text-xs text-muted-foreground">
                        {s.results_count ?? 0} نتيجة · {fmtTime(s.created_at)}
                      </span>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Price views */}
            {priceViews.length > 0 && (
              <Section icon={<span className="text-base">💰</span>} title={`منتجات شاف سعرها (${priceViews.length})`}>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {priceViews.slice(0, 15).map((p, i) => (
                    <div key={i} className="flex items-center justify-between text-sm bg-muted/30 px-3 py-1.5 rounded-lg">
                      <span className="font-medium truncate">{p.product_name}</span>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">{fmtTime(p.viewed_at)}</span>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Pages timeline */}
            {visits.length > 0 && (
              <Section icon={<FileText className="w-4 h-4" />} title={`الصفحات اللي زارها (${visits.length})`}>
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {visits.slice(-30).reverse().map((v, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs bg-muted/30 px-3 py-1.5 rounded-lg">
                      <Clock className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                      <code className="flex-1 truncate">{v.path}</code>
                      <span className="text-muted-foreground whitespace-nowrap">{fmtTime(v.visited_at)}</span>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {visits.length === 0 && searches.length === 0 && (
              <div className="text-center py-8 bg-muted/30 rounded-2xl">
                <div className="text-4xl mb-2">🤷</div>
                <p className="text-sm text-muted-foreground">لا توجد بيانات نشاط مرتبطة بهذا الزائر</p>
                <p className="text-xs text-muted-foreground mt-1">ربما ترك الرقم بسرعة قبل تصفح الموقع</p>
              </div>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

const StatCard = ({ icon, value, label }: { icon: string; value: number | string; label: string }) => (
  <div className="p-3 rounded-xl bg-card border border-border text-center">
    <div className="text-xl mb-0.5">{icon}</div>
    <div className="font-bold text-lg leading-none">{value}</div>
    <div className="text-[10px] text-muted-foreground mt-1">{label}</div>
  </div>
);

const Section = ({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) => (
  <div className="space-y-2">
    <div className="flex items-center gap-2 text-sm font-bold text-foreground">
      {icon} {title}
    </div>
    <div className="bg-card border border-border rounded-xl p-3">{children}</div>
  </div>
);

const Row = ({ label, value, mono }: { label: string; value: string; mono?: boolean }) => (
  <div className="flex items-start justify-between gap-3 text-sm py-1">
    <span className="text-muted-foreground text-xs">{label}</span>
    <span className={`text-foreground text-right ${mono ? "font-mono text-xs" : ""}`}>{value}</span>
  </div>
);

export default VisitorLeadActivitySheet;
