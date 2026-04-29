import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays } from "date-fns";
import { ar } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Send, Lock, FileText, Loader2, CheckCircle2, Calendar as CalIcon,
  ClipboardList, FileSpreadsheet, ShoppingBag, Receipt, DollarSign,
  Phone, MessageCircle, FileCheck, RefreshCw, XCircle, Users,
  UserPlus, AlertTriangle, Target, Eye, History, BarChart3,
  Sparkles, Palmtree, Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const PROBLEM_OPTIONS = [
  { value: "price", label: "السعر" },
  { value: "unavailable", label: "عدم التوافر" },
  { value: "delay", label: "التأخير" },
  { value: "no_response", label: "العميل لم يرد" },
  { value: "system_issue", label: "مشكلة في السيستم" },
];

const PROBLEM_LABEL_MAP = Object.fromEntries(PROBLEM_OPTIONS.map((p) => [p.value, p.label]));

interface ReportData {
  id?: string;
  quotations_count: number;
  calls_count: number;
  whatsapp_count: number;
  offers_sent_count: number;
  offers_count: number;
  offers_converted_count: number;
  incomplete_orders_count: number;
  followups_count: number;
  new_customers_count: number;
  main_problem: string;
  problem_notes: string;
  lost_opportunities_count: number;
  is_submitted: boolean;
  submitted_at: string | null;
  auto_orders_count?: number;
  auto_invoices_count?: number;
  auto_total_sales?: number;
  report_date?: string;
}

const EMPTY: ReportData = {
  quotations_count: 0, calls_count: 0, whatsapp_count: 0, offers_sent_count: 0,
  offers_count: 0, offers_converted_count: 0, incomplete_orders_count: 0,
  followups_count: 0, new_customers_count: 0, main_problem: "", problem_notes: "",
  lost_opportunities_count: 0, is_submitted: false, submitted_at: null,
};

const todayStr = () => new Date().toISOString().slice(0, 10);
const fmtDate = (d: Date) => d.toISOString().slice(0, 10);

export default function ReporterDailyForm() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [data, setData] = useState<ReportData>(EMPTY);
  const [staffName, setStaffName] = useState("");
  const [autoStats, setAutoStats] = useState({ orders: 0, invoices: 0, sales: 0 });
  const [tab, setTab] = useState("today");

  const dateLabel = useMemo(
    () => new Date().toLocaleDateString("ar-EG", { weekday: "long", year: "numeric", month: "long", day: "numeric" }),
    []
  );

  // Fetch today's report + auto stats
  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      try {
        const { data: prof } = await supabase
          .from("profiles").select("full_name, email").eq("user_id", user.id).maybeSingle();
        setStaffName(prof?.full_name || prof?.email || user?.email || "—");

        const { data: row } = await supabase
          .from("reporter_daily_reports").select("*")
          .eq("user_id", user.id).eq("report_date", todayStr()).maybeSingle();
        if (row) setData(row as ReportData);

        const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
        const { data: orders } = await supabase
          .from("orders").select("id, total_amount, erp_order_code, status")
          .gte("created_at", startOfDay.toISOString()).neq("status", "cancelled");
        const list = orders || [];
        setAutoStats({
          orders: list.length,
          invoices: list.filter((o) => !!o.erp_order_code).length,
          sales: list.reduce((s, o) => s + Number(o.total_amount || 0), 0),
        });
      } finally { setLoading(false); }
    })();
  }, [user]);

  const locked = data.is_submitted;

  const setNum = (k: keyof ReportData) => (v: string) => {
    if (locked) return;
    const n = Math.max(0, parseInt(v || "0", 10) || 0);
    setData((d) => ({ ...d, [k]: n }));
  };

  const buildPayload = (submit: boolean) => ({
    user_id: user!.id,
    report_date: todayStr(),
    quotations_count: data.quotations_count,
    calls_count: data.calls_count,
    whatsapp_count: data.whatsapp_count,
    offers_sent_count: data.offers_sent_count,
    offers_count: data.offers_count,
    offers_converted_count: data.offers_converted_count,
    incomplete_orders_count: data.incomplete_orders_count,
    followups_count: data.followups_count,
    new_customers_count: data.new_customers_count,
    main_problem: data.main_problem || null,
    problem_notes: data.problem_notes || null,
    lost_opportunities_count: data.lost_opportunities_count,
    is_submitted: submit,
    // Snapshot the auto stats so admin sees the same numbers later
    auto_orders_count: autoStats.orders,
    auto_invoices_count: autoStats.invoices,
    auto_total_sales: autoStats.sales,
  });

  const saveDraft = async () => {
    if (!user || locked) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("reporter_daily_reports")
        .upsert(buildPayload(false), { onConflict: "user_id,report_date" });
      if (error) throw error;
      toast({ title: "تم الحفظ", description: "تم حفظ المسودة، تقدر تكملها بعدين" });
    } catch (e: any) {
      toast({ title: "خطأ", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const submitReport = async () => {
    if (!user || locked) return;
    setSaving(true);
    try {
      const { data: saved, error } = await supabase
        .from("reporter_daily_reports")
        .upsert(buildPayload(true), { onConflict: "user_id,report_date" })
        .select().maybeSingle();
      if (error) throw error;
      if (saved) setData(saved as ReportData);
      toast({ title: "تم الإرسال ✅", description: "تم تسليم تقرير اليوم وإشعار الإدارة على الواتساب" });
      setConfirmOpen(false);
      setPreviewOpen(false);
    } catch (e: any) {
      toast({ title: "خطأ في الإرسال", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }} className="space-y-4"
    >
      {/* Header */}
      <Card className="p-5 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-slate-700 text-white">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-rose-500/20 grid place-items-center border border-rose-500/30">
              <ClipboardList className="w-6 h-6 text-rose-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-extrabold">📋 التقرير اليومي للمبيعات</h2>
                <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-[10px]">إلزامي</Badge>
              </div>
              <div className="flex items-center gap-1.5 mt-1.5 text-xs text-slate-400 flex-wrap">
                <CalIcon className="w-3.5 h-3.5" />{dateLabel}
                <span className="mx-1">•</span>
                <span className="text-slate-300">{staffName}</span>
              </div>
            </div>
          </div>
          {locked && (
            <Badge className="gap-1.5 bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-sm py-1.5 px-3">
              <Lock className="w-3.5 h-3.5" />تم تسليم التقرير
            </Badge>
          )}
        </div>
      </Card>

      {/* Tabs: today | history | week | month */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="today" className="gap-1.5 text-xs sm:text-sm">
            <ClipboardList className="w-3.5 h-3.5" />اليوم
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5 text-xs sm:text-sm">
            <History className="w-3.5 h-3.5" />تاريخ سابق
          </TabsTrigger>
          <TabsTrigger value="week" className="gap-1.5 text-xs sm:text-sm">
            <BarChart3 className="w-3.5 h-3.5" />الأسبوع
          </TabsTrigger>
          <TabsTrigger value="month" className="gap-1.5 text-xs sm:text-sm">
            <BarChart3 className="w-3.5 h-3.5" />الشهر
          </TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="mt-3 space-y-3">
          <MotivationalCard userId={user!.id} />
          <TomorrowOffCard userId={user!.id} />
          <TodayForm
            data={data} setData={setData} setNum={setNum} locked={locked}
            saving={saving} autoStats={autoStats}
            onSaveDraft={saveDraft}
            onPreview={() => setPreviewOpen(true)}
          />
        </TabsContent>

        <TabsContent value="history" className="mt-3">
          <HistoryView userId={user!.id} />
        </TabsContent>

        <TabsContent value="week" className="mt-3">
          <RangeSummary
            userId={user!.id}
            from={fmtDate(startOfWeek(new Date(), { weekStartsOn: 6 }))}
            to={fmtDate(endOfWeek(new Date(), { weekStartsOn: 6 }))}
            label="الأسبوع الحالي (سبت → جمعة)"
          />
        </TabsContent>

        <TabsContent value="month" className="mt-3">
          <RangeSummary
            userId={user!.id}
            from={fmtDate(startOfMonth(new Date()))}
            to={fmtDate(endOfMonth(new Date()))}
            label="الشهر الحالي"
          />
        </TabsContent>
      </Tabs>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-primary" />
              معاينة التقرير قبل الإرسال
            </DialogTitle>
          </DialogHeader>
          <ReportPreview data={data} autoStats={autoStats} staffName={staffName} dateLabel={dateLabel} />
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>رجوع للتعديل</Button>
            <Button
              onClick={() => { setPreviewOpen(false); setConfirmOpen(true); }}
              className="gap-2 bg-gradient-to-r from-primary to-primary/80"
            >
              <Send className="w-4 h-4" />متابعة الإرسال
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد إرسال التقرير</AlertDialogTitle>
            <AlertDialogDescription>
              بعد الإرسال، لن تتمكن من تعديل التقرير وسيتم إشعار الإدارة على الواتساب فوراً. هل أنت متأكد؟
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={submitReport} disabled={saving} className="gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}نعم، أرسل
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}

/* ------------------------ Today form ------------------------ */
function TodayForm({
  data, setData, setNum, locked, saving, autoStats, onSaveDraft, onPreview,
}: any) {
  return (
    <>
      <Card className="p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-4">
          <NumField icon={<FileSpreadsheet className="w-3.5 h-3.5 text-indigo-600" />} label="عدد عروض الأسعار اليوم" required value={data.quotations_count} onChange={setNum("quotations_count")} disabled={locked} />
          <NumField icon={<Phone className="w-3.5 h-3.5 text-purple-600" />} label="عدد المكالمات" required value={data.calls_count} onChange={setNum("calls_count")} disabled={locked} />
          <NumField icon={<MessageCircle className="w-3.5 h-3.5 text-green-600" />} label="عملاء واتساب" required value={data.whatsapp_count} onChange={setNum("whatsapp_count")} disabled={locked} />
          <NumField icon={<FileCheck className="w-3.5 h-3.5 text-cyan-600" />} label="عملاء أُرسل لهم عروض/كشوف" required value={data.offers_sent_count} onChange={setNum("offers_sent_count")} disabled={locked} />
          <NumField icon={<RefreshCw className="w-3.5 h-3.5 text-blue-600" />} label="عروض اتحولت لطلبات" required value={data.offers_converted_count} onChange={setNum("offers_converted_count")} disabled={locked} />
          <NumField icon={<XCircle className="w-3.5 h-3.5 text-rose-600" />} label="طلبات لم تكتمل" required value={data.incomplete_orders_count} onChange={setNum("incomplete_orders_count")} disabled={locked} />
          <NumField icon={<Users className="w-3.5 h-3.5 text-teal-600" />} label="عملاء تمت متابعتهم" required value={data.followups_count} onChange={setNum("followups_count")} disabled={locked} />
          <NumField icon={<UserPlus className="w-3.5 h-3.5 text-emerald-600" />} label="عملاء جدد تم إضافتهم" required value={data.new_customers_count} onChange={setNum("new_customers_count")} disabled={locked} />
          <NumField icon={<Target className="w-3.5 h-3.5 text-orange-600" />} label="مهتمين ولم يتم إغلاقهم" required value={data.lost_opportunities_count} onChange={setNum("lost_opportunities_count")} disabled={locked} />
        </div>

        <div className="mt-5 pt-5 border-t">
          <Label className="text-xs font-bold mb-1.5 flex items-center gap-1.5 text-foreground">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
            أكثر مشكلة واجهتك اليوم<span className="text-rose-500">*</span>
          </Label>
          <Select value={data.main_problem} onValueChange={(v) => !locked && setData((d: any) => ({ ...d, main_problem: v }))} disabled={locked}>
            <SelectTrigger className="h-11"><SelectValue placeholder="اختر المشكلة..." /></SelectTrigger>
            <SelectContent>
              {PROBLEM_OPTIONS.map((o) => (<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="p-5 sticky bottom-3 bg-card/95 backdrop-blur-md border-2 border-primary/30 shadow-lg mt-3">
        {locked ? (
          <div className="flex items-center justify-center gap-2 text-emerald-600 font-bold py-2">
            <CheckCircle2 className="w-5 h-5" /><span>تم تسليم تقرير اليوم — لا يمكن التعديل</span>
          </div>
        ) : (
          <div className="flex gap-2 flex-col sm:flex-row">
            <Button variant="outline" size="lg" onClick={onSaveDraft} disabled={saving} className="flex-1 sm:flex-none gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}حفظ مسودة
            </Button>
            <Button variant="outline" size="lg" onClick={onPreview} disabled={saving} className="flex-1 sm:flex-none gap-2 border-primary/40 text-primary">
              <Eye className="w-4 h-4" />معاينة
            </Button>
            <Button size="lg" onClick={onPreview} disabled={saving} className="flex-1 gap-2 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-bold text-base h-12">
              <Send className="w-5 h-5" />إرسال التقرير
            </Button>
          </div>
        )}
      </Card>
    </>
  );
}

/* ------------------------ History (pick any date) ------------------------ */
function HistoryView({ userId }: { userId: string }) {
  const [date, setDate] = useState<Date>(subDays(new Date(), 1));
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const dateStr = fmtDate(date);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data } = await supabase
          .from("reporter_daily_reports").select("*")
          .eq("user_id", userId).eq("report_date", dateStr).maybeSingle();
        setReport((data as ReportData) || null);
      } finally { setLoading(false); }
    })();
  }, [userId, dateStr]);

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div>
          <h3 className="font-bold flex items-center gap-2"><History className="w-4 h-4 text-primary" />عرض تقرير سابق</h3>
          <p className="text-xs text-muted-foreground">اختر أي تاريخ لعرض التقرير المسلَّم</p>
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2">
              <CalIcon className="w-4 h-4" />
              {format(date, "PPP", { locale: ar })}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single" selected={date}
              onSelect={(d) => d && setDate(d)}
              disabled={(d) => d > new Date()}
              initialFocus className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : !report ? (
        <div className="text-center py-8 text-sm text-muted-foreground">
          لا يوجد تقرير لهذا التاريخ
        </div>
      ) : (
        <ReportSummaryCard report={report} />
      )}
    </Card>
  );
}

/* ------------------------ Week / Month aggregate ------------------------ */
function RangeSummary({ userId, from, to, label }: { userId: string; from: string; to: string; label: string }) {
  const [agg, setAgg] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data } = await supabase.rpc("get_reporter_aggregate", {
          _user_id: userId, _from: from, _to: to,
        });
        setAgg((data as any[])?.[0] || null);
      } finally { setLoading(false); }
    })();
  }, [userId, from, to]);

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  if (!agg || agg.reports_count === 0) {
    return <Card className="p-8 text-center text-sm text-muted-foreground">لا توجد تقارير مسلَّمة في {label}</Card>;
  }

  const items = [
    { label: "تقارير مُسلَّمة", value: agg.reports_count, icon: <FileText className="w-4 h-4" />, color: "indigo" },
    { label: "عروض أسعار", value: agg.quotations_count, icon: <FileSpreadsheet className="w-4 h-4" />, color: "purple" },
    { label: "مكالمات", value: agg.calls_count, icon: <Phone className="w-4 h-4" />, color: "blue" },
    { label: "عملاء واتساب", value: agg.whatsapp_count, icon: <MessageCircle className="w-4 h-4" />, color: "green" },
    { label: "عروض/كشوف مرسلة", value: agg.offers_sent_count, icon: <FileCheck className="w-4 h-4" />, color: "cyan" },
    { label: "عروض تحوّلت لطلبات", value: agg.offers_converted_count, icon: <RefreshCw className="w-4 h-4" />, color: "emerald" },
    { label: "طلبات لم تكتمل", value: agg.incomplete_orders_count, icon: <XCircle className="w-4 h-4" />, color: "rose" },
    { label: "متابعات", value: agg.followups_count, icon: <Users className="w-4 h-4" />, color: "teal" },
    { label: "عملاء جدد", value: agg.new_customers_count, icon: <UserPlus className="w-4 h-4" />, color: "emerald" },
    { label: "مهتمين بدون إغلاق", value: agg.lost_opportunities_count, icon: <Target className="w-4 h-4" />, color: "orange" },
  ];

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="font-bold flex items-center gap-2"><BarChart3 className="w-4 h-4 text-primary" />ملخص {label}</h3>
        <Badge variant="outline">{from} → {to}</Badge>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
        {items.map((it) => (
          <div key={it.label} className="p-3 rounded-xl border bg-muted/30">
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-1">
              {it.icon}<span>{it.label}</span>
            </div>
            <div className="text-2xl font-extrabold">{Number(it.value).toLocaleString("ar-EG")}</div>
          </div>
        ))}
      </div>

      <div className="mt-4 p-4 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-200 dark:border-amber-800/50">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-amber-800 dark:text-amber-300 font-semibold">درجة الأداء</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">محولة×3 + عملاء جدد×2 + مكالمات + متابعات − طلبات غير مكتملة</div>
          </div>
          <div className="text-3xl font-black text-amber-600 dark:text-amber-400">
            {Number(agg.performance_score).toLocaleString("ar-EG")}
          </div>
        </div>
      </div>
    </Card>
  );
}

/* ------------------------ Preview dialog content ------------------------ */
function ReportPreview({ data, autoStats, staffName, dateLabel }: any) {
  const Row = ({ label, value }: { label: string; value: any }) => (
    <div className="flex justify-between py-1.5 border-b border-dashed last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-bold">{value}</span>
    </div>
  );
  return (
    <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
      <div className="p-3 rounded-lg bg-muted/40 border">
        <Row label="الموظف" value={staffName} />
        <Row label="التاريخ" value={dateLabel} />
      </div>
      <div className="p-3 rounded-lg border">
        <Row label="عروض الأسعار" value={data.quotations_count} />
        <Row label="مكالمات" value={data.calls_count} />
        <Row label="عملاء واتساب" value={data.whatsapp_count} />
        <Row label="عروض/كشوف مرسلة" value={data.offers_sent_count} />
        <Row label="عروض تحوّلت لطلبات" value={data.offers_converted_count} />
        <Row label="طلبات لم تكتمل" value={data.incomplete_orders_count} />
        <Row label="عملاء تمت متابعتهم" value={data.followups_count} />
        <Row label="عملاء جدد" value={data.new_customers_count} />
        <Row label="مهتمين بدون إغلاق" value={data.lost_opportunities_count} />
        <Row label="أكبر مشكلة" value={PROBLEM_LABEL_MAP[data.main_problem] || "—"} />
      </div>
    </div>
  );
}

/* ------------------------ Saved report card (history) ------------------------ */
function ReportSummaryCard({ report }: { report: ReportData }) {
  const Row = ({ label, value }: { label: string; value: any }) => (
    <div className="flex justify-between py-1.5 border-b border-dashed last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-bold">{value}</span>
    </div>
  );
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Badge className={report.is_submitted ? "bg-emerald-500/15 text-emerald-700 border-emerald-500/40" : "bg-amber-500/15 text-amber-700 border-amber-500/40"}>
          {report.is_submitted ? "✓ مُسلَّم" : "مسودة"}
        </Badge>
        {report.submitted_at && (
          <span className="text-[10px] text-muted-foreground">
            {new Date(report.submitted_at).toLocaleString("ar-EG")}
          </span>
        )}
      </div>
      <div className="p-3 rounded-lg border">
        <Row label="عروض الأسعار" value={report.quotations_count} />
        <Row label="مكالمات" value={report.calls_count} />
        <Row label="عملاء واتساب" value={report.whatsapp_count} />
        <Row label="عروض/كشوف مرسلة" value={report.offers_sent_count} />
        <Row label="عروض تحوّلت لطلبات" value={report.offers_converted_count} />
        <Row label="طلبات لم تكتمل" value={report.incomplete_orders_count} />
        <Row label="عملاء تمت متابعتهم" value={report.followups_count} />
        <Row label="عملاء جدد" value={report.new_customers_count} />
        <Row label="مهتمين بدون إغلاق" value={report.lost_opportunities_count} />
        <Row label="أكبر مشكلة" value={PROBLEM_LABEL_MAP[report.main_problem || ""] || "—"} />
      </div>
    </div>
  );
}

/* ------------------------ Helpers ------------------------ */
function NumField({ icon, label, required, value, onChange, disabled }: any) {
  return (
    <div>
      <Label className="text-xs font-bold mb-1.5 flex items-center gap-1.5 text-foreground">
        {icon}<span>{label}</span>
        {required && <span className="text-rose-500">*</span>}
      </Label>
      <Input
        type="number" inputMode="numeric" min={0}
        value={value || ""} onChange={(e) => onChange(e.target.value)}
        disabled={disabled} placeholder="—"
        className="h-11 text-center font-bold text-base"
      />
    </div>
  );
}

function AutoStat({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: "blue" | "emerald" | "amber"; }) {
  const colors = {
    blue: "bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-400",
    emerald: "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400",
    amber: "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400",
  };
  return (
    <div className={`p-3 rounded-xl border text-center ${colors[color]}`}>
      <div className="flex items-center justify-center gap-1.5 mb-1">
        {icon}<span className="text-[10px] font-semibold opacity-80">{label}</span>
      </div>
      <div className="text-xl font-extrabold">{value}</div>
    </div>
  );
}
