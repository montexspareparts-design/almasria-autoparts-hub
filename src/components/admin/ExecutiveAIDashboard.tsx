import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import {
  Brain, TrendingUp, Package, AlertTriangle, Loader2, Sparkles, RefreshCw,
  Users, ShoppingBag, DollarSign, XCircle, Bell, MessageSquare, Send, FileDown, Phone
} from "lucide-react";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import ReactMarkdown from "react-markdown";
import jsPDF from "jspdf";
import FinancialIntelligencePanel from "./FinancialIntelligencePanel";
import SalesFunnelPanel from "./SalesFunnelPanel";
import RealProfitPanel from "./RealProfitPanel";

const fmt = (n: number) => new Intl.NumberFormat("ar-EG", { maximumFractionDigits: 0 }).format(Math.round(n || 0));
const fmtMoney = (n: number) => `${fmt(n)} ج.م`;
const COLORS = ["#0a2540", "#c9a84c", "#8b1a1a", "#2d8a9e", "#5cbdb9", "#e85d3a", "#a0522d", "#4a6741"];

type ChatMsg = { role: "user" | "assistant"; content: string };

export default function ExecutiveAIDashboard() {
  const { toast } = useToast();
  const [kpis, setKpis] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [churn, setChurn] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState<string>("");
  const [analyzingMode, setAnalyzingMode] = useState<string | null>(null);

  // Chat state
  const [chatMsgs, setChatMsgs] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatSending, setChatSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const loadAll = async () => {
    setLoading(true);
    const [k, a, c] = await Promise.all([
      supabase.rpc("get_executive_kpis"),
      supabase.rpc("get_executive_alerts"),
      supabase.rpc("get_customer_churn"),
    ]);
    if (k.error) toast({ title: "خطأ KPIs", description: k.error.message, variant: "destructive" });
    else setKpis(k.data);
    if (!a.error) setAlerts((a.data as any)?.alerts ?? []);
    if (!c.error) setChurn((c.data as any)?.customers ?? []);
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, []);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMsgs]);

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

  const sendChat = async (overrideText?: string) => {
    const text = (overrideText ?? chatInput).trim();
    if (!text || chatSending) return;
    const newMsgs: ChatMsg[] = [...chatMsgs, { role: "user", content: text }];
    setChatMsgs(newMsgs);
    setChatInput("");
    setChatSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("executive-ai-chat", {
        body: { messages: newMsgs },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setChatMsgs([...newMsgs, { role: "assistant", content: (data as any).reply }]);
    } catch (e: any) {
      toast({ title: "فشل الإرسال", description: e.message, variant: "destructive" });
      setChatMsgs(newMsgs); // keep user msg
    } finally {
      setChatSending(false);
    }
  };

  const exportPDF = async () => {
    if (!kpis) return;
    try {
      // Use HTML approach with Arabic text via canvas-friendly rendering
      const doc = new jsPDF({ orientation: "p", unit: "pt", format: "a4" });
      const pageW = doc.internal.pageSize.getWidth();
      let y = 40;

      doc.setFontSize(18);
      doc.text("Executive Summary", pageW / 2, y, { align: "center" });
      y += 10;
      doc.setFontSize(10);
      doc.setTextColor(120);
      doc.text(new Date(kpis.generated_at).toLocaleString("en-GB"), pageW / 2, y + 12, { align: "center" });
      y += 35;

      doc.setTextColor(0);
      doc.setFontSize(12);
      doc.text("Key Metrics:", 40, y); y += 18;
      doc.setFontSize(10);
      const lines = [
        `Sales Today: ${fmt(kpis.sales_today.s)} EGP (${kpis.sales_today.c} orders)`,
        `Sales This Month: ${fmt(kpis.sales_month.s)} EGP (${kpis.sales_month.c} orders)`,
        `Cancellation Rate (30d): ${(kpis.cancel_rate.pct ?? 0).toFixed(1)}%`,
        `Inventory Value: ${fmt(kpis.inventory.total_value)} EGP`,
        `Stagnant Items (60d): ${fmt(kpis.stagnant.c)} (value ${fmt(kpis.stagnant.v)} EGP)`,
        `Low Stock: ${fmt(kpis.inventory.low_stock)}  |  Out of Stock: ${fmt(kpis.inventory.out_of_stock)}`,
      ];
      lines.forEach((l) => { doc.text(l, 50, y); y += 14; });

      y += 10;
      doc.setFontSize(12);
      doc.text(`Smart Alerts (${alerts.length}):`, 40, y); y += 16;
      doc.setFontSize(9);
      alerts.slice(0, 15).forEach((a) => {
        const t = `[${a.severity.toUpperCase()}] ${a.title} - ${a.reason}`;
        const wrapped = doc.splitTextToSize(t, pageW - 80);
        doc.text(wrapped, 50, y);
        y += wrapped.length * 11 + 2;
        if (y > 780) { doc.addPage(); y = 40; }
      });

      y += 10;
      if (y > 720) { doc.addPage(); y = 40; }
      doc.setFontSize(12);
      doc.text(`Top Churn Risk Customers (${churn.length}):`, 40, y); y += 16;
      doc.setFontSize(9);
      churn.slice(0, 15).forEach((c) => {
        const line = `Risk ${c.risk_score}% - ${c.name} - ${c.risk_reason} - Action: ${c.suggested_action}`;
        const wrapped = doc.splitTextToSize(line, pageW - 80);
        doc.text(wrapped, 50, y);
        y += wrapped.length * 11 + 2;
        if (y > 780) { doc.addPage(); y = 40; }
      });

      if (analysis) {
        doc.addPage(); y = 40;
        doc.setFontSize(12);
        doc.text("AI Analysis:", 40, y); y += 16;
        doc.setFontSize(9);
        const wrapped = doc.splitTextToSize(analysis.replace(/[\u0600-\u06FF]/g, "?"), pageW - 80);
        doc.text(wrapped, 40, y);
      }

      doc.save(`executive-summary-${new Date().toISOString().slice(0, 10)}.pdf`);
      toast({ title: "تم", description: "تم تحميل التقرير بصيغة PDF" });
    } catch (e: any) {
      toast({ title: "فشل تصدير PDF", description: e.message, variant: "destructive" });
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

  const sevColor = (s: string) =>
    s === "high" ? "border-destructive/50 bg-destructive/5"
    : s === "medium" ? "border-yellow-500/50 bg-yellow-500/5"
    : "border-border bg-muted/30";

  const sevBadge = (s: string) =>
    s === "high" ? "destructive" : s === "medium" ? "secondary" : "outline";

  const high = alerts.filter(a => a.severity === "high");
  const medium = alerts.filter(a => a.severity === "medium");
  const low = alerts.filter(a => a.severity === "low");

  const quickQs = [
    "من العملاء اللي لازم أتابعهم النهارده؟",
    "إيه الأصناف اللي محتاجة إعادة طلب؟",
    "ليه نسبة الإلغاء عالية؟",
    "إيه الأصناف الراكدة اللي أعمل عليها عرض؟",
  ];

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
            مؤشرات لحظية + تنبيهات + AI — آخر تحديث: {new Date(kpis.generated_at).toLocaleString("ar-EG")}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportPDF}>
            <FileDown className="w-4 h-4 ml-2" /> تصدير PDF
          </Button>
          <Button variant="outline" size="sm" onClick={loadAll}>
            <RefreshCw className="w-4 h-4 ml-2" /> تحديث
          </Button>
        </div>
      </div>

      {/* Smart Alerts */}
      <Card className="border-primary/30">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-base">
            <span className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              التنبيهات الذكية
            </span>
            <div className="flex gap-2 text-xs">
              {high.length > 0 && <Badge variant="destructive">{high.length} عاجل</Badge>}
              {medium.length > 0 && <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-700 dark:text-yellow-400">{medium.length} متوسط</Badge>}
              {low.length > 0 && <Badge variant="outline">{low.length} ملاحظة</Badge>}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-6">✅ لا توجد تنبيهات حالياً — كل المؤشرات في النطاق الطبيعي</div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 max-h-[420px] overflow-y-auto">
              {[...high, ...medium, ...low].map((a, i) => (
                <div key={i} className={`p-3 rounded-lg border ${sevColor(a.severity)}`}>
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="font-semibold text-sm">{a.title}</div>
                    <Badge variant={sevBadge(a.severity) as any} className="text-[10px] shrink-0">
                      {a.severity === "high" ? "عاجل" : a.severity === "medium" ? "متوسط" : "ملاحظة"}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mb-2">{a.reason}</div>
                  <div className="text-xs flex items-center gap-1 text-primary font-medium">
                    👈 {a.action}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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

      {/* AI Chat */}
      <Card className="border-primary/40 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="w-5 h-5 text-primary" />
            اسأل الذكاء الاصطناعي
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {chatMsgs.length === 0 && (
            <div className="flex flex-wrap gap-2">
              {quickQs.map((q, i) => (
                <Button key={i} variant="outline" size="sm" className="text-xs h-auto py-1.5" onClick={() => sendChat(q)} disabled={chatSending}>
                  {q}
                </Button>
              ))}
            </div>
          )}
          {chatMsgs.length > 0 && (
            <ScrollArea className="h-[320px] rounded-lg border bg-background/60 p-3">
              <div className="space-y-3">
                {chatMsgs.map((m, i) => (
                  <div key={i} className={`flex ${m.role === "user" ? "justify-start" : "justify-end"}`}>
                    <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                      {m.role === "assistant" ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1">
                          <ReactMarkdown>{m.content}</ReactMarkdown>
                        </div>
                      ) : m.content}
                    </div>
                  </div>
                ))}
                {chatSending && (
                  <div className="flex justify-end">
                    <div className="bg-muted rounded-lg px-3 py-2 text-sm">
                      <Loader2 className="w-4 h-4 animate-spin inline" /> جاري التفكير...
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
            </ScrollArea>
          )}
          <div className="flex gap-2">
            <Input
              dir="rtl"
              placeholder="اسأل عن المبيعات، المخزون، العملاء..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChat(); } }}
              disabled={chatSending}
            />
            <Button onClick={() => sendChat()} disabled={chatSending || !chatInput.trim()}>
              {chatSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
          {chatMsgs.length > 0 && (
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => setChatMsgs([])}>
              مسح المحادثة
            </Button>
          )}
        </CardContent>
      </Card>

      {/* AI Analysis Buttons */}
      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Brain className="w-5 h-5 text-primary" />
            تحليل ذكي شامل
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

      {/* ===== Stage 3: Financial Intelligence ===== */}
      <FinancialIntelligencePanel />

      {/* ===== Stage 4: Sales Funnel ===== */}
      <SalesFunnelPanel />

      {/* Customer Churn Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="w-5 h-5 text-destructive" />
            عملاء معرضون للتوقف عن الشراء ({churn.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {churn.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-6">لا يوجد عملاء في خطر حالياً</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="text-right p-2">العميل</th>
                    <th className="text-right p-2">Risk</th>
                    <th className="text-right p-2">آخر شراء</th>
                    <th className="text-right p-2">آخر 30 يوم</th>
                    <th className="text-right p-2">السابق (30-60)</th>
                    <th className="text-right p-2">السبب</th>
                    <th className="text-right p-2">الإجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {churn.slice(0, 25).map((c, i) => (
                    <tr key={i} className="border-b hover:bg-muted/30">
                      <td className="p-2 font-medium">
                        <div className="flex items-center gap-1">
                          {c.name}
                          {c.phone && <a href={`tel:${c.phone}`} className="text-primary"><Phone className="w-3 h-3" /></a>}
                        </div>
                      </td>
                      <td className="p-2">
                        <Badge variant={c.risk_score >= 70 ? "destructive" : c.risk_score >= 50 ? "secondary" : "outline"} className="tabular-nums">
                          {c.risk_score}%
                        </Badge>
                      </td>
                      <td className="p-2 text-xs">{c.days_since}ي</td>
                      <td className="p-2 tabular-nums text-xs">{fmtMoney(c.spent_30d)}</td>
                      <td className="p-2 tabular-nums text-xs text-muted-foreground">{fmtMoney(c.spent_30_60)}</td>
                      <td className="p-2 text-xs">{c.risk_reason}</td>
                      <td className="p-2 text-xs text-primary font-medium">{c.suggested_action}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
