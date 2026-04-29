import { useEffect, useMemo, useState } from "react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays } from "date-fns";
import { ar } from "date-fns/locale";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Trophy, Medal, Award, Calendar as CalIcon, Loader2, Eye, FileText,
  Phone, MessageCircle, FileCheck, RefreshCw, XCircle, Users, UserPlus,
  Target, AlertTriangle, FileSpreadsheet, ShoppingBag, Receipt, DollarSign,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

const PROBLEM_LABEL: Record<string, string> = {
  price: "السعر", unavailable: "عدم التوافر", delay: "التأخير",
  no_response: "العميل لم يرد", system_issue: "مشكلة في السيستم",
};

const fmt = (d: Date) => d.toISOString().slice(0, 10);

type RangeKey = "today" | "yesterday" | "week" | "month" | "custom";

export default function AdminReporterReports() {
  const [tab, setTab] = useState<"all" | "leaderboard" | "individual">("all");
  const [rangeKey, setRangeKey] = useState<RangeKey>("week");
  const [customFrom, setCustomFrom] = useState<Date>(subDays(new Date(), 7));
  const [customTo, setCustomTo] = useState<Date>(new Date());

  const { from, to, label } = useMemo(() => {
    const today = new Date();
    switch (rangeKey) {
      case "today":
        return { from: fmt(today), to: fmt(today), label: "اليوم" };
      case "yesterday": {
        const y = subDays(today, 1);
        return { from: fmt(y), to: fmt(y), label: "أمس" };
      }
      case "week":
        return {
          from: fmt(startOfWeek(today, { weekStartsOn: 6 })),
          to: fmt(endOfWeek(today, { weekStartsOn: 6 })),
          label: "الأسبوع",
        };
      case "month":
        return {
          from: fmt(startOfMonth(today)),
          to: fmt(endOfMonth(today)),
          label: "الشهر",
        };
      case "custom":
        return { from: fmt(customFrom), to: fmt(customTo), label: "فترة مخصصة" };
    }
  }, [rangeKey, customFrom, customTo]);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <Card className="p-4 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/20 dark:to-purple-950/20 border-indigo-200 dark:border-indigo-900">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/15 grid place-items-center">
              <FileText className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold">تقارير موظفي الفيصل</h2>
              <p className="text-xs text-muted-foreground">أداء الفريق + تقرير كل موظف بالتفصيل</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Select value={rangeKey} onValueChange={(v) => setRangeKey(v as RangeKey)}>
              <SelectTrigger className="w-[140px] h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="today">اليوم</SelectItem>
                <SelectItem value="yesterday">أمس</SelectItem>
                <SelectItem value="week">هذا الأسبوع</SelectItem>
                <SelectItem value="month">هذا الشهر</SelectItem>
                <SelectItem value="custom">مخصص</SelectItem>
              </SelectContent>
            </Select>

            {rangeKey === "custom" && (
              <>
                <DatePick date={customFrom} onChange={setCustomFrom} />
                <span className="text-xs text-muted-foreground">→</span>
                <DatePick date={customTo} onChange={setCustomTo} />
              </>
            )}
            <Badge variant="outline" className="text-[10px]">{from} → {to}</Badge>
          </div>
        </div>
      </Card>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList className="grid grid-cols-3 w-full max-w-2xl">
          <TabsTrigger value="all" className="gap-1.5"><FileText className="w-4 h-4" />كل التقارير</TabsTrigger>
          <TabsTrigger value="leaderboard" className="gap-1.5"><Trophy className="w-4 h-4" />الترتيب</TabsTrigger>
          <TabsTrigger value="individual" className="gap-1.5"><Users className="w-4 h-4" />تقرير كل موظف</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-3">
          <AllReports from={from} to={to} label={label} />
        </TabsContent>

        <TabsContent value="leaderboard" className="mt-3">
          <Leaderboard from={from} to={to} label={label} />
        </TabsContent>

        <TabsContent value="individual" className="mt-3">
          <IndividualReports from={from} to={to} />
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}

function DatePick({ date, onChange }: { date: Date; onChange: (d: Date) => void }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 h-9">
          <CalIcon className="w-3.5 h-3.5" />
          {format(date, "dd/MM", { locale: ar })}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="single" selected={date} onSelect={(d) => d && onChange(d)} initialFocus className={cn("p-3 pointer-events-auto")} />
      </PopoverContent>
    </Popover>
  );
}

function Leaderboard({ from, to, label }: { from: string; to: string; label: string }) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data } = await supabase.rpc("get_reporter_leaderboard", { _from: from, _to: to });
        setRows((data as any[]) || []);
      } finally { setLoading(false); }
    })();
  }, [from, to]);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  if (rows.length === 0) return <Card className="p-8 text-center text-sm text-muted-foreground">لا توجد تقارير في {label}</Card>;

  const max = Math.max(...rows.map((r) => Number(r.performance_score)), 1);
  const medals = ["🥇", "🥈", "🥉"];

  return (
    <Card className="p-4">
      <h3 className="font-bold mb-3 flex items-center gap-2"><Trophy className="w-4 h-4 text-amber-500" />ترتيب الأداء — {label}</h3>
      <div className="space-y-2">
        {rows.map((r, i) => {
          const pct = (Number(r.performance_score) / max) * 100;
          return (
            <motion.div
              key={r.user_id}
              initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
              className={cn(
                "p-3 rounded-xl border relative overflow-hidden",
                i === 0 ? "bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30 border-amber-300" :
                i === 1 ? "bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-900/50 dark:to-gray-900/50 border-slate-300" :
                i === 2 ? "bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 border-orange-200" :
                "bg-card"
              )}
            >
              <div className="flex items-center justify-between gap-3 relative z-10">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="text-2xl shrink-0 w-10 text-center">
                    {i < 3 ? medals[i] : <span className="text-base font-bold text-muted-foreground">#{i + 1}</span>}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold truncate">{r.staff_name}</div>
                    <div className="text-[10px] text-muted-foreground truncate">{r.staff_email}</div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-2xl font-black text-primary">{Number(r.performance_score).toLocaleString("ar-EG")}</div>
                  <div className="text-[10px] text-muted-foreground">درجة الأداء</div>
                </div>
              </div>
              <div className="mt-2 grid grid-cols-4 gap-2 text-[10px] relative z-10">
                <Stat label="تقارير" value={r.reports_count} />
                <Stat label="عروض" value={r.quotations_total} />
                <Stat label="مكالمات" value={r.calls_total} />
                <Stat label="محولة" value={r.converted_total} />
              </div>
              <div className="absolute inset-y-0 right-0 bg-primary/5 transition-all" style={{ width: `${pct}%` }} />
            </motion.div>
          );
        })}
      </div>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: any }) {
  return (
    <div className="text-center p-1.5 rounded bg-card/60 border">
      <div className="font-bold">{Number(value).toLocaleString("ar-EG")}</div>
      <div className="text-muted-foreground">{label}</div>
    </div>
  );
}

function IndividualReports({ from, to }: { from: string; to: string }) {
  const [reporters, setReporters] = useState<any[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [openReport, setOpenReport] = useState<any | null>(null);

  // Load reporter list
  useEffect(() => {
    (async () => {
      const { data: roles } = await supabase
        .from("user_roles").select("user_id").eq("role", "reporter");
      const ids = (roles || []).map((r) => r.user_id);
      if (ids.length === 0) { setReporters([]); return; }
      const { data: profs } = await supabase
        .from("profiles").select("user_id, full_name, email").in("user_id", ids);
      setReporters(profs || []);
      if (!selected && profs?.[0]) setSelected(profs[0].user_id);
    })();
  }, []);

  // Load reports for selected staff in range
  useEffect(() => {
    if (!selected) return;
    (async () => {
      setLoading(true);
      try {
        const { data } = await supabase
          .from("reporter_daily_reports").select("*")
          .eq("user_id", selected)
          .gte("report_date", from).lte("report_date", to)
          .order("report_date", { ascending: false });
        setReports(data || []);
      } finally { setLoading(false); }
    })();
  }, [selected, from, to]);

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
        <h3 className="font-bold flex items-center gap-2"><Users className="w-4 h-4 text-primary" />تقارير كل موظف</h3>
        <Select value={selected} onValueChange={setSelected}>
          <SelectTrigger className="w-[260px] h-9"><SelectValue placeholder="اختر موظف..." /></SelectTrigger>
          <SelectContent>
            {reporters.map((r) => (
              <SelectItem key={r.user_id} value={r.user_id}>
                {r.full_name || r.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : reports.length === 0 ? (
        <div className="text-center py-10 text-sm text-muted-foreground">لا توجد تقارير في هذه الفترة</div>
      ) : (
        <div className="space-y-2">
          {reports.map((r) => (
            <button
              key={r.id} onClick={() => setOpenReport(r)}
              className="w-full text-right p-3 rounded-lg border hover:border-primary hover:bg-primary/5 transition flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <CalIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <div className="font-bold text-sm">{r.report_date}</div>
                  <div className="text-[10px] text-muted-foreground">
                    عروض: {r.quotations_count} • مكالمات: {r.calls_count} • محولة: {r.offers_converted_count}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge className={r.is_submitted ? "bg-emerald-500/15 text-emerald-700 border-emerald-500/40" : "bg-amber-500/15 text-amber-700 border-amber-500/40"}>
                  {r.is_submitted ? "✓ مُسلَّم" : "مسودة"}
                </Badge>
                <Eye className="w-4 h-4 text-muted-foreground" />
              </div>
            </button>
          ))}
        </div>
      )}

      <Dialog open={!!openReport} onOpenChange={(v) => !v && setOpenReport(null)}>
        <DialogContent className="max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><FileText className="w-5 h-5 text-primary" />تقرير {openReport?.report_date}</DialogTitle>
          </DialogHeader>
          {openReport && <FullReportView r={openReport} />}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function FullReportView({ r }: { r: any }) {
  const Row = ({ icon, label, value }: any) => (
    <div className="flex items-center justify-between py-2 border-b border-dashed last:border-0">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}<span>{label}</span></div>
      <span className="text-sm font-bold">{value}</span>
    </div>
  );
  return (
    <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-1">
      <div className="p-3 rounded-lg border">
        <Row icon={<FileSpreadsheet className="w-3.5 h-3.5" />} label="عروض الأسعار" value={r.quotations_count} />
        <Row icon={<Phone className="w-3.5 h-3.5" />} label="مكالمات" value={r.calls_count} />
        <Row icon={<MessageCircle className="w-3.5 h-3.5" />} label="عملاء واتساب" value={r.whatsapp_count} />
        <Row icon={<FileCheck className="w-3.5 h-3.5" />} label="عروض/كشوف مرسلة" value={r.offers_sent_count} />
        <Row icon={<RefreshCw className="w-3.5 h-3.5" />} label="عروض تحوّلت لطلبات" value={r.offers_converted_count} />
        <Row icon={<XCircle className="w-3.5 h-3.5" />} label="طلبات لم تكتمل" value={r.incomplete_orders_count} />
        <Row icon={<Users className="w-3.5 h-3.5" />} label="عملاء تمت متابعتهم" value={r.followups_count} />
        <Row icon={<UserPlus className="w-3.5 h-3.5" />} label="عملاء جدد" value={r.new_customers_count} />
        <Row icon={<Target className="w-3.5 h-3.5" />} label="مهتمين بدون إغلاق" value={r.lost_opportunities_count} />
        <Row icon={<AlertTriangle className="w-3.5 h-3.5" />} label="أكبر مشكلة" value={PROBLEM_LABEL[r.main_problem || ""] || "—"} />
      </div>
      {r.submitted_at && (
        <div className="text-[10px] text-muted-foreground text-center">
          تم التسليم: {new Date(r.submitted_at).toLocaleString("ar-EG")}
        </div>
      )}
    </div>
  );
}

function AllReports({ from, to, label }: { from: string; to: string; label: string }) {
  const [rows, setRows] = useState<any[]>([]);
  const [profilesMap, setProfilesMap] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [openReport, setOpenReport] = useState<any | null>(null);
  const [filterStaff, setFilterStaff] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "submitted" | "draft">("all");

  // Weekly + Monthly aggregates (always shown alongside the current range)
  const today = new Date();
  const weekFrom = fmt(startOfWeek(today, { weekStartsOn: 6 }));
  const weekTo = fmt(endOfWeek(today, { weekStartsOn: 6 }));
  const monthFrom = fmt(startOfMonth(today));
  const monthTo = fmt(endOfMonth(today));

  const [weekAgg, setWeekAgg] = useState<any>(null);
  const [monthAgg, setMonthAgg] = useState<any>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data: reports } = await supabase
          .from("reporter_daily_reports").select("*")
          .gte("report_date", from).lte("report_date", to)
          .order("report_date", { ascending: false })
          .order("submitted_at", { ascending: false });
        const list = reports || [];
        setRows(list);

        const ids = Array.from(new Set(list.map((r: any) => r.user_id)));
        if (ids.length) {
          const { data: profs } = await supabase
            .from("profiles").select("user_id, full_name, email").in("user_id", ids);
          const map: Record<string, any> = {};
          (profs || []).forEach((p: any) => { map[p.user_id] = p; });
          setProfilesMap(map);
        }
      } finally { setLoading(false); }
    })();
  }, [from, to]);

  // Fetch weekly + monthly aggregates
  useEffect(() => {
    (async () => {
      const sumRange = async (f: string, t: string) => {
        const { data } = await supabase
          .from("reporter_daily_reports").select("*")
          .gte("report_date", f).lte("report_date", t);
        const list = data || [];
        const sum = (k: string) => list.reduce((a: number, r: any) => a + Number(r[k] || 0), 0);
        return {
          reports_count: list.length,
          quotations: sum("quotations_count"),
          calls: sum("calls_count"),
          whatsapp: sum("whatsapp_count"),
          converted: sum("offers_converted_count"),
          new_customers: sum("new_customers_count"),
          incomplete: sum("incomplete_orders_count"),
        };
      };
      setWeekAgg(await sumRange(weekFrom, weekTo));
      setMonthAgg(await sumRange(monthFrom, monthTo));
    })();
  }, [weekFrom, weekTo, monthFrom, monthTo]);

  const staffOptions = useMemo(() => {
    const seen = new Set<string>();
    const list: { id: string; name: string }[] = [];
    rows.forEach((r) => {
      if (seen.has(r.user_id)) return;
      seen.add(r.user_id);
      const p = profilesMap[r.user_id];
      list.push({ id: r.user_id, name: p?.full_name || p?.email || "موظف" });
    });
    return list.sort((a, b) => a.name.localeCompare(b.name, "ar"));
  }, [rows, profilesMap]);

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (filterStaff !== "all" && r.user_id !== filterStaff) return false;
      if (filterStatus === "submitted" && !r.is_submitted) return false;
      if (filterStatus === "draft" && r.is_submitted) return false;
      return true;
    });
  }, [rows, filterStaff, filterStatus]);

  const hasActiveFilter = filterStaff !== "all" || filterStatus !== "all";

  return (
    <div className="space-y-4">
      {/* Aggregates */}
      <div className="grid md:grid-cols-2 gap-3">
        <AggCard title="ملخص الأسبوع" subtitle={`${weekFrom} → ${weekTo}`} agg={weekAgg} color="emerald" />
        <AggCard title="ملخص الشهر" subtitle={`${monthFrom} → ${monthTo}`} agg={monthAgg} color="indigo" />
      </div>

      {/* All reports table */}
      <Card className="p-4">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
          <h3 className="font-bold flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            كل تقارير الموظفين — {label}
            <Badge variant="outline" className="text-[10px]">
              {filteredRows.length}{hasActiveFilter ? ` / ${rows.length}` : ""}
            </Badge>
          </h3>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={filterStaff} onValueChange={setFilterStaff}>
              <SelectTrigger className="w-[180px] h-9">
                <SelectValue placeholder="كل الموظفين" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الموظفين</SelectItem>
                {staffOptions.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)}>
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الحالات</SelectItem>
                <SelectItem value="submitted">✓ مُسلَّم فقط</SelectItem>
                <SelectItem value="draft">مسودة فقط</SelectItem>
              </SelectContent>
            </Select>
            {hasActiveFilter && (
              <Button
                variant="ghost" size="sm" className="h-9 gap-1 text-xs"
                onClick={() => { setFilterStaff("all"); setFilterStatus("all"); }}
              >
                <XCircle className="w-3.5 h-3.5" />مسح الفلتر
              </Button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : filteredRows.length === 0 ? (
          <div className="text-center py-10 text-sm text-muted-foreground">
            {hasActiveFilter ? "لا توجد تقارير مطابقة للفلتر" : "لا توجد تقارير في هذه الفترة"}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-[11px] text-muted-foreground border-b">
                <tr className="text-right">
                  <th className="p-2">الموظف</th>
                  <th className="p-2">التاريخ</th>
                  <th className="p-2">اليوم</th>
                  <th className="p-2 text-center">عروض</th>
                  <th className="p-2 text-center">مكالمات</th>
                  <th className="p-2 text-center">محولة</th>
                  <th className="p-2 text-center">جدد</th>
                  <th className="p-2 text-center">الحالة</th>
                  <th className="p-2"></th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((r) => {
                  const dayName = format(new Date(r.report_date), "EEEE", { locale: ar });
                  const p = profilesMap[r.user_id];
                  return (
                    <tr key={r.id} className="border-b last:border-0 hover:bg-muted/40 transition">
                      <td className="p-2">
                        <div className="font-bold">{p?.full_name || "موظف"}</div>
                        <div className="text-[10px] text-muted-foreground">{p?.email || "—"}</div>
                      </td>
                      <td className="p-2 font-mono text-xs">{r.report_date}</td>
                      <td className="p-2"><Badge variant="outline" className="text-[10px]">{dayName}</Badge></td>
                      <td className="p-2 text-center">{r.quotations_count}</td>
                      <td className="p-2 text-center">{r.calls_count}</td>
                      <td className="p-2 text-center font-bold text-emerald-600">{r.offers_converted_count}</td>
                      <td className="p-2 text-center font-bold text-blue-600">{r.new_customers_count}</td>
                      <td className="p-2 text-center">
                        <Badge className={r.is_submitted ? "bg-emerald-500/15 text-emerald-700 border-emerald-500/40" : "bg-amber-500/15 text-amber-700 border-amber-500/40"}>
                          {r.is_submitted ? "✓ مُسلَّم" : "مسودة"}
                        </Badge>
                      </td>
                      <td className="p-2">
                        <Button size="sm" variant="ghost" onClick={() => setOpenReport({ ...r, _profile: p })}>
                          <Eye className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Dialog open={!!openReport} onOpenChange={(v) => !v && setOpenReport(null)}>
        <DialogContent className="max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              {openReport?._profile?.full_name || "تقرير"} — {openReport?.report_date}
            </DialogTitle>
          </DialogHeader>
          {openReport && <FullReportView r={openReport} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AggCard({ title, subtitle, agg, color }: { title: string; subtitle: string; agg: any; color: "emerald" | "indigo" }) {
  const colorMap = {
    emerald: "from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border-emerald-200 dark:border-emerald-900 text-emerald-700",
    indigo: "from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 border-indigo-200 dark:border-indigo-900 text-indigo-700",
  };
  return (
    <Card className={cn("p-4 bg-gradient-to-br border", colorMap[color])}>
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="font-bold flex items-center gap-1.5"><TrendingUp className="w-4 h-4" />{title}</div>
          <div className="text-[10px] text-muted-foreground font-mono">{subtitle}</div>
        </div>
        <Badge variant="outline" className="text-[10px]">{agg?.reports_count ?? 0} تقرير</Badge>
      </div>
      {!agg ? (
        <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin" /></div>
      ) : (
        <div className="grid grid-cols-4 gap-2 text-[11px]">
          <Stat label="عروض" value={agg.quotations} />
          <Stat label="مكالمات" value={agg.calls} />
          <Stat label="واتساب" value={agg.whatsapp} />
          <Stat label="محولة" value={agg.converted} />
          <Stat label="جدد" value={agg.new_customers} />
          <Stat label="غير مكتملة" value={agg.incomplete} />
        </div>
      )}
    </Card>
  );
}
