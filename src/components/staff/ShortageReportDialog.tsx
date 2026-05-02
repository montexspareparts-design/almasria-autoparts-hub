import { useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Search, Loader2 } from "lucide-react";

interface ProductSuggest {
  id: string;
  sku: string;
  name_ar: string;
  stock_quantity: number;
}

interface ErpSuggest {
  erp_id: string;
  name: string;
  qty: number;
  retail_price: number | null;
  wholesale_price: number | null;
  in_our_system: boolean;
  our_product_id: string | null;
}

interface Props {
  trigger?: ReactNode;
  onSuccess?: () => void;
}

/**
 * Dialog مشترك لإبلاغ صنف ناقص — بنفس آلية StaffShortageRequests
 * (بحث في كتالوج السيستم + كتالوج الفيصل + إدخال يدوي)
 */
export default function ShortageReportDialog({ trigger, onSuccess }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();

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

  // بحث متوازي (السيستم + الفيصل) مع debounce سريع — يبدأ من حرفين أو رقم واحد
  useEffect(() => {
    const q = search.trim();
    const minLen = /^\d+$/.test(q) ? 1 : 2;
    if (!user || !open || mode !== "catalog" || q.length < minLen) {
      setSuggestions([]); setErpSuggestions([]); setSearchingErp(false); setErpSearchError(null);
      return;
    }
    const t = setTimeout(async () => {
      setSearchingErp(true);
      setErpSearchError(null);

      const [systemRes, erpRes] = await Promise.all([
        supabase.rpc("search_all_products_for_shortage" as any, { _q: q }),
        supabase.functions.invoke("erp-search-products", { body: { q } }),
      ]);

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

      if (erpRes.data?.success) {
        setErpSuggestions((erpRes.data.results || []) as ErpSuggest[]);
        setErpCacheInfo(erpRes.data.cache || null);
      } else {
        setErpSuggestions([]);
        setErpSearchError(erpRes.error?.message || erpRes.data?.error || "تعذر تحميل نتائج كتالوج الفيصل حالياً");
      }
      setSearchingErp(false);
    }, 220);
    return () => clearTimeout(t);
  }, [search, mode, user, open]);

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
      payload.product_id = chosen.id;
    } else if (mode === "catalog" && chosenErp) {
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
    onSuccess?.();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button className="gap-2 bg-gradient-to-r from-amber-500 to-rose-500 hover:opacity-90">
            <Plus className="w-4 h-4" />
            بلّغ عن صنف ناقص
          </Button>
        )}
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
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[9px] font-bold text-emerald-700 bg-emerald-200/70 px-1.5 py-0.5 rounded shrink-0">بارت نمبر</span>
                    <span dir="ltr" className="font-mono text-base font-extrabold text-emerald-950 tracking-wide bg-white px-3 py-1 rounded-md border-2 border-emerald-400 shadow-sm break-all">
                      {chosen.name_ar}
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-700 mt-0.5">رصيد حالي: {chosen.stock_quantity} • صنف على الموقع</p>
                  <div className="flex justify-end mt-1.5">
                    <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded font-mono" dir="ltr">كود: {chosen.sku}</span>
                  </div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => { setChosen(null); setSearch(""); }}>تغيير</Button>
              </div>
            ) : chosenErp ? (
              <div className="border-2 border-blue-300 bg-blue-50 rounded-lg p-3 flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[9px] font-bold text-blue-700 bg-blue-200/70 px-1.5 py-0.5 rounded shrink-0">بارت نمبر</span>
                    <span dir="ltr" className="font-mono text-base font-extrabold text-blue-950 tracking-wide bg-white px-3 py-1 rounded-md border-2 border-blue-400 shadow-sm break-all">
                      {chosenErp.name}
                    </span>
                  </div>
                  <p className="text-[11px] text-blue-700 mt-0.5">
                    من الفيصل • رصيد: {chosenErp.qty}
                    {chosenErp.in_our_system ? " • مربوط بصنف موجود على الموقع" : " • غير معروض على الموقع"}
                  </p>
                  <div className="flex justify-end mt-1.5">
                    <span className="text-[10px] font-semibold text-blue-800 bg-blue-100 px-2 py-0.5 rounded font-mono" dir="ltr">كود: {chosenErp.erp_id}</span>
                  </div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => { setChosenErp(null); setSearch(""); }}>تغيير</Button>
              </div>
            ) : (suggestions.length > 0 || erpSuggestions.length > 0) ? (
              <ScrollArea className="h-64 border rounded-lg">
                <div className="p-1 space-y-1">
                  {suggestions.length > 0 && (
                    <>
                      <div className="px-2 py-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 rounded sticky top-0">
                        🟢 أصناف معروضة على الموقع ({suggestions.length})
                      </div>
                      {suggestions.map(s => (
                        <button
                          key={s.id}
                          onClick={() => { setChosen(s); setChosenErp(null); setSearch(s.name_ar); setSuggestions([]); setErpSuggestions([]); }}
                          className="w-full text-right p-2.5 rounded-lg hover:bg-emerald-50 transition-colors border border-transparent hover:border-emerald-200"
                        >
                          <div className="flex items-start justify-between gap-2 mb-1.5" dir="ltr">
                            <div className="flex items-start gap-1.5 min-w-0 flex-1">
                              <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded shrink-0 mt-0.5">بارت نمبر</span>
                              <span className="font-mono text-sm font-extrabold text-emerald-950 break-all leading-tight">
                                {s.name_ar}
                              </span>
                            </div>
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded shrink-0 ${s.stock_quantity > 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                              {s.stock_quantity > 0 ? `متاح: ${s.stock_quantity}` : "غير متوفر"}
                            </span>
                          </div>
                          <div className="flex justify-end">
                            <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded font-mono" dir="ltr">كود: {s.sku}</span>
                          </div>
                        </button>
                      ))}
                    </>
                  )}

                  {erpSuggestions.length > 0 && (
                    <>
                      <div className="px-2 py-1 text-[10px] font-bold text-blue-700 bg-blue-50 rounded sticky top-0 mt-2">
                        🔵 من كتالوج الفيصل بالكامل ({erpSuggestions.length})
                      </div>
                      {erpSuggestions.map(s => (
                        <button
                          key={s.erp_id}
                          onClick={() => { setChosenErp(s); setChosen(null); setSearch(s.name); setSuggestions([]); setErpSuggestions([]); }}
                          className="w-full text-right p-2.5 rounded-lg hover:bg-blue-50 transition-colors border border-transparent hover:border-blue-200"
                        >
                          <div className="flex items-center justify-between gap-2 mb-1.5" dir="ltr">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[9px] font-bold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded">PART №</span>
                              <span className="font-mono text-lg font-extrabold bg-blue-600 text-white px-3 py-1 rounded-md shadow-sm tracking-wider leading-none">
                                {s.erp_id}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${s.qty > 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                                {s.qty > 0 ? `فيصل: ${s.qty}` : "نافد"}
                              </span>
                              {s.in_our_system && (
                                <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">على الموقع ✓</span>
                              )}
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground leading-snug truncate">{s.name}</p>
                          <div className="flex justify-end mt-1">
                            <span className="text-[10px] text-muted-foreground/70 font-mono" dir="ltr">ERP: {s.erp_id}</span>
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
  );
}
