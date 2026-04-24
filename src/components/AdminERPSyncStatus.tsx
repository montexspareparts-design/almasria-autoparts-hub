import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2, XCircle, Clock, RefreshCw, Activity, AlertTriangle,
  Package, DollarSign, ShoppingCart, FileText, Database, Loader2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";

type SyncLog = {
  id: string;
  sync_type: string;
  status: string;
  created_at: string;
  error_message: string | null;
  reference_number: string | null;
  direction: string;
};

type StatusSummary = {
  type: string;
  label: string;
  icon: typeof Package;
  lastAt: string | null;
  lastStatus: string | null;
  lastError: string | null;
  total24h: number;
  failures24h: number;
};

const TYPE_META: Record<string, { label: string; icon: typeof Package }> = {
  order_push:    { label: "دفع الطلبات", icon: ShoppingCart },
  quote_push:    { label: "دفع عروض الأسعار", icon: FileText },
  price_update:  { label: "تحديث الأسعار", icon: DollarSign },
  stock_update:  { label: "تحديث المخزون", icon: Package },
  auto_sync_full:{ label: "المزامنة التلقائية الشاملة", icon: Database },
  fetch_erp_customers: { label: "جلب عملاء الفيصل", icon: Activity },
};

const AdminERPSyncStatus = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summaries, setSummaries] = useState<StatusSummary[]>([]);
  const [recentErrors, setRecentErrors] = useState<SyncLog[]>([]);
  const [overall, setOverall] = useState({ total: 0, success: 0, failed: 0 });

  const load = async () => {
    setRefreshing(true);
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const [{ data: recent }, { data: errors }, { data: all24h }] = await Promise.all([
      supabase
        .from("erp_sync_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("erp_sync_logs")
        .select("*")
        .eq("status", "failed")
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("erp_sync_logs")
        .select("status, sync_type, created_at")
        .gte("created_at", since),
    ]);

    // Build per-type summary from latest 200 + 24h aggregates
    const byType: Record<string, StatusSummary> = {};
    Object.keys(TYPE_META).forEach((t) => {
      byType[t] = {
        type: t,
        label: TYPE_META[t].label,
        icon: TYPE_META[t].icon,
        lastAt: null,
        lastStatus: null,
        lastError: null,
        total24h: 0,
        failures24h: 0,
      };
    });

    (recent || []).forEach((log: any) => {
      const t = log.sync_type as string;
      if (!byType[t]) {
        byType[t] = {
          type: t,
          label: t,
          icon: Activity,
          lastAt: null,
          lastStatus: null,
          lastError: null,
          total24h: 0,
          failures24h: 0,
        };
      }
      if (!byType[t].lastAt) {
        byType[t].lastAt = log.created_at;
        byType[t].lastStatus = log.status;
        byType[t].lastError = log.error_message;
      }
    });

    (all24h || []).forEach((log: any) => {
      const t = log.sync_type as string;
      if (byType[t]) {
        byType[t].total24h += 1;
        if (log.status === "failed") byType[t].failures24h += 1;
      }
    });

    const totals = (all24h || []).reduce(
      (acc, l: any) => {
        acc.total += 1;
        if (l.status === "success") acc.success += 1;
        if (l.status === "failed") acc.failed += 1;
        return acc;
      },
      { total: 0, success: 0, failed: 0 }
    );

    setSummaries(Object.values(byType));
    setRecentErrors((errors || []) as SyncLog[]);
    setOverall(totals);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    load();
  }, []);

  const successRate = overall.total > 0
    ? Math.round((overall.success / overall.total) * 100)
    : 100;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">حالة مزامنة ERP</h2>
          <p className="text-sm text-muted-foreground mt-1">
            نظرة سريعة على آخر عمليات المزامنة مع نظام الفيصل
          </p>
        </div>
        <Button onClick={load} variant="outline" size="sm" disabled={refreshing} className="gap-2">
          {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          تحديث
        </Button>
      </div>

      {/* Overall KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">عمليات آخر 24 ساعة</p>
                <p className="text-2xl font-bold mt-1">{overall.total}</p>
              </div>
              <Activity className="w-8 h-8 text-primary/40" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">نسبة النجاح</p>
                <p className={`text-2xl font-bold mt-1 ${successRate >= 95 ? "text-green-600" : successRate >= 80 ? "text-amber-600" : "text-destructive"}`}>
                  {successRate}%
                </p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-green-500/40" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">عمليات فاشلة</p>
                <p className={`text-2xl font-bold mt-1 ${overall.failed > 0 ? "text-destructive" : "text-foreground"}`}>
                  {overall.failed}
                </p>
              </div>
              <XCircle className="w-8 h-8 text-destructive/40" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Per-type status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">حالة كل نوع مزامنة</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {summaries.map((s) => {
            const Icon = s.icon;
            const isStale = s.lastAt && Date.now() - new Date(s.lastAt).getTime() > 24 * 60 * 60 * 1000;
            return (
              <div
                key={s.type}
                className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/30 transition"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    s.lastStatus === "success" ? "bg-green-500/10 text-green-600" :
                    s.lastStatus === "failed"  ? "bg-destructive/10 text-destructive" :
                    "bg-muted text-muted-foreground"
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-medium text-sm text-foreground">{s.label}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {s.lastAt
                        ? `آخر تشغيل: ${formatDistanceToNow(new Date(s.lastAt), { addSuffix: true, locale: ar })}`
                        : "لم يتم التشغيل بعد"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {s.failures24h > 0 && (
                    <Badge variant="destructive" className="text-[10px]">
                      {s.failures24h} فشل
                    </Badge>
                  )}
                  {s.total24h > 0 && (
                    <Badge variant="outline" className="text-[10px]">
                      {s.total24h} / 24س
                    </Badge>
                  )}
                  {s.lastStatus === "success" && (
                    <Badge className="bg-green-500/10 text-green-700 border-green-500/20 text-[10px]">
                      <CheckCircle2 className="w-3 h-3 ml-1" /> ناجحة
                    </Badge>
                  )}
                  {s.lastStatus === "failed" && (
                    <Badge variant="destructive" className="text-[10px]">
                      <XCircle className="w-3 h-3 ml-1" /> فشل
                    </Badge>
                  )}
                  {!s.lastStatus && (
                    <Badge variant="outline" className="text-[10px]">
                      <Clock className="w-3 h-3 ml-1" /> لم تبدأ
                    </Badge>
                  )}
                  {isStale && (
                    <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-500/30">
                      <AlertTriangle className="w-3 h-3 ml-1" /> قديم
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Recent failures */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-destructive" />
            آخر الأخطاء
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentErrors.length === 0 ? (
            <div className="text-center py-6 text-sm text-muted-foreground">
              <CheckCircle2 className="w-10 h-10 mx-auto text-green-500/40 mb-2" />
              لا توجد أخطاء حديثة — كل العمليات تعمل بشكل سليم ✅
            </div>
          ) : (
            <div className="space-y-2">
              {recentErrors.map((err) => (
                <div
                  key={err.id}
                  className="p-3 rounded-lg border border-destructive/20 bg-destructive/5"
                >
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="destructive" className="text-[10px]">
                        {TYPE_META[err.sync_type]?.label || err.sync_type}
                      </Badge>
                      {err.reference_number && (
                        <span className="text-xs font-mono text-muted-foreground">
                          {err.reference_number}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(err.created_at), { addSuffix: true, locale: ar })}
                    </span>
                  </div>
                  <p className="text-xs text-foreground/80 break-words font-mono leading-relaxed">
                    {err.error_message || "خطأ غير محدد"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminERPSyncStatus;
