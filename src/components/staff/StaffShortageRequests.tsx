import { useEffect, useMemo, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Plus, Search, Package, Loader2, AlertTriangle, CheckCircle2, Clock,
  XCircle, RefreshCw, Trash2, PackageX, Sparkles, PartyPopper,
} from "lucide-react";
import { cn } from "@/lib/utils";

type StatusKey = "open" | "sourcing" | "fulfilled" | "rejected";

interface ShortageRow {
  id: string;
  product_id: string | null;
  manual_sku: string | null;
  manual_name: string | null;
  requested_quantity: number;
  customer_note: string | null;
  status: StatusKey;
  admin_response: string | null;
  created_at: string;
  reviewed_at: string | null;
  product?: { sku: string; name_ar: string } | null;
}

interface ProductSuggest {
  id: string;
  sku: string;
  name_ar: string;
  stock_quantity: number;
}

// نتيجة بحث من كتالوج الفيصل الكامل (12 ألف صنف)
interface ErpSuggest {
  erp_id: string;
  name: string;
  qty: number;
  retail_price: number | null;
  wholesale_price: number | null;
  in_our_system: boolean;
  our_product_id: string | null;
}

const STATUS_META: Record<StatusKey, { label: string; color: string; icon: typeof Clock }> = {
  open:      { label: "مفتوح",       color: "bg-amber-100 text-amber-700 border-amber-300",    icon: Clock },
  sourcing:  { label: "جارٍ التوفير", color: "bg-sky-100 text-sky-700 border-sky-300",          icon: RefreshCw },
  fulfilled: { label: "تم التوفير",  color: "bg-emerald-100 text-emerald-700 border-emerald-300", icon: CheckCircle2 },
  rejected:  { label: "مرفوض",       color: "bg-rose-100 text-rose-700 border-rose-300",        icon: XCircle },
};

export default function StaffShortageRequests() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rows, setRows] = useState<ShortageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<StatusKey | "all">("open");
  const [todayOnly, setTodayOnly] = useState(false);

  // Add dialog state
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"catalog" | "manual">("catalog");
  const [search, setSearch] = useState("");
  const [suggestions, setSuggestions] = useState<ProductSuggest[]>([]);
  const [erpSuggestions, setErpSuggestions] = useState<ErpSuggest[]>([]);
  const [searchingErp, setSearchingErp] = useState(false);
  const [erpSearchError, setErpSearchError] = useState<string | null>(null);
  const [erpCacheInfo, setErpCacheInfo] = useState<{ last_synced_at?: string; total_items?: number } | null>(null);
  const [chosen, setChosen] = useState<ProductSuggest | null>(null);
  const [chosenErp, setChosenErp] = useState<ErpSuggest | null>(null);
  const [manualSku, setManualSku] = useState("");
  const [manualName, setManualName] = useState("");
  const [qty, setQty] = useState(1);
  const [customerNote, setCustomerNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchRows = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("stock_shortage_requests" as any)
      .select("id,product_id,manual_sku,manual_name,requested_quantity,customer_note,status,admin_response,created_at,reviewed_at,product:products(sku,name_ar)")
      .eq("staff_user_id", user.id)
      .order("created_at", { ascending: false });
    if (!error) setRows((data as any) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  // Realtime updates
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel("staff-shortage-" + user.id)
      .on("postgres_changes", { event: "*", schema: "public", table: "stock_shortage_requests", filter: `staff_user_id=eq.${user.id}` }, () => fetchRows())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, fetchRows]);

  // جلب رصيد الفيصل الحالي للأصناف اللي عندها بلاغات مفتوحة (open/sourcing)
  const [erpStockMap, setErpStockMap] = useState<Record<string, number>>({});
  const [erpStockFetchedAt, setErpStockFetchedAt] = useState<string | null>(null);
  useEffect(() => {
    const openRows = rows.filter(r => r.status === "open" || r.status === "sourcing");
    if (openRows.length === 0) { setErpStockMap({}); return; }
    const skus = Array.from(new Set(
      openRows.map(r => (r.manual_sku || r.product?.sku || "").trim()).filter(Boolean)
    ));
    if (skus.length === 0) return;
    (async () => {
      const { data } = await supabase
        .from("erp_full_catalog_cache" as any)
        .select("erp_id, qty, fetched_at")
        .in("erp_id", skus);
      const map: Record<string, number> = {};
      let latest: string | null = null;
      (data || []).forEach((r: any) => {
        map[r.erp_id] = Number(r.qty || 0);
        if (!latest || r.fetched_at > latest) latest = r.fetched_at;
      });
      setErpStockMap(map);
      setErpStockFetchedAt(latest);
    })();
  }, [rows]);

  // مزامنة يدوية: الموظف يقدر يدوس "افحص دلوقتي" بدل ما يستنى الساعة الجاية
  const [manualSyncing, setManualSyncing] = useState(false);
  const runManualSync = useCallback(async () => {
    if (manualSyncing) return;
    setManualSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("auto-fulfill-shortages-from-erp", { body: {} });
      if (error) throw error;
      const fulfilled = Number((data as any)?.fulfilled_count ?? (data as any)?.fulfilled ?? 0);
      const checked   = Number((data as any)?.checked_count   ?? (data as any)?.checked   ?? 0);
      if (fulfilled > 0) {
        toast({
          title: `🎉 تم توفير ${fulfilled} صنف!`,
          description: "البلاغات اتنقلت لـ«تم التوفير» — اتفرج على القائمة.",
        });
      } else {
        toast({
          title: "✓ تمت المزامنة",
          description: checked > 0
            ? `اتفحص ${checked} بلاغ — لسه مفيش رصيد كافي في الفيصل.`
            : "مفيش بلاغات مفتوحة محتاجة فحص دلوقتي.",
        });
      }
      // أعِد جلب البلاغات وكاش الفيصل
      await fetchRows();
    } catch (e: any) {
      toast({
        title: "تعذّر تشغيل المزامنة",
        description: e?.message || "حاول تاني بعد شوية",
        variant: "destructive",
      });
    } finally {
      setManualSyncing(false);
    }
  }, [manualSyncing, toast, fetchRows]);

  // Search products (debounced) — يبحث بالتوازي في:
  //   1) أصناف السيستم (الـ 422 المعروضين للتجار) عبر RPC
  //   2) كل أصناف الفيصل (~12 ألف) عبر edge function مع كاش ساعة
  useEffect(() => {
    if (!user || mode !== "catalog" || search.trim().length < 2) {
      setSuggestions([]); setErpSuggestions([]); setSearchingErp(false); setErpSearchError(null);
      return;
    }
    const t = setTimeout(async () => {
      const q = search.trim();
      setSearchingErp(true);
      setErpSearchError(null);

      // بحث متوازي: السيستم + الفيصل
      const [systemRes, erpRes] = await Promise.all([
        supabase.rpc("search_all_products_for_shortage" as any, { _q: q }),
        supabase.functions.invoke("erp-search-products", { body: { q } }),
      ]);

      // أصناف السيستم
      if (systemRes.error) {
        const { data: fb } = await supabase
          .from("products")
          .select("id,sku,name_ar,stock_quantity")
          .or(`sku.ilike.%${q}%,name_ar.ilike.%${q}%`)
          .limit(15);
        setSuggestions((fb as any) || []);
      } else {
        setSuggestions((systemRes.data as any) || []);
      }

      // أصناف الفيصل — نعرض الكتالوج بالكامل للموظف حتى لو الصنف موجود عندنا بالفعل
      if (erpRes.data?.success) {
        const all = (erpRes.data.results || []) as ErpSuggest[];
        setErpSuggestions(all);
        setErpCacheInfo(erpRes.data.cache || null);
      } else {
        setErpSuggestions([]);
        setErpSearchError(erpRes.error?.message || erpRes.data?.error || "تعذر تحميل نتائج كتالوج الفيصل حالياً");
      }
      setSearchingErp(false);
    }, 350);
    return () => clearTimeout(t);
  }, [search, mode, user]);

  const counts = useMemo(() => {
    const c: Record<StatusKey | "all", number> = { all: rows.length, open: 0, sourcing: 0, fulfilled: 0, rejected: 0 };
    rows.forEach(r => { c[r.status] = (c[r.status] || 0) + 1; });
    return c;
  }, [rows]);

  const totalRequestedQty = useMemo(() => rows.reduce((s, r) => s + (r.requested_quantity || 0), 0), [rows]);
  const openQty = useMemo(() => rows.filter(r => r.status === "open" || r.status === "sourcing").reduce((s, r) => s + r.requested_quantity, 0), [rows]);

  // فلترة بتاريخ النهاردة (محلياً) لو اتفعّلت
  const todayKey = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD محلي
  const isToday = (iso: string) => new Date(iso).toLocaleDateString("en-CA") === todayKey;

  const todayCount = useMemo(() => rows.filter(r => isToday(r.created_at)).length, [rows, todayKey]);

  const filtered = useMemo(() => {
    let list = rows;
    if (todayOnly) list = list.filter(r => isToday(r.created_at));
    if (activeTab === "all") return list;
    return list.filter(r => r.status === activeTab);
  }, [rows, activeTab, todayOnly, todayKey]);

  // الأصناف المتوفرة حديثاً (آخر 14 يوم) — تظهر في بانر بارز فوق
  const recentlyFulfilled = useMemo(() => {
    const cutoff = Date.now() - 14 * 24 * 60 * 60 * 1000;
    return rows
      .filter(r => r.status === "fulfilled" && r.reviewed_at && new Date(r.reviewed_at).getTime() >= cutoff)
      .sort((a, b) => new Date(b.reviewed_at!).getTime() - new Date(a.reviewed_at!).getTime());
  }, [rows]);

  // الأصناف المتوفرة الجديدة اللي الموظف لسه ما شافهاش (تتسجل في localStorage)
  const seenKey = user ? `shortage_seen_fulfilled_${user.id}` : "shortage_seen_fulfilled";
  const newlyFulfilled = useMemo(() => {
    if (typeof window === "undefined") return [];
    try {
      const seen = new Set(JSON.parse(localStorage.getItem(seenKey) || "[]"));
      return recentlyFulfilled.filter(r => !seen.has(r.id));
    } catch { return recentlyFulfilled; }
  }, [recentlyFulfilled, seenKey]);

  const markAllSeen = useCallback(() => {
    if (typeof window === "undefined") return;
    const ids = recentlyFulfilled.map(r => r.id);
    localStorage.setItem(seenKey, JSON.stringify(ids));
  }, [recentlyFulfilled, seenKey]);

  const resetForm = () => {
    setMode("catalog"); setSearch(""); setChosen(null); setChosenErp(null);
    setSuggestions([]); setErpSuggestions([]);
    setManualSku(""); setManualName(""); setQty(1); setCustomerNote("");
  };

  const handleSubmit = async () => {
    if (!user) return;
    if (mode === "catalog" && !chosen && !chosenErp) {
      toast({ title: "اختر صنف من الكتالوج أو من الفيصل أولاً", variant: "destructive" });
      return;
    }
    if (mode === "manual" && (!manualSku.trim() || !manualName.trim())) {
      toast({ title: "أدخل اسم ورقم الصنف", variant: "destructive" });
      return;
    }
    if (qty < 1) { toast({ title: "الكمية لازم تكون 1 على الأقل", variant: "destructive" }); return; }

    setSubmitting(true);
    const payload: any = {
      staff_user_id: user.id,
      requested_quantity: qty,
      customer_note: customerNote.trim() || null,
    };
    if (mode === "catalog" && chosen) {
      // صنف موجود في السيستم
      payload.product_id = chosen.id;
    } else if (mode === "catalog" && chosenErp) {
      // نتيجة من كتالوج الفيصل: لو مربوطة بصنف داخل النظام نربطها مباشرة، وإلا نسجلها يدوي
      if (chosenErp.in_our_system && chosenErp.our_product_id) {
        payload.product_id = chosenErp.our_product_id;
      } else {
        payload.manual_sku = chosenErp.erp_id;
        payload.manual_name = chosenErp.name;
      }
    } else {
      payload.manual_sku = manualSku.trim();
      payload.manual_name = manualName.trim();
    }
    const { error } = await supabase.from("stock_shortage_requests" as any).insert(payload);
    setSubmitting(false);
    if (error) {
      toast({ title: "فشل الإرسال", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "✅ تم تسجيل البلاغ — هيوصل للإدارة دلوقتي" });
    resetForm();
    setOpen(false);
    fetchRows();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("stock_shortage_requests" as any).delete().eq("id", id);
    if (error) {
      toast({ title: "تعذّر الحذف", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "تم حذف البلاغ" });
      fetchRows();
    }
  };

  // إعادة طلب صنف مرفوض — يُنشئ بلاغ جديد بنفس بيانات القديم
  const [resubmittingId, setResubmittingId] = useState<string | null>(null);
  const handleResubmit = async (row: ShortageRow) => {
    if (!user) return;
    setResubmittingId(row.id);
    const payload: any = {
      staff_user_id: user.id,
      requested_quantity: row.requested_quantity,
      customer_note: row.customer_note,
    };
    if (row.product_id) {
      payload.product_id = row.product_id;
    } else {
      payload.manual_sku = row.manual_sku;
      payload.manual_name = row.manual_name;
    }
    const { error } = await supabase.from("stock_shortage_requests" as any).insert(payload);
    setResubmittingId(null);
    if (error) {
      toast({ title: "تعذّر إعادة الطلب", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "✅ تم إعادة الطلب — هيتراجع من جديد" });
      fetchRows();
    }
  };

  return (
    <Card className="p-5 space-y-5 bg-gradient-to-br from-background to-muted/30 border-2">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-rose-500 flex items-center justify-center shadow-md">
            <PackageX className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-foreground">الأصناف الناقصة المطلوبة</h3>
            <p className="text-xs text-muted-foreground">
              سجّل أي صنف عميل سأل عليه ومكنش متوفر — هتطلع للإدارة بأهميتها
            </p>
          </div>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-gradient-to-r from-amber-500 to-rose-500 hover:opacity-90">
              <Plus className="w-4 h-4" />
              بلّغ عن صنف ناقص
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg" dir="rtl">
            <DialogHeader>
              <DialogTitle>تسجيل صنف ناقص</DialogTitle>
            </DialogHeader>

            <Tabs value={mode} onValueChange={(v) => setMode(v as any)}>
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="catalog">من الكتالوج</TabsTrigger>
                <TabsTrigger value="manual">إدخال يدوي</TabsTrigger>
              </TabsList>

              <TabsContent value="catalog" className="space-y-3 pt-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label>ابحث في كل أصناف الفيصل (~12 ألف صنف)</Label>
                    {erpCacheInfo?.total_items ? (
                      <span className="text-[10px] text-muted-foreground">
                        كاش: {erpCacheInfo.total_items.toLocaleString("ar-EG")} صنف
                      </span>
                    ) : null}
                  </div>
                  <div className="relative">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      value={search}
                      onChange={(e) => { setSearch(e.target.value); setChosen(null); setChosenErp(null); }}
                      placeholder="مثال: فلتر زيت أو 90915..."
                      className="pr-9"
                      dir="rtl"
                    />
                    {searchingErp && (
                      <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                    )}
                  </div>
                </div>

                {chosen ? (
                  <div className="border-2 border-emerald-300 bg-emerald-50 rounded-lg p-3 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-emerald-900 truncate">{chosen.name_ar}</p>
                      <p className="text-xs text-emerald-700 font-mono" dir="ltr">{chosen.sku}</p>
                      <p className="text-[11px] text-emerald-700 mt-0.5">رصيد حالي: {chosen.stock_quantity} • صنف على الموقع</p>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => { setChosen(null); setSearch(""); }}>تغيير</Button>
                  </div>
                ) : chosenErp ? (
                  <div className="border-2 border-blue-300 bg-blue-50 rounded-lg p-3 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-blue-900 truncate">{chosenErp.name}</p>
                      <p className="text-xs text-blue-700 font-mono" dir="ltr">{chosenErp.erp_id}</p>
                      <p className="text-[11px] text-blue-700 mt-0.5">
                        من الفيصل • رصيد: {chosenErp.qty}
                        {chosenErp.in_our_system ? " • مربوط بصنف موجود على الموقع" : " • غير معروض على الموقع"}
                      </p>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => { setChosenErp(null); setSearch(""); }}>تغيير</Button>
                  </div>
                ) : (suggestions.length > 0 || erpSuggestions.length > 0) ? (
                  <ScrollArea className="h-64 border rounded-lg">
                    <div className="p-1 space-y-1">
                      {/* قسم 1: أصناف معروضة على الموقع */}
                      {suggestions.length > 0 && (
                        <>
                          <div className="px-2 py-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 rounded sticky top-0">
                            🟢 أصناف معروضة على الموقع ({suggestions.length})
                          </div>
                          {suggestions.map(s => (
                            <button
                              key={s.id}
                              onClick={() => { setChosen(s); setChosenErp(null); setSearch(s.name_ar); setSuggestions([]); setErpSuggestions([]); }}
                              className="w-full text-right p-2 rounded hover:bg-emerald-50 transition-colors"
                            >
                              <p className="text-sm font-medium text-foreground truncate">{s.name_ar}</p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span dir="ltr" className="font-mono">{s.sku}</span>
                                <span>•</span>
                                <span className={s.stock_quantity > 0 ? "text-emerald-600" : "text-rose-600 font-semibold"}>
                                  {s.stock_quantity > 0 ? `متاح: ${s.stock_quantity}` : "غير متوفر"}
                                </span>
                              </div>
                            </button>
                          ))}
                        </>
                      )}

                      {/* قسم 2: أصناف من كتالوج الفيصل بالكامل */}
                      {erpSuggestions.length > 0 && (
                        <>
                          <div className="px-2 py-1 text-[10px] font-bold text-blue-700 bg-blue-50 rounded sticky top-0 mt-2">
                            🔵 من كتالوج الفيصل بالكامل ({erpSuggestions.length})
                          </div>
                          {erpSuggestions.map(s => (
                            <button
                              key={s.erp_id}
                              onClick={() => { setChosenErp(s); setChosen(null); setSearch(s.name); setSuggestions([]); setErpSuggestions([]); }}
                              className="w-full text-right p-2 rounded hover:bg-blue-50 transition-colors"
                            >
                              <p className="text-sm font-medium text-foreground truncate">{s.name}</p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span dir="ltr" className="font-mono">{s.erp_id}</span>
                                <span>•</span>
                                <span className={s.qty > 0 ? "text-emerald-600" : "text-rose-600 font-semibold"}>
                                  {s.qty > 0 ? `متاح بالفيصل: ${s.qty}` : "غير متوفر بالفيصل"}
                                </span>
                                {s.in_our_system && (
                                  <>
                                    <span>•</span>
                                    <span className="text-emerald-700 font-semibold">موجود كمان على الموقع</span>
                                  </>
                                )}
                              </div>
                            </button>
                          ))}
                        </>
                      )}
                    </div>
                  </ScrollArea>
                ) : erpSearchError ? (
                  <p className="text-xs text-rose-600 text-center py-3">{erpSearchError}</p>
                ) : search.trim().length >= 2 && !searchingErp ? (
                  <p className="text-xs text-muted-foreground text-center py-3">مفيش نتائج لا في السيستم ولا في الفيصل — جرّب الإدخال اليدوي</p>
                ) : null}
              </TabsContent>

              <TabsContent value="manual" className="space-y-3 pt-3">
                <div className="space-y-1.5">
                  <Label>اسم الصنف *</Label>
                  <Input value={manualName} onChange={(e) => setManualName(e.target.value)} placeholder="مثال: مساعد أمامي راف 4 موديل 2015" dir="rtl" />
                </div>
                <div className="space-y-1.5">
                  <Label>رقم الصنف / SKU *</Label>
                  <Input value={manualSku} onChange={(e) => setManualSku(e.target.value)} placeholder="مثال: 48510-09L60" dir="ltr" className="font-mono" />
                </div>
              </TabsContent>
            </Tabs>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="space-y-1.5">
                <Label>الكمية المطلوبة *</Label>
                <Input type="number" min={1} value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))} dir="ltr" />
              </div>
              <div className="space-y-1.5">
                <Label>اسم/رقم العميل (اختياري)</Label>
                <Input value={customerNote} onChange={(e) => setCustomerNote(e.target.value)} placeholder="مثال: ورشة محمد" dir="rtl" />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => { setOpen(false); resetForm(); }}>إلغاء</Button>
              <Button onClick={handleSubmit} disabled={submitting} className="gap-2">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                إرسال البلاغ
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatChip label="إجمالي البلاغات" value={rows.length} color="from-slate-500 to-slate-700" />
        <StatChip label="إجمالي الكميات" value={totalRequestedQty} color="from-blue-500 to-indigo-600" />
        <StatChip label="مفتوح/جارٍ التوفير" value={counts.open + counts.sourcing} color="from-amber-500 to-orange-600" />
        <StatChip label="كميات مفتوحة" value={openQty} color="from-rose-500 to-red-600" />
      </div>

      {/* 🎉 بانر الأصناف اللي تم توفيرها حديثاً (آخر 14 يوم) — يظهر بشكل بارز فوق التبويبات */}
      {recentlyFulfilled.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 p-4 shadow-sm"
        >
          {/* Decoration */}
          <div className="absolute -top-8 -right-8 w-32 h-32 bg-emerald-300/20 rounded-full blur-2xl" />
          <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-teal-300/20 rounded-full blur-2xl" />

          <div className="relative flex items-start justify-between gap-3 mb-3 flex-wrap">
            <div className="flex items-center gap-3">
              <motion.div
                animate={{ rotate: [0, -10, 10, -10, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 3 }}
                className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md"
              >
                <PartyPopper className="w-5 h-5 text-white" />
              </motion.div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-bold text-emerald-900">أصناف تم توفيرها على الفيصل</h4>
                  {newlyFulfilled.length > 0 && (
                    <motion.span
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 1.2, repeat: Infinity }}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-bold shadow-sm"
                    >
                      <Sparkles className="w-3 h-3" />
                      {newlyFulfilled.length} جديد
                    </motion.span>
                  )}
                </div>
                <p className="text-[11px] text-emerald-700 mt-0.5">
                  المزامنة مع الفيصل كل ساعة — اتصل بالعميل وبشّره
                </p>
              </div>
            </div>
            {newlyFulfilled.length > 0 && (
              <Button
                size="sm" variant="outline"
                onClick={markAllSeen}
                className="h-7 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-100"
              >
                <CheckCircle2 className="w-3.5 h-3.5 ml-1" />
                علّم كمشاهد
              </Button>
            )}
          </div>

          <ScrollArea className="relative max-h-[200px]">
            <div className="space-y-1.5 pr-1">
              {recentlyFulfilled.slice(0, 10).map((row) => {
                const isNew = newlyFulfilled.some(n => n.id === row.id);
                const name = row.product?.name_ar || row.manual_name || "—";
                const sku = row.product?.sku || row.manual_sku || "—";
                return (
                  <motion.div
                    key={row.id}
                    initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
                    className={cn(
                      "flex items-center justify-between gap-2 p-2 rounded-lg border bg-white/70 backdrop-blur-sm",
                      isNew ? "border-emerald-400 ring-2 ring-emerald-200" : "border-emerald-200"
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{name}</p>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                          <span dir="ltr" className="font-mono">{sku}</span>
                          <span>•</span>
                          <span>كمية: {row.requested_quantity}</span>
                          {row.customer_note && (<><span>•</span><span className="truncate">{row.customer_note}</span></>)}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {isNew && (
                        <Badge className="text-[9px] h-4 px-1.5 bg-rose-500 text-white border-0">جديد</Badge>
                      )}
                      <span className="text-[10px] text-emerald-700">
                        {row.reviewed_at ? new Date(row.reviewed_at).toLocaleDateString("ar-EG", { day: "numeric", month: "short" }) : ""}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
              {recentlyFulfilled.length > 10 && (
                <p className="text-center text-[11px] text-emerald-700 pt-1">
                  و{recentlyFulfilled.length - 10} صنف تاني — شوف تبويب "تم التوفير" تحت
                </p>
              )}
            </div>
          </ScrollArea>
        </motion.div>
      )}

      {/* Today-only filter toggle */}
      <div className="flex items-center justify-between gap-2 -mb-1">
        <button
          type="button"
          onClick={() => setTodayOnly(v => !v)}
          className={cn(
            "inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all",
            todayOnly
              ? "bg-primary text-primary-foreground border-primary shadow-sm"
              : "bg-muted/40 text-muted-foreground border-border hover:bg-muted"
          )}
          aria-pressed={todayOnly}
        >
          <Clock className="w-3.5 h-3.5" />
          {todayOnly ? "بلاغات النهاردة فقط" : "اعرض بلاغات النهاردة فقط"}
          <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{todayCount}</Badge>
        </button>
        {todayOnly && (
          <button
            type="button"
            onClick={() => setTodayOnly(false)}
            className="text-[11px] text-muted-foreground hover:text-foreground underline"
          >
            عرض الكل
          </button>
        )}
      </div>

      {/* بانر المزامنة + زر "افحص دلوقتي" اتنقلوا لشاشة «طلبات الفريق» (TeamShortagesView) */}

      {/* Tabs by status */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="w-full grid grid-cols-5 h-auto">
          <TabsTrigger value="all" className="flex-col gap-0.5 py-2">
            <span className="text-xs">الكل</span>
            <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{counts.all}</Badge>
          </TabsTrigger>
          {(["open", "sourcing", "fulfilled", "rejected"] as StatusKey[]).map(k => {
            const M = STATUS_META[k]; const Icon = M.icon;
            const isFulfilled = k === "fulfilled";
            const hasNew = isFulfilled && newlyFulfilled.length > 0;
            return (
              <TabsTrigger
                key={k}
                value={k}
                className={cn(
                  "flex-col gap-0.5 py-2 relative",
                  isFulfilled && "data-[state=active]:bg-emerald-100 data-[state=active]:text-emerald-900"
                )}
              >
                <span className="flex items-center gap-1 text-xs">
                  <Icon className={cn("w-3 h-3", isFulfilled && "text-emerald-600")} />
                  {M.label}
                </span>
                <Badge
                  variant="secondary"
                  className={cn(
                    "text-[10px] h-4 px-1.5",
                    isFulfilled && counts[k] > 0 && "bg-emerald-200 text-emerald-900"
                  )}
                >
                  {counts[k]}
                </Badge>
                {hasNew && (
                  <motion.span
                    animate={{ scale: [1, 1.3, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="absolute -top-1 -left-1 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-white"
                  />
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <PackageX className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p className="text-sm">مفيش بلاغات في القسم ده</p>
            </div>
          ) : (
            <div className="space-y-2">
              <AnimatePresence>
                {filtered.map(row => {
                  const M = STATUS_META[row.status]; const Icon = M.icon;
                  const name = row.product?.name_ar || row.manual_name || "—";
                  const sku = row.product?.sku || row.manual_sku || "—";
                  return (
                    <motion.div
                      key={row.id}
                      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}
                      className="border rounded-lg p-3 bg-card hover:border-primary/40 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <Package className="w-4 h-4 text-muted-foreground shrink-0" />
                            <p className="font-semibold text-sm text-foreground truncate">{name}</p>
                            {!row.product_id && (
                              <Badge variant="outline" className="text-[10px] h-4">يدوي</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                            <span dir="ltr" className="font-mono">{sku}</span>
                            <span>•</span>
                            <span className="font-semibold text-foreground">كمية: {row.requested_quantity}</span>
                            {row.customer_note && (<><span>•</span><span>عميل: {row.customer_note}</span></>)}
                            <span>•</span>
                            <span>{new Date(row.created_at).toLocaleDateString("ar-EG", { day: "numeric", month: "short" })}</span>
                          </div>
                          {/* رصيد الفيصل الحالي للبلاغات اللي لسه قيد التوفير */}
                          {(row.status === "open" || row.status === "sourcing") && sku in erpStockMap && (() => {
                            const av = erpStockMap[sku];
                            const ok = av >= row.requested_quantity;
                            return (
                              <div className={cn(
                                "mt-1.5 inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium",
                                ok
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60"
                                  : "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60"
                              )}>
                                <Package className="w-3 h-3" />
                                رصيد الفيصل الآن: <span className="font-bold">{av}</span>
                                {ok ? " ✓ كافي — هيتم التحديث في المزامنة القادمة" : ` (المتبقي ${row.requested_quantity - av})`}
                              </div>
                            );
                          })()}
                          {row.admin_response && (
                            <div className="mt-2 text-xs bg-muted/50 rounded p-2 border-r-2 border-primary">
                              <span className="font-semibold">رد الإدارة:</span> {row.admin_response}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          <Badge className={cn("text-[10px] gap-1", M.color)}>
                            <Icon className="w-3 h-3" />{M.label}
                          </Badge>
                          {row.status === "open" && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-rose-500 hover:text-rose-700">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>حذف البلاغ؟</AlertDialogTitle>
                                  <AlertDialogDescription>هتحذف بلاغ "{name}" — مينفعش تعمل ده بعد ما الإدارة تشوفه</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(row.id)} className="bg-rose-600 hover:bg-rose-700">حذف</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                          {row.status === "rejected" && (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={resubmittingId === row.id}
                              onClick={() => handleResubmit(row)}
                              className="h-7 text-[11px] gap-1 border-amber-400 text-amber-700 hover:bg-amber-50 hover:text-amber-800"
                            >
                              {resubmittingId === row.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <RefreshCw className="w-3 h-3" />
                              )}
                              إعادة طلب
                            </Button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </Card>
  );
}

function StatChip({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={cn("rounded-xl p-3 text-white bg-gradient-to-br shadow-sm", color)}>
      <p className="text-[11px] opacity-90">{label}</p>
      <p className="text-2xl font-bold mt-0.5 tabular-nums">{value}</p>
    </div>
  );
}
