import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, Database, Package, AlertTriangle, CheckCircle2, XCircle, Tag, Boxes, Clock } from "lucide-react";
import { toast } from "sonner";

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
    </div>
  );
};

export default AdminFaisalCatalogHealth;
