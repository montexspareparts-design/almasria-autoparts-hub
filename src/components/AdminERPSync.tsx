import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, RefreshCw, ArrowUpRight, ArrowDownLeft, CheckCircle,
  XCircle, Clock, Settings, Play, Database, DollarSign, Package,
  Zap, TestTube, Globe, Copy
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
    const { data } = await supabase
      .from("products")
      .select("id, sku, name_ar, erp_item_code, stock_quantity, base_price")
      .eq("is_active", true)
      .order("name_ar");
    setMappingProducts(data || []);
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
      toast({
        title: "تمت المزامنة ✓",
        description: data?.message || `تم تنفيذ ${action} بنجاح`,
      });
      fetchData();
    } catch (err: any) {
      toast({ title: "خطأ في المزامنة", description: err.message, variant: "destructive" });
    }
    setSyncing(null);
  };

  const testWebhook = async () => {
    setSyncing("webhook_test");
    try {
      const payload = JSON.parse(testPayload);
      const { data, error } = await supabase.functions.invoke("erp-webhook", {
        body: payload,
        headers: { "x-webhook-secret": config.webhook_secret },
      });
      if (error) throw error;
      toast({
        title: "تم اختبار الـ Webhook ✓",
        description: JSON.stringify(data),
      });
      fetchData();
    } catch (err: any) {
      toast({ title: "خطأ في الاختبار", description: err.message, variant: "destructive" });
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
              {syncing === "import_products" && (
                <div className="mb-3 p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  جاري استيراد الأصناف... قد يستغرق بضع دقائق حسب عدد المنتجات
                </div>
              )}
              <Button
                className="w-full gap-2"
                onClick={() => runSync("import_products")}
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
                <label className="text-sm font-medium text-foreground mb-1.5 block">API Key</label>
                <Input
                  value={config.erp_api_key}
                  onChange={(e) => setConfig((c) => ({ ...c, erp_api_key: e.target.value }))}
                  placeholder="أدخل مفتاح الـ API"
                  type="password"
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
    </div>
  );
};

export default AdminERPSync;
