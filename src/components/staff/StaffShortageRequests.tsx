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
  XCircle, RefreshCw, Trash2, PackageX,
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

  // Add dialog state
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"catalog" | "manual">("catalog");
  const [search, setSearch] = useState("");
  const [suggestions, setSuggestions] = useState<ProductSuggest[]>([]);
  const [chosen, setChosen] = useState<ProductSuggest | null>(null);
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

  // Search products (debounced)
  useEffect(() => {
    if (mode !== "catalog" || search.trim().length < 2) { setSuggestions([]); return; }
    const t = setTimeout(async () => {
      const q = search.trim();
      // البحث في كل الأصناف بالنظام (المتوفرة + النافدة + المعطّلة) عبر RPC SECURITY DEFINER
      const { data, error } = await supabase.rpc("search_all_products_for_shortage" as any, { _q: q });
      if (error) {
        // fallback للبحث المباشر لو حصلت مشكلة
        const { data: fb } = await supabase
          .from("products")
          .select("id,sku,name_ar,stock_quantity")
          .or(`sku.ilike.%${q}%,name_ar.ilike.%${q}%`)
          .limit(15);
        setSuggestions((fb as any) || []);
      } else {
        setSuggestions((data as any) || []);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [search, mode]);

  const counts = useMemo(() => {
    const c: Record<StatusKey | "all", number> = { all: rows.length, open: 0, sourcing: 0, fulfilled: 0, rejected: 0 };
    rows.forEach(r => { c[r.status] = (c[r.status] || 0) + 1; });
    return c;
  }, [rows]);

  const totalRequestedQty = useMemo(() => rows.reduce((s, r) => s + (r.requested_quantity || 0), 0), [rows]);
  const openQty = useMemo(() => rows.filter(r => r.status === "open" || r.status === "sourcing").reduce((s, r) => s + r.requested_quantity, 0), [rows]);

  const filtered = useMemo(() => {
    if (activeTab === "all") return rows;
    return rows.filter(r => r.status === activeTab);
  }, [rows, activeTab]);

  const resetForm = () => {
    setMode("catalog"); setSearch(""); setChosen(null); setSuggestions([]);
    setManualSku(""); setManualName(""); setQty(1); setCustomerNote("");
  };

  const handleSubmit = async () => {
    if (!user) return;
    if (mode === "catalog" && !chosen) {
      toast({ title: "اختر صنف من الكتالوج أولاً", variant: "destructive" });
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
                  <Label>ابحث بالاسم أو رقم القطعة</Label>
                  <div className="relative">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      value={search}
                      onChange={(e) => { setSearch(e.target.value); setChosen(null); }}
                      placeholder="مثال: فلتر زيت أو 90915..."
                      className="pr-9"
                      dir="rtl"
                    />
                  </div>
                </div>
                {chosen ? (
                  <div className="border-2 border-emerald-300 bg-emerald-50 rounded-lg p-3 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-emerald-900 truncate">{chosen.name_ar}</p>
                      <p className="text-xs text-emerald-700 font-mono" dir="ltr">{chosen.sku}</p>
                      <p className="text-[11px] text-emerald-700 mt-0.5">رصيد حالي: {chosen.stock_quantity}</p>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => { setChosen(null); setSearch(""); }}>تغيير</Button>
                  </div>
                ) : suggestions.length > 0 ? (
                  <ScrollArea className="h-48 border rounded-lg">
                    <div className="p-1 space-y-1">
                      {suggestions.map(s => (
                        <button
                          key={s.id}
                          onClick={() => { setChosen(s); setSearch(s.name_ar); setSuggestions([]); }}
                          className="w-full text-right p-2 rounded hover:bg-muted transition-colors"
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
                    </div>
                  </ScrollArea>
                ) : search.trim().length >= 2 ? (
                  <p className="text-xs text-muted-foreground text-center py-3">مفيش نتائج — جرّب الإدخال اليدوي</p>
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

      {/* Tabs by status */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="w-full grid grid-cols-5 h-auto">
          <TabsTrigger value="all" className="flex-col gap-0.5 py-2">
            <span className="text-xs">الكل</span>
            <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{counts.all}</Badge>
          </TabsTrigger>
          {(["open", "sourcing", "fulfilled", "rejected"] as StatusKey[]).map(k => {
            const M = STATUS_META[k]; const Icon = M.icon;
            return (
              <TabsTrigger key={k} value={k} className="flex-col gap-0.5 py-2">
                <span className="flex items-center gap-1 text-xs"><Icon className="w-3 h-3" />{M.label}</span>
                <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{counts[k]}</Badge>
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
