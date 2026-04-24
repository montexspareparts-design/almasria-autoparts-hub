import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, RefreshCw, ArrowUpRight, ArrowDownLeft, CheckCircle,
  XCircle, Clock, Settings, Play, Database, DollarSign, Package,
  Zap, TestTube, Globe, Copy, ShieldCheck
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface SyncLog {
  id: string;
  sync_type: string;
  direction: string;
  reference_id: string | null;
  reference_number: string | null;
  payload: any;
  response: any;
  status: string;
  error_message: string | null;
  created_at: string;
}

interface ERPConfig {
  erp_base_url: string;
  erp_mode: string;
  erp_api_key: string;
  webhook_secret: string;
}

const syncTypeLabels: Record<string, { label: string; icon: typeof Package }> = {
  quote_push: { label: "إرسال عرض سعر", icon: DollarSign },
  order_push: { label: "إرسال طلبية", icon: Package },
  order_update: { label: "تحديث طلبية", icon: RefreshCw },
  stock_update: { label: "تحديث مخزون", icon: Database },
  price_update: { label: "تحديث أسعار", icon: DollarSign },
  product_import: { label: "استيراد أصناف", icon: Play },
  error: { label: "خطأ", icon: XCircle },
};

const statusStyles: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  success: { label: "نجح", variant: "default" },
  mock: { label: "تجريبي", variant: "secondary" },
  failed: { label: "فشل", variant: "destructive" },
  pending: { label: "قيد التنفيذ", variant: "outline" },
};

const AdminERPSync = () => {
  const { toast } = useToast();
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [config, setConfig] = useState<ERPConfig>({
    erp_base_url: "",
    erp_mode: "mock",
    erp_api_key: "",
    webhook_secret: "",
  });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [savingConfig, setSavingConfig] = useState(false);
  const [fullSyncReport, setFullSyncReport] = useState<{
    pricesUpdated: number;
    stockUpdated: number;
    pricesError?: string;
    stockError?: string;
    stockWarning?: string;
    finishedAt: string;
  } | null>(null);
  const [priceSyncProgress, setPriceSyncProgress] = useState<{
    phase: string;
    percent: number;
    done: boolean;
    error?: string;
  } | null>(null);
  const [priceSyncReport, setPriceSyncReport] = useState<{
    retailUpdated: number;
    wholesaleUpdated: number;
    matched: number;
    erpTotal: number;
    ourProducts: number;
    sample: Array<{ id: string; name?: string; retailPrice?: number; wholesalePrice?: number; status: "success" | "skipped"; reason?: string }>;
    failures: Array<{ id: string; name?: string; reason: string }>;
    finishedAt: string;
  } | null>(null);
  const [showPriceReport, setShowPriceReport] = useState(false);
  const [stockSyncProgress, setStockSyncProgress] = useState<{
    phase: string;
    percent: number;
    done: boolean;
    error?: string;
  } | null>(null);
  const [stockSyncReport, setStockSyncReport] = useState<{
    updated: number;
    matched: number;
    erpTotal: number;
    ourProducts: number;
    withPositiveStock: number;
    sample: Array<{ id: string; qty: number; status: "in_stock" | "out_of_stock" }>;
    failures: Array<{ id: string; reason: string }>;
    finishedAt: string;
  } | null>(null);
  const [showStockReport, setShowStockReport] = useState(false);

  // ─── Auto Sync state ───
  const [autoSyncReport, setAutoSyncReport] = useState<{
    started_at: string;
    finished_at: string;
    erp_total: number;
    our_active_products: number;
    sync: {
      stock_updated: number;
      retail_updated: number;
      wholesale_updated: number;
      stock_disabled: boolean;
      price_disabled: boolean;
    };
    new_items: {
      detected: number;
      added: number;
      failed: number;
      threshold: number;
      samples: Array<{ erp_id: string; name: string; qty: number; retailPrice: number; wholesalePrice: number; action?: string }>;
      failed_samples: Array<{ erp_id: string; name: string; error: string }>;
    };
  } | null>(null);
  const [autoSyncThreshold, setAutoSyncThreshold] = useState(10);

  // ─── Preview (Dry-Run) state ───
  const [previewLoading, setPreviewLoading] = useState<"prices" | "stock" | null>(null);
  const [pricePreview, setPricePreview] = useState<{
    matched: number;
    erpTotal: number;
    ourProducts: number;
    changesCount: number;
    increases: number;
    decreases: number;
    bigChanges: number;
    wholesaleChangesCount: number;
    wholesaleIncreases: number;
    wholesaleDecreases: number;
    wholesaleNew: number;
    changes: Array<{ erp_id: string; name: string; old_price: number; new_price: number; delta: number; pct: number; status: string }>;
    wholesaleChanges: Array<{ erp_id: string; name: string; old_price: number; new_price: number; delta: number; pct: number; status: string }>;
    generatedAt: string;
  } | null>(null);
  const [stockPreview, setStockPreview] = useState<{
    matched: number;
    erpTotal: number;
    ourProducts: number;
    withPositiveStock: number;
    changesCount: number;
    increases: number;
    decreases: number;
    backInStock: number;
    outOfStock: number;
    changes: Array<{ erp_id: string; name: string; old_qty: number; new_qty: number; delta: number; status: string }>;
    generatedAt: string;
  } | null>(null);
  const [showPricePreview, setShowPricePreview] = useState(false);
  const [showStockPreview, setShowStockPreview] = useState(false);
  const [importProgress, setImportProgress] = useState<{
    phase: string;
    currentBatch: number;
    totalBatches: number;
    imported: number;
    updated: number;
    skipped: number;
    totalItems: number;
    done: boolean;
    error?: string;
  } | null>(null);
  // Mapping state
  const [mappingProducts, setMappingProducts] = useState<any[]>([]);
  const [mappingSearch, setMappingSearch] = useState("");
  const [mappingEdits, setMappingEdits] = useState<Record<string, string>>({});
  const [savingMapping, setSavingMapping] = useState(false);
  const [erpProducts, setErpProducts] = useState<{ id: string; name: string; price: number; quantity: number }[]>([]);
  const [fetchingErp, setFetchingErp] = useState(false);
  const [erpSearchFilter, setErpSearchFilter] = useState<Record<string, string>>({});
  // Unlinked products state
  const [unlinkedProducts, setUnlinkedProducts] = useState<any[]>([]);
  const [unlinkedLoading, setUnlinkedLoading] = useState(false);
  const [unlinkedBrandFilter, setUnlinkedBrandFilter] = useState("all");
  const [unlinkedSearch, setUnlinkedSearch] = useState("");
  const [testPayload, setTestPayload] = useState(
    JSON.stringify(
      {
        event: "order.updated",
        data: {
          order_number: "ORD-001",
          items: [
            { sku: "90915-YZZD3", quantity: 5 },
            { sku: "04152-YZZA1", removed: true },
          ],
        },
      },
      null,
      2
    )
  );

  useEffect(() => {
    fetchData();
    fetchMappingProducts();
    fetchUnlinkedProducts();
  }, []);

  const fetchUnlinkedProducts = async () => {
    setUnlinkedLoading(true);
    let query = supabase
      .from("products")
      .select("id, sku, name_ar, brand, base_price, is_active, image_url")
      .is("erp_item_code", null)
      .order("brand")
      .order("name_ar");

    const { data } = await query;
    setUnlinkedProducts(data || []);
    setUnlinkedLoading(false);
  };

  const fetchData = async () => {
    setLoading(true);
    const [logsRes, configRes] = await Promise.all([
      supabase
        .from("erp_sync_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50),
      supabase.from("erp_config").select("key, value"),
    ]);

    setLogs((logsRes.data as any) || []);

    const cfg: any = {};
    (configRes.data || []).forEach((c: any) => (cfg[c.key] = c.value));
    setConfig({
      erp_base_url: cfg.erp_base_url || "",
      erp_mode: cfg.erp_mode || "mock",
      erp_api_key: cfg.erp_api_key || "",
      webhook_secret: cfg.webhook_secret || "",
    });
    setLoading(false);
  };

  const fetchMappingProducts = async () => {
    // Fetch all active products (handle Supabase 1000 row default limit)
    let allProducts: any[] = [];
    let from = 0;
    const PAGE_SIZE = 1000;
    
    while (true) {
      const { data } = await supabase
        .from("products")
        .select("id, sku, name_ar, erp_item_code, stock_quantity, base_price")
        .eq("is_active", true)
        .order("name_ar")
        .range(from, from + PAGE_SIZE - 1);
      
      if (!data || data.length === 0) break;
      allProducts = [...allProducts, ...data];
      if (data.length < PAGE_SIZE) break;
      from += PAGE_SIZE;
    }
    
    setMappingProducts(allProducts);
  };

  const fetchErpProducts = async () => {
    setFetchingErp(true);
    try {
      const { data, error } = await supabase.functions.invoke("erp-sync-outbound", {
        body: { action: "fetch_erp_products", data: {} },
      });
      if (error) throw error;
      setErpProducts(data?.products || []);
      toast({ title: `تم جلب ${data?.products?.length || 0} صنف من الفيصل ✓` });
    } catch (err: any) {
      toast({ title: "خطأ في جلب أصناف الفيصل", description: err.message, variant: "destructive" });
    }
    setFetchingErp(false);
  };

  const autoMatchByName = () => {
    if (erpProducts.length === 0) return;
    let matched = 0;
    const edits: Record<string, string> = { ...mappingEdits };
    for (const product of mappingProducts) {
      if (product.erp_item_code) continue; // already mapped
      // Try to find ERP product with similar name
      const nameWords = (product.name_ar || "").split(/\s+/).filter((w: string) => w.length > 2);
      const match = erpProducts.find((ep) => {
        const epName = ep.name || "";
        return nameWords.some((w: string) => epName.includes(w));
      });
      if (match) {
        edits[product.id] = match.id;
        matched++;
      }
    }
    setMappingEdits(edits);
    toast({ title: `تم مطابقة ${matched} صنف تلقائياً` });
  };

  const saveMappings = async () => {
    setSavingMapping(true);
    let count = 0;
    for (const [productId, erpCode] of Object.entries(mappingEdits)) {
      const { error } = await supabase
        .from("products")
        .update({ erp_item_code: erpCode || null } as any)
        .eq("id", productId);
      if (!error) count++;
    }
    toast({ title: `تم حفظ ${count} ربط ✓` });
    setMappingEdits({});
    fetchMappingProducts();
    setSavingMapping(false);
  };

  const saveConfig = async () => {
    setSavingConfig(true);
    for (const [key, value] of Object.entries(config)) {
      await supabase
        .from("erp_config")
        .upsert({ key, value, updated_at: new Date().toISOString() } as any, { onConflict: "key" });
    }
    toast({ title: "تم حفظ إعدادات الربط ✓" });
    setSavingConfig(false);
  };

  const runSync = async (action: string) => {
    setSyncing(action);
    try {
      const { data, error } = await supabase.functions.invoke("erp-sync-outbound", {
        body: { action, data: {} },
      });
      if (error) throw error;
      
      // Handle ERP_ALL_ZERO_STOCK warning
      if (data?.warning === "ERP_ALL_ZERO_STOCK") {
        toast({
          title: "⚠️ الأرصدة غير متاحة من الـ ERP",
          description: data?.message || "استخدم رفع ملف Excel لتحديث الأرصدة",
          variant: "destructive",
        });
      } else {
        toast({
          title: "تمت المزامنة ✓",
          description: data?.message || `تم تنفيذ ${action} بنجاح — تم تحديث ${data?.updated_count || 0} صنف`,
        });
      }
      fetchData();
    } catch (err: any) {
      toast({ title: "خطأ في المزامنة", description: err.message, variant: "destructive" });
    }
    setSyncing(null);
  };

  const runAutoSync = async () => {
    setSyncing("auto_sync");
    setAutoSyncReport(null);
    try {
      const { data, error } = await supabase.functions.invoke("erp-sync-outbound", {
        body: { action: "auto_sync_full", data: { stock_threshold: autoSyncThreshold } },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "فشل التنفيذ");
      setAutoSyncReport(data);
      toast({
        title: "اكتملت المزامنة التلقائية ✓",
        description: `تم تحديث ${data.sync.stock_updated} رصيد و ${data.sync.retail_updated} سعر قطاعي • ${data.new_items.added} صنف جديد مضاف`,
      });
      fetchData();
    } catch (err: any) {
      toast({ title: "فشل المزامنة التلقائية", description: err.message, variant: "destructive" });
    }
    setSyncing(null);
  };

  const runFullSync = async () => {
    setSyncing("full_sync");
    setFullSyncReport(null);
    let pricesUpdated = 0;
    let stockUpdated = 0;
    let pricesError: string | undefined;
    let stockError: string | undefined;
    let stockWarning: string | undefined;

    // 1) Prices
    try {
      const { data, error } = await supabase.functions.invoke("erp-sync-outbound", {
        body: { action: "sync_prices", data: {} },
      });
      if (error) throw error;
      pricesUpdated = data?.updated_count || 0;
    } catch (err: any) {
      pricesError = err?.message || "خطأ غير معروف";
    }

    // 2) Stock
    try {
      const { data, error } = await supabase.functions.invoke("erp-sync-outbound", {
        body: { action: "sync_stock", data: {} },
      });
      if (error) throw error;
      if (data?.warning === "ERP_ALL_ZERO_STOCK") {
        stockWarning = data?.message || "كل الأرصدة من الـ ERP وصلت بقيمة صفر — تم تجاهلها";
      } else {
        stockUpdated = data?.updated_count || 0;
      }
    } catch (err: any) {
      stockError = err?.message || "خطأ غير معروف";
    }

    setFullSyncReport({
      pricesUpdated,
      stockUpdated,
      pricesError,
      stockError,
      stockWarning,
      finishedAt: new Date().toISOString(),
    });

    const hasError = pricesError || stockError;
    toast({
      title: hasError ? "اكتملت المزامنة مع أخطاء" : "✅ تمت المزامنة الشاملة",
      description: `أسعار: ${pricesUpdated} | أرصدة: ${stockUpdated}${stockWarning ? " — " + stockWarning : ""}`,
      variant: hasError ? "destructive" : "default",
    });

    fetchData();
    setSyncing(null);
  };

  const runPriceSync = async () => {
    setSyncing("price_sync");
    setPriceSyncReport(null);
    setPriceSyncProgress({ phase: "جاري الاتصال بنظام الفيصل...", percent: 10, done: false });

    const t1 = setTimeout(() => {
      setPriceSyncProgress(p => p && !p.done ? { ...p, phase: "جاري جلب الأسعار من الفيصل...", percent: 35 } : p);
    }, 800);
    const t2 = setTimeout(() => {
      setPriceSyncProgress(p => p && !p.done ? { ...p, phase: "جاري مطابقة المنتجات...", percent: 60 } : p);
    }, 2000);
    const t3 = setTimeout(() => {
      setPriceSyncProgress(p => p && !p.done ? { ...p, phase: "جاري تحديث قاعدة البيانات...", percent: 85 } : p);
    }, 3500);

    try {
      const { data, error } = await supabase.functions.invoke("erp-sync-outbound", {
        body: { action: "sync_prices", data: {} },
      });

      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3);

      if (error) throw error;
      if (data?.success === false) throw new Error(data?.message || "فشلت المزامنة");

      const retailUpdated = data?.retail_updated || 0;
      const wholesaleUpdated = data?.wholesale_updated || 0;
      const matched = data?.matched || 0;
      const erpTotal = data?.erp_total || 0;
      const ourProducts = data?.our_products || 0;
      const sample = (data?.sample || []) as Array<any>;

      const sampleWithStatus = sample.map((s) => {
        const r = Number(s.retailPrice || 0);
        const w = Number(s.wholesalePrice || 0);
        const ok = r > 0 || w > 0;
        return {
          id: String(s.id || ""),
          name: s.name,
          retailPrice: r,
          wholesalePrice: w,
          status: ok ? ("success" as const) : ("skipped" as const),
          reason: !ok ? "السعر = 0 من الفيصل" : undefined,
        };
      });

      const unmatchedCount = Math.max(0, ourProducts - matched);
      const failures: Array<{ id: string; name?: string; reason: string }> = [];
      if (unmatchedCount > 0) {
        failures.push({
          id: "—",
          reason: `${unmatchedCount} صنف على موقعنا بدون كود الفيصل (erp_item_code) أو غير موجود في الفيصل`,
        });
      }

      setPriceSyncProgress({ phase: "✅ اكتملت المزامنة", percent: 100, done: true });
      setPriceSyncReport({
        retailUpdated, wholesaleUpdated, matched, erpTotal, ourProducts,
        sample: sampleWithStatus, failures,
        finishedAt: new Date().toISOString(),
      });

      toast({
        title: "✅ تمت مزامنة الأسعار",
        description: `تم تحديث ${retailUpdated} سعر قطاعي و ${wholesaleUpdated} سعر جملة من ${matched} صنف مطابق`,
      });
    } catch (err: any) {
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3);
      setPriceSyncProgress({ phase: "❌ فشلت المزامنة", percent: 100, done: true, error: err?.message || "خطأ غير معروف" });
      toast({
        title: "فشل مزامنة الأسعار",
        description: err?.message || "خطأ غير معروف",
        variant: "destructive",
      });
    }

    fetchData();
    setSyncing(null);
  };

  // ─── Preview / Dry-Run handlers ───
  const runPricePreview = async () => {
    setPreviewLoading("prices");
    setPricePreview(null);
    try {
      const { data, error } = await supabase.functions.invoke("erp-sync-outbound", {
        body: { action: "sync_prices", dry_run: true, data: { dry_run: true } },
      });
      if (error) throw error;
      if (data?.success === false) throw new Error(data?.message || "فشل المعاينة");
      setPricePreview({
        matched: data?.matched || 0,
        erpTotal: data?.erp_total || 0,
        ourProducts: data?.our_products || 0,
        changesCount: data?.retail_changes_count || 0,
        increases: data?.increases || 0,
        decreases: data?.decreases || 0,
        bigChanges: data?.big_changes || 0,
        wholesaleChangesCount: data?.wholesale_changes_count || 0,
        wholesaleIncreases: data?.wholesale_increases || 0,
        wholesaleDecreases: data?.wholesale_decreases || 0,
        wholesaleNew: data?.wholesale_new || 0,
        changes: data?.changes || [],
        wholesaleChanges: data?.wholesale_changes || [],
        generatedAt: new Date().toISOString(),
      });
      setShowPricePreview(true);
      toast({
        title: "✅ المعاينة جاهزة",
        description: `قطاعي: ${data?.retail_changes_count || 0} • جملة: ${data?.wholesale_changes_count || 0} — راجعها قبل التنفيذ`,
      });
    } catch (err: any) {
      toast({ title: "فشل المعاينة", description: err?.message || "خطأ غير معروف", variant: "destructive" });
    } finally {
      setPreviewLoading(null);
    }
  };

  const runStockPreview = async () => {
    setPreviewLoading("stock");
    setStockPreview(null);
    try {
      const { data, error } = await supabase.functions.invoke("erp-sync-outbound", {
        body: { action: "sync_stock", dry_run: true, data: { dry_run: true } },
      });
      if (error) throw error;
      if (data?.success === false) throw new Error(data?.message || "فشل المعاينة");
      setStockPreview({
        matched: data?.matched || 0,
        erpTotal: data?.erp_total || 0,
        ourProducts: data?.our_products || 0,
        withPositiveStock: data?.with_positive_stock || 0,
        changesCount: data?.changes_count || 0,
        increases: data?.increases || 0,
        decreases: data?.decreases || 0,
        backInStock: data?.back_in_stock || 0,
        outOfStock: data?.out_of_stock || 0,
        changes: data?.changes || [],
        generatedAt: new Date().toISOString(),
      });
      setShowStockPreview(true);
      toast({
        title: "✅ المعاينة جاهزة",
        description: `${data?.changes_count || 0} تغيير رصيد متوقع — راجعها قبل التنفيذ`,
      });
    } catch (err: any) {
      toast({ title: "فشل المعاينة", description: err?.message || "خطأ غير معروف", variant: "destructive" });
    } finally {
      setPreviewLoading(null);
    }
  };

  const downloadPreviewCsv = (kind: "prices" | "stock") => {
    if (kind === "prices" && pricePreview) {
      const headers = ["كود الفيصل", "اسم الصنف", "السعر الحالي", "السعر الجديد", "الفرق", "النسبة %", "الاتجاه"];
      const rows = pricePreview.changes.map(c => [
        c.erp_id, c.name, c.old_price, c.new_price, c.delta, c.pct,
        c.status === "increase" ? "ارتفاع ⬆️" : "انخفاض ⬇️",
      ]);
      const csv = "\uFEFF" + [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `price-preview-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
      URL.revokeObjectURL(url);
    } else if (kind === "stock" && stockPreview) {
      const headers = ["كود الفيصل", "اسم الصنف", "الرصيد الحالي", "الرصيد الجديد", "الفرق", "الحالة"];
      const labels: Record<string, string> = {
        increase: "زيادة ⬆️", decrease: "نقصان ⬇️",
        back_in_stock: "متوفر مرة أخرى ✅", out_of_stock: "نفد ⚠️",
      };
      const rows = stockPreview.changes.map(c => [
        c.erp_id, c.name, c.old_qty, c.new_qty, c.delta, labels[c.status] || c.status,
      ]);
      const csv = "\uFEFF" + [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `stock-preview-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
      URL.revokeObjectURL(url);
    }
  };

  const downloadPriceReportCsv = () => {
    if (!priceSyncReport) return;
    const headers = ["كود الفيصل", "اسم الصنف", "سعر القطاعي", "سعر الجملة", "الحالة", "ملاحظة"];
    const rows = [
      ...priceSyncReport.sample.map(s => [
        s.id, s.name || "", s.retailPrice || 0, s.wholesalePrice || 0,
        s.status === "success" ? "نجح" : "تم التخطي", s.reason || "",
      ]),
      ...priceSyncReport.failures.map(f => [f.id, f.name || "", "", "", "فشل", f.reason]),
    ];
    const csv = "\uFEFF" + [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `price-sync-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadLastRunReport = () => {
    if (!priceSyncReport && !stockSyncReport && !fullSyncReport) {
      toast({ title: "لا يوجد تقرير", description: "شغّل مزامنة أولاً ثم نزّل التقرير", variant: "destructive" });
      return;
    }
    const headers = ["نوع المزامنة", "كود الفيصل", "اسم الصنف", "القيمة", "الحالة", "رسالة الخطأ / الملاحظة"];
    const rows: (string | number)[][] = [];

    if (priceSyncReport) {
      priceSyncReport.sample.forEach(s => {
        rows.push([
          "أسعار", s.id, s.name || "",
          `قطاعي:${s.retailPrice ?? 0} | جملة:${s.wholesalePrice ?? 0}`,
          s.status === "success" ? "نجح ✅" : "تم التخطي ⚠️",
          s.reason || "",
        ]);
      });
      priceSyncReport.failures.forEach(f => {
        rows.push(["أسعار - غير مطابق", f.id, f.name || "", "—", "فشل ❌", f.reason]);
      });
    }

    if (stockSyncReport) {
      stockSyncReport.sample.forEach(s => {
        rows.push([
          "أرصدة", s.id, "", s.qty,
          s.status === "in_stock" ? "متوفر ✅" : "نافذ ⚠️", "",
        ]);
      });
      stockSyncReport.failures.forEach(f => {
        rows.push(["أرصدة - غير مطابق", f.id, "", "—", "فشل ❌", f.reason]);
      });
    }

    if (fullSyncReport) {
      if (fullSyncReport.pricesError) {
        rows.push(["مزامنة شاملة - أسعار", "—", "", "—", "فشل ❌", fullSyncReport.pricesError]);
      }
      if (fullSyncReport.stockError) {
        rows.push(["مزامنة شاملة - أرصدة", "—", "", "—", "فشل ❌", fullSyncReport.stockError]);
      }
      if (fullSyncReport.stockWarning) {
        rows.push(["مزامنة شاملة - أرصدة", "—", "", "—", "تحذير ⚠️", fullSyncReport.stockWarning]);
      }
    }

    if (rows.length === 0) {
      toast({ title: "لا توجد بيانات للتنزيل", variant: "destructive" });
      return;
    }

    const csv = "\uFEFF" + [headers, ...rows]
      .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `erp-last-sync-report-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "✅ تم تنزيل التقرير", description: `${rows.length} سجل` });
  };

  const runStockSync = async () => {
    setSyncing("stock_sync");
    setStockSyncReport(null);
    setStockSyncProgress({ phase: "جاري الاتصال بنظام الفيصل...", percent: 10, done: false });

    const t1 = setTimeout(() => {
      setStockSyncProgress(p => p && !p.done ? { ...p, phase: "جاري جلب الأرصدة من الفيصل...", percent: 35 } : p);
    }, 800);
    const t2 = setTimeout(() => {
      setStockSyncProgress(p => p && !p.done ? { ...p, phase: "جاري مطابقة المنتجات بالكود...", percent: 60 } : p);
    }, 2000);
    const t3 = setTimeout(() => {
      setStockSyncProgress(p => p && !p.done ? { ...p, phase: "جاري تحديث الأرصدة في قاعدة البيانات...", percent: 85 } : p);
    }, 3500);

    try {
      const { data, error } = await supabase.functions.invoke("erp-sync-outbound", {
        body: { action: "sync_stock", data: {} },
      });

      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3);

      if (error) throw error;
      if (data?.success === false) throw new Error(data?.message || "فشلت المزامنة");

      const updated = data?.updated || 0;
      const matched = data?.matched || 0;
      const erpTotal = data?.erp_total || 0;
      const ourProducts = data?.our_products || 0;
      const withPositiveStock = data?.with_positive_stock || 0;
      const sample = (data?.sample || []) as Array<any>;

      const sampleWithStatus = sample.map((s) => ({
        id: String(s.id || ""),
        qty: Number(s.qty || 0),
        status: (Number(s.qty || 0) > 0 ? "in_stock" : "out_of_stock") as "in_stock" | "out_of_stock",
      }));

      const unmatchedCount = Math.max(0, ourProducts - matched);
      const failures: Array<{ id: string; reason: string }> = [];
      if (unmatchedCount > 0) {
        failures.push({
          id: "—",
          reason: `${unmatchedCount} صنف على موقعنا بدون كود الفيصل (erp_item_code) أو غير موجود في الفيصل`,
        });
      }
      if (withPositiveStock === 0 && matched > 0) {
        failures.push({
          id: "⚠️",
          reason: `كل الأصناف المطابقة (${matched}) رصيدها = 0 من الفيصل. تأكد من حالة المخزون في النظام.`,
        });
      }

      setStockSyncProgress({ phase: "✅ اكتملت مزامنة الأرصدة", percent: 100, done: true });
      setStockSyncReport({
        updated, matched, erpTotal, ourProducts, withPositiveStock,
        sample: sampleWithStatus, failures,
        finishedAt: new Date().toISOString(),
      });

      toast({
        title: "✅ تمت مزامنة الأرصدة",
        description: `تم تحديث ${updated} صنف من ${matched} مطابق (${withPositiveStock} منهم برصيد موجب)`,
      });
    } catch (err: any) {
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3);
      setStockSyncProgress({ phase: "❌ فشلت المزامنة", percent: 100, done: true, error: err?.message || "خطأ غير معروف" });
      toast({
        title: "فشل مزامنة الأرصدة",
        description: err?.message || "خطأ غير معروف",
        variant: "destructive",
      });
    }

    fetchData();
    setSyncing(null);
  };

  const downloadStockReportCsv = () => {
    if (!stockSyncReport) return;
    const headers = ["كود الفيصل", "الرصيد الجديد", "الحالة", "ملاحظة"];
    const rows = [
      ...stockSyncReport.sample.map(s => [
        s.id, s.qty,
        s.status === "in_stock" ? "متوفر ✅" : "نافذ ⚠️",
        "",
      ]),
      ...stockSyncReport.failures.map(f => [f.id, "", "فشل", f.reason]),
    ];
    const csv = "\uFEFF" + [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `stock-sync-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleBatchImport = async () => {
    setSyncing("import_products");
    setImportProgress({ phase: "جاري جلب الأصناف من الفيصل...", currentBatch: 0, totalBatches: 0, imported: 0, updated: 0, skipped: 0, totalItems: 0, done: false });

    try {
      // Phase 1: Fetch all ERP products
      const { data: erpFetchData, error: fetchErr } = await supabase.functions.invoke("erp-sync-outbound", {
        body: { action: "fetch_erp_products", data: {} },
      });
      if (fetchErr) throw fetchErr;

      const products = erpFetchData?.products || [];
      if (products.length === 0) {
        setImportProgress(p => ({ ...p!, phase: "لم يتم العثور على أصناف", done: true }));
        setSyncing(null);
        return;
      }

      // Phase 2: Send in batches
      const BATCH_SIZE = 500;
      const totalBatches = Math.ceil(products.length / BATCH_SIZE);
      let totalImported = 0, totalUpdated = 0, totalSkipped = 0;

      setImportProgress(p => ({ ...p!, phase: "جاري استيراد الأصناف...", totalBatches, totalItems: products.length }));

      for (let i = 0; i < products.length; i += BATCH_SIZE) {
        const batchNum = Math.floor(i / BATCH_SIZE) + 1;
        const batch = products.slice(i, i + BATCH_SIZE);

        setImportProgress(p => ({
          ...p!,
          currentBatch: batchNum,
          phase: `جاري معالجة الدفعة ${batchNum} من ${totalBatches}...`,
        }));

        const { data: batchResult, error: batchErr } = await supabase.functions.invoke("erp-sync-outbound", {
          body: { action: "import_products_batch", data: { items: batch } },
        });

        if (batchErr) {
          console.error(`Batch ${batchNum} error:`, batchErr);
        } else {
          totalImported += batchResult?.imported || 0;
          totalUpdated += batchResult?.updated || 0;
          totalSkipped += batchResult?.skipped || 0;
        }

        setImportProgress(p => ({
          ...p!,
          imported: totalImported,
          updated: totalUpdated,
          skipped: totalSkipped,
        }));
      }

      setImportProgress(p => ({
        ...p!,
        currentBatch: totalBatches,
        phase: "✅ اكتمل الاستيراد بنجاح!",
        done: true,
      }));

      toast({
        title: "تم استيراد الأصناف ✓",
        description: `جديد: ${totalImported} | محدّث: ${totalUpdated} | تخطي: ${totalSkipped}`,
      });

      fetchData();
    } catch (err: any) {
      setImportProgress(p => ({
        ...p!,
        phase: "❌ فشل الاستيراد",
        error: err.message,
        done: true,
      }));
      toast({ title: "خطأ في الاستيراد", description: err.message, variant: "destructive" });
    }
    setSyncing(null);
  };

  const testWebhook = async () => {
    setSyncing("webhook_test");
    try {
      let payload: any;
      try {
        payload = JSON.parse(testPayload);
      } catch {
        toast({ title: "خطأ في الاختبار", description: "صيغة JSON غير صالحة", variant: "destructive" });
        setSyncing(null);
        return;
      }

      // Use raw fetch to avoid supabase-js throwing on non-2xx
      const webhookEndpoint = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/erp-webhook`;
      const response = await fetch(webhookEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-webhook-secret": config.webhook_secret,
          "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        toast({
          title: "خطأ في الاختبار",
          description: String(data?.error || data?.message || `HTTP ${response.status}`).slice(0, 200),
          variant: "destructive",
        });
      } else {
        toast({
          title: "تم اختبار الـ Webhook ✓",
          description: JSON.stringify(data)?.slice(0, 200),
        });
      }
      fetchData();
    } catch (err: any) {
      toast({
        title: "خطأ في الاختبار",
        description: String(err?.message || "حدث خطأ غير متوقع").slice(0, 200),
        variant: "destructive",
      });
    }
    setSyncing(null);
  };

  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/erp-webhook`;

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  const stats = {
    total: logs.length,
    success: logs.filter((l) => l.status === "success").length,
    mock: logs.filter((l) => l.status === "mock").length,
    failed: logs.filter((l) => l.status === "failed").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            ربط نظام الفيصل ERP
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            مزامنة الأسعار والمخزون والطلبات مع نظام الـ ERP
          </p>
        </div>
        <Badge variant={config.erp_mode === "mock" ? "secondary" : "default"} className="text-sm px-3 py-1">
          {config.erp_mode === "mock" ? "🧪 وضع تجريبي" : "🟢 وضع مباشر"}
        </Badge>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{stats.total}</p>
            <p className="text-xs text-muted-foreground">إجمالي العمليات</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-emerald-500">{stats.success}</p>
            <p className="text-xs text-muted-foreground">ناجحة</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-500">{stats.mock}</p>
            <p className="text-xs text-muted-foreground">تجريبية</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-destructive">{stats.failed}</p>
            <p className="text-xs text-muted-foreground">فاشلة</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="actions" dir="rtl">
        <TabsList className="w-full flex-wrap">
          <TabsTrigger value="actions" className="flex-1">⚡ المزامنة</TabsTrigger>
          <TabsTrigger value="mapping" className="flex-1">🔗 ربط الأصناف</TabsTrigger>
          <TabsTrigger value="unlinked" className="flex-1">⚠️ غير مربوطة</TabsTrigger>
          <TabsTrigger value="webhook" className="flex-1">📡 Webhook</TabsTrigger>
          <TabsTrigger value="config" className="flex-1">⚙️ الإعدادات</TabsTrigger>
          <TabsTrigger value="logs" className="flex-1">📋 السجلات</TabsTrigger>
        </TabsList>

        {/* ─── SYNC ACTIONS ─── */}
        <TabsContent value="actions" className="space-y-4 mt-4">

          {/* Auto Sync Card — Scheduled hourly + manual trigger */}
          <Card className="border-2 border-primary/40 hover:border-primary/70 transition-colors bg-primary/5">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                  <RefreshCw className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-foreground">🤖 المزامنة التلقائية (سعر + رصيد + اكتشاف أصناف جديدة)</h3>
                  <p className="text-xs text-muted-foreground">
                    تعمل تلقائياً كل ساعة. تُحدّث الأسعار والأرصدة للأصناف المعروضة فقط، وتُضيف أي صنف أصلي برصيد أكبر من الحد المحدد.
                  </p>
                </div>
                <Badge variant="outline" className="text-xs">⏰ كل ساعة</Badge>
              </div>

              <div className="flex items-end gap-2 mb-3">
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground mb-1 block">الحد الأدنى للرصيد لاكتشاف صنف جديد</label>
                  <Input
                    type="number"
                    min={1}
                    value={autoSyncThreshold}
                    onChange={(e) => setAutoSyncThreshold(Math.max(1, Number(e.target.value) || 10))}
                    className="h-9"
                  />
                </div>
                <Button
                  className="gap-2"
                  onClick={runAutoSync}
                  disabled={syncing !== null}
                >
                  {syncing === "auto_sync" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  {syncing === "auto_sync" ? "جاري التنفيذ..." : "تشغيل الآن"}
                </Button>
              </div>

              {autoSyncReport && (
                <div className="mt-3 p-4 rounded-lg bg-muted/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">📊 نتيجة آخر تنفيذ</span>
                    <Button variant="ghost" size="sm" onClick={() => setAutoSyncReport(null)} className="h-6 px-2 text-xs">✕</Button>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="bg-background rounded p-3 text-center border border-emerald-500/30">
                      <p className="font-bold text-lg text-foreground">{autoSyncReport.sync.stock_updated}</p>
                      <p className="text-muted-foreground">رصيد محدّث</p>
                    </div>
                    <div className="bg-background rounded p-3 text-center border border-amber-500/30">
                      <p className="font-bold text-lg text-foreground">{autoSyncReport.sync.retail_updated}</p>
                      <p className="text-muted-foreground">سعر قطاعي</p>
                    </div>
                    <div className="bg-background rounded p-3 text-center border border-blue-500/30">
                      <p className="font-bold text-lg text-foreground">{autoSyncReport.sync.wholesale_updated}</p>
                      <p className="text-muted-foreground">سعر جملة</p>
                    </div>
                  </div>

                  <div className="bg-background rounded-lg p-3 border border-primary/30">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold text-foreground">🆕 أصناف أصلية جديدة</span>
                      <Badge variant="default" className="text-xs">
                        {autoSyncReport.new_items.added} مُضاف من {autoSyncReport.new_items.detected} مكتشف
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">
                      الحد المعتمد: رصيد &gt; {autoSyncReport.new_items.threshold}
                    </p>
                    {autoSyncReport.new_items.samples.length > 0 ? (
                      <div className="max-h-48 overflow-y-auto space-y-1">
                        {autoSyncReport.new_items.samples.map((s, i) => (
                          <div key={i} className="flex items-center justify-between gap-2 text-xs p-2 rounded bg-muted/40">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-foreground truncate">{s.name}</p>
                              <p className="text-muted-foreground">كود: {s.erp_id} • سعر: {s.retailPrice} ج.م</p>
                            </div>
                            <Badge variant="secondary" className="text-[10px] shrink-0">رصيد: {s.qty}</Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground text-center py-2">لا توجد أصناف جديدة هذه المرة</p>
                    )}
                  </div>

                  <p className="text-[10px] text-muted-foreground text-center">
                    آخر تنفيذ: {new Date(autoSyncReport.finished_at).toLocaleString("ar-EG")}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Full Sync Card - Prices + Stock together */}
          <Card className="border-2 border-emerald-500/40 hover:border-emerald-500/70 transition-colors bg-emerald-500/5">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-foreground">⚡ مزامنة شاملة (الأسعار + الأرصدة)</h3>
                  <p className="text-xs text-muted-foreground">
                    تشغيل مزامنة الأسعار ثم الأرصدة معاً من نظام الفيصل في خطوة واحدة
                  </p>
                </div>
              </div>

              {fullSyncReport && (
                <div className="mb-3 p-4 rounded-lg bg-muted/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">📊 نتيجة آخر مزامنة شاملة</span>
                    <Button variant="ghost" size="sm" onClick={() => setFullSyncReport(null)} className="h-6 px-2 text-xs">✕</Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className={`bg-background rounded p-3 text-center border ${fullSyncReport.pricesError ? "border-destructive/50" : "border-emerald-500/30"}`}>
                      <p className="font-bold text-lg text-foreground">{fullSyncReport.pricesUpdated}</p>
                      <p className="text-muted-foreground">أسعار محدّثة</p>
                      {fullSyncReport.pricesError && (
                        <p className="text-destructive mt-1 text-[10px]">❌ {fullSyncReport.pricesError}</p>
                      )}
                    </div>
                    <div className={`bg-background rounded p-3 text-center border ${fullSyncReport.stockError ? "border-destructive/50" : "border-emerald-500/30"}`}>
                      <p className="font-bold text-lg text-foreground">{fullSyncReport.stockUpdated}</p>
                      <p className="text-muted-foreground">أرصدة محدّثة</p>
                      {fullSyncReport.stockError && (
                        <p className="text-destructive mt-1 text-[10px]">❌ {fullSyncReport.stockError}</p>
                      )}
                      {fullSyncReport.stockWarning && (
                        <p className="text-amber-600 mt-1 text-[10px]">⚠️ {fullSyncReport.stockWarning}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <Button
                className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={runFullSync}
                disabled={syncing !== null}
              >
                {syncing === "full_sync" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Zap className="w-4 h-4" />
                )}
                {syncing === "full_sync" ? "جاري المزامنة..." : "تشغيل المزامنة الشاملة الآن"}
              </Button>

              <Button
                variant="outline"
                className="w-full gap-2 mt-2"
                onClick={downloadLastRunReport}
                disabled={!priceSyncReport && !stockSyncReport && !fullSyncReport}
              >
                📥 تنزيل تقرير آخر مزامنة (CSV) — يتضمن الأصناف غير المطابقة والأخطاء
              </Button>
            </CardContent>
          </Card>

          {/* Prices-Only Sync Card with Live Progress + Per-Record Report */}
          <Card className="border-2 border-amber-500/40 hover:border-amber-500/70 transition-colors bg-amber-500/5">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-amber-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-foreground">💰 مزامنة الأسعار فقط (مع تقدّم وتقرير تفصيلي)</h3>
                  <p className="text-xs text-muted-foreground">
                    تحديث أسعار القطاعي والجملة من الفيصل لكل المنتجات المربوطة بـ erp_item_code — مع عرض حي للتقدم وتقرير نتائج لكل سجل
                  </p>
                </div>
              </div>

              {priceSyncProgress && (
                <div className="mb-3 p-4 rounded-lg bg-muted/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground flex items-center gap-2">
                      {!priceSyncProgress.done && <Loader2 className="w-4 h-4 animate-spin" />}
                      {priceSyncProgress.phase}
                    </span>
                    {priceSyncProgress.done && (
                      <Button variant="ghost" size="sm" onClick={() => { setPriceSyncProgress(null); setPriceSyncReport(null); }} className="h-6 px-2 text-xs">✕</Button>
                    )}
                  </div>
                  <Progress value={priceSyncProgress.percent} className="h-2" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{priceSyncProgress.percent}%</span>
                  </div>
                  {priceSyncProgress.error && (
                    <p className="text-xs text-destructive">❌ {priceSyncProgress.error}</p>
                  )}
                </div>
              )}

              {priceSyncReport && (
                <div className="mb-3 p-4 rounded-lg bg-background border space-y-3">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                    <div className="bg-emerald-500/10 rounded p-3 text-center border border-emerald-500/30">
                      <p className="font-bold text-lg text-foreground">{priceSyncReport.retailUpdated}</p>
                      <p className="text-muted-foreground">سعر قطاعي ✅</p>
                    </div>
                    <div className="bg-emerald-500/10 rounded p-3 text-center border border-emerald-500/30">
                      <p className="font-bold text-lg text-foreground">{priceSyncReport.wholesaleUpdated}</p>
                      <p className="text-muted-foreground">سعر جملة ✅</p>
                    </div>
                    <div className="bg-blue-500/10 rounded p-3 text-center border border-blue-500/30">
                      <p className="font-bold text-lg text-foreground">{priceSyncReport.matched}</p>
                      <p className="text-muted-foreground">صنف مطابق</p>
                    </div>
                    <div className="bg-amber-500/10 rounded p-3 text-center border border-amber-500/30">
                      <p className="font-bold text-lg text-foreground">{Math.max(0, priceSyncReport.ourProducts - priceSyncReport.matched)}</p>
                      <p className="text-muted-foreground">غير مطابق ⚠️</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setShowPriceReport(true)} className="flex-1 gap-2">
                      <Database className="w-4 h-4" /> عرض التقرير التفصيلي
                    </Button>
                    <Button variant="outline" size="sm" onClick={downloadPriceReportCsv} className="gap-2">
                      <Copy className="w-4 h-4" /> CSV
                    </Button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  className="w-full gap-2 border-amber-500/50 text-amber-700 hover:bg-amber-500/10"
                  onClick={runPricePreview}
                  disabled={syncing !== null || previewLoading !== null}
                >
                  {previewLoading === "prices" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <TestTube className="w-4 h-4" />
                  )}
                  {previewLoading === "prices" ? "جاري المعاينة..." : "👁️ معاينة قبل التنفيذ"}
                </Button>
                <Button
                  className="w-full gap-2 bg-amber-600 hover:bg-amber-700 text-white"
                  onClick={runPriceSync}
                  disabled={syncing !== null || previewLoading !== null}
                >
                  {syncing === "price_sync" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <DollarSign className="w-4 h-4" />
                  )}
                  {syncing === "price_sync" ? "جاري المزامنة..." : "✅ تنفيذ نهائي"}
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground mt-2 text-center">
                💡 اضغط "معاينة" أولاً لرؤية كل التغييرات المتوقعة بدون تطبيقها
              </p>
            </CardContent>
          </Card>

          {/* Stock-Only Sync Card with Live Progress + Per-Record Report */}
          <Card className="border-2 border-cyan-500/40 hover:border-cyan-500/70 transition-colors bg-cyan-500/5">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                  <Package className="w-5 h-5 text-cyan-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-foreground">📦 مزامنة الأرصدة فقط (مع تقدّم وتقرير تفصيلي)</h3>
                  <p className="text-xs text-muted-foreground">
                    تحديث كميات المخزون من الفيصل لكل المنتجات المربوطة بـ erp_item_code أو SKU — مع عرض حي للتقدم وتقرير لكل سجل
                  </p>
                </div>
              </div>

              {stockSyncProgress && (
                <div className="mb-3 p-4 rounded-lg bg-muted/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground flex items-center gap-2">
                      {!stockSyncProgress.done && <Loader2 className="w-4 h-4 animate-spin" />}
                      {stockSyncProgress.phase}
                    </span>
                    {stockSyncProgress.done && (
                      <Button variant="ghost" size="sm" onClick={() => { setStockSyncProgress(null); setStockSyncReport(null); }} className="h-6 px-2 text-xs">✕</Button>
                    )}
                  </div>
                  <Progress value={stockSyncProgress.percent} className="h-2" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{stockSyncProgress.percent}%</span>
                  </div>
                  {stockSyncProgress.error && (
                    <p className="text-xs text-destructive">❌ {stockSyncProgress.error}</p>
                  )}
                </div>
              )}

              {stockSyncReport && (
                <div className="mb-3 p-4 rounded-lg bg-background border space-y-3">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                    <div className="bg-emerald-500/10 rounded p-3 text-center border border-emerald-500/30">
                      <p className="font-bold text-lg text-foreground">{stockSyncReport.updated}</p>
                      <p className="text-muted-foreground">صنف محدّث ✅</p>
                    </div>
                    <div className="bg-blue-500/10 rounded p-3 text-center border border-blue-500/30">
                      <p className="font-bold text-lg text-foreground">{stockSyncReport.matched}</p>
                      <p className="text-muted-foreground">صنف مطابق</p>
                    </div>
                    <div className="bg-emerald-500/10 rounded p-3 text-center border border-emerald-500/30">
                      <p className="font-bold text-lg text-foreground">{stockSyncReport.withPositiveStock}</p>
                      <p className="text-muted-foreground">برصيد موجب</p>
                    </div>
                    <div className="bg-amber-500/10 rounded p-3 text-center border border-amber-500/30">
                      <p className="font-bold text-lg text-foreground">{Math.max(0, stockSyncReport.ourProducts - stockSyncReport.matched)}</p>
                      <p className="text-muted-foreground">غير مطابق ⚠️</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setShowStockReport(true)} className="flex-1 gap-2">
                      <Database className="w-4 h-4" /> عرض التقرير التفصيلي
                    </Button>
                    <Button variant="outline" size="sm" onClick={downloadStockReportCsv} className="gap-2">
                      <Copy className="w-4 h-4" /> CSV
                    </Button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  className="w-full gap-2 border-cyan-500/50 text-cyan-700 hover:bg-cyan-500/10"
                  onClick={runStockPreview}
                  disabled={syncing !== null || previewLoading !== null}
                >
                  {previewLoading === "stock" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <TestTube className="w-4 h-4" />
                  )}
                  {previewLoading === "stock" ? "جاري المعاينة..." : "👁️ معاينة قبل التنفيذ"}
                </Button>
                <Button
                  className="w-full gap-2 bg-cyan-600 hover:bg-cyan-700 text-white"
                  onClick={runStockSync}
                  disabled={syncing !== null || previewLoading !== null}
                >
                  {syncing === "stock_sync" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Package className="w-4 h-4" />
                  )}
                  {syncing === "stock_sync" ? "جاري المزامنة..." : "✅ تنفيذ نهائي"}
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground mt-2 text-center">
                💡 اضغط "معاينة" أولاً لرؤية كل التغييرات المتوقعة بدون تطبيقها
              </p>
            </CardContent>
          </Card>

          {/* Import Products Card - Full Width */}
          <Card className="border-2 border-primary/30 hover:border-primary/60 transition-colors bg-primary/5">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Play className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-foreground">🚀 استيراد الأصناف من الفيصل</h3>
                  <p className="text-xs text-muted-foreground">
                    جلب جميع المنتجات من نظام الفيصل وإضافتها تلقائياً — المنتجات الموجودة يتم تحديث أسعارها ومخزونها
                  </p>
                </div>
              </div>

              {/* Import Progress Bar */}
              {importProgress && (
                <div className="mb-3 p-4 rounded-lg bg-muted/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground flex items-center gap-2">
                      {!importProgress.done && <Loader2 className="w-4 h-4 animate-spin" />}
                      {importProgress.phase}
                    </span>
                    {importProgress.done && (
                      <Button variant="ghost" size="sm" onClick={() => setImportProgress(null)} className="h-6 px-2 text-xs">✕</Button>
                    )}
                  </div>

                  {importProgress.totalBatches > 0 && (
                    <>
                      <Progress value={(importProgress.currentBatch / importProgress.totalBatches) * 100} className="h-2" />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>الدفعة {importProgress.currentBatch} من {importProgress.totalBatches}</span>
                        <span>{Math.round((importProgress.currentBatch / importProgress.totalBatches) * 100)}%</span>
                      </div>
                    </>
                  )}

                  {importProgress.totalItems > 0 && (
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="bg-background rounded p-2 text-center">
                        <p className="font-bold text-foreground">{importProgress.imported}</p>
                        <p className="text-muted-foreground">جديد</p>
                      </div>
                      <div className="bg-background rounded p-2 text-center">
                        <p className="font-bold text-foreground">{importProgress.updated}</p>
                        <p className="text-muted-foreground">محدّث</p>
                      </div>
                      <div className="bg-background rounded p-2 text-center">
                        <p className="font-bold text-foreground">{importProgress.skipped}</p>
                        <p className="text-muted-foreground">تخطي</p>
                      </div>
                    </div>
                  )}

                  {importProgress.error && (
                    <p className="text-xs text-destructive">❌ {importProgress.error}</p>
                  )}
                </div>
              )}

              <Button
                className="w-full gap-2"
                onClick={handleBatchImport}
                disabled={syncing !== null}
              >
                {syncing === "import_products" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Database className="w-4 h-4" />
                )}
                استيراد الأصناف الآن
              </Button>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="border-2 hover:border-primary/40 transition-colors">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Database className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground">مزامنة المخزون</h3>
                    <p className="text-xs text-muted-foreground">سحب كميات المخزون من الـ ERP</p>
                  </div>
                </div>
                <Button
                  className="w-full gap-2"
                  onClick={() => runSync("sync_stock")}
                  disabled={syncing !== null}
                >
                  {syncing === "sync_stock" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  مزامنة الآن
                </Button>
                <p className="text-[10px] text-muted-foreground mt-2 text-center">
                  💡 إذا لم تتوفر الأرصدة من الـ API، استخدم "استيراد جماعي" لرفع ملف Excel
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-primary/40 transition-colors">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground">مزامنة الأسعار</h3>
                    <p className="text-xs text-muted-foreground">سحب أسعار المنتجات من الـ ERP</p>
                  </div>
                </div>
                <Button
                  className="w-full gap-2"
                  onClick={() => runSync("sync_prices")}
                  disabled={syncing !== null}
                >
                  {syncing === "sync_prices" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  مزامنة الآن
                </Button>
              </CardContent>
            </Card>
          </div>

          <Card className="border-dashed bg-muted/30">
            <CardContent className="p-4 text-center text-sm text-muted-foreground">
              <p>💡 عروض الأسعار والطلبات تتم مزامنتها تلقائياً عند إنشائها</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mapping" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                🔗 ربط أصناف الموقع بأكواد الفيصل
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">
                1. اضغط "جلب أصناف الفيصل" لتحميل قائمة المنتجات من الـ ERP. 
                2. اختر كود الفيصل المناسب لكل منتج. 
                3. اضغط "حفظ" لتثبيت الربط.
              </p>

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={fetchErpProducts}
                  disabled={fetchingErp}
                  className="gap-1"
                >
                  {fetchingErp ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
                  جلب أصناف الفيصل {erpProducts.length > 0 && `(${erpProducts.length})`}
                </Button>
                {erpProducts.length > 0 && (
                  <Button variant="outline" onClick={autoMatchByName} className="gap-1">
                    <Zap className="w-4 h-4" />
                    مطابقة تلقائية بالاسم
                  </Button>
                )}
                <Button
                  onClick={saveMappings}
                  disabled={savingMapping || Object.keys(mappingEdits).length === 0}
                  className="gap-1 mr-auto"
                >
                  {savingMapping ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  حفظ ({Object.keys(mappingEdits).length})
                </Button>
              </div>

              {/* Search */}
              <Input
                placeholder="بحث بالاسم أو SKU أو كود الفيصل..."
                value={mappingSearch}
                onChange={(e) => setMappingSearch(e.target.value)}
              />

              <div className="text-xs text-muted-foreground flex gap-4">
                <span>إجمالي: {mappingProducts.length}</span>
                <span className="text-primary">مربوط: {mappingProducts.filter(p => p.erp_item_code || mappingEdits[p.id]).length}</span>
                <span>غير مربوط: {mappingProducts.filter(p => !p.erp_item_code && !mappingEdits[p.id]).length}</span>
              </div>

              <div className="border rounded-lg overflow-hidden max-h-[500px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted sticky top-0 z-10">
                    <tr>
                      <th className="text-right p-2 font-medium">المنتج</th>
                      <th className="text-right p-2 font-medium w-28">SKU</th>
                      <th className="text-right p-2 font-medium w-64">كود الفيصل</th>
                      <th className="text-center p-2 font-medium w-14">الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mappingProducts
                      .filter(p => {
                        if (!mappingSearch) return true;
                        const q = mappingSearch.toLowerCase();
                        return p.name_ar?.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q) || (p.erp_item_code || "").toLowerCase().includes(q);
                      })
                      .slice(0, 100)
                      .map((product) => {
                        const currentValue = mappingEdits[product.id] ?? product.erp_item_code ?? "";
                        const searchTerm = (erpSearchFilter[product.id] || "").toLowerCase();
                        const filteredErp = erpProducts.filter(ep =>
                          !searchTerm || ep.id.includes(searchTerm) || (ep.name || "").toLowerCase().includes(searchTerm)
                        ).slice(0, 20);

                        return (
                          <tr key={product.id} className="border-t hover:bg-muted/30">
                            <td className="p-2 text-xs">{product.name_ar}</td>
                            <td className="p-2 text-xs font-mono" dir="ltr">{product.sku}</td>
                            <td className="p-2">
                              {erpProducts.length > 0 ? (
                                <div className="relative">
                                  <Input
                                    className="h-7 text-xs font-mono"
                                    dir="ltr"
                                    placeholder="ابحث في أصناف الفيصل..."
                                    value={erpSearchFilter[product.id] !== undefined ? erpSearchFilter[product.id] : currentValue}
                                    onChange={(e) => {
                                      setErpSearchFilter(prev => ({ ...prev, [product.id]: e.target.value }));
                                    }}
                                    onFocus={() => {
                                      if (erpSearchFilter[product.id] === undefined) {
                                        setErpSearchFilter(prev => ({ ...prev, [product.id]: "" }));
                                      }
                                    }}
                                    onBlur={() => {
                                      setTimeout(() => {
                                        setErpSearchFilter(prev => {
                                          const next = { ...prev };
                                          delete next[product.id];
                                          return next;
                                        });
                                      }, 200);
                                    }}
                                  />
                                  {erpSearchFilter[product.id] !== undefined && (
                                    <div className="absolute z-20 top-full left-0 right-0 bg-background border rounded-md shadow-lg max-h-40 overflow-y-auto mt-1">
                                      {filteredErp.map((ep) => (
                                        <button
                                          key={ep.id}
                                          className="w-full text-right px-2 py-1.5 text-xs hover:bg-muted flex justify-between items-center gap-2"
                                          onMouseDown={(e) => {
                                            e.preventDefault();
                                            setMappingEdits(prev => ({ ...prev, [product.id]: ep.id }));
                                            setErpSearchFilter(prev => {
                                              const next = { ...prev };
                                              delete next[product.id];
                                              return next;
                                            });
                                          }}
                                        >
                                          <span className="font-mono text-primary" dir="ltr">{ep.id}</span>
                                          <span className="truncate text-muted-foreground">{ep.name}</span>
                                        </button>
                                      ))}
                                      {filteredErp.length === 0 && (
                                        <p className="text-xs text-muted-foreground p-2 text-center">لا نتائج</p>
                                      )}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <Input
                                  className="h-7 text-xs font-mono"
                                  dir="ltr"
                                  placeholder="مثال: 10003"
                                  value={currentValue}
                                  onChange={(e) =>
                                    setMappingEdits(prev => ({ ...prev, [product.id]: e.target.value }))
                                  }
                                />
                              )}
                            </td>
                            <td className="p-2 text-center">
                              {currentValue ? (
                                <Badge variant="default" className="text-[10px]">✓</Badge>
                              ) : (
                                <Badge variant="outline" className="text-[10px]">—</Badge>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── WEBHOOK TEST ─── */}
        <TabsContent value="webhook" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Globe className="w-4 h-4" />
                رابط الـ Webhook
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input value={webhookUrl} readOnly className="font-mono text-xs" dir="ltr" />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    navigator.clipboard.writeText(webhookUrl);
                    toast({ title: "تم نسخ الرابط ✓" });
                  }}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                أرسل هذا الرابط للدعم الفني لنظام الفيصل لإعداد الـ Webhook.
                يجب إرسال header: <code className="bg-muted px-1 rounded">x-webhook-secret: {config.webhook_secret.slice(0, 20)}...</code>
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TestTube className="w-4 h-4" />
                اختبار الـ Webhook
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">
                اختبر استقبال البيانات من الـ ERP. الأحداث المدعومة: 
                <code className="bg-muted px-1 rounded mx-1">order.updated</code>
                <code className="bg-muted px-1 rounded mx-1">stock.updated</code>
                <code className="bg-muted px-1 rounded mx-1">price.updated</code>
              </p>
              <Textarea
                value={testPayload}
                onChange={(e) => setTestPayload(e.target.value)}
                className="font-mono text-xs min-h-[180px]"
                dir="ltr"
              />
              <Button
                className="w-full gap-2"
                onClick={testWebhook}
                disabled={syncing !== null}
              >
                {syncing === "webhook_test" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                إرسال اختبار
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── CONFIG ─── */}
        <TabsContent value="config" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Settings className="w-4 h-4" />
                إعدادات الربط مع الفيصل ERP
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">وضع التشغيل</label>
                <div className="flex gap-2">
                  <Button
                    variant={config.erp_mode === "mock" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setConfig((c) => ({ ...c, erp_mode: "mock" }))}
                    className="flex-1"
                  >
                    🧪 تجريبي (Mock)
                  </Button>
                  <Button
                    variant={config.erp_mode === "live" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setConfig((c) => ({ ...c, erp_mode: "live" }))}
                    className="flex-1"
                  >
                    🟢 مباشر (Live)
                  </Button>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">رابط الـ API</label>
                <Input
                  value={config.erp_base_url}
                  onChange={(e) => setConfig((c) => ({ ...c, erp_base_url: e.target.value }))}
                  placeholder="https://alfaysalerp.com/api"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Webhook Secret</label>
                <Input value={config.webhook_secret} readOnly className="font-mono text-xs" dir="ltr" />
                <p className="text-[10px] text-muted-foreground mt-1">
                  يتم توليده تلقائياً — أرسله للدعم الفني للفيصل
                </p>
              </div>

              {/* ─── Secrets Info Panel ─── */}
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                  <p className="text-sm font-bold text-foreground">بيانات الاعتماد (Secrets)</p>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  المصادقة مع نظام الفيصل تتم تلقائياً عبر Secrets محفوظة بأمان في الخادم — وليس من هذه الواجهة. الأسرار المُستخدمة فعلياً:
                </p>
                <ul className="text-xs space-y-1 text-foreground/80 pr-3">
                  <li>• <code className="bg-muted px-1.5 py-0.5 rounded text-[10px]">ERP_FAISAL_USERNAME</code> — اسم المستخدم</li>
                  <li>• <code className="bg-muted px-1.5 py-0.5 rounded text-[10px]">ERP_FAISAL_PASSWORD</code> — كلمة المرور</li>
                  <li>• <code className="bg-muted px-1.5 py-0.5 rounded text-[10px]">ERP_FAISAL_API_KEY</code> — مفتاح داخلي للاستدعاءات الآلية</li>
                </ul>
                <p className="text-[10px] text-muted-foreground mt-1">
                  لتحديث أي منها، استخدم إعدادات Lovable Cloud → Secrets.
                </p>
              </div>

              <Button onClick={saveConfig} disabled={savingConfig} className="w-full gap-2">
                {savingConfig ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                حفظ الإعدادات
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── LOGS ─── */}
        <TabsContent value="logs" className="space-y-3 mt-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-foreground">سجل العمليات</h3>
            <Button variant="ghost" size="sm" onClick={fetchData} className="gap-1 text-xs">
              <RefreshCw className="w-3 h-3" /> تحديث
            </Button>
          </div>

          {logs.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-8 text-center">
                <Clock className="w-10 h-10 mx-auto text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">لا توجد عمليات مزامنة بعد</p>
              </CardContent>
            </Card>
          ) : (
            logs.map((log) => {
              const typeInfo = syncTypeLabels[log.sync_type] || syncTypeLabels.error;
              const statusInfo = statusStyles[log.status] || statusStyles.pending;
              const TypeIcon = typeInfo.icon;

              return (
                <Card key={log.id} className="hover:bg-muted/20 transition-colors">
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        log.direction === "outbound" ? "bg-blue-500/10" : "bg-emerald-500/10"
                      }`}>
                        {log.direction === "outbound" ? (
                          <ArrowUpRight className="w-4 h-4 text-blue-500" />
                        ) : (
                          <ArrowDownLeft className="w-4 h-4 text-emerald-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold text-foreground">{typeInfo.label}</span>
                          <Badge variant={statusInfo.variant} className="text-[10px]">
                            {statusInfo.label}
                          </Badge>
                          {log.reference_number && (
                            <span className="text-[10px] font-mono text-muted-foreground">
                              #{log.reference_number}
                            </span>
                          )}
                        </div>
                        {log.error_message && (
                          <p className="text-xs text-destructive">{log.error_message}</p>
                        )}
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(log.created_at).toLocaleDateString("ar-EG", {
                            year: "numeric", month: "short", day: "numeric",
                            hour: "2-digit", minute: "2-digit", second: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        {/* ─── UNLINKED PRODUCTS REPORT ─── */}
        <TabsContent value="unlinked" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between flex-wrap gap-3">
                <span className="flex items-center gap-2 text-base">
                  <Package className="w-5 h-5 text-destructive" />
                  أصناف بدون كود فيصل ({(() => {
                    let filtered = unlinkedProducts;
                    if (unlinkedBrandFilter !== "all") filtered = filtered.filter(p => p.brand === unlinkedBrandFilter);
                    if (unlinkedSearch.trim()) filtered = filtered.filter(p => p.name_ar?.includes(unlinkedSearch) || p.sku?.includes(unlinkedSearch));
                    return filtered.length;
                  })()})
                </span>
                <Button size="sm" variant="outline" onClick={fetchUnlinkedProducts} disabled={unlinkedLoading}>
                  <RefreshCw className={`w-4 h-4 ml-1 ${unlinkedLoading ? "animate-spin" : ""}`} />
                  تحديث
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  value={unlinkedSearch}
                  onChange={e => setUnlinkedSearch(e.target.value)}
                  placeholder="بحث بالاسم أو رقم القطعة..."
                  className="flex-1"
                  dir="rtl"
                />
                <select
                  value={unlinkedBrandFilter}
                  onChange={e => setUnlinkedBrandFilter(e.target.value)}
                  className="border rounded-md px-3 py-2 text-sm bg-background text-foreground"
                >
                  <option value="all">كل الماركات</option>
                  <option value="toyota_genuine">تويوتا أصلي</option>
                  <option value="toyota_oils">زيوت تويوتا</option>
                  <option value="mtx_aftermarket">MTX</option>
                  <option value="denso">DENSO</option>
                  <option value="aisin">AISIN</option>
                  <option value="fbk">FBK</option>
                </select>
              </div>

              {unlinkedLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : (() => {
                let filtered = unlinkedProducts;
                if (unlinkedBrandFilter !== "all") filtered = filtered.filter(p => p.brand === unlinkedBrandFilter);
                if (unlinkedSearch.trim()) filtered = filtered.filter(p => p.name_ar?.includes(unlinkedSearch) || p.sku?.includes(unlinkedSearch));
                
                if (filtered.length === 0) return (
                  <p className="text-center text-muted-foreground py-8">🎉 كل الأصناف مربوطة بأكواد الفيصل!</p>
                );

                const grouped = filtered.reduce((acc: Record<string, any[]>, p: any) => {
                  const brand = p.brand || "unknown";
                  if (!acc[brand]) acc[brand] = [];
                  acc[brand].push(p);
                  return acc;
                }, {});

                const brandNames: Record<string, string> = {
                  toyota_genuine: "تويوتا أصلي",
                  toyota_oils: "زيوت تويوتا",
                  mtx_aftermarket: "MTX",
                  denso: "DENSO",
                  aisin: "AISIN",
                  fbk: "FBK",
                };

                return Object.entries(grouped).map(([brand, products]) => (
                  <div key={brand} className="space-y-2">
                    <h3 className="font-semibold text-sm text-muted-foreground flex items-center gap-2">
                      <Badge variant="secondary">{brandNames[brand] || brand}</Badge>
                      <span>({(products as any[]).length} صنف)</span>
                    </h3>
                    <div className="border rounded-lg divide-y">
                      {(products as any[]).map((p: any) => (
                        <div key={p.id} className="flex items-center justify-between p-3 hover:bg-muted/50 transition-colors">
                          <div className="flex items-center gap-3 min-w-0">
                            {p.image_url ? (
                              <img src={p.image_url} alt="" className="w-8 h-8 rounded object-cover shrink-0 bg-muted" />
                            ) : (
                              <div className="w-8 h-8 rounded bg-muted flex items-center justify-center shrink-0">
                                <Package className="w-4 h-4 text-muted-foreground" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate">{p.name_ar}</p>
                              <p className="text-xs text-muted-foreground font-mono" dir="ltr">{p.sku}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs text-muted-foreground">{p.base_price} ج.م</span>
                            {!p.is_active && <Badge variant="destructive" className="text-[10px]">غير نشط</Badge>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ));
              })()}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Detailed Per-Record Price Sync Report Dialog */}
      <Dialog open={showPriceReport} onOpenChange={setShowPriceReport}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-amber-600" />
              تقرير مزامنة الأسعار التفصيلي
            </DialogTitle>
          </DialogHeader>

          {priceSyncReport && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
                <div className="bg-muted rounded p-2 text-center">
                  <p className="font-bold text-foreground">{priceSyncReport.erpTotal}</p>
                  <p className="text-muted-foreground">في الفيصل</p>
                </div>
                <div className="bg-muted rounded p-2 text-center">
                  <p className="font-bold text-foreground">{priceSyncReport.ourProducts}</p>
                  <p className="text-muted-foreground">على موقعنا</p>
                </div>
                <div className="bg-emerald-500/10 rounded p-2 text-center">
                  <p className="font-bold text-foreground">{priceSyncReport.matched}</p>
                  <p className="text-muted-foreground">مطابق ✅</p>
                </div>
                <div className="bg-emerald-500/10 rounded p-2 text-center">
                  <p className="font-bold text-foreground">{priceSyncReport.retailUpdated}</p>
                  <p className="text-muted-foreground">سعر قطاعي محدّث</p>
                </div>
                <div className="bg-emerald-500/10 rounded p-2 text-center">
                  <p className="font-bold text-foreground">{priceSyncReport.wholesaleUpdated}</p>
                  <p className="text-muted-foreground">سعر جملة محدّث</p>
                </div>
              </div>

              <Button onClick={downloadPriceReportCsv} variant="outline" size="sm" className="w-full gap-2">
                <Copy className="w-4 h-4" /> تحميل التقرير الكامل (CSV)
              </Button>

              <div>
                <h4 className="font-semibold mb-2 text-sm flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  عيّنة من السجلات الناجحة (أول 5)
                </h4>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-muted">
                      <tr>
                        <th className="p-2 text-right">كود الفيصل</th>
                        <th className="p-2 text-right">الاسم</th>
                        <th className="p-2 text-right">قطاعي</th>
                        <th className="p-2 text-right">جملة</th>
                        <th className="p-2 text-right">الحالة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {priceSyncReport.sample.length === 0 && (
                        <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">لا توجد سجلات</td></tr>
                      )}
                      {priceSyncReport.sample.map((s, i) => (
                        <tr key={i} className="border-t">
                          <td className="p-2 font-mono">{s.id}</td>
                          <td className="p-2">{s.name || "—"}</td>
                          <td className="p-2">{s.retailPrice ? `${s.retailPrice} ج.م` : "—"}</td>
                          <td className="p-2">{s.wholesalePrice ? `${s.wholesalePrice} ج.م` : "—"}</td>
                          <td className="p-2">
                            {s.status === "success" ? (
                              <Badge variant="default" className="bg-emerald-600">نجح</Badge>
                            ) : (
                              <Badge variant="secondary" title={s.reason}>تخطي</Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {priceSyncReport.failures.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2 text-sm flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-destructive" />
                    أصناف فشلت أو بدون مطابقة
                  </h4>
                  <div className="space-y-2">
                    {priceSyncReport.failures.map((f, i) => (
                      <div key={i} className="p-3 rounded border border-destructive/30 bg-destructive/5 text-xs">
                        <p className="font-medium text-destructive">{f.reason}</p>
                        <p className="text-muted-foreground mt-1">💡 الحل: تأكد من إضافة كود الفيصل (erp_item_code) لكل منتج في صفحة "المنتجات"</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-xs text-muted-foreground text-center">
                ⏱️ اكتمل في: {new Date(priceSyncReport.finishedAt).toLocaleString("ar-EG")}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Detailed Per-Record Stock Sync Report Dialog */}
      <Dialog open={showStockReport} onOpenChange={setShowStockReport}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-cyan-600" />
              تقرير مزامنة الأرصدة التفصيلي
            </DialogTitle>
          </DialogHeader>

          {stockSyncReport && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
                <div className="bg-muted rounded p-2 text-center">
                  <p className="font-bold text-foreground">{stockSyncReport.erpTotal}</p>
                  <p className="text-muted-foreground">في الفيصل</p>
                </div>
                <div className="bg-muted rounded p-2 text-center">
                  <p className="font-bold text-foreground">{stockSyncReport.ourProducts}</p>
                  <p className="text-muted-foreground">على موقعنا</p>
                </div>
                <div className="bg-emerald-500/10 rounded p-2 text-center">
                  <p className="font-bold text-foreground">{stockSyncReport.matched}</p>
                  <p className="text-muted-foreground">مطابق ✅</p>
                </div>
                <div className="bg-emerald-500/10 rounded p-2 text-center">
                  <p className="font-bold text-foreground">{stockSyncReport.updated}</p>
                  <p className="text-muted-foreground">تم تحديثه</p>
                </div>
                <div className="bg-blue-500/10 rounded p-2 text-center">
                  <p className="font-bold text-foreground">{stockSyncReport.withPositiveStock}</p>
                  <p className="text-muted-foreground">برصيد &gt; 0</p>
                </div>
              </div>

              <Button onClick={downloadStockReportCsv} variant="outline" size="sm" className="w-full gap-2">
                <Copy className="w-4 h-4" /> تحميل التقرير الكامل (CSV)
              </Button>

              <div>
                <h4 className="font-semibold mb-2 text-sm flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  عيّنة من السجلات المحدّثة (أول 5 برصيد موجب)
                </h4>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-muted">
                      <tr>
                        <th className="p-2 text-right">كود الفيصل</th>
                        <th className="p-2 text-right">الرصيد الجديد</th>
                        <th className="p-2 text-right">الحالة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stockSyncReport.sample.length === 0 && (
                        <tr><td colSpan={3} className="p-4 text-center text-muted-foreground">لا توجد عيّنة برصيد موجب</td></tr>
                      )}
                      {stockSyncReport.sample.map((s, i) => (
                        <tr key={i} className="border-t">
                          <td className="p-2 font-mono">{s.id}</td>
                          <td className="p-2 font-bold">{s.qty}</td>
                          <td className="p-2">
                            {s.status === "in_stock" ? (
                              <Badge variant="default" className="bg-emerald-600">متوفر ✅</Badge>
                            ) : (
                              <Badge variant="secondary">نافذ ⚠️</Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {stockSyncReport.failures.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2 text-sm flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-destructive" />
                    تنبيهات / أصناف بدون مطابقة
                  </h4>
                  <div className="space-y-2">
                    {stockSyncReport.failures.map((f, i) => (
                      <div key={i} className="p-3 rounded border border-destructive/30 bg-destructive/5 text-xs">
                        <p className="font-medium text-destructive">{f.reason}</p>
                        <p className="text-muted-foreground mt-1">💡 الحل: تأكد من إضافة كود الفيصل (erp_item_code) لكل منتج في صفحة "المنتجات"</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-xs text-muted-foreground text-center">
                ⏱️ اكتمل في: {new Date(stockSyncReport.finishedAt).toLocaleString("ar-EG")}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── Price Preview (Dry-Run) Dialog ─── */}
      <Dialog open={showPricePreview} onOpenChange={setShowPricePreview}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TestTube className="w-5 h-5 text-amber-600" />
              معاينة تغييرات الأسعار قبل التنفيذ
              <Badge variant="outline" className="ms-2">Dry-Run</Badge>
            </DialogTitle>
          </DialogHeader>
          {pricePreview && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
                <div className="bg-muted rounded p-2 text-center">
                  <p className="font-bold text-foreground">{pricePreview.matched}</p>
                  <p className="text-muted-foreground">صنف مطابق</p>
                </div>
                <div className="bg-amber-500/10 rounded p-2 text-center border border-amber-500/30">
                  <p className="font-bold text-foreground">{pricePreview.changesCount}</p>
                  <p className="text-muted-foreground">سيتم تعديله</p>
                </div>
                <div className="bg-emerald-500/10 rounded p-2 text-center">
                  <p className="font-bold text-foreground">{pricePreview.increases}</p>
                  <p className="text-muted-foreground">ارتفاع ⬆️</p>
                </div>
                <div className="bg-rose-500/10 rounded p-2 text-center">
                  <p className="font-bold text-foreground">{pricePreview.decreases}</p>
                  <p className="text-muted-foreground">انخفاض ⬇️</p>
                </div>
                <div className="bg-orange-500/10 rounded p-2 text-center border border-orange-500/30">
                  <p className="font-bold text-foreground">{pricePreview.bigChanges}</p>
                  <p className="text-muted-foreground">تغيير ≥ 10%</p>
                </div>
              </div>

              {/* Wholesale stats row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                <div className="bg-blue-500/10 rounded p-2 text-center border border-blue-500/30">
                  <p className="font-bold text-foreground">{pricePreview.wholesaleChangesCount}</p>
                  <p className="text-muted-foreground">سعر جملة سيتغيّر</p>
                </div>
                <div className="bg-emerald-500/10 rounded p-2 text-center">
                  <p className="font-bold text-foreground">{pricePreview.wholesaleIncreases}</p>
                  <p className="text-muted-foreground">جملة ⬆️</p>
                </div>
                <div className="bg-rose-500/10 rounded p-2 text-center">
                  <p className="font-bold text-foreground">{pricePreview.wholesaleDecreases}</p>
                  <p className="text-muted-foreground">جملة ⬇️</p>
                </div>
                <div className="bg-violet-500/10 rounded p-2 text-center border border-violet-500/30">
                  <p className="font-bold text-foreground">{pricePreview.wholesaleNew}</p>
                  <p className="text-muted-foreground">جملة جديدة 🆕</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button onClick={() => downloadPreviewCsv("prices")} variant="outline" size="sm" className="gap-2">
                  <Copy className="w-4 h-4" /> تحميل المعاينة (CSV)
                </Button>
                <Button
                  onClick={() => { setShowPricePreview(false); runPriceSync(); }}
                  size="sm"
                  className="gap-2 bg-amber-600 hover:bg-amber-700 text-white ms-auto"
                  disabled={pricePreview.changesCount === 0}
                >
                  <CheckCircle className="w-4 h-4" /> تأكيد وتنفيذ التغييرات الآن
                </Button>
              </div>

              {pricePreview.changes.length === 0 ? (
                <div className="p-6 rounded-lg bg-muted/50 text-center text-sm text-muted-foreground">
                  ✅ لا توجد تغييرات أسعار — كل الأصناف المطابقة بنفس السعر بين موقعنا والفيصل
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-muted sticky top-0">
                      <tr>
                        <th className="p-2 text-right">كود</th>
                        <th className="p-2 text-right">الصنف</th>
                        <th className="p-2 text-right">السعر الحالي</th>
                        <th className="p-2 text-right">السعر الجديد</th>
                        <th className="p-2 text-right">الفرق</th>
                        <th className="p-2 text-right">النسبة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pricePreview.changes.map((c, i) => (
                        <tr key={i} className="border-t hover:bg-muted/30">
                          <td className="p-2 font-mono">{c.erp_id}</td>
                          <td className="p-2 max-w-[200px] truncate" title={c.name}>{c.name || "—"}</td>
                          <td className="p-2 text-muted-foreground line-through">{c.old_price.toLocaleString("ar-EG")}</td>
                          <td className="p-2 font-bold">{c.new_price.toLocaleString("ar-EG")}</td>
                          <td className={`p-2 font-medium ${c.delta > 0 ? "text-emerald-600" : "text-rose-600"}`}>
                            {c.delta > 0 ? "+" : ""}{c.delta.toLocaleString("ar-EG")}
                          </td>
                          <td className="p-2">
                            <Badge variant={Math.abs(c.pct) >= 10 ? "destructive" : "secondary"} className="text-[10px]">
                              {c.pct > 0 ? "+" : ""}{c.pct}%
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {pricePreview.changesCount > pricePreview.changes.length && (
                    <p className="p-2 text-center text-xs text-muted-foreground bg-muted">
                      عرض أول {pricePreview.changes.length} من {pricePreview.changesCount} — حمّل CSV للقائمة الكاملة
                    </p>
                  )}
                </div>
              )}

              {/* Wholesale changes table */}
              {pricePreview.wholesaleChanges.length > 0 && (
                <div className="border rounded-lg overflow-hidden border-blue-500/30">
                  <div className="bg-blue-500/10 p-2 text-xs font-semibold text-foreground">
                    📋 تغييرات أسعار الجملة (wholesale_tier1) — {pricePreview.wholesaleChangesCount} صنف
                  </div>
                  <table className="w-full text-xs">
                    <thead className="bg-muted sticky top-0">
                      <tr>
                        <th className="p-2 text-right">كود</th>
                        <th className="p-2 text-right">الصنف</th>
                        <th className="p-2 text-right">السعر الحالي</th>
                        <th className="p-2 text-right">السعر الجديد</th>
                        <th className="p-2 text-right">الفرق</th>
                        <th className="p-2 text-right">النسبة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pricePreview.wholesaleChanges.map((c, i) => (
                        <tr key={i} className="border-t hover:bg-muted/30">
                          <td className="p-2 font-mono">{c.erp_id}</td>
                          <td className="p-2 max-w-[200px] truncate" title={c.name}>{c.name || "—"}</td>
                          <td className="p-2 text-muted-foreground line-through">{c.old_price.toLocaleString("ar-EG")}</td>
                          <td className="p-2 font-bold">{c.new_price.toLocaleString("ar-EG")}</td>
                          <td className={`p-2 font-medium ${c.delta > 0 ? "text-emerald-600" : "text-rose-600"}`}>
                            {c.delta > 0 ? "+" : ""}{c.delta.toLocaleString("ar-EG")}
                          </td>
                          <td className="p-2">
                            <Badge variant={c.status === "new" ? "default" : (Math.abs(c.pct) >= 10 ? "destructive" : "secondary")} className="text-[10px]">
                              {c.status === "new" ? "جديد 🆕" : `${c.pct > 0 ? "+" : ""}${c.pct}%`}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {pricePreview.wholesaleChangesCount > pricePreview.wholesaleChanges.length && (
                    <p className="p-2 text-center text-xs text-muted-foreground bg-muted">
                      عرض أول {pricePreview.wholesaleChanges.length} من {pricePreview.wholesaleChangesCount}
                    </p>
                  )}
                </div>
              )}

              <p className="text-xs text-muted-foreground text-center">
                ⏱️ تم التوليد: {new Date(pricePreview.generatedAt).toLocaleString("ar-EG")} — لم يتم كتابة أي شيء بعد
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── Stock Preview (Dry-Run) Dialog ─── */}
      <Dialog open={showStockPreview} onOpenChange={setShowStockPreview}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TestTube className="w-5 h-5 text-cyan-600" />
              معاينة تغييرات الأرصدة قبل التنفيذ
              <Badge variant="outline" className="ms-2">Dry-Run</Badge>
            </DialogTitle>
          </DialogHeader>
          {stockPreview && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
                <div className="bg-muted rounded p-2 text-center">
                  <p className="font-bold text-foreground">{stockPreview.matched}</p>
                  <p className="text-muted-foreground">صنف مطابق</p>
                </div>
                <div className="bg-cyan-500/10 rounded p-2 text-center border border-cyan-500/30">
                  <p className="font-bold text-foreground">{stockPreview.changesCount}</p>
                  <p className="text-muted-foreground">سيتم تعديله</p>
                </div>
                <div className="bg-emerald-500/10 rounded p-2 text-center">
                  <p className="font-bold text-foreground">{stockPreview.backInStock}</p>
                  <p className="text-muted-foreground">يعود متوفر ✅</p>
                </div>
                <div className="bg-rose-500/10 rounded p-2 text-center">
                  <p className="font-bold text-foreground">{stockPreview.outOfStock}</p>
                  <p className="text-muted-foreground">سينفد ⚠️</p>
                </div>
                <div className="bg-blue-500/10 rounded p-2 text-center">
                  <p className="font-bold text-foreground">{stockPreview.increases + stockPreview.decreases}</p>
                  <p className="text-muted-foreground">تعديل كمية</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button onClick={() => downloadPreviewCsv("stock")} variant="outline" size="sm" className="gap-2">
                  <Copy className="w-4 h-4" /> تحميل المعاينة (CSV)
                </Button>
                <Button
                  onClick={() => { setShowStockPreview(false); runStockSync(); }}
                  size="sm"
                  className="gap-2 bg-cyan-600 hover:bg-cyan-700 text-white ms-auto"
                  disabled={stockPreview.changesCount === 0}
                >
                  <CheckCircle className="w-4 h-4" /> تأكيد وتنفيذ التغييرات الآن
                </Button>
              </div>

              {stockPreview.changes.length === 0 ? (
                <div className="p-6 rounded-lg bg-muted/50 text-center text-sm text-muted-foreground">
                  ✅ لا توجد تغييرات أرصدة — كل الأصناف المطابقة بنفس الكمية
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-muted sticky top-0">
                      <tr>
                        <th className="p-2 text-right">كود</th>
                        <th className="p-2 text-right">الصنف</th>
                        <th className="p-2 text-right">الرصيد الحالي</th>
                        <th className="p-2 text-right">الرصيد الجديد</th>
                        <th className="p-2 text-right">الفرق</th>
                        <th className="p-2 text-right">الحالة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stockPreview.changes.map((c, i) => {
                        const labelMap: Record<string, { text: string; cls: string }> = {
                          increase: { text: "زيادة ⬆️", cls: "bg-emerald-600 text-white" },
                          decrease: { text: "نقصان ⬇️", cls: "bg-amber-600 text-white" },
                          back_in_stock: { text: "متوفر مرة أخرى ✅", cls: "bg-emerald-700 text-white" },
                          out_of_stock: { text: "نفد ⚠️", cls: "bg-rose-600 text-white" },
                        };
                        const lbl = labelMap[c.status] || { text: c.status, cls: "" };
                        return (
                          <tr key={i} className="border-t hover:bg-muted/30">
                            <td className="p-2 font-mono">{c.erp_id}</td>
                            <td className="p-2 max-w-[200px] truncate" title={c.name}>{c.name || "—"}</td>
                            <td className="p-2 text-muted-foreground line-through">{c.old_qty}</td>
                            <td className="p-2 font-bold">{c.new_qty}</td>
                            <td className={`p-2 font-medium ${c.delta > 0 ? "text-emerald-600" : "text-rose-600"}`}>
                              {c.delta > 0 ? "+" : ""}{c.delta}
                            </td>
                            <td className="p-2">
                              <Badge className={`text-[10px] ${lbl.cls}`}>{lbl.text}</Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {stockPreview.changesCount > stockPreview.changes.length && (
                    <p className="p-2 text-center text-xs text-muted-foreground bg-muted">
                      عرض أول {stockPreview.changes.length} من {stockPreview.changesCount} — حمّل CSV للقائمة الكاملة
                    </p>
                  )}
                </div>
              )}

              <p className="text-xs text-muted-foreground text-center">
                ⏱️ تم التوليد: {new Date(stockPreview.generatedAt).toLocaleString("ar-EG")} — لم يتم كتابة أي شيء بعد
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminERPSync;
