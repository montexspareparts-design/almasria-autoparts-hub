import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Banknote, TrendingDown, Boxes, Building2, Sparkles, Loader2, RefreshCw, Crown, AlertTriangle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import ReactMarkdown from "react-markdown";

const fmt = (n: number) => new Intl.NumberFormat("ar-EG", { maximumFractionDigits: 0 }).format(Math.round(n || 0));
const fmtMoney = (n: number) => `${fmt(n)} ج.م`;

const tierLabel = (t: string) =>
  t === "wholesale" ? "جملة" : t === "half_wholesale" ? "نصف جملة" : t === "retail" ? "قطاعي" : t;

export default function FinancialIntelligencePanel() {
  const { toast } = useToast();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState<string>("");
  const [genLoading, setGenLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("get_financial_intelligence");
    if (error) toast({ title: "خطأ", description: error.message, variant: "destructive" });
    else setData(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const generateRecommendations = async () => {
    setGenLoading(true);
    setRecommendations("");
    try {
      const { data, error } = await supabase.functions.invoke("executive-ai-analysis", {
        body: { mode: "recommendations" },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setRecommendations((data as any).analysis);
    } catch (e: any) {
      toast({ title: "فشل التوليد", description: e.message, variant: "destructive" });
    } finally {
      setGenLoading(false);
    }
  };

  if (loading) return <Skeleton className="h-96" />;
  if (!data) return null;

  const prof = data.profitability;
  const fc = data.forecast;
  const dead = data.dead_inventory;
  const branches = data.branch_performance ?? [];

  return (
    <div className="space-y-4" dir="rtl">
      <Card className="border-primary/40 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-base">
            <span className="flex items-center gap-2">
              <Banknote className="w-5 h-5 text-primary" />
              الذكاء المالي والتوقعات
            </span>
            <Button variant="outline" size="sm" onClick={load}>
              <RefreshCw className="w-4 h-4 ml-2" /> تحديث
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            ملاحظة: لا يوجد سعر تكلفة محفوظ — الهامش يُحسب كـ "Gross Margin Proxy" من فرق السعر الأساسي والخصومات. للحصول على هامش حقيقي يرجى رفع أسعار التكلفة.
          </p>
        </CardContent>
      </Card>

      <Tabs defaultValue="profitability" className="w-full">
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="profitability">الربحية</TabsTrigger>
          <TabsTrigger value="forecast">إعادة الطلب</TabsTrigger>
          <TabsTrigger value="dead">المخزون الراكد</TabsTrigger>
          <TabsTrigger value="branches">سكور الفروع</TabsTrigger>
          <TabsTrigger value="actions">قرارات الأسبوع</TabsTrigger>
        </TabsList>

        {/* ========= PROFITABILITY ========= */}
        <TabsContent value="profitability" className="space-y-4 mt-4">
          {/* Discount impact */}
          {prof.discount_impact && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Card><CardContent className="p-4">
                <div className="text-xs text-muted-foreground mb-1">إجمالي الإيراد</div>
                <div className="text-lg font-bold tabular-nums">{fmtMoney(prof.discount_impact.revenue_total)}</div>
              </CardContent></Card>
              <Card className="border-yellow-500/40"><CardContent className="p-4">
                <div className="text-xs text-muted-foreground mb-1">خصم الأسعار (هدر)</div>
                <div className="text-lg font-bold tabular-nums text-yellow-700 dark:text-yellow-400">{fmtMoney(prof.discount_impact.price_discount_total)}</div>
                <div className="text-[11px] text-muted-foreground mt-1">
                  {prof.discount_impact.revenue_total > 0
                    ? `${((prof.discount_impact.price_discount_total / prof.discount_impact.revenue_total) * 100).toFixed(1)}% من الإيراد`
                    : "—"}
                </div>
              </CardContent></Card>
              <Card className="border-destructive/40"><CardContent className="p-4">
                <div className="text-xs text-muted-foreground mb-1">إجمالي خصومات الكوبونات</div>
                <div className="text-lg font-bold tabular-nums text-destructive">{fmtMoney(prof.discount_impact.coupon_total)}</div>
              </CardContent></Card>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* By brand */}
            <Card>
              <CardHeader><CardTitle className="text-sm">الربحية حسب البراند</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={prof.by_brand}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="brand" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v: any) => fmtMoney(Number(v))} />
                    <Bar dataKey="margin_proxy" fill="#c9a84c" name="هامش" />
                    <Bar dataKey="discount" fill="#8b1a1a" name="خصم" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* By sale type */}
            <Card>
              <CardHeader><CardTitle className="text-sm">حسب نوع البيع</CardTitle></CardHeader>
              <CardContent>
                <table className="w-full text-sm">
                  <thead><tr className="border-b text-xs text-muted-foreground">
                    <th className="text-right p-2">النوع</th>
                    <th className="text-right p-2">الإيراد</th>
                    <th className="text-right p-2">قطع</th>
                    <th className="text-right p-2">متوسط السعر</th>
                  </tr></thead>
                  <tbody>
                    {(prof.by_sale_type || []).map((s: any, i: number) => (
                      <tr key={i} className="border-b">
                        <td className="p-2 font-medium">{tierLabel(s.sale_tier)}</td>
                        <td className="p-2 tabular-nums">{fmtMoney(s.revenue)}</td>
                        <td className="p-2 tabular-nums">{fmt(s.qty)}</td>
                        <td className="p-2 tabular-nums">{fmtMoney(s.avg_price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>

          {/* Top customers */}
          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Crown className="w-4 h-4 text-primary" /> أعلى 10 عملاء (إيراد)</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b text-xs text-muted-foreground">
                  <th className="text-right p-2">#</th>
                  <th className="text-right p-2">العميل</th>
                  <th className="text-right p-2">الإيراد</th>
                  <th className="text-right p-2">طلبات</th>
                  <th className="text-right p-2">متوسط الطلب</th>
                </tr></thead>
                <tbody>
                  {(prof.top_customers || []).map((c: any, i: number) => (
                    <tr key={i} className="border-b">
                      <td className="p-2">{i + 1}</td>
                      <td className="p-2">{c.full_name || "—"}</td>
                      <td className="p-2 tabular-nums font-semibold">{fmtMoney(c.revenue)}</td>
                      <td className="p-2 tabular-nums">{c.orders_count}</td>
                      <td className="p-2 tabular-nums">{fmtMoney(c.aov)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Weak customers */}
          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><TrendingDown className="w-4 h-4 text-destructive" /> عملاء بربحية ضعيفة (متوسط طلب منخفض)</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b text-xs text-muted-foreground">
                  <th className="text-right p-2">العميل</th>
                  <th className="text-right p-2">إيراد</th>
                  <th className="text-right p-2">طلبات</th>
                  <th className="text-right p-2">متوسط الطلب</th>
                </tr></thead>
                <tbody>
                  {(prof.weak_customers || []).map((c: any, i: number) => (
                    <tr key={i} className="border-b">
                      <td className="p-2">{c.full_name || "—"}</td>
                      <td className="p-2 tabular-nums">{fmtMoney(c.revenue)}</td>
                      <td className="p-2 tabular-nums">{c.orders_count}</td>
                      <td className="p-2 tabular-nums text-destructive">{fmtMoney(c.aov)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* High turnover low margin */}
          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-yellow-600" /> أصناف دوران عالي وخصم كبير</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b text-xs text-muted-foreground">
                  <th className="text-right p-2">SKU</th>
                  <th className="text-right p-2">الصنف</th>
                  <th className="text-right p-2">براند</th>
                  <th className="text-right p-2">قطع</th>
                  <th className="text-right p-2">إيراد</th>
                  <th className="text-right p-2">إجمالي الخصم</th>
                </tr></thead>
                <tbody>
                  {(prof.high_turnover_low_margin || []).map((p: any, i: number) => (
                    <tr key={i} className="border-b">
                      <td className="p-2 font-mono text-xs">{p.sku}</td>
                      <td className="p-2 max-w-[200px] truncate">{p.name_ar}</td>
                      <td className="p-2"><Badge variant="outline" className="text-[10px]">{p.brand}</Badge></td>
                      <td className="p-2 tabular-nums">{p.qty_sold}</td>
                      <td className="p-2 tabular-nums">{fmtMoney(p.revenue)}</td>
                      <td className="p-2 tabular-nums text-destructive">{fmtMoney(p.discount_burn)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========= FORECAST ========= */}
        <TabsContent value="forecast" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">أصناف يجب إعادة طلبها — مرتبة حسب الأيام المتبقية</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b text-xs text-muted-foreground">
                  <th className="text-right p-2">SKU</th>
                  <th className="text-right p-2">الصنف</th>
                  <th className="text-right p-2">براند</th>
                  <th className="text-right p-2">رصيد حالي</th>
                  <th className="text-right p-2">معدل يومي</th>
                  <th className="text-right p-2">أيام متبقية</th>
                  <th className="text-right p-2">نقطة إعادة الطلب</th>
                  <th className="text-right p-2">كمية مقترحة</th>
                </tr></thead>
                <tbody>
                  {(fc.urgent || []).map((p: any, i: number) => {
                    const dr = p.days_remaining;
                    const tone = dr === null ? "text-destructive" : dr <= 7 ? "text-destructive" : dr <= 14 ? "text-yellow-600" : "";
                    return (
                      <tr key={i} className="border-b">
                        <td className="p-2 font-mono text-xs">{p.sku}</td>
                        <td className="p-2 max-w-[200px] truncate">{p.name_ar}</td>
                        <td className="p-2"><Badge variant="outline" className="text-[10px]">{p.brand}</Badge></td>
                        <td className="p-2 tabular-nums">{p.stock_quantity}</td>
                        <td className="p-2 tabular-nums">{Number(p.avg_daily).toFixed(2)}</td>
                        <td className={`p-2 tabular-nums font-bold ${tone}`}>{dr === null ? "نفد" : `${dr}ي`}</td>
                        <td className="p-2 tabular-nums">{p.reorder_point}</td>
                        <td className="p-2 tabular-nums font-semibold text-primary">{p.suggested_qty}</td>
                      </tr>
                    );
                  })}
                  {(!fc.urgent || fc.urgent.length === 0) && (
                    <tr><td colSpan={8} className="p-6 text-center text-muted-foreground text-sm">لا توجد أصناف عاجلة الآن ✅</td></tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========= DEAD INVENTORY ========= */}
        <TabsContent value="dead" className="space-y-4 mt-4">
          {dead.summary && (
            <div className="grid grid-cols-2 gap-3">
              <Card><CardContent className="p-4">
                <div className="text-xs text-muted-foreground mb-1">عدد الأصناف الراكدة</div>
                <div className="text-2xl font-bold tabular-nums">{fmt(dead.summary.items_count)}</div>
                <div className="text-[11px] text-muted-foreground mt-1">بدون مبيعات منذ 90 يوم</div>
              </CardContent></Card>
              <Card className="border-destructive/40"><CardContent className="p-4">
                <div className="text-xs text-muted-foreground mb-1">إجمالي القيمة المجمدة</div>
                <div className="text-2xl font-bold tabular-nums text-destructive">{fmtMoney(dead.summary.total_frozen_value)}</div>
              </CardContent></Card>
            </div>
          )}
          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Boxes className="w-4 h-4" /> أكبر 30 صنف راكد (بالقيمة)</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b text-xs text-muted-foreground">
                  <th className="text-right p-2">SKU</th>
                  <th className="text-right p-2">الصنف</th>
                  <th className="text-right p-2">براند</th>
                  <th className="text-right p-2">رصيد</th>
                  <th className="text-right p-2">السعر</th>
                  <th className="text-right p-2">قيمة مجمدة</th>
                  <th className="text-right p-2">إجراء مقترح</th>
                </tr></thead>
                <tbody>
                  {(dead.items || []).map((p: any, i: number) => {
                    const sug = p.frozen_value > 50000 ? "Bundle / نقل بين الفروع" : p.frozen_value > 10000 ? "خصم 15-25%" : "Cross-selling";
                    return (
                      <tr key={i} className="border-b">
                        <td className="p-2 font-mono text-xs">{p.sku}</td>
                        <td className="p-2 max-w-[200px] truncate">{p.name_ar}</td>
                        <td className="p-2"><Badge variant="outline" className="text-[10px]">{p.brand}</Badge></td>
                        <td className="p-2 tabular-nums">{p.stock_quantity}</td>
                        <td className="p-2 tabular-nums">{fmtMoney(p.base_price)}</td>
                        <td className="p-2 tabular-nums font-bold text-destructive">{fmtMoney(p.frozen_value)}</td>
                        <td className="p-2 text-xs text-primary font-medium">{sug}</td>
                      </tr>
                    );
                  })}
                  {(!dead.items || dead.items.length === 0) && (
                    <tr><td colSpan={7} className="p-6 text-center text-muted-foreground text-sm">لا يوجد مخزون راكد 🎉</td></tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========= BRANCHES ========= */}
        <TabsContent value="branches" className="space-y-4 mt-4">
          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Building2 className="w-4 h-4" /> سكور أداء الفروع</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b text-xs text-muted-foreground">
                  <th className="text-right p-2">الفرع</th>
                  <th className="text-right p-2">السكور</th>
                  <th className="text-right p-2">الإيراد</th>
                  <th className="text-right p-2">طلبات</th>
                  <th className="text-right p-2">عملاء</th>
                  <th className="text-right p-2">خصم</th>
                </tr></thead>
                <tbody>
                  {branches.map((b: any, i: number) => {
                    const sc = Number(b.score) || 0;
                    const tone = sc >= 70 ? "bg-green-500/15 text-green-700 dark:text-green-400" : sc >= 40 ? "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400" : "bg-destructive/15 text-destructive";
                    return (
                      <tr key={i} className="border-b">
                        <td className="p-2 font-medium">{b.branch}</td>
                        <td className="p-2"><span className={`px-2 py-0.5 rounded font-bold tabular-nums ${tone}`}>{sc}</span></td>
                        <td className="p-2 tabular-nums">{fmtMoney(b.revenue)}</td>
                        <td className="p-2 tabular-nums">{b.orders_count}</td>
                        <td className="p-2 tabular-nums">{b.customers}</td>
                        <td className="p-2 tabular-nums text-yellow-600">{fmtMoney(b.discount)}</td>
                      </tr>
                    );
                  })}
                  {branches.length === 0 && (
                    <tr><td colSpan={6} className="p-6 text-center text-muted-foreground text-sm">لا توجد بيانات فروع</td></tr>
                  )}
                </tbody>
              </table>
              <p className="text-[11px] text-muted-foreground mt-3">
                المعادلة: الإيراد ٥٠٪ + الطلبات ٣٠٪ + العملاء ٢٠٪ (نسبي لأعلى فرع).
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========= AI RECOMMENDATIONS ========= */}
        <TabsContent value="actions" className="space-y-4 mt-4">
          <Card className="border-primary/40 bg-gradient-to-br from-primary/5 to-transparent">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Recommended Actions This Week
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button onClick={generateRecommendations} disabled={genLoading} className="gap-2">
                {genLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                توليد أهم 10 قرارات تنفيذية للأسبوع
              </Button>
              {recommendations ? (
                <div className="prose prose-sm dark:prose-invert max-w-none rtl bg-background/60 rounded-lg p-4 border">
                  <ReactMarkdown>{recommendations}</ReactMarkdown>
                </div>
              ) : !genLoading && (
                <p className="text-sm text-muted-foreground">
                  اضغط الزر للحصول على ١٠ قرارات تنفيذية مرتبة حسب الأثر المالي، مبنية على بيانات الذكاء المالي والـ KPIs الحالية.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
