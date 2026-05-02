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

  const total = items.length;
  const shortageCount = items.filter((i) => i.had_shortage_request).length;

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
            {total > 0 && (
              <Badge className="bg-amber-600 text-white font-mono">
                {filtered.length}
                {filtered.length !== total && ` / ${total}`}
              </Badge>
            )}
            {shortageCount > 0 && (
              <Badge className="bg-rose-600 text-white gap-1">
                <Flame className="w-3 h-3" /> {shortageCount} فرص
              </Badge>
            )}
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

        {/* شريط الإجراءات */}
        <div className="p-3 border-b bg-amber-50/40 flex flex-wrap items-center gap-2">
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
              placeholder="ابحث باسم الصنف، البارت نمبر، الماركة..."
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
              بعد كده، أي صنف رصيده يزيد (سواء من المزامنة التلقائية أو إضافة يدوية) هيظهر هنا فوراً.
            </p>
          </div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            <p className="mb-2">مفيش أصناف رصيدها زاد بعد آخر نقطة مقارنة.</p>
            <p className="text-xs">
              المزامنة التلقائية للفيصل بتشتغل كل ساعة. ممكن تحدّث القائمة بعد شوية.
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

            <ScrollArea className="h-[450px]">
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
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {item.brand}
                        </p>
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
      </DialogContent>
    </Dialog>
  );
}
