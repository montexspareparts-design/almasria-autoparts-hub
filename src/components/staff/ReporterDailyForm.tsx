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
  Sparkles, Palmtree, Trash2, Info,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  PersonalCompareCard,
  MoodShoutoutSection,
  performanceScore,
  StreakBadge,
  TeamBenchmarkLine,
} from "./ReporterEnhancements";
import StaffShortageRequests from "./StaffShortageRequests";
import MissingReportPrompt from "./MissingReportPrompt";


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
  invoices_count: number;
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
  self_rating?: number | null;
  mood?: string | null;
  shoutout_user_id?: string | null;
  shoutout_reason?: string | null;
  why_good_day?: string | null;
}

const EMPTY: ReportData = {
  quotations_count: 0, invoices_count: 0, calls_count: 0, whatsapp_count: 0, offers_sent_count: 0,
  offers_count: 0, offers_converted_count: 0, incomplete_orders_count: 0,
  followups_count: 0, new_customers_count: 0, main_problem: "", problem_notes: "",
  lost_opportunities_count: 0, is_submitted: false, submitted_at: null, self_rating: null,
  mood: null, shoutout_user_id: null, shoutout_reason: null, why_good_day: null,
};

const todayStr = () => new Date().toISOString().slice(0, 10);
const fmtDate = (d: Date) => d.toISOString().slice(0, 10);

// ============================================================
// Soft validation: warnings (not blockers) عشان نمنع الأخطاء الواضحة
// ============================================================
function buildConsistencyWarnings(d: ReportData, autoStats: { orders: number; invoices: number; sales: number }): string[] {
  const warnings: string[] = [];
  if (Number(d.offers_converted_count) > Number(d.offers_sent_count) && Number(d.offers_sent_count) > 0) {
    warnings.push("⚠️ عدد العروض المحوّلة أكبر من المرسلة — هل أنت متأكد؟");
  }
  if (Number(d.quotations_count) === 0 && Number(d.offers_sent_count) > 0) {
    warnings.push("⚠️ كتبت إنك أرسلت عروض بدون ما تعمل عروض أسعار اليوم.");
  }
  if (
    Number(d.calls_count) + Number(d.whatsapp_count) === 0 &&
    Number(d.new_customers_count) > 0
  ) {
    warnings.push("⚠️ ضفت عملاء جدد بدون أي مكالمة أو واتساب — تأكّد.");
  }
  if (autoStats.orders > 0 && Number(d.offers_converted_count) === 0) {
    warnings.push(`⚠️ السيستم سجّل لك ${autoStats.orders} طلب اليوم، لكن مفيش عروض محوّلة في تقريرك.`);
  }
  return warnings;
}

// نسبة الحقول الفاضية (= 0) من الحقول الرئيسية الـ9
function emptyFieldsRatio(d: ReportData): number {
  const fields = [
    d.quotations_count, d.calls_count, d.whatsapp_count,
    d.offers_sent_count, d.offers_converted_count, d.incomplete_orders_count,
    d.followups_count, d.new_customers_count, d.lost_opportunities_count,
  ].map((v) => Number(v || 0));
  const empties = fields.filter((v) => v === 0).length;
  return empties / fields.length;
}

// التحقق الذكي من الحقول الإلزامية — يرجّع قائمة بأسماء الحقول الناقصة (= 0 أو فاضية)
function getMissingRequiredFields(d: ReportData): string[] {
  const required: { key: keyof ReportData; label: string }[] = [
    { key: "quotations_count",        label: "عدد عروض الأسعار" },
    { key: "invoices_count",          label: "عدد الفواتير" },
    { key: "calls_count",             label: "عدد المكالمات" },
    { key: "whatsapp_count",          label: "عملاء واتساب" },
    { key: "offers_sent_count",       label: "عروض/كشوف مُرسلة" },
    { key: "offers_converted_count",  label: "عروض اتحولت لطلبات" },
    { key: "incomplete_orders_count", label: "طلبات لم تكتمل" },
    { key: "followups_count",         label: "عملاء تمت متابعتهم" },
    { key: "new_customers_count",     label: "عملاء جدد" },
    
  ];
  return required
    .filter(({ key }) => {
      const v = (d as any)[key];
      return v === null || v === undefined || v === "" || Number(v) === 0;
    })
    .map(({ label }) => label);
}

export default function ReporterDailyForm() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [emptyWarnOpen, setEmptyWarnOpen] = useState(false);
  const [thankYouOpen, setThankYouOpen] = useState(false);
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
    invoices_count: data.invoices_count,
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
    self_rating: data.self_rating ?? null,
    mood: data.mood || null,
    shoutout_user_id: data.shoutout_user_id || null,
    shoutout_reason: data.shoutout_reason || null,
    why_good_day: data.why_good_day || null,
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
      setConfirmOpen(false);
      setPreviewOpen(false);
      setThankYouOpen(true); // اعرض شاشة الشكر بدل الـ toast
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
      {/* مودال يظهر تلقائياً لو الموظف مقدمش تقرير امبارح */}
      <MissingReportPrompt />
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
          <div className="flex items-center gap-2 flex-wrap">
            <StreakBadge userId={user!.id} />
            {locked && (
              <Badge className="gap-1.5 bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-sm py-1.5 px-3">
                <Lock className="w-3.5 h-3.5" />تم تسليم التقرير
              </Badge>
            )}
          </div>
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
            userId={user!.id}
            data={data} setData={setData} setNum={setNum} locked={locked}
            saving={saving} autoStats={autoStats}
            onSaveDraft={saveDraft}
            onPreview={() => {
              // Smart guard: لو فيه حقول إلزامية ناقصة → افتح dialog ذكي يحدد إيه اللي ناقص
              const missing = getMissingRequiredFields(data);
              if (missing.length > 0 || emptyFieldsRatio(data) >= 0.6) {
                setEmptyWarnOpen(true);
              } else {
                setPreviewOpen(true);
              }
            }}
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

      {/* Thank-you screen after submission */}
      <ThankYouDialog
        open={thankYouOpen}
        onClose={() => setThankYouOpen(false)}
        data={data}
        staffName={staffName}
      />

      {/* Smart guard: تحذير ذكي يحدد الحقول الناقصة بالتفصيل */}
      <AlertDialog open={emptyWarnOpen} onOpenChange={setEmptyWarnOpen}>
        <AlertDialogContent dir="rtl" className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
              {(() => {
                const m = getMissingRequiredFields(data);
                if (m.length === 0) return "التقرير شبه فاضي";
                if (m.length >= 7) return "التقرير لسه فاضي تقريباً";
                return `فيه ${m.length} حقل لسه ناقص`;
              })()}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 leading-relaxed text-foreground/80">
                {(() => {
                  const missing = getMissingRequiredFields(data);
                  if (missing.length === 0) {
                    return (
                      <p className="text-sm">
                        كل الحقول الإلزامية مليانة، بس معظمها <strong>0</strong>. هل ده فعلاً يومك؟
                      </p>
                    );
                  }
                  return (
                    <>
                      <p className="text-sm">
                        قبل ما تكمّل، الحقول دي لسه قيمتها <strong className="text-amber-600">0</strong> أو فاضية:
                      </p>
                      <div className="rounded-lg border border-amber-200 dark:border-amber-800/50 bg-amber-50/60 dark:bg-amber-950/20 p-3 max-h-48 overflow-y-auto">
                        <ul className="space-y-1.5">
                          {missing.map((label) => (
                            <li key={label} className="flex items-center gap-2 text-xs">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                              <span>{label}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        💡 لو يومك كان هادي فعلاً وما اشتغلتش على الحقول دي، تقدر تكمّل عادي — بس تأكد إن الأرقام بتعكس شغل يومك بأمانة.
                      </p>
                    </>
                  );
                })()}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>رجوع وأكمّل الحقول</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { setEmptyWarnOpen(false); setPreviewOpen(true); }}
              className="bg-amber-600 hover:bg-amber-700"
            >
              يومي كان كده فعلاً، كمّل
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}

/* ------------------------ Today form ------------------------ */
function TodayForm({
  userId, data, setData, setNum, locked, saving, autoStats, onSaveDraft, onPreview,
}: any) {
  const todayScore = performanceScore(data);
  const warnings = !locked ? buildConsistencyWarnings(data, autoStats) : [];
  return (
    <>
      <PersonalCompareCard userId={userId} todayScore={todayScore} />
      <TeamBenchmarkLine todayScore={todayScore} />
      {/* Focus strip — تذكير أن كل الأرقام بتتدخل يدوي من الموظف */}
      <div className="relative overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-l from-primary/5 via-background to-amber-500/5 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-lg">
            ✍️
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground leading-tight">
              ادخل أرقامك يدوياً بدقة
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">
              كل المؤشرات والأهداف بتعتمد على الأرقام اللي بتكتبها بنفسك — اتأكد إنها صحيحة قبل الإرسال.
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-1 shrink-0 text-[10px] text-amber-700 dark:text-amber-300 bg-amber-100/70 dark:bg-amber-950/40 border border-amber-300/60 rounded-full px-2 py-1 font-semibold">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            إدخال يدوي
          </div>
        </div>
      </div>
      {warnings.length > 0 && (
        <Card className="p-3 bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800/60">
          <div className="space-y-1.5">
            {warnings.map((w, i) => (
              <p key={i} className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">{w}</p>
            ))}
          </div>
        </Card>
      )}
      <Card className="p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-4">
          <NumField icon={<FileSpreadsheet className="w-3.5 h-3.5 text-indigo-600" />} label="عدد عروض الأسعار اليوم" required value={data.quotations_count} onChange={setNum("quotations_count")} disabled={locked} hint="عدد عروض الأسعار اللي عملتها وبعتّها للعملاء النهارده — سواء عبر واتساب أو إيميل أو يدوي." />
          <NumField icon={<FileCheck className="w-3.5 h-3.5 text-emerald-600" />} label="عدد الفواتير" required value={data.invoices_count} onChange={setNum("invoices_count")} disabled={locked} hint="إجمالي عدد الفواتير اللي اتعملت النهارده على السيستم." />
          <NumField icon={<Phone className="w-3.5 h-3.5 text-purple-600" />} label="عدد المكالمات" required value={data.calls_count} onChange={setNum("calls_count")} disabled={locked} hint="إجمالي المكالمات التليفونية اللي اتعملت النهارده (واردة + صادرة) مع العملاء فقط — مش الزمايل." />
          <NumField icon={<MessageCircle className="w-3.5 h-3.5 text-green-600" />} label="عملاء واتساب" required value={data.whatsapp_count} onChange={setNum("whatsapp_count")} disabled={locked} hint="عدد العملاء المختلفين اللي تواصلت معاهم على واتساب النهارده — مش عدد الرسائل، الرقم لكل عميل مرة واحدة." />
          <NumField icon={<FileCheck className="w-3.5 h-3.5 text-cyan-600" />} label="عملاء أُرسل لهم عروض/كشوف" required value={data.offers_sent_count} onChange={setNum("offers_sent_count")} disabled={locked} hint="عدد العملاء اللي بعتّ لهم عرض سعر أو كشف حساب رسمي النهارده — لازم يكون مرفق بـ PDF أو ملف." />
          <NumField icon={<RefreshCw className="w-3.5 h-3.5 text-blue-600" />} label="عروض اتحولت لطلبات" required value={data.offers_converted_count} onChange={setNum("offers_converted_count")} disabled={locked} hint="عدد عروض الأسعار اللي العميل وافق عليها واتحوّلت لطلب فعلي على السيستم النهارده." />
          <NumField icon={<XCircle className="w-3.5 h-3.5 text-rose-600" />} label="طلبات لم تكتمل" required value={data.incomplete_orders_count} onChange={setNum("incomplete_orders_count")} disabled={locked} hint="طلبات بدأها العميل ووقفت أو اتلغت لأي سبب (سعر/تأخير/مشكلة) — اللي محتاجة متابعة." />
          <NumField icon={<Users className="w-3.5 h-3.5 text-teal-600" />} label="عملاء تمت متابعتهم" required value={data.followups_count} onChange={setNum("followups_count")} disabled={locked} hint="عملاء قدام عرض/طلب قديم رجعت كلّمتهم النهارده عشان تقفل الصفقة أو تطمن على الحالة." />
          <NumField icon={<UserPlus className="w-3.5 h-3.5 text-emerald-600" />} label="عملاء جدد تم إضافتهم" required value={data.new_customers_count} onChange={setNum("new_customers_count")} disabled={locked} hint="عملاء جداد بالكامل دخلوا قاعدة البيانات لأول مرة على إيدك النهارده — مش عملاء قدام." />
          
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

        {/* تقييم ذاتي */}
        <div className="mt-5 pt-5 border-t">
          <Label className="text-xs font-bold mb-2 flex items-center gap-1.5 text-foreground">
            ⭐ قيّم نفسك النهاردة (من 10)<span className="text-rose-500">*</span>
          </Label>
          <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
              const active = data.self_rating === n;
              const color =
                n <= 3 ? "from-rose-500 to-red-600" :
                n <= 6 ? "from-amber-500 to-orange-600" :
                n <= 8 ? "from-sky-500 to-blue-600" :
                "from-emerald-500 to-green-600";
              return (
                <button
                  key={n}
                  type="button"
                  disabled={locked}
                  onClick={() => setData((d: any) => ({ ...d, self_rating: n }))}
                  className={`w-10 h-10 rounded-xl font-bold text-sm transition-all border-2 ${
                    active
                      ? `bg-gradient-to-br ${color} text-white border-transparent shadow-md scale-110`
                      : "bg-card border-border text-muted-foreground hover:border-primary/40 hover:scale-105"
                  } ${locked ? "opacity-60 cursor-not-allowed" : ""}`}
                >
                  {n}
                </button>
              );
            })}
          </div>
          {data.self_rating ? (
            <p className="text-xs text-muted-foreground mt-2">
              {data.self_rating >= 9 ? "🔥 يومك نار، خليه عادة!" :
               data.self_rating >= 7 ? "👏 يوم محترم، فيه مساحة لتحسين بسيط." :
               data.self_rating >= 5 ? "💪 يوم متوسط، بكره أحسن بإذن الله." :
               "❤️ مفيش مشكلة، كل يوم فرصة جديدة."}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground mt-2">اضغط رقم من 1 لـ 10 يعبّر عن إحساسك بأدائك النهاردة.</p>
          )}
        </div>
      </Card>

      <MoodShoutoutSection
        data={data}
        setData={setData}
        locked={locked}
        currentUserId={userId}
        todayScore={todayScore}
      />

      <StaffShortageRequests />

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
        <Row label="⭐ تقييم ذاتي" value={data.self_rating ? `${data.self_rating} / 10` : "—"} />
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
        <Row label="⭐ تقييم ذاتي" value={report.self_rating ? `${report.self_rating} / 10` : "—"} />
      </div>
    </div>
  );
}

/* ------------------------ Helpers ------------------------ */
function NumField({ icon, label, required, value, onChange, disabled, hint }: any) {
  return (
    <div>
      <Label className="text-xs font-bold mb-1.5 flex items-center gap-1.5 text-foreground">
        {icon}<span>{label}</span>
        {required && <span className="text-rose-500">*</span>}
        {hint && (
          <Tooltip delayDuration={150}>
            <TooltipTrigger asChild>
              <button
                type="button"
                tabIndex={-1}
                aria-label="توضيح"
                className="ms-auto text-muted-foreground hover:text-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-full"
              >
                <Info className="w-3.5 h-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" align="end" className="max-w-[260px] text-[11px] leading-relaxed">
              {hint}
            </TooltipContent>
          </Tooltip>
        )}
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

/* ------------------------ Motivational Card ------------------------ */
function MotivationalCard({ userId }: { userId: string }) {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string>("");
  const [tier, setTier] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke("reporter-motivational-message", { body: {} });
        if (cancelled) return;
        if (error) throw error;
        setMessage(data?.message || "صباح الفل! يلا نبدأ يوم جديد 💪");
        setTier(data?.tier || "");
      } catch (e) {
        if (!cancelled) setMessage("صباح الفل! النهاردة يوم جديد، يلا نخليه نار 🔥");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [userId]);

  const tierStyle: Record<string, string> = {
    excellent: "from-amber-400/30 to-orange-500/20 border-amber-500/40",
    good: "from-emerald-400/25 to-teal-500/15 border-emerald-500/40",
    average: "from-sky-400/25 to-indigo-500/15 border-sky-500/40",
    low: "from-rose-400/25 to-rose-500/15 border-rose-500/40",
    new: "from-violet-400/25 to-purple-500/15 border-violet-500/40",
  };
  const cls = tierStyle[tier] || tierStyle.new;

  return (
    <Card className={cn("p-4 bg-gradient-to-br border-2 relative overflow-hidden", cls)}>
      <div className="absolute -top-4 -right-4 w-20 h-20 bg-white/10 rounded-full blur-2xl" />
      <div className="flex items-start gap-3 relative z-10">
        <div className="w-10 h-10 rounded-xl bg-white/30 backdrop-blur-sm grid place-items-center border border-white/40 shrink-0">
          <Sparkles className="w-5 h-5 text-amber-700" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-bold text-foreground/60 mb-1 tracking-wide">رسالة اليوم 🌟</div>
          {loading ? (
            <div className="h-5 w-3/4 bg-white/40 rounded animate-pulse" />
          ) : (
            <div className="text-sm sm:text-base font-bold text-foreground leading-relaxed">{message}</div>
          )}
        </div>
      </div>
    </Card>
  );
}

/* ------------------------ Tomorrow Off Card ------------------------ */
function TomorrowOffCard({ userId }: { userId: string }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasOff, setHasOff] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [reason, setReason] = useState("");

  const tomorrowStr = useMemo(() => {
    const d = new Date(); d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  }, []);
  const tomorrowLabel = useMemo(() => {
    const d = new Date(); d.setDate(d.getDate() + 1);
    return d.toLocaleDateString("ar-EG", { weekday: "long", day: "numeric", month: "long" });
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("reporter_day_off" as any)
        .select("id")
        .eq("user_id", userId)
        .eq("off_date", tomorrowStr)
        .maybeSingle();
      setHasOff(!!data);
      setLoading(false);
    })();
  }, [userId, tomorrowStr]);

  const submitOff = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from("reporter_day_off" as any).insert({
        user_id: userId,
        off_date: tomorrowStr,
        reason: reason || null,
      });
      if (error) throw error;
      setHasOff(true);
      setConfirmOpen(false);
      toast({ title: "🌴 أجازة سعيدة!", description: "تم تسجيل أجازتك بكرة وإشعار الإدارة." });
    } catch (e: any) {
      toast({ title: "خطأ", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const cancelOff = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from("reporter_day_off" as any)
        .delete().eq("user_id", userId).eq("off_date", tomorrowStr);
      if (error) throw error;
      setHasOff(false);
      toast({ title: "تم الإلغاء", description: "أجازة بكرة اتلغت — هتقدر تسجّل التقرير عادي." });
    } catch (e: any) {
      toast({ title: "خطأ", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  if (loading) return null;

  if (hasOff) {
    return (
      <Card className="p-4 bg-gradient-to-r from-emerald-500/15 to-teal-500/10 border-2 border-emerald-500/40">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 grid place-items-center text-2xl">🌴</div>
            <div>
              <div className="font-extrabold text-emerald-700 dark:text-emerald-300">أجازة سعيدة بكرة!</div>
              <div className="text-xs text-muted-foreground">{tomorrowLabel} — مش هنطلب منك تقرير</div>
            </div>
          </div>
          <Button size="sm" variant="ghost" onClick={cancelOff} disabled={saving} className="gap-1 text-rose-600 hover:bg-rose-500/10">
            <Trash2 className="w-3.5 h-3.5" />إلغاء الأجازة
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card className="p-3 bg-card border-dashed flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Palmtree className="w-4 h-4 text-emerald-600" />
          <span>هتاخد أجازة بكرة ({tomorrowLabel})؟</span>
        </div>
        <Button size="sm" variant="outline" onClick={() => setConfirmOpen(true)} className="gap-1.5 border-emerald-500/40 text-emerald-700 hover:bg-emerald-500/10">
          <Palmtree className="w-3.5 h-3.5" />سجّل أجازة بكرة
        </Button>
      </Card>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>🌴 تأكيد أجازة بكرة</AlertDialogTitle>
            <AlertDialogDescription>
              هتسجّل أجازة يوم <strong>{tomorrowLabel}</strong>. الإدارة هتاخد إشعار فوري ومش هيتطلب منك تقرير في اليوم ده.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="my-2">
            <Label className="text-xs">السبب (اختياري)</Label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="مثال: ظرف عائلي، تعبان…" className="mt-1" />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>تراجع</AlertDialogCancel>
            <AlertDialogAction onClick={submitOff} disabled={saving} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              نعم، أجازة بكرة 🌴
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/* ------------------------ Thank-you Dialog ------------------------ */
function ThankYouDialog({
  open, onClose, data, staffName,
}: { open: boolean; onClose: () => void; data: ReportData; staffName: string }) {
  const firstName = (staffName || "").trim().split(" ")[0] || "بطلنا";

  // نقاط الأداء — نفس معادلة edge function
  const score = Math.max(
    0,
    (Number(data.offers_converted_count) || 0) * 3 +
      (Number(data.new_customers_count) || 0) * 2 +
      (Number(data.calls_count) || 0) +
      (Number(data.followups_count) || 0) -
      (Number(data.incomplete_orders_count) || 0)
  );

  const tier: "excellent" | "good" | "average" | "low" =
    score >= 80 ? "excellent" : score >= 50 ? "good" : score >= 25 ? "average" : "low";

  // كلمات شكر متنوعة لكل تصنيف — تختار رسالة مختلفة كل يوم
  const THANKS: Record<string, string[]> = {
    excellent: [
      `🔥 مفيش كلام يا ${firstName}! يومك ده هيتكتب في كتب التاريخ. يستاهل قهوتين مش واحدة ☕☕`,
      `🏆 يا ${firstName} انت دلوقتي في المنطقة الذهبية. شكراً على الجهد ده، فعلاً بتفرّق!`,
      `👑 شكراً يا ${firstName} — لما الواحد بيشتغل بضمير زيك بنحس إن الشركة في إيدين أمينة 💛`,
      `⭐ تم التسليم بقوة! يومك زي السوبرمان، بس لابس قميص شركة 😄 شكراً يا ${firstName}!`,
    ],
    good: [
      `👏 برافو يا ${firstName} — يوم محترم وتقرير زي الفل. شكراً على الالتزام!`,
      `✨ شكراً يا ${firstName}! خطوة ورا خطوة وانت بتقرّب من القمة 🚀`,
      `💪 يا ${firstName} ده نص الطريق للممتاز، بكره نخلّيه كامل بإذن الله. شكراً!`,
      `🎯 تقرير وصل بسلامة! انت من النوع اللي ميخلّيش فجوة في الفريق. شكراً يا ${firstName}.`,
    ],
    average: [
      `🙏 شكراً يا ${firstName} على التسليم في وقته. بكره نلوّعها أكتر، انت قدها وقدود!`,
      `☕ يوم عدّى بسلام يا ${firstName} — قهوة وراحة، وبكره صفحة جديدة 💪`,
      `👍 شكراً يا ${firstName}! المهم انك بتسجّل، والباقي بيتظبط مع الوقت.`,
      `💡 شكراً على الجهد يا ${firstName} — بكره خلينا نركّز على المكالمات بدري، النتيجة هتفرق.`,
    ],
    low: [
      `❤️ شكراً يا ${firstName} على الصدق في التسجيل — ده أصعب جزء، والباقي يتعدّل بكره.`,
      `🌅 شكراً يا ${firstName}! كل بطل عنده يوم هادي… بكره الجمهور بيهتف من تاني 🎤`,
      `🤝 شكراً يا ${firstName}، إحنا فريق واحد. لو محتاج مساعدة قول وإحنا معاك.`,
      `💎 شكراً على التسليم. الألماظ بيلمع تحت الضغط — وانت قريب 🔥`,
    ],
  };

  const list = THANKS[tier];
  // اختيار حتمي حسب اليوم + اسم الموظف عشان تتغير كل يوم لكل موظف
  const seed = (() => {
    const s = firstName + new Date().toISOString().slice(0, 10);
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i);
    return Math.abs(h) % list.length;
  })();
  const thankMsg = list[seed];

  const tierMeta: Record<string, { label: string; gradient: string; emoji: string }> = {
    excellent: { label: "أداء ممتاز", gradient: "from-emerald-500 via-green-500 to-teal-500", emoji: "🏆" },
    good: { label: "أداء كويس", gradient: "from-sky-500 via-blue-500 to-indigo-500", emoji: "👏" },
    average: { label: "أداء متوسط", gradient: "from-amber-500 via-orange-500 to-yellow-500", emoji: "💪" },
    low: { label: "محتاج شوية push", gradient: "from-rose-500 via-red-500 to-pink-500", emoji: "❤️" },
  };
  const meta = tierMeta[tier];

  const Stat = ({ label, value, icon }: { label: string; value: any; icon: string }) => (
    <div className="bg-card/60 border rounded-xl p-2.5 flex items-center justify-between">
      <span className="text-[11px] text-muted-foreground flex items-center gap-1">
        <span>{icon}</span>{label}
      </span>
      <span className="text-sm font-extrabold text-foreground">{value}</span>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md p-0 overflow-hidden" dir="rtl">
        <div className={`relative bg-gradient-to-br ${meta.gradient} text-white p-5 text-center overflow-hidden`}>
          <motion.div
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 14 }}
            className="text-6xl mb-2 inline-block"
          >
            {meta.emoji}
          </motion.div>
          <h2 className="text-2xl font-extrabold mb-1">تم تسليم التقرير ✅</h2>
          <p className="text-sm opacity-95">{meta.label}</p>
          <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/10 blur-xl" />
          <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full bg-white/10 blur-xl" />
        </div>

        <div className="p-5 space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-xl p-3.5 text-center"
          >
            <p className="text-sm font-bold text-foreground leading-relaxed">{thankMsg}</p>
          </motion.div>

          <div>
            <h3 className="text-xs font-extrabold mb-2 text-muted-foreground flex items-center gap-1.5">
              📊 ملخص أداءك النهاردة
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <Stat icon="📞" label="مكالمات" value={data.calls_count} />
              <Stat icon="💬" label="واتساب" value={data.whatsapp_count} />
              <Stat icon="📄" label="عروض الأسعار" value={data.quotations_count} />
              <Stat icon="🔁" label="عروض محوّلة" value={data.offers_converted_count} />
              <Stat icon="🆕" label="عملاء جدد" value={data.new_customers_count} />
              <Stat icon="👥" label="متابعات" value={data.followups_count} />
              <Stat icon="⭐" label="تقييم ذاتي" value={data.self_rating ? `${data.self_rating}/10` : "—"} />
              <Stat icon="🎯" label="إجمالي النقاط" value={score} />
            </div>
          </div>

          <Button onClick={onClose} className={`w-full h-11 bg-gradient-to-r ${meta.gradient} text-white font-bold`}>
            تمام، شكراً 💪
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
