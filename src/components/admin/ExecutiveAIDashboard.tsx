import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Brain, TrendingUp, Package, AlertTriangle, Loader2, Sparkles, RefreshCw, Users, ShoppingBag, DollarSign, XCircle } from "lucide-react";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import ReactMarkdown from "react-markdown";

const fmt = (n: number) => new Intl.NumberFormat("ar-EG", { maximumFractionDigits: 0 }).format(Math.round(n || 0));
const fmtMoney = (n: number) => `${fmt(n)} ج.م`;

const COLORS = ["#0a2540", "#c9a84c", "#8b1a1a", "#2d8a9e", "#5cbdb9", "#e85d3a", "#a0522d", "#4a6741"];

export default function ExecutiveAIDashboard() {
  const { toast } = useToast();
  const [kpis, setKpis] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState<string>("");
  const [analyzingMode, setAnalyzingMode] = useState<string | null>(null);

  const loadKpis = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("get_executive_kpis");
    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } else {
      setKpis(data);
    }
    setLoading(false);
  };

  useEffect(() => { loadKpis(); }, []);

  const runAnalysis = async (mode: "executive" | "sales" | "inventory") => {
    setAnalyzingMode(mode);
    setAnalysis("");
    try {
      const { data, error } = await supabase.functions.invoke("executive-ai-analysis", { body: { mode } });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setAnalysis((data as any).analysis);
    } catch (e: any) {
      toast({ title: "فشل التحليل", description: e.message, variant: "destructive" });
    } finally {
      setAnalyzingMode(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-72" />
      </div>
    );
  }

  if (!kpis) return null;

  const KpiCard = ({ icon: Icon, label, value, sub, tone = "default" }: any) => (
    <Card className={`relative overflow-hidden ${tone === "danger" ? "border-destructive/40" : tone === "warn" ? "border-yellow-500/40" : "border-border"}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className={`p-2 rounded-lg ${tone === "danger" ? "bg-destructive/10 text-destructive" : tone === "warn" ? "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400" : "bg-primary/10 text-primary"}`}>
            <Icon className="w-4 h-4" />
          </div>
        </div>
        <div className="text-xs text-muted-foreground mb-1">{label}</div>
        <div className="text-xl font-bold tabular-nums">{value}</div>
        {sub && <div className="text-[11px] text-muted-foreground mt-1">{sub}</div>}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6 p-4 md:p-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            لوحة الذكاء التنفيذي
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            مؤشرات لحظية + تحليل ذكي بالـ AI — آخر تحديث: {new Date(kpis.generated_at).toLocaleString("ar-EG")}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadKpis}>
          <RefreshCw className="w-4 h-4 ml-2" /> تحديث
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard icon={DollarSign} label="مبيعات اليوم" value={fmtMoney(kpis.sales_today.s)} sub={`${kpis.sales_today.c} طلب`} />
        <KpiCard icon={TrendingUp} label="مبيعات الشهر" value={fmtMoney(kpis.sales_month.s)} sub={`${kpis.sales_month.c} طلب`} />
        <KpiCard
          icon={XCircle}
          label="نسبة إلغاء الطلبات (30يوم)"
          value={`${(kpis.cancel_rate.pct ?? 0).toFixed(1)}%`}
          sub={`${kpis.cancel_rate.cancelled} من ${kpis.cancel_rate.total}`}
          tone={kpis.cancel_rate.pct > 50 ? "danger" : kpis.cancel_rate.pct > 20 ? "warn" : "default"}
        />
        <KpiCard icon={Package} label="قيمة المخزون" value={fmtMoney(kpis.inventory.total_value)} sub={`${fmt(kpis.inventory.in_stock)} صنف متوفر`} />
        <KpiCard icon={AlertTriangle} label="أصناف راكدة (60يوم)" value={fmt(kpis.stagnant.c)} sub={fmtMoney(kpis.stagnant.v)} tone="warn" />
        <KpiCard icon={AlertTriangle} label="مخزون منخفض" value={fmt(kpis.inventory.low_stock)} sub="≤ حد الأمان" tone={kpis.inventory.low_stock > 20 ? "danger" : "warn"} />
        <KpiCard icon={Package} label="نافد المخزون" value={fmt(kpis.inventory.out_of_stock)} sub={`من ${fmt(kpis.inventory.total_skus)} صنف`} />
        <KpiCard icon={ShoppingBag} label="متوسط الطلب الشهري" value={kpis.sales_month.c > 0 ? fmtMoney(kpis.sales_month.s / kpis.sales_month.c) : "—"} />
      </div>

      {/* AI Analysis Buttons */}
      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Brain className="w-5 h-5 text-primary" />
            تحليل ذكي بالـ AI
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => runAnalysis("executive")} disabled={analyzingMode !== null} className="gap-2">
              {analyzingMode === "executive" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              📊 الملخص التنفيذي
            </Button>
            <Button onClick={() => runAnalysis("sales")} disabled={analyzingMode !== null} variant="secondary" className="gap-2">
              {analyzingMode === "sales" ? <Loader2 className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
              🧠 حلّل المبيعات
            </Button>
            <Button onClick={() => runAnalysis("inventory")} disabled={analyzingMode !== null} variant="secondary" className="gap-2">
              {analyzingMode === "inventory" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Package className="w-4 h-4" />}
              📦 حلّل المخزون
            </Button>
          </div>
          {analysis && (
            <div className="prose prose-sm dark:prose-invert max-w-none rtl bg-background/60 rounded-lg p-4 border">
              <ReactMarkdown>{analysis}</ReactMarkdown>
            </div>
          )}
          {!analysis && analyzingMode === null && (
            <p className="text-sm text-muted-foreground">اضغط على زر فوق عشان تحصل على تحليل ذكي مبني على بيانات الموقع لحظياً.</p>
          )}
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">اتجاه المبيعات (30 يوم)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={kpis.daily_trend || []}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: any) => fmtMoney(Number(v))} />
                <Line type="monotone" dataKey="revenue" stroke="#c9a84c" strokeWidth={2} dot={false} name="إيراد" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">توزيع البراندات (إيراد)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={kpis.brand_split || []} dataKey="revenue" nameKey="brand" outerRadius={90} label={(e: any) => e.brand}>
                  {(kpis.brand_split || []).map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: any) => fmtMoney(Number(v))} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Users className="w-4 h-4" /> أعلى 5 عملاء (30 يوم)</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(kpis.top_customers || []).map((c: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/40">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">{i + 1}</span>
                    <span className="text-sm truncate">{c.name}</span>
                  </div>
                  <div className="text-sm font-semibold tabular-nums">{fmtMoney(c.total_spent)}</div>
                </div>
              ))}
              {(!kpis.top_customers || kpis.top_customers.length === 0) && <div className="text-sm text-muted-foreground text-center py-4">لا يوجد بيانات</div>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">أعلى 10 أصناف مبيعاً</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={kpis.top_products || []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="sku" tick={{ fontSize: 10 }} width={70} />
                <Tooltip formatter={(v: any) => fmtMoney(Number(v))} />
                <Bar dataKey="revenue" fill="#0a2540" name="إيراد" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
