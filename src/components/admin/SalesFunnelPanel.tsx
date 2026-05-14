import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Filter, Loader2, RefreshCw, Sparkles, TrendingDown, AlertTriangle, Crown, Clock } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, FunnelChart, Funnel, LabelList } from "recharts";
import ReactMarkdown from "react-markdown";

const fmt = (n: number) => new Intl.NumberFormat("ar-EG", { maximumFractionDigits: 0 }).format(Math.round(n || 0));
const fmtMoney = (n: number) => `${fmt(n)} ج.م`;
const tierLabel = (t: string) => t === "wholesale" ? "جملة" : t === "half_wholesale" ? "نصف جملة" : t === "retail" ? "قطاعي" : t;

export default function SalesFunnelPanel() {
  const { toast } = useToast();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [aiInsight, setAiInsight] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("get_funnel_analysis");
    if (error) toast({ title: "خطأ", description: error.message, variant: "destructive" });
    else setData(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const runAI = async () => {
    setAiLoading(true);
    setAiInsight("");
    try {
      const { data, error } = await supabase.functions.invoke("executive-ai-analysis", { body: { mode: "funnel" } });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setAiInsight((data as any).analysis);
    } catch (e: any) {
      toast({ title: "فشل", description: e.message, variant: "destructive" });
    } finally { setAiLoading(false); }
  };

  if (loading) return <Skeleton className="h-96" />;
  if (!data) return null;

  const f = data.funnel;
  const funnelData = [
    { name: "عروض الأسعار", value: f.quotes_total, fill: "#0a2540" },
    { name: "طلبيات (تحوّلت)", value: f.quotes_converted, fill: "#c9a84c" },
    { name: "فواتير", value: f.orders_invoiced, fill: "#2d8a9e" },
  ];

  // Alerts
  const alerts: any[] = [];
  if (f.quote_to_order_rate !== null && f.quote_to_order_rate < 30)
    alerts.push({ sev: "high", title: "نسبة تحويل عروض الأسعار منخفضة", reason: `${f.quote_to_order_rate}% فقط`, action: "راجع التسعير وسرعة المتابعة" });
  if (f.order_to_invoice_rate !== null && f.order_to_invoice_rate < 50)
    alerts.push({ sev: "medium", title: "تأخر فوترة الطلبيات", reason: `${f.order_to_invoice_rate}% فقط مفوتر`, action: "راجع طابور الفواتير المعلقة" });
  if (f.quote_value_lost > 0)
    alerts.push({ sev: f.quote_value_lost > f.quote_value_won ? "high" : "low", title: "قيمة عروض مفقودة", reason: fmtMoney(f.quote_value_lost), action: "تواصل مع العملاء قبل انتهاء الصلاحية" });
  if ((data.stuck_orders || []).length > 0)
    alerts.push({ sev: "medium", title: `${data.stuck_orders.length} طلب متوقف بدون فوترة (>7 أيام)`, reason: "تأخر إصدار الفواتير", action: "افتح تبويب «معلقات» وراجع كل طلب" });

  const sevColor = (s: string) =>
    s === "high" ? "border-destructive/50 bg-destructive/5"
    : s === "medium" ? "border-yellow-500/50 bg-yellow-500/5"
    : "border-border bg-muted/30";

  return (
    <div className="space-y-4" dir="rtl">
      <Card className="border-primary/40 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-base">
            <span className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-primary" />
              تحليل قمع المبيعات (عرض → طلبية → فاتورة)
            </span>
            <Button variant="outline" size="sm" onClick={load}>
              <RefreshCw className="w-4 h-4 ml-2" /> تحديث
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            ربط عرض السعر بالطلب: نفس العميل + منتج مشترك + خلال 30 يوم. الفاتورة = طلب بحالة (مُسلَّم/مشحون) أو له ملف فاتورة.
            ملاحظة: عرض الأسعار لا يحفظ الموظف المنشئ — التحليل حسب الموظف غير متاح حالياً.
          </p>
        </CardContent>
      </Card>

      {/* Top KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground mb-1">معدل تحويل العروض → طلبيات</div>
          <div className="text-2xl font-bold tabular-nums">{f.quote_to_order_rate ?? "—"}%</div>
          <div className="text-[11px] text-muted-foreground mt-1">{f.quotes_converted} من {f.quotes_total}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground mb-1">معدل تحويل طلبيات → فواتير</div>
          <div className="text-2xl font-bold tabular-nums">{f.order_to_invoice_rate ?? "—"}%</div>
          <div className="text-[11px] text-muted-foreground mt-1">{f.orders_invoiced} من {f.orders_total}</div>
        </CardContent></Card>
        <Card className="border-primary/30"><CardContent className="p-4">
          <div className="text-xs text-muted-foreground mb-1">القمع الكامل (عرض → فاتورة)</div>
          <div className="text-2xl font-bold tabular-nums text-primary">{f.full_funnel_rate ?? "—"}%</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground mb-1">متوسط الوقت للتحويل</div>
          <div className="text-2xl font-bold tabular-nums">{f.avg_days_to_convert ? `${Number(f.avg_days_to_convert).toFixed(1)}ي` : "—"}</div>
        </CardContent></Card>
      </div>

      {/* Value KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground mb-1">قيمة عروض الأسعار</div>
          <div className="text-lg font-bold tabular-nums">{fmtMoney(f.quote_value_total)}</div>
        </CardContent></Card>
        <Card className="border-green-500/40"><CardContent className="p-4">
          <div className="text-xs text-muted-foreground mb-1">قيمة العروض الناجحة</div>
          <div className="text-lg font-bold tabular-nums text-green-700 dark:text-green-400">{fmtMoney(f.quote_value_won)}</div>
        </CardContent></Card>
        <Card className="border-destructive/40"><CardContent className="p-4">
          <div className="text-xs text-muted-foreground mb-1">قيمة العروض المفقودة</div>
          <div className="text-lg font-bold tabular-nums text-destructive">{fmtMoney(f.quote_value_lost)}</div>
        </CardContent></Card>
        <Card className="border-yellow-500/40"><CardContent className="p-4">
          <div className="text-xs text-muted-foreground mb-1">طلبيات معلقة بدون فاتورة</div>
          <div className="text-lg font-bold tabular-nums text-yellow-700 dark:text-yellow-400">{fmtMoney(f.order_value_pending)}</div>
        </CardContent></Card>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-yellow-600" /> تنبيهات القمع ({alerts.length})</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {alerts.map((a, i) => (
                <div key={i} className={`p-3 rounded-lg border ${sevColor(a.sev)}`}>
                  <div className="font-semibold text-sm mb-1">{a.title}</div>
                  <div className="text-xs text-muted-foreground mb-2">{a.reason}</div>
                  <div className="text-xs text-primary font-medium">👈 {a.action}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Funnel chart */}
        <Card>
          <CardHeader><CardTitle className="text-sm">شكل القمع</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <FunnelChart>
                <Tooltip />
                <Funnel dataKey="value" data={funnelData} isAnimationActive>
                  <LabelList position="right" fill="#000" stroke="none" dataKey="name" />
                  <LabelList position="center" fill="#fff" stroke="none" dataKey="value" />
                </Funnel>
              </FunnelChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Trend */}
        <Card>
          <CardHeader><CardTitle className="text-sm">اتجاه العروض والطلبات (30 يوم)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={data.trend || []}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="quotes" stroke="#0a2540" strokeWidth={2} name="عروض" dot={false} />
                <Line type="monotone" dataKey="orders" stroke="#c9a84c" strokeWidth={2} name="طلبات" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Breakdowns tabs */}
      <Tabs defaultValue="brand">
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="brand">حسب البراند</TabsTrigger>
          <TabsTrigger value="tier">نوع البيع</TabsTrigger>
          <TabsTrigger value="branch">الفرع</TabsTrigger>
          <TabsTrigger value="closers">أعلى/أضعف العملاء</TabsTrigger>
          <TabsTrigger value="leaks">التسريبات</TabsTrigger>
        </TabsList>

        <TabsContent value="brand" className="mt-4">
          <Card><CardContent className="p-4 overflow-x-auto">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data.by_brand}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="brand" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="quoted_in" fill="#0a2540" name="عروض" />
                <Bar dataKey="converted" fill="#c9a84c" name="تحوّل" />
              </BarChart>
            </ResponsiveContainer>
            <table className="w-full text-sm mt-3">
              <thead><tr className="border-b text-xs text-muted-foreground">
                <th className="text-right p-2">البراند</th>
                <th className="text-right p-2">عروض</th>
                <th className="text-right p-2">تحوّل</th>
                <th className="text-right p-2">نسبة</th>
                <th className="text-right p-2">قيمة العروض</th>
              </tr></thead>
              <tbody>
                {(data.by_brand || []).map((b: any, i: number) => (
                  <tr key={i} className="border-b">
                    <td className="p-2"><Badge variant="outline">{b.brand}</Badge></td>
                    <td className="p-2 tabular-nums">{b.quoted_in}</td>
                    <td className="p-2 tabular-nums">{b.converted}</td>
                    <td className={`p-2 tabular-nums font-bold ${(b.rate || 0) < 30 ? 'text-destructive' : (b.rate || 0) < 60 ? 'text-yellow-600' : 'text-green-700 dark:text-green-400'}`}>{b.rate ?? '—'}%</td>
                    <td className="p-2 tabular-nums">{fmtMoney(b.quote_value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="tier" className="mt-4">
          <Card><CardContent className="p-4">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-xs text-muted-foreground">
                <th className="text-right p-2">النوع</th><th className="text-right p-2">عروض</th><th className="text-right p-2">تحوّل</th><th className="text-right p-2">نسبة</th>
              </tr></thead>
              <tbody>
                {(data.by_tier || []).map((t: any, i: number) => (
                  <tr key={i} className="border-b">
                    <td className="p-2 font-medium">{tierLabel(t.sale_tier)}</td>
                    <td className="p-2 tabular-nums">{t.quotes}</td>
                    <td className="p-2 tabular-nums">{t.converted}</td>
                    <td className="p-2 tabular-nums font-bold">{t.rate ?? '—'}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="branch" className="mt-4">
          <Card><CardContent className="p-4">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-xs text-muted-foreground">
                <th className="text-right p-2">الفرع</th><th className="text-right p-2">طلبات</th><th className="text-right p-2">مفوتر</th><th className="text-right p-2">نسبة فوترة</th><th className="text-right p-2">إيراد</th>
              </tr></thead>
              <tbody>
                {(data.by_branch || []).map((b: any, i: number) => (
                  <tr key={i} className="border-b">
                    <td className="p-2 font-medium">{b.branch}</td>
                    <td className="p-2 tabular-nums">{b.orders_count}</td>
                    <td className="p-2 tabular-nums">{b.invoiced}</td>
                    <td className={`p-2 tabular-nums font-bold ${(b.rate || 0) < 50 ? 'text-destructive' : ''}`}>{b.rate ?? '—'}%</td>
                    <td className="p-2 tabular-nums">{fmtMoney(b.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="closers" className="mt-4 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Crown className="w-4 h-4 text-primary" /> أعلى العملاء تحويلاً</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b text-xs text-muted-foreground">
                  <th className="text-right p-2">العميل</th><th className="text-right p-2">عروض</th><th className="text-right p-2">حوّل</th><th className="text-right p-2">نسبة</th><th className="text-right p-2">قيمة العروض</th>
                </tr></thead>
                <tbody>
                  {(data.top_closers || []).map((c: any, i: number) => (
                    <tr key={i} className="border-b">
                      <td className="p-2">{c.full_name || '—'}</td>
                      <td className="p-2 tabular-nums">{c.quotes}</td>
                      <td className="p-2 tabular-nums">{c.converted}</td>
                      <td className="p-2 tabular-nums font-bold text-green-700 dark:text-green-400">{c.rate}%</td>
                      <td className="p-2 tabular-nums">{fmtMoney(c.quote_value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><TrendingDown className="w-4 h-4 text-destructive" /> أضعف العملاء تحويلاً</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b text-xs text-muted-foreground">
                  <th className="text-right p-2">العميل</th><th className="text-right p-2">عروض</th><th className="text-right p-2">حوّل</th><th className="text-right p-2">نسبة</th><th className="text-right p-2">قيمة مفقودة</th>
                </tr></thead>
                <tbody>
                  {(data.weak_closers || []).map((c: any, i: number) => (
                    <tr key={i} className="border-b">
                      <td className="p-2">{c.full_name || '—'}</td>
                      <td className="p-2 tabular-nums">{c.quotes}</td>
                      <td className="p-2 tabular-nums">{c.converted}</td>
                      <td className="p-2 tabular-nums font-bold text-destructive">{c.rate ?? '0'}%</td>
                      <td className="p-2 tabular-nums text-destructive">{fmtMoney(c.lost_value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leaks" className="mt-4 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">عملاء يطلبون عروض كثيرة بدون شراء</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b text-xs text-muted-foreground">
                  <th className="text-right p-2">العميل</th><th className="text-right p-2">عروض</th><th className="text-right p-2">شراء</th><th className="text-right p-2">إجمالي مطلوب</th><th className="text-right p-2">نسبة</th>
                </tr></thead>
                <tbody>
                  {(data.repeat_askers || []).map((r: any, i: number) => (
                    <tr key={i} className="border-b">
                      <td className="p-2">{r.full_name || '—'}</td>
                      <td className="p-2 tabular-nums">{r.quotes_count}</td>
                      <td className="p-2 tabular-nums">{r.conv_count}</td>
                      <td className="p-2 tabular-nums">{fmtMoney(r.total_quoted)}</td>
                      <td className="p-2 tabular-nums font-bold text-yellow-600">{r.conv_rate}%</td>
                    </tr>
                  ))}
                  {(data.repeat_askers || []).length === 0 && <tr><td colSpan={5} className="p-4 text-center text-muted-foreground text-sm">لا يوجد</td></tr>}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">أكبر عروض الأسعار المعلقة (لم تتحول)</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b text-xs text-muted-foreground">
                  <th className="text-right p-2">رقم العرض</th><th className="text-right p-2">العميل</th><th className="text-right p-2">القيمة</th><th className="text-right p-2">عمر العرض</th>
                </tr></thead>
                <tbody>
                  {(data.lost_opportunities || []).map((l: any, i: number) => (
                    <tr key={i} className="border-b">
                      <td className="p-2 font-mono text-xs">{l.quote_number}</td>
                      <td className="p-2">{l.customer_name || '—'}</td>
                      <td className="p-2 tabular-nums font-bold text-destructive">{fmtMoney(l.quote_value)}</td>
                      <td className="p-2 tabular-nums">{l.age_days}ي</td>
                    </tr>
                  ))}
                  {(data.lost_opportunities || []).length === 0 && <tr><td colSpan={4} className="p-4 text-center text-muted-foreground text-sm">لا يوجد</td></tr>}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Clock className="w-4 h-4 text-yellow-600" /> طلبيات متوقفة بدون فوترة (>7 أيام)</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b text-xs text-muted-foreground">
                  <th className="text-right p-2">الطلب</th><th className="text-right p-2">العميل</th><th className="text-right p-2">القيمة</th><th className="text-right p-2">الحالة</th><th className="text-right p-2">العمر</th>
                </tr></thead>
                <tbody>
                  {(data.stuck_orders || []).map((s: any, i: number) => (
                    <tr key={i} className="border-b">
                      <td className="p-2 font-mono text-xs">{s.order_number}</td>
                      <td className="p-2">{s.customer_name || '—'}</td>
                      <td className="p-2 tabular-nums font-bold">{fmtMoney(s.total_amount)}</td>
                      <td className="p-2"><Badge variant="outline" className="text-[10px]">{s.status}</Badge></td>
                      <td className="p-2 tabular-nums text-destructive">{s.age_days}ي</td>
                    </tr>
                  ))}
                  {(data.stuck_orders || []).length === 0 && <tr><td colSpan={5} className="p-4 text-center text-muted-foreground text-sm">لا يوجد ✅</td></tr>}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* AI Insights */}
      <Card className="border-primary/40 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" /> توصيات AI لتحسين القمع
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={runAI} disabled={aiLoading} className="gap-2">
            {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            حلّل القمع وأعطني توصيات
          </Button>
          {aiInsight && (
            <div className="prose prose-sm dark:prose-invert max-w-none rtl bg-background/60 rounded-lg p-4 border">
              <ReactMarkdown>{aiInsight}</ReactMarkdown>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
