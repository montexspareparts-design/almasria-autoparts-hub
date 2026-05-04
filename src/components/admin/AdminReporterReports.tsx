import { useEffect, useMemo, useState } from "react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, parseISO } from "date-fns";
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
  TrendingUp, Heart, CheckCircle2, AlertCircle, Search, ArrowUp, ArrowDown, ArrowUpDown, Download, Filter,
} from "lucide-react";
import ShoutoutsLog from "./ShoutoutsLog";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
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
  const [tab, setTab] = useState<"all" | "leaderboard" | "individual" | "shoutouts">("all");
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
        // آخر 7 أيام (rolling) — مش ISO week، علشان لو النهاردة سبت يبقى الخميس والجمعة داخلين
        return {
          from: fmt(subDays(today, 6)),
          to: fmt(today),
          label: "آخر 7 أيام",
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
                <SelectItem value="week">آخر 7 أيام</SelectItem>
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
        <TabsList className="grid grid-cols-4 w-full max-w-3xl">
          <TabsTrigger value="all" className="gap-1.5"><FileText className="w-4 h-4" />كل التقارير</TabsTrigger>
          <TabsTrigger value="leaderboard" className="gap-1.5"><Trophy className="w-4 h-4" />الترتيب</TabsTrigger>
          <TabsTrigger value="individual" className="gap-1.5"><Users className="w-4 h-4" />تقرير كل موظف</TabsTrigger>
          <TabsTrigger value="shoutouts" className="gap-1.5"><Heart className="w-4 h-4" />سجل الشكر</TabsTrigger>
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

        <TabsContent value="shoutouts" className="mt-3">
          <ShoutoutsLog from={from} to={to} label={label} />
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
  const [timeline, setTimeline] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [openReport, setOpenReport] = useState<any | null>(null);
  // فلتر مدى زمني خاص بالعرض الفردي (لحد سنة كاملة)
  const [historyRange, setHistoryRange] = useState<"7" | "30" | "90" | "180" | "365" | "custom">("30");
  const [statusFilter, setStatusFilter] = useState<"all" | "submitted" | "missing" | "day_off" | "justified">("all");

  const histFrom = useMemo(() => {
    if (historyRange === "custom") return from;
    return format(subDays(new Date(), Number(historyRange) - 1), "yyyy-MM-dd");
  }, [historyRange, from]);
  const histTo = useMemo(() => {
    if (historyRange === "custom") return to;
    return format(new Date(), "yyyy-MM-dd");
  }, [historyRange, to]);

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

  // Load timeline (يوم بيوم) عبر الـ RPC
  useEffect(() => {
    if (!selected) return;
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await (supabase as any).rpc("get_reporter_daily_timeline", {
          _user_id: selected, _from: histFrom, _to: histTo,
        });
        if (error) throw error;
        setTimeline(data || []);
      } finally { setLoading(false); }
    })();
  }, [selected, histFrom, histTo]);

  // إحصائيات سريعة
  const counts = useMemo(() => {
    const c = { submitted: 0, day_off: 0, justified: 0, missing: 0 };
    timeline.forEach((d) => { if (d.status in c) (c as any)[d.status] += 1; });
    return c;
  }, [timeline]);

  const totalDays = timeline.filter((d) => d.status !== "future").length;
  const submitRate = totalDays > 0 ? Math.round((counts.submitted / totalDays) * 100) : 0;

  const filtered = useMemo(() => {
    return timeline.filter((d) => {
      if (d.status === "future") return false;
      if (statusFilter === "all") return true;
      return d.status === statusFilter;
    });
  }, [timeline, statusFilter]);

  const openReportDetails = async (day: any) => {
    if (!day.report_id) return;
    const { data } = await supabase
      .from("reporter_daily_reports").select("*").eq("id", day.report_id).maybeSingle();
    if (data) setOpenReport(data);
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
        <h3 className="font-bold flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />تقرير كل موظف — متابعة سنوية
        </h3>
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

      {/* فلاتر المدى والحالة */}
      <div className="flex items-center gap-2 flex-wrap mb-3">
        <Badge variant="outline" className="text-[10px]">فترة:</Badge>
        {[
          { v: "7", l: "آخر 7 أيام" },
          { v: "30", l: "آخر شهر" },
          { v: "90", l: "آخر 3 شهور" },
          { v: "180", l: "آخر 6 شهور" },
          { v: "365", l: "آخر سنة" },
          { v: "custom", l: "مخصص (من الفلتر العام)" },
        ].map((r) => (
          <button
            key={r.v}
            onClick={() => setHistoryRange(r.v as any)}
            className={cn(
              "px-2.5 py-1 text-[11px] rounded-full border transition-all",
              historyRange === r.v
                ? "bg-gradient-to-l from-indigo-500 to-violet-600 text-white border-transparent shadow-sm font-semibold"
                : "bg-background text-muted-foreground border-border hover:border-indigo-300"
            )}
          >
            {r.l}
          </button>
        ))}
        <span className="text-[10px] text-muted-foreground ms-1">{histFrom} → {histTo}</span>
      </div>

      {/* لوحة ملخص */}
      {!loading && timeline.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-3">
          <SummaryPill label="نسبة الالتزام" value={`${submitRate}%`} cls="from-indigo-500/15 to-violet-500/15 text-indigo-700 border-indigo-300" />
          <SummaryPill label="مُسلَّم" value={counts.submitted} cls="from-emerald-500/15 to-teal-500/15 text-emerald-700 border-emerald-300" onClick={() => setStatusFilter("submitted")} active={statusFilter === "submitted"} />
          <SummaryPill label="إجازات" value={counts.day_off} cls="from-amber-500/15 to-orange-500/15 text-amber-700 border-amber-300" onClick={() => setStatusFilter("day_off")} active={statusFilter === "day_off"} />
          <SummaryPill label="مبرَّر" value={counts.justified} cls="from-sky-500/15 to-blue-500/15 text-sky-700 border-sky-300" onClick={() => setStatusFilter("justified")} active={statusFilter === "justified"} />
          <SummaryPill label="مفقود" value={counts.missing} cls="from-rose-500/15 to-red-500/15 text-rose-700 border-rose-300" onClick={() => setStatusFilter("missing")} active={statusFilter === "missing"} />
        </div>
      )}

      {/* الحالة المختارة */}
      {statusFilter !== "all" && (
        <div className="mb-2 flex items-center gap-2">
          <Badge className="bg-primary/15 text-primary border-primary/30">
            عرض: {statusFilter === "submitted" ? "مُسلَّم" : statusFilter === "day_off" ? "إجازات" : statusFilter === "justified" ? "مبرَّر" : "مفقود"}
          </Badge>
          <button onClick={() => setStatusFilter("all")} className="text-[10px] text-muted-foreground underline">مسح الفلتر</button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-10 text-sm text-muted-foreground">لا توجد أيام تطابق الفلتر</div>
      ) : (
        <div className="space-y-1.5 max-h-[60vh] overflow-y-auto pr-1">
          {filtered.map((d) => <DayRow key={d.day} d={d} onOpen={() => openReportDetails(d)} />)}
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

function SummaryPill({ label, value, cls, onClick, active }: { label: string; value: any; cls: string; onClick?: () => void; active?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        "rounded-xl border p-2.5 bg-gradient-to-br text-right transition-all",
        cls,
        onClick && "cursor-pointer hover:shadow-md hover:scale-[1.02]",
        active && "ring-2 ring-offset-1 ring-primary scale-[1.02]"
      )}
    >
      <div className="text-[10px] opacity-80 font-semibold">{label}</div>
      <div className="text-xl font-extrabold tabular-nums leading-tight">{value}</div>
    </button>
  );
}

function DayRow({ d, onOpen }: { d: any; onOpen: () => void }) {
  const isSubmitted = d.status === "submitted";
  const isDayOff = d.status === "day_off";
  const isJustified = d.status === "justified";
  const isMissing = d.status === "missing";

  const statusMeta: Record<string, { label: string; cls: string; icon: any }> = {
    submitted: { label: "✓ مُسلَّم", cls: "bg-emerald-500/15 text-emerald-700 border-emerald-500/40", icon: CheckCircle2 },
    day_off:   { label: "🌴 إجازة", cls: "bg-amber-500/15 text-amber-700 border-amber-500/40", icon: AlertCircle },
    justified: { label: "📝 مبرَّر", cls: "bg-sky-500/15 text-sky-700 border-sky-500/40", icon: AlertCircle },
    missing:   { label: "✗ مفقود", cls: "bg-rose-500/15 text-rose-700 border-rose-500/40", icon: XCircle },
  };
  const meta = statusMeta[d.status] || statusMeta.missing;
  const justTypeLabel: Record<string, string> = {
    sick: "مريض", forgot: "نسيت", no_work: "مفيش شغل", other: "سبب آخر",
  };

  const dayName = new Date(d.day).toLocaleDateString("ar-EG", { weekday: "short", day: "2-digit", month: "short" });

  return (
    <button
      onClick={isSubmitted ? onOpen : undefined}
      disabled={!isSubmitted}
      className={cn(
        "w-full text-right p-2.5 rounded-lg border transition-all flex items-start justify-between gap-3 flex-wrap",
        isSubmitted && "hover:border-primary hover:bg-primary/5 cursor-pointer",
        !isSubmitted && "cursor-default",
        isMissing && "border-rose-200 bg-rose-50/40 dark:bg-rose-950/10"
      )}
    >
      <div className="flex items-center gap-2 min-w-0">
        <CalIcon className="w-4 h-4 text-muted-foreground shrink-0" />
        <div className="min-w-0">
          <div className="font-bold text-sm tabular-nums">{dayName}</div>
          {isSubmitted && (
            <div className="text-[10px] text-muted-foreground">
              عروض: {d.quotations_count} • مكالمات: {d.calls_count} • محولة: {d.offers_converted_count}
              {d.self_rating ? ` • ⭐ ${d.self_rating}/10` : ""}
            </div>
          )}
          {isDayOff && d.day_off_reason && (
            <div className="text-[10px] text-amber-700 dark:text-amber-400 line-clamp-1">🌴 {d.day_off_reason}</div>
          )}
          {isJustified && (
            <div className="text-[10px] text-sky-700 dark:text-sky-400 line-clamp-1">
              📝 {justTypeLabel[d.justification_type] || "مبرّر"}
              {d.justification_text ? `: ${d.justification_text}` : ""}
            </div>
          )}
          {isMissing && (
            <div className="text-[10px] text-rose-700 dark:text-rose-400">⚠ مفيش تقرير ولا مبرّر</div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Badge className={cn("text-[10px]", meta.cls)}>{meta.label}</Badge>
        {isSubmitted && <Eye className="w-4 h-4 text-muted-foreground" />}
      </div>
    </button>
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
        <Row label="⭐ تقييم الموظف لنفسه" value={r.self_rating ? `${r.self_rating} / 10` : "—"} />
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
  const [filterDate, setFilterDate] = useState<string | null>(null); // YYYY-MM-DD
  const [search, setSearch] = useState("");
  const [minPerf, setMinPerf] = useState<number>(0);
  type SortKey = "report_date" | "quotations_count" | "calls_count" | "offers_converted_count" | "new_customers_count" | "performance_score";
  const [sortBy, setSortBy] = useState<SortKey>("report_date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  function handleSort(k: SortKey) {
    if (k === sortBy) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortBy(k); setSortDir(k === "report_date" ? "desc" : "desc"); }
  }

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

  const maxPerf = useMemo(
    () => rows.reduce((m, r) => Math.max(m, Number(r.performance_score) || 0), 0),
    [rows]
  );

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    let arr = rows.filter((r) => {
      if (filterStaff !== "all" && r.user_id !== filterStaff) return false;
      if (filterStatus === "submitted" && !r.is_submitted) return false;
      if (filterStatus === "draft" && r.is_submitted) return false;
      if (filterDate && r.report_date !== filterDate) return false;
      if (minPerf > 0 && (Number(r.performance_score) || 0) < minPerf) return false;
      if (q) {
        const p = profilesMap[r.user_id];
        const haystack = [
          p?.full_name, p?.email,
          r.best_deal_today, r.problems_faced, r.tomorrow_plan, r.general_notes,
          r.report_date,
        ].filter(Boolean).join(" ").toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
    arr.sort((a, b) => {
      let av: number | string = a[sortBy] ?? 0;
      let bv: number | string = b[sortBy] ?? 0;
      if (sortBy === "report_date") {
        av = String(av); bv = String(bv);
        return sortDir === "desc" ? (bv as string).localeCompare(av as string) : (av as string).localeCompare(bv as string);
      }
      const an = Number(av) || 0;
      const bn = Number(bv) || 0;
      return sortDir === "desc" ? bn - an : an - bn;
    });
    return arr;
  }, [rows, profilesMap, filterStaff, filterStatus, filterDate, search, minPerf, sortBy, sortDir]);

  // Available dates (unique, sorted desc) — used for quick chips
  const availableDates = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => r.report_date && set.add(r.report_date));
    return Array.from(set).sort((a, b) => (a < b ? 1 : -1));
  }, [rows]);

  // Clear date filter automatically if it falls outside the loaded range
  useEffect(() => {
    if (filterDate && (filterDate < from || filterDate > to)) {
      setFilterDate(null);
    }
  }, [from, to, filterDate]);

  const hasActiveFilter =
    filterStaff !== "all" || filterStatus !== "all" || filterDate !== null ||
    !!search.trim() || minPerf > 0;

  function exportCsv() {
    const headers = [
      "الموظف", "الإيميل", "التاريخ", "اليوم",
      "عروض", "مكالمات", "واتساب", "محولة", "عملاء جدد",
      "غير مكتملة", "نقاط الأداء", "الحالة", "أفضل صفقة", "مشاكل", "خطة بكرة",
    ];
    const lines = [headers.join(",")];
    filteredRows.forEach((r) => {
      const p = profilesMap[r.user_id] || {};
      const day = (() => { try { return format(new Date(r.report_date), "EEEE", { locale: ar }); } catch { return ""; } })();
      const cells = [
        `"${(p.full_name || "موظف").replace(/"/g, '""')}"`,
        `"${(p.email || "").replace(/"/g, '""')}"`,
        r.report_date, day,
        r.quotations_count || 0, r.calls_count || 0, r.whatsapp_count || 0,
        r.offers_converted_count || 0, r.new_customers_count || 0,
        r.incomplete_orders_count || 0, r.performance_score || 0,
        r.is_submitted ? "مُسلَّم" : "مسودة",
        `"${(r.best_deal_today || "").replace(/"/g, '""').replace(/\n/g, " ")}"`,
        `"${(r.problems_faced || "").replace(/"/g, '""').replace(/\n/g, " ")}"`,
        `"${(r.tomorrow_plan || "").replace(/"/g, '""').replace(/\n/g, " ")}"`,
      ];
      lines.push(cells.join(","));
    });
    const csv = "\uFEFF" + lines.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reporter-reports-${from}_${to}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }


  return (
    <div className="space-y-4">
      {/* Missing today + Day off panels */}
      <MissingTodayPanel />
      <DayOffPanel profilesMap={profilesMap} />

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

            {/* Date filter */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "h-9 gap-1.5 text-xs font-normal",
                    filterDate && "border-primary text-primary bg-primary/5"
                  )}
                >
                  <CalIcon className="w-3.5 h-3.5" />
                  {filterDate
                    ? format(parseISO(filterDate), "EEEE dd/MM", { locale: ar })
                    : "كل التواريخ"}
                  {filterDate && (
                    <XCircle
                      className="w-3.5 h-3.5 mr-1 hover:text-destructive"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setFilterDate(null);
                      }}
                    />
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={filterDate ? parseISO(filterDate) : undefined}
                  onSelect={(d) => d && setFilterDate(fmt(d))}
                  disabled={(d) => { const s = fmt(d); return s < from || s > to || s > fmt(new Date()); }}
                  defaultMonth={filterDate ? parseISO(filterDate) : parseISO(to)}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>

            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 text-xs"
              onClick={exportCsv}
              disabled={!filteredRows.length}
              title="تصدير النتائج الحالية CSV"
            >
              <Download className="w-3.5 h-3.5" />
              CSV
            </Button>

            {hasActiveFilter && (
              <Button
                variant="ghost" size="sm" className="h-9 gap-1 text-xs"
                onClick={() => {
                  setFilterStaff("all"); setFilterStatus("all"); setFilterDate(null);
                  setSearch(""); setMinPerf(0);
                }}
              >
                <XCircle className="w-3.5 h-3.5" />مسح الفلتر
              </Button>
            )}
          </div>
        </div>

        {/* Search + min performance */}
        <div className="flex items-center gap-3 flex-wrap mb-3 pb-3 border-b border-border/50">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث في الاسم/الإيميل/أفضل صفقة/مشاكل/ملاحظات..."
              className="h-9 pr-8 text-xs"
            />
          </div>
          <div className="flex items-center gap-2 text-xs flex-1 min-w-[200px] max-w-sm">
            <Filter className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-muted-foreground whitespace-nowrap">حد أدنى للأداء:</span>
            <Slider
              min={0}
              max={Math.max(maxPerf, 10)}
              step={1}
              value={[minPerf]}
              onValueChange={(v) => setMinPerf(v[0] || 0)}
              className="flex-1"
            />
            <Badge variant="outline" className="font-mono w-12 justify-center">{minPerf}</Badge>
          </div>
        </div>

        {/* Quick date chips */}
        {availableDates.length > 1 && (
          <div className="flex items-center gap-1.5 flex-wrap mb-3 pb-3 border-b border-border/50">
            <span className="text-[11px] text-muted-foreground ml-1">تواريخ سريعة:</span>
            {availableDates.slice(0, 7).map((d) => {
              const count = rows.filter((r) => r.report_date === d).length;
              const active = filterDate === d;
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => setFilterDate(active ? null : d)}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] border transition-all",
                    active
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-muted/40 hover:bg-muted border-border text-foreground"
                  )}
                >
                  <span>{format(parseISO(d), "EEEE", { locale: ar })}</span>
                  <span className="opacity-70">{format(parseISO(d), "dd/MM")}</span>
                  <Badge
                    variant="outline"
                    className={cn(
                      "h-4 text-[9px] px-1.5",
                      active && "bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30"
                    )}
                  >
                    {count}
                  </Badge>
                </button>
              );
            })}
          </div>
        )}

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
                  <SortTh label="التاريخ" k="report_date" current={sortBy} dir={sortDir} onSort={handleSort} />
                  <th className="p-2">اليوم</th>
                  <SortTh label="عروض" k="quotations_count" current={sortBy} dir={sortDir} onSort={handleSort} center />
                  <SortTh label="مكالمات" k="calls_count" current={sortBy} dir={sortDir} onSort={handleSort} center />
                  <SortTh label="محولة" k="offers_converted_count" current={sortBy} dir={sortDir} onSort={handleSort} center />
                  <SortTh label="جدد" k="new_customers_count" current={sortBy} dir={sortDir} onSort={handleSort} center />
                  <SortTh label="أداء" k="performance_score" current={sortBy} dir={sortDir} onSort={handleSort} center />
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

/* ------------------------ Day Off Panel (admin) ------------------------ */
function DayOffPanel({ profilesMap }: { profilesMap: Record<string, any> }) {
  const [rows, setRows] = useState<Array<{ id: string; user_id: string; off_date: string; reason: string | null }>>([]);
  const [loading, setLoading] = useState(true);

  const todayStr2 = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr2 = tomorrow.toISOString().slice(0, 10);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("reporter_day_off" as any)
        .select("id, user_id, off_date, reason")
        .in("off_date", [todayStr2, tomorrowStr2])
        .order("off_date");
      if (!cancelled) {
        setRows((data as any) || []);
        setLoading(false);
      }
    })();
    // realtime
    const ch = supabase
      .channel("day-off-admin")
      .on("postgres_changes", { event: "*", schema: "public", table: "reporter_day_off" }, async () => {
        const { data } = await supabase
          .from("reporter_day_off" as any)
          .select("id, user_id, off_date, reason")
          .in("off_date", [todayStr2, tomorrowStr2])
          .order("off_date");
        setRows((data as any) || []);
      })
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [todayStr2, tomorrowStr2]);

  if (loading) return null;
  if (rows.length === 0) {
    return (
      <Card className="p-3 bg-muted/30 border-dashed text-xs text-muted-foreground flex items-center gap-2">
        🌴 مفيش أجازات مسجّلة لليوم أو بكرة
      </Card>
    );
  }

  const todayList = rows.filter(r => r.off_date === todayStr2);
  const tomorrowList = rows.filter(r => r.off_date === tomorrowStr2);

  const Pill = ({ r }: { r: typeof rows[0] }) => {
    const p = profilesMap[r.user_id];
    const name = p?.full_name || p?.email || "موظف";
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-xs">
        <span>🌴</span>
        <span className="font-bold text-emerald-700 dark:text-emerald-300">{name}</span>
        {r.reason && <span className="text-muted-foreground">— {r.reason}</span>}
      </div>
    );
  };

  return (
    <Card className="p-4 bg-gradient-to-br from-emerald-500/10 to-teal-500/5 border-emerald-500/30">
      <div className="text-xs font-bold text-emerald-700 dark:text-emerald-300 mb-2 flex items-center gap-1.5">
        🌴 الإجازات
      </div>
      <div className="space-y-2">
        {todayList.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-semibold text-muted-foreground">النهاردة:</span>
            {todayList.map(r => <Pill key={r.id} r={r} />)}
          </div>
        )}
        {tomorrowList.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-semibold text-muted-foreground">بكرة:</span>
            {tomorrowList.map(r => <Pill key={r.id} r={r} />)}
          </div>
        )}
      </div>
    </Card>
  );
}

function SortTh({
  label, k, current, dir, onSort, center,
}: {
  label: string;
  k: string;
  current: string;
  dir: "asc" | "desc";
  onSort: (k: any) => void;
  center?: boolean;
}) {
  const active = current === k;
  const Icon = active ? (dir === "desc" ? ArrowDown : ArrowUp) : ArrowUpDown;
  return (
    <th
      className={cn(
        "p-2 cursor-pointer select-none hover:text-primary transition-colors",
        center && "text-center",
        active && "text-primary font-bold"
      )}
      onClick={() => onSort(k)}
      title={active ? `اضغط لعكس الفرز (${dir === "desc" ? "تنازلي" : "تصاعدي"})` : "اضغط للفرز"}
    >
      <span className={cn("inline-flex items-center gap-1", center && "justify-center")}>
        {label}
        <Icon className={cn("w-3 h-3", active ? "text-primary" : "opacity-30")} />
      </span>
    </th>
  );
}
