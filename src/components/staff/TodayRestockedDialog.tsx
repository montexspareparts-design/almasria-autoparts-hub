import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Search,
  X,
  Loader2,
  RefreshCcw,
  Flame,
  Clock,
  PackageCheck,
  PackagePlus,
  AlertCircle,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface TodayRestockedItem {
  product_id: string;
  sku: string;
  name_ar: string;
  brand: string | null;
  prev_stock: number;
  current_stock: number;
  delta: number;
  was_zero: boolean;
  had_shortage_request: boolean;
  shortage_requests_count: number;
  base_price: number | null;
  baseline_at: string | null;
  minutes_since_baseline: number | null;
}

interface NewInErpItem {
  erp_id: string;
  name: string;
  qty: number;
  retail_price: number | null;
  wholesale_price: number | null;
  fetched_at: string;
  in_our_system: boolean;
  is_inactive: boolean;
  our_product_id: string | null;
  had_shortage_request: boolean;
  shortage_requests_count: number;
}

interface BaselineStatus {
  has_baseline: boolean;
  last_snapshot_at: string | null;
  minutes_ago: number | null;
  items_in_baseline: number;
}

function fmtTime(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("ar-EG", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

interface Props {
  triggerLabel?: string;
  variant?: "primary" | "ghost";
}

export default function TodayRestockedDialog({
  triggerLabel = "🔄 عرفني إيه اللي وصل النهاردة",
  variant = "primary",
}: Props) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<TodayRestockedItem[]>([]);
  const [newInErp, setNewInErp] = useState<NewInErpItem[]>([]);
  const [baseline, setBaseline] = useState<BaselineStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState<"restocked" | "new_in_erp">("restocked");

  const loadAll = async () => {
    setLoading(true);
    const [{ data: itemsData }, { data: baseData }, { data: erpData }] = await Promise.all([
      supabase.rpc("get_today_restocked_items" as any),
      supabase.rpc("intraday_baseline_status" as any),
      supabase.rpc("get_today_new_in_erp" as any),
    ]);
    setItems((itemsData as any) || []);
    setNewInErp((erpData as any) || []);
    const b = Array.isArray(baseData) ? baseData[0] : baseData;
    setBaseline((b as any) ?? null);
    setLoaded(true);
    setLoading(false);
  };

  useEffect(() => {
    if (!open || loaded) return;
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // أول مرة الموظف يضغط الزر — لو مفيش baseline أصلاً، نأخذ سنابشوت أولي + نفسّر
  const handleTakeBaseline = async () => {
    setRefreshing(true);
    try {
      const { error } = await supabase.rpc("take_intraday_stock_baseline" as any);
      if (error) throw error;
      toast({
        title: "✅ اتسجلت نقطة المقارنة",
        description: "هنرصد أي صنف رصيده يزيد من اللحظة دي. ارجع تاني بعد المزامنة الجاية للفيصل.",
      });
      await loadAll();
    } catch (e: any) {
      toast({
        title: "تعذّر التسجيل",
        description: e?.message ?? "حصل خطأ",
        variant: "destructive",
      });
    } finally {
      setRefreshing(false);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) =>
        i.name_ar?.toLowerCase().includes(q) ||
        i.sku?.toLowerCase().includes(q) ||
        i.brand?.toLowerCase().includes(q)
    );
  }, [items, search]);

  const filteredErp = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return newInErp;
    return newInErp.filter(
      (i) =>
        i.name?.toLowerCase().includes(q) ||
        i.erp_id?.toLowerCase().includes(q)
    );
  }, [newInErp, search]);

  const total = items.length;
  const erpTotal = newInErp.length;
  const shortageCount = items.filter((i) => i.had_shortage_request).length;
  const erpShortageCount = newInErp.filter((i) => i.had_shortage_request).length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant={variant === "primary" ? "default" : "outline"}
          className={
            variant === "primary"
              ? "bg-amber-600 hover:bg-amber-700 text-white gap-1.5 shadow-sm"
              : "gap-1.5 border-amber-300 text-amber-800 hover:bg-amber-50"
          }
        >
          <Sparkles className="w-4 h-4" />
          {triggerLabel}
        </Button>
      </DialogTrigger>

      <DialogContent dir="rtl" className="max-w-3xl p-0 overflow-hidden">
        <DialogHeader className="p-4 border-b bg-gradient-to-l from-amber-50 to-white">
          <DialogTitle className="flex items-center gap-2 text-amber-900">
            <Sparkles className="w-5 h-5 text-amber-600" />
            وصل النهاردة (مزامنة لحظية)
          </DialogTitle>
          {baseline?.has_baseline && (
            <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1.5">
              <Clock className="w-3 h-3" />
              نقطة المقارنة الحالية: {fmtTime(baseline.last_snapshot_at)}
              {typeof baseline.minutes_ago === "number" && baseline.minutes_ago >= 0 && (
                <span className="text-amber-700">
                  (من {baseline.minutes_ago === 0 ? "أقل من دقيقة" : `${baseline.minutes_ago} دقيقة`})
                </span>
              )}
              {" • "}
              {baseline.items_in_baseline} صنف في الـ baseline
            </p>
          )}
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="w-full">
          <TabsList className="w-full justify-start rounded-none border-b bg-amber-50/30 h-auto p-0 gap-0">
            <TabsTrigger
              value="restocked"
              className="gap-1.5 data-[state=active]:bg-amber-100 data-[state=active]:text-amber-900 rounded-none border-b-2 border-transparent data-[state=active]:border-amber-600 px-4 py-2.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              زاد رصيدها على الموقع
              {total > 0 && (
                <Badge className="bg-amber-600 text-white font-mono ms-1 h-5 px-1.5 text-[10px]">{total}</Badge>
              )}
              {shortageCount > 0 && (
                <Badge className="bg-rose-600 text-white gap-0.5 ms-1 h-5 px-1.5 text-[10px]">
                  <Flame className="w-2.5 h-2.5" />{shortageCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="new_in_erp"
              className="gap-1.5 data-[state=active]:bg-amber-100 data-[state=active]:text-amber-900 rounded-none border-b-2 border-transparent data-[state=active]:border-amber-600 px-4 py-2.5"
            >
              <PackagePlus className="w-3.5 h-3.5" />
              في الفيصل (مش على الموقع)
              {erpTotal > 0 && (
                <Badge className="bg-blue-600 text-white font-mono ms-1 h-5 px-1.5 text-[10px]">{erpTotal}</Badge>
              )}
              {erpShortageCount > 0 && (
                <Badge className="bg-rose-600 text-white gap-0.5 ms-1 h-5 px-1.5 text-[10px]">
                  <Flame className="w-2.5 h-2.5" />{erpShortageCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* شريط الإجراءات */}
          <div className="p-3 border-b bg-amber-50/40 flex flex-wrap items-center gap-2">
            {tab === "restocked" && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleTakeBaseline}
                disabled={refreshing}
                className="gap-1.5 border-amber-300 text-amber-900 hover:bg-amber-100"
              >
                {refreshing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RefreshCcw className="w-3.5 h-3.5" />
                )}
                {baseline?.has_baseline ? "حدّث نقطة المقارنة" : "ابدأ المقارنة"}
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={loadAll}
              disabled={loading}
              className="gap-1.5"
            >
              <RefreshCcw className="w-3.5 h-3.5" />
              تحديث القائمة
            </Button>

            <div className="relative flex-1 min-w-[180px] ms-auto">
              <Search className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ابحث باسم الصنف، البارت نمبر..."
                className="pr-9 pl-8 h-9 text-sm"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="مسح"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* TAB: Restocked على الموقع */}
          <TabsContent value="restocked" className="m-0">
            {loading ? (
              <div className="p-10 flex flex-col items-center gap-2 text-muted-foreground text-sm">
                <Loader2 className="w-6 h-6 animate-spin text-amber-600" />
                جاري التحميل...
              </div>
            ) : !baseline?.has_baseline ? (
              <div className="p-8 text-center text-sm">
                <PackageCheck className="w-10 h-10 text-amber-500 mx-auto mb-2" />
                <p className="font-bold text-amber-900 mb-1">لسه مفيش نقطة مقارنة</p>
                <p className="text-muted-foreground text-xs leading-relaxed max-w-md mx-auto">
                  اضغط <span className="font-bold text-amber-700">"ابدأ المقارنة"</span> دلوقتي عشان نسجّل صورة لرصيد كل الأصناف.
                  بعد كده، أي صنف رصيده يزيد هيظهر هنا فوراً.
                </p>
                <p className="text-[11px] text-blue-700 mt-3">
                  💡 لو الصنف لسه مش على الموقع، شوف تبويب <span className="font-bold">"في الفيصل (مش على الموقع)"</span>
                </p>
              </div>
            ) : items.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                <p className="mb-2">مفيش أصناف رصيدها زاد بعد آخر نقطة مقارنة.</p>
                <p className="text-xs">المزامنة التلقائية للفيصل بتشتغل كل ساعة.</p>
                <p className="text-[11px] text-blue-700 mt-3">
                  💡 شوف تبويب <span className="font-bold">"في الفيصل (مش على الموقع)"</span> لو ضفت صنف جديد على الفيصل
                </p>
              </div>
            ) : (
              <>
                <div className="hidden sm:grid grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_110px_90px] gap-3 px-4 py-2 text-[11px] font-bold text-amber-900/80 bg-amber-100/60 border-b border-amber-200">
                  <div>اسم الصنف</div>
                  <div>البارت نمبر</div>
                  <div className="text-center">الرصيد الجديد</div>
                  <div className="text-center">الحالة</div>
                </div>
                <ScrollArea className="h-[420px]">
                  <div className="divide-y divide-amber-100">
                    {filtered.map((item) => (
                      <div
                        key={item.product_id}
                        className={`grid grid-cols-1 sm:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_110px_90px] gap-3 px-4 py-3 items-center transition-colors ${
                          item.had_shortage_request
                            ? "bg-rose-50/50 hover:bg-rose-100/60"
                            : "bg-white hover:bg-amber-50/60"
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground leading-tight break-words">
                            {item.name_ar}
                          </p>
                          {item.brand && (
                            <p className="text-[10px] text-muted-foreground mt-0.5">{item.brand}</p>
                          )}
                        </div>
                        <div className="min-w-0" dir="ltr">
                          <span className="inline-block font-mono text-xs font-bold text-amber-950 bg-amber-100/70 px-2 py-1 rounded break-all tracking-wide">
                            {item.sku}
                          </span>
                        </div>
                        <div className="text-center">
                          <span className="text-base font-extrabold text-emerald-700 font-mono">
                            {item.current_stock}
                          </span>
                          <div className="text-[10px] text-muted-foreground mt-0.5">
                            من <span className="font-bold text-rose-600">{item.prev_stock}</span>
                            <span className="mx-0.5">+{item.delta}</span>
                          </div>
                        </div>
                        <div className="flex sm:justify-center">
                          {item.had_shortage_request ? (
                            <Badge className="bg-rose-600 hover:bg-rose-700 text-white text-[10px] px-2 py-0.5 h-auto gap-0.5">
                              <Flame className="w-3 h-3" /> فرصة
                            </Badge>
                          ) : item.was_zero ? (
                            <Badge variant="secondary" className="bg-amber-100 text-amber-800 text-[10px] px-2 py-0.5 h-auto">
                              رجع متاح
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] px-2 py-0.5 h-auto">
                              +{item.delta}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </>
            )}
          </TabsContent>

          {/* TAB: New in ERP */}
          <TabsContent value="new_in_erp" className="m-0">
            {loading ? (
              <div className="p-10 flex flex-col items-center gap-2 text-muted-foreground text-sm">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                جاري التحميل...
              </div>
            ) : newInErp.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                <PackagePlus className="w-10 h-10 text-blue-400 mx-auto mb-2" />
                <p className="font-bold text-blue-900 mb-1">كل أصناف الفيصل المتاحة موجودة على الموقع</p>
                <p className="text-xs">مفيش أصناف جديدة في الفيصل لسه مش مضافة عندنا.</p>
              </div>
            ) : (
              <>
                <div className="px-4 py-2 bg-blue-50 border-b border-blue-200 text-[11px] text-blue-900 flex items-start gap-2">
                  <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  <span>
                    دي أصناف موجودة في الفيصل برصيد متاح، بس <span className="font-bold">لسه مش معروضة على الموقع</span> (محتاجة إضافة من الإدارة). لو فيه عميل بيطلبها، سجّل بلاغ نقص.
                  </span>
                </div>
                <div className="hidden sm:grid grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)_90px_120px] gap-3 px-4 py-2 text-[11px] font-bold text-blue-900/80 bg-blue-100/60 border-b border-blue-200">
                  <div>اسم الصنف</div>
                  <div>كود الفيصل</div>
                  <div className="text-center">الرصيد</div>
                  <div className="text-center">الحالة</div>
                </div>
                <ScrollArea className="h-[400px]">
                  <div className="divide-y divide-blue-100">
                    {filteredErp.map((item) => (
                      <div
                        key={item.erp_id}
                        className={`grid grid-cols-1 sm:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)_90px_120px] gap-3 px-4 py-3 items-center transition-colors ${
                          item.had_shortage_request
                            ? "bg-rose-50/50 hover:bg-rose-100/60"
                            : "bg-white hover:bg-blue-50/60"
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground leading-tight break-words">
                            {item.name}
                          </p>
                          {item.retail_price && (
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              قطاعي: {Number(item.retail_price).toLocaleString("ar-EG")} ج.م
                            </p>
                          )}
                        </div>
                        <div className="min-w-0" dir="ltr">
                          <span className="inline-block font-mono text-xs font-bold text-blue-950 bg-blue-100/70 px-2 py-1 rounded break-all tracking-wide">
                            {item.erp_id}
                          </span>
                        </div>
                        <div className="text-center">
                          <span className="text-base font-extrabold text-emerald-700 font-mono">
                            {item.qty}
                          </span>
                        </div>
                        <div className="flex sm:justify-center gap-1 flex-wrap">
                          {item.had_shortage_request && (
                            <Badge className="bg-rose-600 text-white text-[10px] px-2 py-0.5 h-auto gap-0.5">
                              <Flame className="w-3 h-3" /> فرصة
                            </Badge>
                          )}
                          {item.is_inactive ? (
                            <Badge variant="outline" className="text-[10px] px-2 py-0.5 h-auto border-orange-300 text-orange-700">
                              غير مفعّل
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] px-2 py-0.5 h-auto border-blue-300 text-blue-700">
                              جديد على الفيصل
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
