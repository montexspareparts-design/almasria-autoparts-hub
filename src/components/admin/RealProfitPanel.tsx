import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, TrendingDown, AlertTriangle, Sparkles, Loader2, Upload, RefreshCw } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import ReactMarkdown from "react-markdown";
import PurchaseInvoiceUploader from "./PurchaseInvoiceUploader";

const fmt = (n: number) => new Intl.NumberFormat("ar-EG", { maximumFractionDigits: 0 }).format(Math.round(n || 0));
const money = (n: number) => `${fmt(n)} ج.م`;
const pct = (n: number | null) => (n == null ? "—" : `${Number(n).toFixed(1)}%`);

export default function RealProfitPanel() {
  const { toast } = useToast();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [advice, setAdvice] = useState("");
  const [adviceLoading, setAdviceLoading] = useState(false);
  const [showUploader, setShowUploader] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data: d, error } = await supabase.rpc("get_real_profit_intelligence", { period_days: 90 });
    if (error) toast({ title: "خطأ", description: error.message, variant: "destructive" });
    else setData(d);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const askAdvisor = async () => {
    setAdviceLoading(true); setAdvice("");
    try {
      const { data: r, error } = await supabase.functions.invoke("executive-ai-analysis", { body: { mode: "profit_advisor" } });
      if (error) throw error;
      if ((r as any)?.error) throw new Error((r as any).error);
      setAdvice((r as any).analysis);
    } catch (e: any) {
      toast({ title: "فشل التحليل", description: e.message, variant: "destructive" });
    } finally { setAdviceLoading(false); }
  };

  if (loading) return <Card><CardContent className="p-6"><Skeleton className="h-64" /></CardContent></Card>;
  if (!data) return null;

  const t = data.totals || {};
  const cov = data.cost_coverage || {};
  const leak = data.leakage || {};

  return (
    <div className="space-y-4">
      {/* Header + Cost Coverage */}
      <Card className="border-2 border-primary/30 bg-gradient-to-br from-background to-primary/5">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <DollarSign className="h-5 w-5 text-primary" />
            الربحية الحقيقية (Net Profit) — آخر 90 يوم
          </CardTitle>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setShowUploader(s => !s)}>
              <Upload className="h-3 w-3 ml-1" /> فواتير الشراء
            </Button>
            <Button size="sm" variant="ghost" onClick={load}><RefreshCw className="h-3 w-3" /></Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Coverage warning */}
          {cov.coverage_pct < 80 && (
            <div className="flex items-center gap-2 p-3 rounded-md bg-amber-500/10 border border-amber-500/30 text-sm">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <span>
                تغطية بيانات التكلفة: <strong>{pct(cov.coverage_pct)}</strong> ({cov.lines_with_cost}/{cov.total_lines} سطر بيع له تكلفة).
                ارفع المزيد من فواتير الشراء لزيادة دقة التحليل.
              </span>
            </div>
          )}

          {/* Totals */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label="إجمالي الإيراد" value={money(t.gross_revenue)} />
            <Stat label="تكلفة البضاعة (COGS)" value={money(t.cogs)} negative />
            <Stat label="الخصومات + الكوبونات" value={money((t.discounts_value||0)+(t.coupons_value||0))} negative />
            <Stat label="المرتجعات" value={money(t.returns_value)} negative />
            <Stat label="تكلفة الشحن" value={money(t.shipping_cost)} negative />
            <Stat label="صافي الإيراد" value={money(t.net_revenue)} />
            <Stat label="صافي الربح" value={money(t.net_profit)} highlight={t.net_profit >= 0 ? "good" : "bad"} />
            <Stat label="هامش صافي %" value={pct(t.net_margin_pct)} highlight={t.net_margin_pct >= 15 ? "good" : t.net_margin_pct < 5 ? "bad" : undefined} />
          </div>
        </CardContent>
      </Card>

      {showUploader && <PurchaseInvoiceUploader onDone={() => { setShowUploader(false); load(); }} />}

      {/* Tabs */}
      <Tabs defaultValue="brand">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="brand">حسب البراند</TabsTrigger>
          <TabsTrigger value="customer">حسب العميل</TabsTrigger>
          <TabsTrigger value="product">حسب الصنف</TabsTrigger>
          <TabsTrigger value="branch">حسب الفرع</TabsTrigger>
          <TabsTrigger value="staff">حسب الموظف</TabsTrigger>
          <TabsTrigger value="sale_type">نوع البيع</TabsTrigger>
          <TabsTrigger value="leakage">🚨 تسريب الربحية</TabsTrigger>
        </TabsList>

        <TabsContent value="brand">
          <ProfitTable rows={data.by_brand} cols={[
            { key: "brand", label: "البراند" },
            { key: "net_revenue", label: "صافي الإيراد", money: true },
            { key: "net_profit", label: "صافي الربح", money: true, profit: true },
            { key: "net_margin_pct", label: "هامش %", pct: true },
          ]} />
        </TabsContent>

        <TabsContent value="customer">
          <ProfitTable rows={data.by_customer?.slice(0, 25)} cols={[
            { key: "customer", label: "العميل" },
            { key: "orders_count", label: "طلبيات" },
            { key: "net_revenue", label: "صافي الإيراد", money: true },
            { key: "net_profit", label: "صافي الربح", money: true, profit: true },
            { key: "net_margin_pct", label: "هامش %", pct: true },
          ]} />
        </TabsContent>

        <TabsContent value="product">
          <ProfitTable rows={data.by_product?.slice(0, 30)} cols={[
            { key: "name_ar", label: "الصنف" },
            { key: "sku", label: "كود" },
            { key: "qty_sold", label: "كمية" },
            { key: "avg_cost", label: "تكلفة", money: true },
            { key: "net_profit", label: "صافي الربح", money: true, profit: true },
            { key: "net_margin_pct", label: "هامش %", pct: true },
          ]} />
        </TabsContent>

        <TabsContent value="branch">
          <ProfitTable rows={data.by_branch} cols={[
            { key: "branch", label: "الفرع" },
            { key: "orders_count", label: "طلبيات" },
            { key: "net_revenue", label: "صافي الإيراد", money: true },
            { key: "net_profit", label: "صافي الربح", money: true, profit: true },
            { key: "net_margin_pct", label: "هامش %", pct: true },
          ]} />
        </TabsContent>

        <TabsContent value="staff">
          {data.by_staff?.length ? (
            <ProfitTable rows={data.by_staff} cols={[
              { key: "staff_name", label: "الموظف" },
              { key: "orders_count", label: "طلبيات" },
              { key: "net_revenue", label: "صافي الإيراد", money: true },
              { key: "net_profit", label: "صافي الربح", money: true, profit: true },
              { key: "net_margin_pct", label: "هامش %", pct: true },
            ]} />
          ) : (
            <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">
              لم يتم ربط الطلبات بالموظفين بعد. اطلب من المطور تفعيل تسجيل `created_by_staff_id` على الطلبات الجديدة.
            </CardContent></Card>
          )}
        </TabsContent>

        <TabsContent value="sale_type">
          <ProfitTable rows={data.by_sale_type} cols={[
            { key: "sale_type", label: "النوع" },
            { key: "net_revenue", label: "صافي الإيراد", money: true },
            { key: "net_profit", label: "صافي الربح", money: true, profit: true },
            { key: "net_margin_pct", label: "هامش %", pct: true },
          ]} />
        </TabsContent>

        <TabsContent value="leakage">
          <div className="space-y-3">
            <LeakageBlock title="عملاء بربحية ضعيفة (هامش <5% وإيراد >1000)" rows={leak.lossy_customers} keys={["customer","net_revenue","net_profit","net_margin_pct"]} />
            <LeakageBlock title="أصناف بهامش سلبي (تباع بخسارة)" rows={leak.negative_margin_items} keys={["name_ar","sku","qty_sold","avg_cost","avg_sell_price","net_profit"]} />
            <LeakageBlock title="خصومات قاتلة (الخصم > الربح)" rows={leak.killer_discounts} keys={["name_ar","sku","total_discount","net_profit","discount_pct"]} />
            <LeakageBlock title="فروع بهامش <10%" rows={leak.low_branches} keys={["branch","net_revenue","net_profit","net_margin_pct"]} />
            <LeakageBlock title="موظفون بهامش <10%" rows={leak.low_staff} keys={["staff_name","net_revenue","net_profit","net_margin_pct"]} />
          </div>
        </TabsContent>
      </Tabs>

      {/* AI Financial Advisor */}
      <Card className="border-2 border-amber-500/30">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-amber-500" /> المستشار المالي الذكي
          </CardTitle>
          <Button onClick={askAdvisor} disabled={adviceLoading} size="sm">
            {adviceLoading ? <><Loader2 className="h-3 w-3 ml-1 animate-spin" /> يحلل...</> : "اطلب توصيات"}
          </Button>
        </CardHeader>
        {advice && (
          <CardContent>
            <div className="prose prose-sm max-w-none rtl:text-right" dir="rtl">
              <ReactMarkdown>{advice}</ReactMarkdown>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}

function Stat({ label, value, negative, highlight }: { label: string; value: string; negative?: boolean; highlight?: "good" | "bad" }) {
  const color = highlight === "good" ? "text-green-600" : highlight === "bad" ? "text-red-600" : negative ? "text-muted-foreground" : "text-foreground";
  return (
    <div className="p-3 rounded-md border bg-card">
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div className={`text-base font-bold tabular-nums ${color}`}>{value}</div>
    </div>
  );
}

function ProfitTable({ rows, cols }: { rows: any[]; cols: any[] }) {
  if (!rows?.length) return <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">لا توجد بيانات</CardContent></Card>;
  return (
    <Card>
      <CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>{cols.map((c: any) => <th key={c.key} className="text-right p-2 font-medium">{c.label}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((r: any, i: number) => (
              <tr key={i} className="border-t hover:bg-muted/30">
                {cols.map((c: any) => {
                  const v = r[c.key];
                  let display: any = v ?? "—";
                  let cls = "p-2 tabular-nums";
                  if (c.money && v != null) display = money(v);
                  if (c.pct && v != null) display = pct(v);
                  if (c.profit && v != null) cls += v < 0 ? " text-red-600 font-semibold" : " text-green-700";
                  return <td key={c.key} className={cls}>{display}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

function LeakageBlock({ title, rows, keys }: { title: string; rows: any[]; keys: string[] }) {
  if (!rows?.length) return null;
  const labels: Record<string, string> = {
    customer: "العميل", net_revenue: "صافي الإيراد", net_profit: "صافي الربح", net_margin_pct: "هامش %",
    name_ar: "الصنف", sku: "كود", qty_sold: "كمية", avg_cost: "تكلفة", avg_sell_price: "سعر البيع",
    total_discount: "إجمالي خصم", discount_pct: "خصم %", branch: "الفرع", staff_name: "الموظف",
  };
  const moneyKeys = new Set(["net_revenue","net_profit","avg_cost","avg_sell_price","total_discount"]);
  const pctKeys = new Set(["net_margin_pct","discount_pct"]);
  return (
    <Card className="border-red-500/30">
      <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><TrendingDown className="h-4 w-4 text-red-500" />{title} <Badge variant="destructive" className="ml-2">{rows.length}</Badge></CardTitle></CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted/50"><tr>{keys.map(k => <th key={k} className="text-right p-2">{labels[k] || k}</th>)}</tr></thead>
          <tbody>
            {rows.map((r: any, i: number) => (
              <tr key={i} className="border-t">
                {keys.map(k => {
                  const v = r[k];
                  const display = v == null ? "—" : moneyKeys.has(k) ? money(v) : pctKeys.has(k) ? pct(v) : v;
                  return <td key={k} className="p-2 tabular-nums">{display}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
