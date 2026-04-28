import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, FunnelChart, Funnel, LabelList, Cell,
} from "recharts";
import {
  TrendingUp, Users, ShoppingBag, DollarSign, Target, Activity,
  AlertTriangle, Trophy, Download, Filter, Loader2, Lock, Unlock, RefreshCw,
} from "lucide-react";
import * as XLSX from "xlsx";

type Row = {
  id: string;
  staff_user_id: string;
  staff_name: string | null;
  staff_email: string | null;
  report_date: string;
  customers_contacted: number;
  customers_registered: number;
  customers_with_invoices: number;
  total_invoices_amount: number;
  hot_leads_count: number;
  follow_ups_count: number;
  quotes_count: number;
  lost_customers_count: number;
  lost_reason: string | null;
  performance_rating: number | null;
  problems_faced: string | null;
  best_deal_today: string | null;
  is_locked: boolean;
  submitted_at: string;
  conversion_rate_pct: number;
  leads_to_orders_pct: number;
  avg_order_value: number;
  activity_score: number;
};

const today = () => {
  const d = new Date();
  return d.toISOString().slice(0, 10);
};
const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

const LOST_REASON_LABEL: Record<string, string> = {
  price: "السعر",
  out_of_stock: "عدم التوافر",
  delay: "التأخير",
  no_response: "لم يرد",
  other: "أخرى",
};

export default function AdminDailyReportsDashboard() {
  const { toast } = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState(daysAgo(7));
  const [to, setTo] = useState(today());
  const [staffFilter, setStaffFilter] = useState<string>("all");

  const fetchRows = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("staff_daily_reports_kpi" as any)
      .select("*")
      .gte("report_date", from)
      .lte("report_date", to)
      .order("report_date", { ascending: false });

    if (error) {
      toast({ title: "خطأ في تحميل التقارير", description: error.message, variant: "destructive" });
      setRows([]);
    } else {
      setRows((data as any) ?? []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchRows(); /* eslint-disable-next-line */ }, [from, to]);

  // قائمة الموظفين
  const staffList = useMemo(() => {
    const map = new Map<string, string>();
    rows.forEach((r) => {
      if (!map.has(r.staff_user_id))
        map.set(r.staff_user_id, r.staff_name || r.staff_email || "موظف");
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [rows]);

  const filteredRows = useMemo(
    () => (staffFilter === "all" ? rows : rows.filter((r) => r.staff_user_id === staffFilter)),
    [rows, staffFilter]
  );

  // تجميع بالموظف (أحدث تقرير + إجماليات)
  const perStaff = useMemo(() => {
    const map = new Map<string, {
      staff_user_id: string;
      name: string;
      reports: number;
      leads: number;
      contacted: number;
      orders: number;
      sales: number;
      conversion: number;
      activity: number;
      avg_rating: number;
    }>();

    filteredRows.forEach((r) => {
      const cur = map.get(r.staff_user_id) || {
        staff_user_id: r.staff_user_id,
        name: r.staff_name || r.staff_email || "موظف",
        reports: 0, leads: 0, contacted: 0, orders: 0, sales: 0,
        conversion: 0, activity: 0, avg_rating: 0,
      };
      cur.reports += 1;
      cur.leads += r.hot_leads_count;
      cur.contacted += r.customers_contacted;
      cur.orders += r.customers_with_invoices;
      cur.sales += Number(r.total_invoices_amount);
      cur.activity += r.activity_score;
      cur.avg_rating += r.performance_rating ?? 0;
      map.set(r.staff_user_id, cur);
    });

    return Array.from(map.values()).map((s) => ({
      ...s,
      conversion: s.contacted > 0 ? Math.round((s.orders / s.contacted) * 1000) / 10 : 0,
      avg_rating: s.reports > 0 ? Math.round((s.avg_rating / s.reports) * 10) / 10 : 0,
    }));
  }, [filteredRows]);

  // ترتيب الموظفين (Ranking)
  const ranking = useMemo(() => {
    return [...perStaff].sort((a, b) => {
      // وزن: مبيعات > طلبات > معدل تحويل
      const scoreA = a.sales * 0.5 + a.orders * 1000 + a.conversion * 100;
      const scoreB = b.sales * 0.5 + b.orders * 1000 + b.conversion * 100;
      return scoreB - scoreA;
    });
  }, [perStaff]);

  // Funnel
  const funnelData = useMemo(() => {
    const totals = perStaff.reduce(
      (acc, s) => {
        acc.leads += s.leads;
        acc.contacted += s.contacted;
        acc.orders += s.orders;
        return acc;
      },
      { leads: 0, contacted: 0, orders: 0 }
    );
    return [
      { name: "Leads", value: Math.max(totals.leads, 1), fill: "hsl(220 90% 60%)" },
      { name: "تواصل", value: Math.max(totals.contacted, 1), fill: "hsl(160 80% 45%)" },
      { name: "طلبات", value: Math.max(totals.orders, 1), fill: "hsl(30 90% 55%)" },
    ];
  }, [perStaff]);

  // KPI إجمالي للوحة
  const totals = useMemo(() => {
    return perStaff.reduce(
      (acc, s) => {
        acc.reports += s.reports;
        acc.contacted += s.contacted;
        acc.orders += s.orders;
        acc.sales += s.sales;
        return acc;
      },
      { reports: 0, contacted: 0, orders: 0, sales: 0 }
    );
  }, [perStaff]);

  const overallConversion = totals.contacted > 0 ? (totals.orders / totals.contacted) * 100 : 0;

  const exportExcel = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: التقارير التفصيلية
    const sheet1 = filteredRows.map((r) => ({
      "التاريخ": r.report_date,
      "الموظف": r.staff_name || r.staff_email,
      "تواصل": r.customers_contacted,
      "متابعات": r.follow_ups_count,
      "عروض": r.quotes_count,
      "طلبات (فواتير)": r.customers_with_invoices,
      "Leads": r.hot_leads_count,
      "مبيعات (ج.م)": Number(r.total_invoices_amount),
      "معدل التحويل %": r.conversion_rate_pct,
      "متوسط قيمة الطلب": r.avg_order_value,
      "النشاط": r.activity_score,
      "تقييم ذاتي": r.performance_rating,
      "عملاء مفقودين": r.lost_customers_count,
      "سبب الفقد": r.lost_reason ? LOST_REASON_LABEL[r.lost_reason] : "",
      "أحسن صفقة": r.best_deal_today,
      "مشاكل": r.problems_faced,
      "مغلق؟": r.is_locked ? "نعم" : "لا",
      "وقت الإرسال": r.submitted_at,
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheet1), "التقارير");

    // Sheet 2: ترتيب الموظفين
    const sheet2 = ranking.map((s, i) => ({
      "الترتيب": i + 1,
      "الموظف": s.name,
      "عدد التقارير": s.reports,
      "Leads": s.leads,
      "تواصل": s.contacted,
      "طلبات": s.orders,
      "مبيعات (ج.م)": s.sales,
      "معدل التحويل %": s.conversion,
      "النشاط": s.activity,
      "متوسط التقييم": s.avg_rating,
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheet2), "ترتيب الموظفين");

    XLSX.writeFile(wb, `تقارير_الموظفين_${from}_${to}.xlsx`);
  };

  const toggleLock = async (row: Row) => {
    const { error } = await supabase
      .from("staff_daily_reports")
      .update({ is_locked: !row.is_locked })
      .eq("id", row.id);
    if (error) {
      toast({ title: "تعذّر التغيير", description: error.message, variant: "destructive" });
    } else {
      toast({ title: row.is_locked ? "🔓 تم فك القفل" : "🔒 تم القفل" });
      fetchRows();
    }
  };

  return (
    <div className="space-y-6 pb-20" dir="rtl">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <TrendingUp className="h-7 w-7 text-primary" />
            لوحة التقارير اليومية للموظفين
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            متابعة الأداء، KPIs محسوبة تلقائياً، Ranking وتصدير Excel.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchRows}>
            <RefreshCw className="ml-1 h-4 w-4" /> تحديث
          </Button>
          <Button size="sm" onClick={exportExcel} className="bg-emerald-600 hover:bg-emerald-700">
            <Download className="ml-1 h-4 w-4" /> تصدير Excel
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-end">
          <div className="flex-1">
            <Label className="text-xs">من تاريخ</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="flex-1">
            <Label className="text-xs">إلى تاريخ</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="flex-1">
            <Label className="text-xs">الموظف</Label>
            <Select value={staffFilter} onValueChange={setStaffFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الموظفين</SelectItem>
                {staffList.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" onClick={() => { setFrom(today()); setTo(today()); }}>اليوم</Button>
            <Button variant="outline" size="sm" onClick={() => { setFrom(daysAgo(7)); setTo(today()); }}>7 أيام</Button>
            <Button variant="outline" size="sm" onClick={() => { setFrom(daysAgo(30)); setTo(today()); }}>30 يوم</Button>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KPI label="عدد التقارير" value={totals.reports} icon={Activity} color="from-indigo-500 to-indigo-600" />
        <KPI label="إجمالي تواصل" value={totals.contacted} icon={Users} color="from-emerald-500 to-emerald-600" />
        <KPI label="إجمالي طلبات" value={totals.orders} icon={ShoppingBag} color="from-blue-500 to-blue-600" />
        <KPI label="إجمالي مبيعات (ج.م)" value={totals.sales.toLocaleString("ar-EG")} icon={DollarSign} color="from-amber-500 to-amber-600" />
      </div>

      <div className="rounded-lg border bg-gradient-to-l from-primary/5 to-emerald-500/5 p-3 text-center">
        <span className="text-sm">معدل التحويل العام: </span>
        <span className={`text-2xl font-bold ${overallConversion < 10 ? "text-rose-600" : "text-emerald-600"}`}>
          {overallConversion.toFixed(1)}%
        </span>
        {overallConversion < 10 && (
          <Badge variant="destructive" className="mr-2">⚠️ منخفض</Badge>
        )}
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">المبيعات لكل موظف</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={perStaff}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="sales" fill="hsl(30 90% 55%)" name="مبيعات" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">الطلبات vs معدل التحويل</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={perStaff}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="l" />
                <YAxis yAxisId="r" orientation="right" />
                <Tooltip />
                <Legend />
                <Bar yAxisId="l" dataKey="orders" fill="hsl(220 90% 60%)" name="طلبات" />
                <Bar yAxisId="r" dataKey="conversion" fill="hsl(160 80% 45%)" name="تحويل %" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="pb-2"><CardTitle className="text-base">قمع المبيعات (Funnel)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
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
      </div>

      {/* Ranking */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Trophy className="h-5 w-5 text-amber-500" />
            ترتيب الموظفين
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>الموظف</TableHead>
                <TableHead>تقارير</TableHead>
                <TableHead>تواصل</TableHead>
                <TableHead>طلبات</TableHead>
                <TableHead>مبيعات (ج.م)</TableHead>
                <TableHead>تحويل %</TableHead>
                <TableHead>النشاط</TableHead>
                <TableHead>تقييم</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ranking.map((s, i) => {
                const lowConv = s.contacted >= 5 && s.conversion < 10;
                const highContactLowOrders = s.contacted >= 10 && s.orders < 2;
                const lowSales = s.reports >= 3 && s.sales < 1000;
                return (
                  <TableRow key={s.staff_user_id}>
                    <TableCell>
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                    </TableCell>
                    <TableCell className="font-semibold">{s.name}</TableCell>
                    <TableCell>{s.reports}</TableCell>
                    <TableCell>{s.contacted}</TableCell>
                    <TableCell>{s.orders}</TableCell>
                    <TableCell>{s.sales.toLocaleString("ar-EG")}</TableCell>
                    <TableCell className={lowConv ? "font-bold text-rose-600" : "text-emerald-600"}>
                      {s.conversion}%
                      {lowConv && <Badge variant="destructive" className="mr-1 text-[10px]">منخفض</Badge>}
                    </TableCell>
                    <TableCell>
                      {s.activity}
                      {highContactLowOrders && (
                        <Badge variant="outline" className="mr-1 border-amber-400 bg-amber-50 text-[10px] text-amber-700">
                          ⚠️ تواصل عالي
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={s.avg_rating >= 7 ? "bg-emerald-50 text-emerald-700" : s.avg_rating >= 4 ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700"}>
                        {s.avg_rating || "-"}/10
                      </Badge>
                      {lowSales && (
                        <Badge variant="destructive" className="mr-1 text-[10px]">مبيعات ضعيفة</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {ranking.length === 0 && (
                <TableRow><TableCell colSpan={9} className="py-8 text-center text-muted-foreground">لا توجد بيانات في الفترة المحددة.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* تفاصيل التقارير */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">التقارير التفصيلية ({filteredRows.length})</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>الموظف</TableHead>
                  <TableHead>تواصل</TableHead>
                  <TableHead>متابعات</TableHead>
                  <TableHead>عروض</TableHead>
                  <TableHead>طلبات</TableHead>
                  <TableHead>مبيعات</TableHead>
                  <TableHead>تحويل %</TableHead>
                  <TableHead>متوسط طلب</TableHead>
                  <TableHead>سبب الفقد</TableHead>
                  <TableHead>تقييم</TableHead>
                  <TableHead>القفل</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.map((r) => {
                  const lowConv = r.customers_contacted >= 5 && r.conversion_rate_pct < 10;
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs">{r.report_date}</TableCell>
                      <TableCell className="font-medium">{r.staff_name || r.staff_email}</TableCell>
                      <TableCell>{r.customers_contacted}</TableCell>
                      <TableCell>{r.follow_ups_count}</TableCell>
                      <TableCell>{r.quotes_count}</TableCell>
                      <TableCell>{r.customers_with_invoices}</TableCell>
                      <TableCell>{Number(r.total_invoices_amount).toLocaleString("ar-EG")}</TableCell>
                      <TableCell className={lowConv ? "font-bold text-rose-600" : ""}>{r.conversion_rate_pct}%</TableCell>
                      <TableCell>{Number(r.avg_order_value).toLocaleString("ar-EG")}</TableCell>
                      <TableCell className="text-xs">
                        {r.lost_customers_count > 0 && r.lost_reason ? (
                          <Badge variant="outline">{LOST_REASON_LABEL[r.lost_reason]} ({r.lost_customers_count})</Badge>
                        ) : "-"}
                      </TableCell>
                      <TableCell>{r.performance_rating ?? "-"}/10</TableCell>
                      <TableCell>
                        <Button size="sm" variant={r.is_locked ? "destructive" : "outline"} onClick={() => toggleLock(r)} className="h-7 px-2">
                          {r.is_locked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function KPI({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: any; color: string }) {
  return (
    <div className={`rounded-xl bg-gradient-to-br ${color} p-4 text-white shadow-md`}>
      <Icon className="mb-2 h-5 w-5 opacity-90" />
      <div className="text-xs opacity-90">{label}</div>
      <div className="mt-1 text-2xl font-bold leading-tight">{value}</div>
    </div>
  );
}
