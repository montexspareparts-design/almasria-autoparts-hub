import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, Database, Package, AlertTriangle, CheckCircle2, XCircle, Tag, Boxes, Clock, Zap } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface HealthData {
  base_url: string;
  refreshed: boolean;
  refresh_error: string | null;
  faisal: { total: number; with_retail_price: number; with_wholesale_price: number };
  site: { total: number; in_stock: number };
  meta: { last_synced_at: string | null; total_items: number; last_error: string | null } | null;
  recent_syncs: Array<{ sync_type: string; status: string; created_at: string; error_message: string | null }>;
}

const AdminFaisalCatalogHealth = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<HealthData | null>(null);
  const [fullSyncRunning, setFullSyncRunning] = useState(false);
  const [fullSyncResult, setFullSyncResult] = useState<{
    matched: number;
    changes: number;
    increases: number;
    decreases: number;
    backInStock: number;
    outOfStock: number;
    at: string;
  } | null>(null);

  const runFullStockSync = async () => {
    setFullSyncRunning(true);
    setFullSyncResult(null);
    const t = toast.loading("⚡ جارٍ تشغيل المزامنة الكاملة للمخزون من الفيصل...");
    try {
      const { data: res, error } = await supabase.functions.invoke("erp-sync-outbound", {
        body: { action: "sync_stock", dry_run: false, data: { dry_run: false } },
      });
      if (error) throw error;
      if (res?.success === false) throw new Error(res?.message || "فشل التنفيذ");
      const result = {
        matched: res?.matched || 0,
        changes: res?.changes_count || 0,
        increases: res?.increases || 0,
        decreases: res?.decreases || 0,
        backInStock: res?.back_in_stock || 0,
        outOfStock: res?.out_of_stock || 0,
        at: new Date().toISOString(),
      };
      setFullSyncResult(result);
      toast.success(
        `✅ تمت المزامنة الكاملة — ${result.changes} رصيد تم تحديثه (↑${result.increases} / ↓${result.decreases})`,
        { id: t, duration: 6000 }
      );
      // Refresh health data
      fetchHealth(false);
    } catch (e: any) {
      toast.error("❌ فشل تشغيل المزامنة: " + (e?.message || "خطأ غير معروف"), { id: t });
    } finally {
      setFullSyncRunning(false);
    }
  };

  const fetchHealth = async (forceRefresh = false) => {
    if (forceRefresh) setRefreshing(true); else setLoading(true);
    try {
      const { data: res, error } = await supabase.functions.invoke("erp-search-products", {
        body: { health: true, refresh: forceRefresh },
      });
      if (error) throw error;
      if (!res?.success) throw new Error(res?.error || "فشل تحميل البيانات");
      setData(res.health);
      if (forceRefresh) {
        if (res.health.refresh_error) {
          toast.error("فشلت المزامنة: " + res.health.refresh_error);
        } else {
          toast.success(`تمت المزامنة: ${res.health.faisal.total.toLocaleString("ar-EG")} صنف من الفيصل`);
        }
      }
    } catch (e: any) {
      toast.error(e?.message || "حدث خطأ");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchHealth(false); }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          تعذر تحميل البيانات
          <div className="mt-4">
            <Button onClick={() => fetchHealth(true)}><RefreshCw className="ml-2 h-4 w-4" />إعادة المحاولة</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const lastSync = data.meta?.last_synced_at ? new Date(data.meta.last_synced_at) : null;
  const minutesAgo = lastSync ? Math.floor((Date.now() - lastSync.getTime()) / 60000) : null;
  const isHealthy = !data.refresh_error && (data.faisal.total > 0);
  const wholesaleCount = data.faisal.with_wholesale_price;
  const retailCount = data.faisal.with_retail_price;
  const onlyWholesale = Math.max(0, wholesaleCount - retailCount);
  const onlyRetail = Math.max(0, retailCount - wholesaleCount);

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Database className="h-6 w-6 text-primary" />
            صحة مزامنة كتالوج الفيصل
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            عرض كامل لأصناف الفيصل (جملة/قطاعي) ومقارنتها بأصناف الموقع
          </p>
        </div>
        <Button onClick={() => fetchHealth(true)} disabled={refreshing} size="lg">
          {refreshing ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <RefreshCw className="ml-2 h-4 w-4" />}
          {refreshing ? "جارٍ المزامنة الآن..." : "مزامنة فورية من الفيصل"}
        </Button>
      </div>

      {/* Status banner */}
      <Card className={isHealthy ? "border-emerald-300 bg-emerald-50/50" : "border-red-300 bg-red-50/50"}>
        <CardContent className="py-4 flex items-start gap-3">
          {isHealthy
            ? <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0" />
            : <XCircle className="h-6 w-6 text-red-600 shrink-0" />}
          <div className="flex-1">
            <div className="font-semibold">
              {isHealthy ? "المزامنة شغّالة ✓" : "في مشكلة في المزامنة"}
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              <span className="font-mono">{data.base_url}</span>
              {lastSync && minutesAgo !== null && (
                <> · آخر مزامنة من <strong>{minutesAgo === 0 ? "اللحظة" : `${minutesAgo} دقيقة`}</strong></>
              )}
            </div>
            {data.refresh_error && (
              <div className="text-sm text-red-700 mt-2 bg-red-100 p-2 rounded font-mono">
                {data.refresh_error.substring(0, 300)}
              </div>
            )}
            {data.meta?.last_error && !data.refresh_error && (
              <div className="text-sm text-amber-700 mt-2 bg-amber-100 p-2 rounded font-mono">
                آخر خطأ مسجل: {data.meta.last_error.substring(0, 300)}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Faisal counts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
              <Boxes className="h-4 w-4" /> إجمالي أصناف الفيصل
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{data.faisal.total.toLocaleString("ar-EG")}</div>
            <div className="text-xs text-muted-foreground mt-1">في كاش النظام</div>
          </CardContent>
        </Card>

        <Card className="border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-blue-700">
              <Tag className="h-4 w-4" /> له سعر جملة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-700">{wholesaleCount.toLocaleString("ar-EG")}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {data.faisal.total > 0 ? `${Math.round(wholesaleCount/data.faisal.total*100)}% من الإجمالي` : "—"}
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-emerald-700">
              <Tag className="h-4 w-4" /> له سعر قطاعي
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-700">{retailCount.toLocaleString("ar-EG")}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {data.faisal.total > 0 ? `${Math.round(retailCount/data.faisal.total*100)}% من الإجمالي` : "—"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Coverage breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">تفصيل الأسعار</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between border-b pb-2">
            <span>أصناف لها سعرين (جملة + قطاعي)</span>
            <Badge variant="default">{Math.min(wholesaleCount, retailCount).toLocaleString("ar-EG")}</Badge>
          </div>
          <div className="flex justify-between border-b pb-2">
            <span>أصناف لها سعر جملة فقط (مفيش قطاعي)</span>
            <Badge variant="secondary">{onlyWholesale.toLocaleString("ar-EG")}</Badge>
          </div>
          <div className="flex justify-between border-b pb-2">
            <span>أصناف لها سعر قطاعي فقط (مفيش جملة)</span>
            <Badge variant="secondary">{onlyRetail.toLocaleString("ar-EG")}</Badge>
          </div>
          <div className="flex justify-between">
            <span>أصناف من غير أي سعر</span>
            <Badge variant="outline" className="text-amber-700">
              {Math.max(0, data.faisal.total - Math.max(wholesaleCount, retailCount)).toLocaleString("ar-EG")}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Site vs Faisal comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Package className="h-5 w-5" /> مقارنة الموقع ↔ الفيصل
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-muted/50">
              <div className="text-xs text-muted-foreground">الموقع — إجمالي</div>
              <div className="text-2xl font-bold mt-1">{data.site.total.toLocaleString("ar-EG")}</div>
              <div className="text-xs text-emerald-700 mt-1">متوفر منهم: {data.site.in_stock.toLocaleString("ar-EG")}</div>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <div className="text-xs text-muted-foreground">الفيصل — إجمالي</div>
              <div className="text-2xl font-bold mt-1">{data.faisal.total.toLocaleString("ar-EG")}</div>
              <div className="text-xs text-muted-foreground mt-1">
                الموقع يعرض {data.faisal.total > 0 ? `${Math.round(data.site.total/data.faisal.total*100)}%` : "—"} من كتالوج الفيصل
              </div>
            </div>
          </div>
          <div className="mt-4 p-3 rounded bg-blue-50 text-sm text-blue-900 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <div>
              <strong>الفرق</strong> ({(data.faisal.total - data.site.total).toLocaleString("ar-EG")} صنف) موجود في الفيصل ومش معروض في الموقع — ده طبيعي لأن الموقع بيعرض أصناف منتقاة فقط.
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent sync activity */}
      {data.recent_syncs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5" /> آخر 10 عمليات مزامنة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.recent_syncs.map((s, i) => (
                <div key={i} className="flex items-center justify-between text-sm border-b pb-2 last:border-0">
                  <div className="flex items-center gap-2">
                    {s.status === "success"
                      ? <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      : <XCircle className="h-4 w-4 text-red-600" />}
                    <span className="font-mono text-xs">{s.sync_type}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(s.created_at).toLocaleString("ar-EG")}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <SampleComparisonCard />
    </div>
  );
};

// ============= Sample Comparison (5 random products vs Faisal) =============
interface SampleRow {
  product_id: string;
  name_ar: string;
  sku: string | null;
  erp_item_code: string;
  found_in_erp: boolean;
  erp_name: string | null;
  stock: { site: number; erp: number | null; erp_raw?: number | null; safety_stock?: number; diff: number | null; match: boolean; note?: string | null; reason_code?: string | null; reason_text?: string | null; site_updated_at?: string | null };
  retail_price: { site: number | null; erp: number | null; diff: number | null; match: boolean };
  wholesale_price: { site: number | null; erp: number | null; diff: number | null; match: boolean };
  fetched_at: string | null;
}

const SampleComparisonCard = () => {
  const [running, setRunning] = useState(false);
  const [sampleSize, setSampleSize] = useState(5);
  const [rows, setRows] = useState<SampleRow[] | null>(null);
  const [summary, setSummary] = useState<any>(null);

  const runTest = async (apply = false) => {
    setRunning(true);
    try {
      const { data: res, error } = await supabase.functions.invoke("erp-search-products", {
        body: { compareSample: true, sampleSize, applyStockSync: apply },
      });
      if (error) throw error;
      if (!res?.success) throw new Error(res?.error || "فشل الاختبار");
      setRows(res.comparison);
      setSummary(res.summary);
      if (apply && res.applied) {
        toast.success(`تم تحديث رصيد ${res.applied.updated} صنف من الفيصل${res.applied.errors ? ` (${res.applied.errors} خطأ)` : ""}`);
      } else {
        toast.success(`تم اختبار ${res.summary.sampled} صنف`);
      }
    } catch (e: any) {
      toast.error(e?.message || "فشل الاختبار");
    } finally {
      setRunning(false);
    }
  };

  const fmtPrice = (n: number | null) => n == null ? "—" : n.toLocaleString("ar-EG", { maximumFractionDigits: 2 });
  const matchBadge = (match: boolean, hasData: boolean) => {
    if (!hasData) return <Badge variant="outline" className="text-xs">غير متاح</Badge>;
    return match
      ? <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-xs">✓ مطابق</Badge>
      : <Badge variant="destructive" className="text-xs">✗ مختلف</Badge>;
  };

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Boxes className="h-5 w-5 text-primary" />
          اختبار مزامنة عينة من الأصناف
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          يختار عينة عشوائية من أصنافنا الـ422 ويقارن (الرصيد + سعر القطاعي + سعر الجملة) مع كتالوج الفيصل المخزن.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          <label className="text-sm font-medium">حجم العينة:</label>
          <select
            className="border rounded-md px-3 py-1.5 text-sm bg-background"
            value={sampleSize}
            onChange={(e) => setSampleSize(Number(e.target.value))}
            disabled={running}
          >
            {[5, 10, 15, 20, 50].map((n) => <option key={n} value={n}>{n} أصناف</option>)}
          </select>
          <Button onClick={() => runTest(false)} disabled={running} size="sm">
            {running ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <RefreshCw className="h-4 w-4 ml-2" />}
            تشغيل الاختبار
          </Button>
          {summary && summary.stock_mismatches > 0 && (
            <Button
              onClick={() => runTest(true)}
              disabled={running}
              size="sm"
              variant="destructive"
            >
              طبّق رصيد الفيصل على {summary.stock_mismatches} صنف
            </Button>
          )}
        </div>

        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-center">
            <div className="bg-muted/50 rounded-lg p-2">
              <div className="text-xs text-muted-foreground">العينة</div>
              <div className="text-lg font-bold">{summary.sampled}</div>
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-lg p-2">
              <div className="text-xs text-muted-foreground">موجود بالفيصل</div>
              <div className="text-lg font-bold text-emerald-600">{summary.found_in_erp}</div>
            </div>
            <div className="bg-red-50 dark:bg-red-950/30 rounded-lg p-2">
              <div className="text-xs text-muted-foreground">مختلف رصيد</div>
              <div className="text-lg font-bold text-red-600">{summary.stock_mismatches}</div>
            </div>
            <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-2">
              <div className="text-xs text-muted-foreground">مختلف قطاعي</div>
              <div className="text-lg font-bold text-amber-600">{summary.retail_price_mismatches}</div>
            </div>
            <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-2">
              <div className="text-xs text-muted-foreground">مختلف جملة</div>
              <div className="text-lg font-bold text-amber-600">{summary.wholesale_price_mismatches}</div>
            </div>
          </div>
        )}

        {rows && rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-right p-2 border">الصنف</th>
                  <th className="text-center p-2 border">كود الفيصل</th>
                  <th className="text-center p-2 border" colSpan={3}>الرصيد</th>
                  <th className="text-center p-2 border">سبب اختلاف المخزون</th>
                  <th className="text-center p-2 border" colSpan={3}>سعر القطاعي</th>
                  <th className="text-center p-2 border" colSpan={3}>سعر الجملة</th>
                </tr>
                <tr className="bg-muted/30 text-muted-foreground">
                  <th className="p-1 border"></th>
                  <th className="p-1 border"></th>
                  <th className="p-1 border">عندنا</th>
                  <th className="p-1 border">الفيصل</th>
                  <th className="p-1 border">الحالة</th>
                  <th className="p-1 border"></th>
                  <th className="p-1 border">عندنا</th>
                  <th className="p-1 border">الفيصل</th>
                  <th className="p-1 border">الحالة</th>
                  <th className="p-1 border">عندنا</th>
                  <th className="p-1 border">الفيصل</th>
                  <th className="p-1 border">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.product_id} className={!r.found_in_erp ? "bg-red-50/50 dark:bg-red-950/20" : ""}>
                    <td className="p-2 border">
                      <div className="font-medium">{r.name_ar}</div>
                      <div className="text-muted-foreground text-[10px]">{r.sku}</div>
                    </td>
                    <td className="text-center p-2 border font-mono">{r.erp_item_code}</td>
                    <td className="text-center p-2 border">{r.stock.site}</td>
                    <td className="text-center p-2 border">
                      <div>{r.stock.erp ?? "—"}</div>
                      {r.stock.note && (
                        <div className="text-[10px] text-muted-foreground mt-0.5">{r.stock.note}</div>
                      )}
                    </td>
                    <td className="text-center p-2 border">{matchBadge(r.stock.match, r.found_in_erp)}</td>
                    <td className="p-2 border max-w-[220px]">
                      {r.stock.reason_code && (() => {
                        const code = r.stock.reason_code;
                        const palette: Record<string, string> = {
                          ok: "bg-emerald-100 text-emerald-700 border-emerald-200",
                          mapping_missing: "bg-red-100 text-red-700 border-red-200",
                          stale_site_stock: "bg-orange-100 text-orange-700 border-orange-200",
                          stale_sync: "bg-amber-100 text-amber-700 border-amber-200",
                          safety_stock_applied: "bg-blue-100 text-blue-700 border-blue-200",
                          minor_drift: "bg-slate-100 text-slate-700 border-slate-200",
                          data_drift: "bg-rose-100 text-rose-700 border-rose-200",
                        };
                        const labels: Record<string, string> = {
                          ok: "✓ مطابق",
                          mapping_missing: "🔗 Mapping ناقص",
                          stale_site_stock: "⚠️ موقع لم يُحدَّث",
                          stale_sync: "🕐 مزامنة قديمة",
                          safety_stock_applied: "🛡️ احتياطي أمان",
                          minor_drift: "↔️ فرق بسيط",
                          data_drift: "🔴 يحتاج مزامنة",
                        };
                        return (
                          <div className="space-y-1">
                            <Badge variant="outline" className={`text-[10px] ${palette[code] || ""}`}>
                              {labels[code] || code}
                            </Badge>
                            <div className="text-[10px] text-muted-foreground leading-tight">{r.stock.reason_text}</div>
                          </div>
                        );
                      })()}
                    </td>
                    <td className="text-center p-2 border">{fmtPrice(r.retail_price.site)}</td>
                    <td className="text-center p-2 border">{fmtPrice(r.retail_price.erp)}</td>
                    <td className="text-center p-2 border">{matchBadge(r.retail_price.match, r.found_in_erp)}</td>
                    <td className="text-center p-2 border">{fmtPrice(r.wholesale_price.site)}</td>
                    <td className="text-center p-2 border">{fmtPrice(r.wholesale_price.erp)}</td>
                    <td className="text-center p-2 border">{matchBadge(r.wholesale_price.match, r.found_in_erp)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminFaisalCatalogHealth;
