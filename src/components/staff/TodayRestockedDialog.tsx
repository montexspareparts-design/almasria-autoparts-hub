import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
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
  Plus,
  CheckCircle2,
} from "lucide-react";

const BRAND_OPTIONS: { value: string; label: string }[] = [
  { value: "toyota_genuine", label: "Toyota Genuine (أصلي)" },
  { value: "denso", label: "DENSO" },
  { value: "aisin", label: "AISIN" },
  { value: "fbk", label: "FBK" },
  { value: "toyota_oils", label: "Toyota Oils (زيوت)" },
];

interface ErpRestockedItem {
  erp_id: string;
  name: string;
  part_number: string | null;
  prev_qty: number;
  current_qty: number;
  delta: number;
  was_zero: boolean;
  is_new: boolean;
  retail_price: number | null;
  wholesale_price: number | null;
  in_our_system: boolean;
  our_product_id: string | null;
  had_shortage_request: boolean;
  shortage_requests_count: number;
  baseline_at: string | null;
  minutes_since_baseline: number | null;
}

interface BaselineStatus {
  has_baseline: boolean;
  last_snapshot_at: string | null;
  minutes_ago: number | null;
  items_in_baseline: number;
  last_batch_id: string | null;
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
  const { isAdmin } = useAuth();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<ErpRestockedItem[]>([]);
  const [baseline, setBaseline] = useState<BaselineStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [syncing, setSyncing] = useState(false);

  // Add-to-site dialog state (admin only)
  const [addTarget, setAddTarget] = useState<ErpRestockedItem | null>(null);
  const [addBrand, setAddBrand] = useState<string>("");
  const [addCategoryId, setAddCategoryId] = useState<string>("");
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [addedSkus, setAddedSkus] = useState<Set<string>>(new Set());
  const [categories, setCategories] = useState<{ id: string; name_ar: string }[]>([]);

  // Load categories once when admin opens
  useEffect(() => {
    if (!isAdmin || !open || categories.length > 0) return;
    supabase
      .from("product_categories")
      .select("id,name_ar")
      .order("name_ar")
      .then(({ data }) => setCategories((data as any) || []));
  }, [isAdmin, open, categories.length]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [{ data: itemsData, error: itemsError }, { data: baseData, error: baseError }] = await Promise.all([
        supabase.rpc("get_today_erp_restocked_items" as any),
        supabase.rpc("erp_intraday_baseline_status" as any),
      ]);

      if (itemsError) throw itemsError;
      if (baseError) throw baseError;

      setItems((itemsData as any) || []);
      const b = Array.isArray(baseData) ? baseData[0] : baseData;
      setBaseline((b as any) ?? null);
    } catch (e: any) {
      toast({
        title: "تعذّر تحميل بيانات الوصول",
        description: e?.message ?? "حصل خطأ أثناء جلب البيانات",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // الزر الرئيسي: مزامنة كاش الفيصل + (لو مفيش baseline) ناخد أول واحدة + مقارنة
  const handleSyncAndCheck = async () => {
    setSyncing(true);
    try {
      // 1) مزامنة فعلية لكاش الفيصل
      const { error: syncErr } = await supabase.functions.invoke("erp-search-products", {
        body: { refresh: true },
      });
      if (syncErr) console.warn("ERP refresh warning:", syncErr);

      // 2) لو مفيش baseline ناخد أول snapshot للفيصل
      if (!baseline?.has_baseline) {
        const { error: bErr } = await supabase.rpc("take_erp_intraday_baseline" as any);
        if (bErr) throw bErr;
        toast({
          title: "📸 اتسجلت نقطة المقارنة",
          description: "من اللحظة دي أي صنف رصيده يزيد في الفيصل هيظهر هنا.",
        });
      }

      // 3) reload
      await loadAll();

      toast({
        title: "✅ تمت المزامنة مع الفيصل",
        description: baseline?.has_baseline
          ? "تم تحديث الرصيد. الأصناف اللي زادت ظاهرة دلوقتي."
          : "تم حفظ النقطة. زود رصيد أي صنف في الفيصل واضغط الزر تاني.",
      });
    } catch (e: any) {
      toast({
        title: "⚠️ حصلت مشكلة",
        description: e?.message ?? "جرّب تاني بعد شوية",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  // إعادة تصفير نقطة المقارنة (snapshot جديد)
  const handleResetBaseline = async () => {
    setSyncing(true);
    try {
      const { error } = await supabase.rpc("take_erp_intraday_baseline" as any);
      if (error) throw error;
      toast({
        title: "✅ اتسجلت نقطة مقارنة جديدة",
        description: "هنرصد الزيادات من اللحظة دي.",
      });
      await loadAll();
    } catch (e: any) {
      toast({
        title: "تعذّر التصفير",
        description: e?.message ?? "حصل خطأ",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleAddToSite = async () => {
    if (!addTarget || !addBrand || !addCategoryId) return;
    setAddSubmitting(true);
    try {
      const { error } = await supabase.from("products").insert({
        sku: addTarget.erp_id,
        name_ar: addTarget.name,
        name_en: addTarget.name,
        brand: addBrand as any,
        category_id: addCategoryId,
        base_price: addTarget.retail_price ?? 0,
        wholesale_price: addTarget.wholesale_price ?? addTarget.retail_price ?? 0,
        stock_quantity: addTarget.current_qty,
        is_active: true,
      } as any);
      if (error) throw error;
      toast({
        title: "✅ تمت إضافة الصنف للموقع",
        description: `${addTarget.name} (${addTarget.erp_id})`,
      });
      setAddedSkus((prev) => new Set(prev).add(addTarget.erp_id));
      setAddTarget(null);
      setAddBrand("");
      setAddCategoryId("");
    } catch (e: any) {
      toast({
        title: "تعذّرت الإضافة",
        description: e?.message ?? "حصل خطأ",
        variant: "destructive",
      });
    } finally {
      setAddSubmitting(false);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) =>
        i.name?.toLowerCase().includes(q) ||
        i.erp_id?.toLowerCase().includes(q)
    );
  }, [items, search]);

  const total = items.length;
  const shortageCount = items.filter((i) => i.had_shortage_request).length;
  const newCount = items.filter((i) => i.is_new).length;

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
            وصل النهاردة من الفيصل
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-1">
            مقارنة لحظية مع كتالوج الفيصل — الأصناف اللي رصيدها زاد بعد آخر نقطة مقارنة.
          </DialogDescription>
          {baseline?.has_baseline && (
            <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1.5">
              <Clock className="w-3 h-3" />
              نقطة المقارنة: {fmtTime(baseline.last_snapshot_at)}
              {typeof baseline.minutes_ago === "number" && baseline.minutes_ago >= 0 && (
                <span className="text-amber-700">
                  (من {baseline.minutes_ago === 0 ? "أقل من دقيقة" : `${baseline.minutes_ago} دقيقة`})
                </span>
              )}
              {" • "}
              {baseline.items_in_baseline.toLocaleString("ar-EG")} صنف في الفيصل
            </p>
          )}
        </DialogHeader>

        {/* شريط الإجراءات */}
        <div className="p-3 border-b bg-amber-50/40 flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            onClick={handleSyncAndCheck}
            disabled={syncing}
            className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
          >
            {syncing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            {syncing ? "جاري المزامنة..." : "🔄 عرفني إيه اللي زاد دلوقتي"}
          </Button>

          {/* نقطة المقارنة بقت ثابتة طول اليوم — أي ضغطة على الزر الرئيسي بتقارن مع أول snapshot الصبح */}

          {total > 0 && (
            <div className="flex items-center gap-1.5 ms-1">
              <Badge className="bg-amber-600 text-white font-mono h-6 px-2">
                {total} صنف زاد
              </Badge>
              {newCount > 0 && (
                <Badge variant="outline" className="border-blue-400 text-blue-700 h-6 px-2">
                  {newCount} جديد
                </Badge>
              )}
              {shortageCount > 0 && (
                <Badge className="bg-rose-600 text-white gap-0.5 h-6 px-2">
                  <Flame className="w-3 h-3" />
                  {shortageCount} فرصة
                </Badge>
              )}
            </div>
          )}

          <div className="relative flex-1 min-w-[180px] ms-auto">
            <Search className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث باسم الصنف أو كود الفيصل..."
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

        {/* محتوى */}
        {loading ? (
          <div className="p-10 flex flex-col items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="w-6 h-6 animate-spin text-amber-600" />
            جاري التحميل...
          </div>
        ) : !baseline?.has_baseline ? (
          <div className="p-8 text-center text-sm">
            <PackageCheck className="w-10 h-10 text-amber-500 mx-auto mb-2" />
            <p className="font-bold text-amber-900 mb-1">لسه مفيش نقطة مقارنة للفيصل</p>
            <p className="text-muted-foreground text-xs leading-relaxed max-w-md mx-auto">
              اضغط <span className="font-bold text-emerald-700">"🔄 عرفني إيه اللي زاد دلوقتي"</span> فوق
              عشان نسحب آخر رصيد من الفيصل ونسجّل نقطة بداية. بعد كده أي صنف رصيده يزيد في الفيصل هيظهر هنا
              باسمه + كود الفيصل + الكمية.
            </p>
          </div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            <PackageCheck className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-60" />
            <p className="mb-2 font-semibold text-foreground">مفيش أصناف رصيدها زاد في الفيصل بعد آخر نقطة مقارنة.</p>
            <p className="text-xs">
              لو ضفت أصناف للفيصل دلوقتي، دوس{" "}
              <span className="font-bold text-emerald-700">"🔄 عرفني إيه اللي زاد دلوقتي"</span>
            </p>
          </div>
        ) : (
          <>
            <div dir="rtl" className="hidden sm:grid grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_90px_90px_90px_110px] gap-3 px-4 py-2 text-[11px] font-bold text-amber-900/80 bg-amber-100/60 border-b border-amber-200">
              <div className="text-right">اسم الصنف</div>
              <div>البارت نمبر</div>
              <div className="text-center">الكود</div>
              <div className="text-center">وصل</div>
              <div className="text-center">اجمالي الرصيد</div>
              <div className="text-center">{isAdmin ? "إجراء / حالة" : "الحالة"}</div>
            </div>
            <ScrollArea className="h-[440px]">
              <div className="divide-y divide-amber-100">
                {filtered.map((item) => {
                  const alreadyAdded = addedSkus.has(item.erp_id);
                  return (
                    <div
                      key={item.erp_id}
                      className={`grid grid-cols-1 sm:grid-cols-[120px_120px_minmax(0,1fr)_minmax(0,1.6fr)] gap-3 px-4 py-3 items-center transition-colors ${
                        item.had_shortage_request
                          ? "bg-rose-50/50 hover:bg-rose-100/60"
                          : "bg-white hover:bg-amber-50/60"
                      }`}
                    >
                      {/* عمود الإجراء/الحالة */}
                      <div className="flex sm:justify-center gap-1 flex-wrap">
                        {item.had_shortage_request && (
                          <Badge className="bg-rose-600 text-white text-[10px] px-2 py-0.5 h-auto gap-0.5">
                            <Flame className="w-3 h-3" /> فرصة
                          </Badge>
                        )}
                        {item.is_new ? (
                          <Badge variant="outline" className="text-[10px] px-2 py-0.5 h-auto border-blue-400 text-blue-700">
                            جديد على الفيصل
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
                        {/* زر إضافة للموقع — للأدمن فقط لو مش موجود عندنا */}
                        {isAdmin && !item.in_our_system && (
                          alreadyAdded ? (
                            <Badge className="bg-emerald-600 text-white text-[10px] gap-0.5 px-2 py-0.5 h-auto">
                              <CheckCircle2 className="w-3 h-3" /> اتضاف
                            </Badge>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => {
                                setAddTarget(item);
                                setAddBrand("");
                                setAddCategoryId("");
                              }}
                              className="h-6 px-1.5 gap-0.5 text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                              <Plus className="w-3 h-3" />
                              للموقع
                            </Button>
                          )
                        )}
                      </div>

                      {/* عمود الرصيد */}
                      <div className="text-center">
                        <span className="text-base font-extrabold text-emerald-700 font-mono">
                          {item.current_qty.toLocaleString("ar-EG")}
                        </span>
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          من <span className="font-bold text-rose-600">{item.prev_qty.toLocaleString("ar-EG")}</span>
                          <span className="mx-0.5 text-emerald-600 font-bold">+{item.delta.toLocaleString("ar-EG")}</span>
                        </div>
                      </div>

                      {/* عمود كود الفيصل */}
                      <div className="min-w-0" dir="ltr">
                        <span className="inline-block font-mono text-xs font-bold text-amber-950 bg-amber-100/70 px-2 py-1 rounded break-all tracking-wide">
                          {item.erp_id}
                        </span>
                      </div>

                      {/* عمود اسم الصنف */}
                      <div className="min-w-0 text-right">
                        <p className="text-sm font-semibold text-foreground leading-tight break-words">
                          {item.name}
                        </p>
                        {item.retail_price && (
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            قطاعي: {Number(item.retail_price).toLocaleString("ar-EG")} ج.م
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </>
        )}
      </DialogContent>

      {/* Admin: Add to site dialog */}
      <Dialog open={!!addTarget} onOpenChange={(o) => !o && setAddTarget(null)}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-800">
              <PackagePlus className="w-5 h-5" />
              إضافة الصنف للموقع
            </DialogTitle>
            <DialogDescription className="text-xs leading-relaxed">
              اختار الماركة والتصنيف المناسبين عشان يتعرض الصنف على الموقع للعملاء.
            </DialogDescription>
          </DialogHeader>

          {addTarget && (
            <div className="space-y-4 py-2">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-1">
                <p className="text-sm font-bold text-blue-950 leading-tight">{addTarget.name}</p>
                <div className="flex items-center gap-3 text-[11px] text-blue-800">
                  <span className="font-mono bg-blue-100 px-2 py-0.5 rounded" dir="ltr">{addTarget.erp_id}</span>
                  <span>الرصيد: <span className="font-bold text-emerald-700">{addTarget.current_qty}</span></span>
                  {addTarget.retail_price && (
                    <span>قطاعي: {Number(addTarget.retail_price).toLocaleString("ar-EG")} ج.م</span>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-bold">الماركة *</Label>
                <Select value={addBrand} onValueChange={setAddBrand}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="اختار الماركة..." />
                  </SelectTrigger>
                  <SelectContent>
                    {BRAND_OPTIONS.map((b) => (
                      <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-bold">التصنيف *</Label>
                <Select value={addCategoryId} onValueChange={setAddCategoryId}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="اختار التصنيف..." />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name_ar}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => setAddTarget(null)}
              disabled={addSubmitting}
            >
              إلغاء
            </Button>
            <Button
              onClick={handleAddToSite}
              disabled={!addBrand || !addCategoryId || addSubmitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
            >
              {addSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              {addSubmitting ? "جاري الإضافة..." : "أضف الصنف"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
