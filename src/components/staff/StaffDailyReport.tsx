import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClipboardList, CheckCircle2, AlertCircle, Save, Sparkles, Clock, HelpCircle, Users2, History as HistoryIcon, ChevronDown } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

type QType = "text" | "textarea" | "number" | "choice" | "boolean";
type QScope = "all" | "role" | "team" | "users";
interface DynQuestion {
  id: string;
  question_text: string;
  question_type: QType;
  options: string[];
  placeholder: string | null;
  is_required: boolean;
  sort_order: number;
  target_scope: QScope;
  target_team_ids: string[];
}
interface TeamInfo {
  id: string;
  name: string;
  color: string | null;
}
interface DynAnswer {
  text?: string;
  number?: number;
  boolean?: boolean;
  choice?: string;
}

interface ReportRow {
  id?: string;
  customers_contacted: number;
  customers_registered: number;
  customers_with_invoices: number;
  total_invoices_amount: number;
  hot_leads_count: number;
  follow_ups_done: number;
  problems_faced: string;
  best_deal_today: string;
  tomorrow_plan: string;
  general_notes: string;
  submitted_at?: string;
}

const EMPTY: ReportRow = {
  customers_contacted: 0,
  customers_registered: 0,
  customers_with_invoices: 0,
  total_invoices_amount: 0,
  hot_leads_count: 0,
  follow_ups_done: 0,
  problems_faced: "",
  best_deal_today: "",
  tomorrow_plan: "",
  general_notes: "",
};

const MAX_TEXT = 1000;

const StaffDailyReport = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [report, setReport] = useState<ReportRow>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);
  const [showReminder, setShowReminder] = useState(false);
  const [dynQuestions, setDynQuestions] = useState<DynQuestion[]>([]);
  const [dynAnswers, setDynAnswers] = useState<Record<string, DynAnswer>>({});

  const [teams, setTeams] = useState<TeamInfo[]>([]);

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [reportRes, qRes, aRes, tmRes] = await Promise.all([
        supabase
          .from("staff_daily_reports")
          .select("*")
          .eq("staff_user_id", user.id)
          .eq("report_date", today)
          .maybeSingle(),
        supabase
          .from("daily_report_questions")
          .select("id, question_text, question_type, options, placeholder, is_required, sort_order, target_scope, target_team_ids")
          .eq("is_active", true)
          .order("sort_order", { ascending: true }),
        supabase
          .from("daily_report_answers")
          .select("question_id, answer_text, answer_number, answer_boolean, answer_choice")
          .eq("user_id", user.id)
          .eq("report_date", today),
        supabase
          .from("team_members")
          .select("team_id, teams:team_id(id, name, color)")
          .eq("user_id", user.id),
      ]);

      const data = reportRes.data;
      if (data) {
        setReport({
          id: data.id,
          customers_contacted: data.customers_contacted ?? 0,
          customers_registered: data.customers_registered ?? 0,
          customers_with_invoices: data.customers_with_invoices ?? 0,
          total_invoices_amount: Number(data.total_invoices_amount ?? 0),
          hot_leads_count: data.hot_leads_count ?? 0,
          follow_ups_done: data.follow_ups_done ?? 0,
          problems_faced: data.problems_faced ?? "",
          best_deal_today: data.best_deal_today ?? "",
          tomorrow_plan: data.tomorrow_plan ?? "",
          general_notes: data.general_notes ?? "",
          submitted_at: data.submitted_at,
        });
        setSubmittedAt(data.submitted_at);
      }

      if (qRes.data) {
        setDynQuestions(
          qRes.data.map((q: any) => ({
            id: q.id,
            question_text: q.question_text,
            question_type: q.question_type as QType,
            options: Array.isArray(q.options) ? q.options : [],
            placeholder: q.placeholder,
            is_required: q.is_required,
            sort_order: q.sort_order ?? 0,
            target_scope: (q.target_scope ?? "all") as QScope,
            target_team_ids: Array.isArray(q.target_team_ids) ? q.target_team_ids : [],
          }))
        );
      }

      if (tmRes.data) {
        const ts: TeamInfo[] = [];
        tmRes.data.forEach((row: any) => {
          const t = row.teams;
          if (t) ts.push({ id: t.id, name: t.name, color: t.color ?? null });
        });
        setTeams(ts);
      }

      if (aRes.data) {
        const map: Record<string, DynAnswer> = {};
        aRes.data.forEach((a: any) => {
          map[a.question_id] = {
            text: a.answer_text ?? undefined,
            number: a.answer_number != null ? Number(a.answer_number) : undefined,
            boolean: a.answer_boolean ?? undefined,
            choice: a.answer_choice ?? undefined,
          };
        });
        setDynAnswers(map);
      }

      setLoading(false);
    };
    load();

    // Reminder at 6 PM (18:00) if not submitted
    const checkReminder = () => {
      const hour = new Date().getHours();
      if (hour >= 18 && !submittedAt) setShowReminder(true);
    };
    checkReminder();
    const interval = setInterval(checkReminder, 60000);
    return () => clearInterval(interval);
  }, [user, today]);

  // Restore preview dialog state
  type RestoreMode = "kpis" | "dynamic" | "both";
  const [restorePreview, setRestorePreview] = useState<{
    mode: RestoreMode;
    hasReport: boolean;
    activeMatchedCount: number; // dyn answers whose question IDs are still active today
    totalYesterdayAnswers: number;
    skippedInactive: number;
    yReportData: any;
    yAnswersData: any[];
  } | null>(null);
  const [restoreLoading, setRestoreLoading] = useState<RestoreMode | null>(null);
  const [highlightedQId, setHighlightedQId] = useState<string | null>(null);

  const scrollToQuestion = (qid: string) => {
    const el = document.getElementById(`dyn-q-${qid}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlightedQId(qid);
    // Try to focus first interactive element inside
    setTimeout(() => {
      const focusable = el.querySelector<HTMLElement>("input, textarea, button, [role='combobox']");
      focusable?.focus();
    }, 350);
    setTimeout(() => setHighlightedQId((cur) => (cur === qid ? null : cur)), 2200);
  };

  const previewRestore = async (mode: RestoreMode) => {
    if (!user) return;
    setRestoreLoading(mode);
    const yest = new Date();
    yest.setDate(yest.getDate() - 1);
    const yDate = yest.toISOString().split("T")[0];

    const wantKpis = mode === "kpis" || mode === "both";
    const wantDyn = mode === "dynamic" || mode === "both";

    const [yReport, yAnswers] = await Promise.all([
      wantKpis
        ? supabase
            .from("staff_daily_reports")
            .select("*")
            .eq("staff_user_id", user.id)
            .eq("report_date", yDate)
            .maybeSingle()
        : Promise.resolve({ data: null } as any),
      wantDyn
        ? supabase
            .from("daily_report_answers")
            .select("question_id, answer_text, answer_number, answer_boolean, answer_choice")
            .eq("user_id", user.id)
            .eq("report_date", yDate)
        : Promise.resolve({ data: [] } as any),
    ]);
    setRestoreLoading(null);

    const hasReport = !!yReport.data;
    const yAnswersArr: any[] = yAnswers.data || [];
    const activeQIds = new Set(dynQuestions.map((q) => q.id));
    const matched = yAnswersArr.filter((a) => activeQIds.has(a.question_id));
    const activeMatchedCount = matched.length;
    const skippedInactive = yAnswersArr.length - activeMatchedCount;

    if (
      (mode === "kpis" && !hasReport) ||
      (mode === "dynamic" && activeMatchedCount === 0) ||
      (mode === "both" && !hasReport && activeMatchedCount === 0)
    ) {
      toast({
        title: "مفيش بيانات لاسترجاعها",
        description:
          mode === "kpis"
            ? "مفيش KPIs محفوظة من أمس"
            : mode === "dynamic"
              ? skippedInactive > 0
                ? `كل إجابات الأسئلة الإضافية لأمس (${skippedInactive}) مرتبطة بأسئلة لم تعد نشطة`
                : "مفيش إجابات أسئلة إضافية من أمس"
              : "مفيش تقرير أمس أصلاً",
        variant: "destructive",
      });
      return;
    }

    setRestorePreview({
      mode,
      hasReport,
      activeMatchedCount,
      totalYesterdayAnswers: yAnswersArr.length,
      skippedInactive,
      yReportData: yReport.data,
      yAnswersData: matched,
    });
  };

  const confirmRestore = () => {
    if (!restorePreview) return;
    const { mode, yReportData, yAnswersData, activeMatchedCount, hasReport } = restorePreview;
    const wantKpis = mode === "kpis" || mode === "both";
    const wantDyn = mode === "dynamic" || mode === "both";

    if (wantKpis && yReportData) {
      const d = yReportData;
      setReport((r) => ({
        ...r,
        customers_contacted: d.customers_contacted ?? 0,
        customers_registered: d.customers_registered ?? 0,
        customers_with_invoices: d.customers_with_invoices ?? 0,
        total_invoices_amount: Number(d.total_invoices_amount ?? 0),
        hot_leads_count: d.hot_leads_count ?? 0,
        follow_ups_done: d.follow_ups_done ?? 0,
        problems_faced: d.problems_faced ?? "",
        best_deal_today: d.best_deal_today ?? "",
        tomorrow_plan: d.tomorrow_plan ?? "",
        general_notes: d.general_notes ?? "",
      }));
    }

    if (wantDyn && yAnswersData.length) {
      const map: Record<string, DynAnswer> = { ...dynAnswers };
      yAnswersData.forEach((a: any) => {
        map[a.question_id] = {
          text: a.answer_text ?? undefined,
          number: a.answer_number != null ? Number(a.answer_number) : undefined,
          boolean: a.answer_boolean ?? undefined,
          choice: a.answer_choice ?? undefined,
        };
      });
      setDynAnswers(map);
    }

    const parts: string[] = [];
    if (wantKpis && hasReport) parts.push("KPIs والنصوص");
    if (wantDyn && activeMatchedCount > 0) parts.push(`${activeMatchedCount} سؤال إضافي`);

    toast({
      title: "✅ تم الاسترجاع من أمس",
      description: `تم استرجاع ${parts.join(" + ")} — تقدر تعدّل أي قيمة قبل الحفظ`,
    });
    setRestorePreview(null);
  };

  const handleSubmit = async () => {
    if (!user) return;
    if (
      report.customers_contacted === 0 &&
      report.customers_registered === 0 &&
      report.customers_with_invoices === 0 &&
      !report.general_notes.trim()
    ) {
      toast({
        title: "تقرير فاضي",
        description: "ادخل الأرقام أو على الأقل ملاحظة قبل التقديم",
        variant: "destructive",
      });
      return;
    }
    // Validate required dynamic questions
    for (const dq of dynQuestions) {
      if (!dq.is_required) continue;
      const a = dynAnswers[dq.id];
      const filled =
        (dq.question_type === "number" && a?.number != null) ||
        (dq.question_type === "boolean" && a?.boolean != null) ||
        (dq.question_type === "choice" && !!a?.choice) ||
        ((dq.question_type === "text" || dq.question_type === "textarea") && !!a?.text?.trim());
      if (!filled) {
        toast({
          title: "سؤال إجباري ناقص",
          description: dq.question_text,
          variant: "destructive",
        });
        return;
      }
    }
    setSaving(true);

    // Get staff name/email for the snapshot
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", user.id)
      .maybeSingle();

    const payload = {
      staff_user_id: user.id,
      staff_name: profile?.full_name || user.email?.split("@")[0] || "موظف",
      staff_email: user.email,
      report_date: today,
      customers_contacted: Math.max(0, Math.floor(Number(report.customers_contacted) || 0)),
      customers_registered: Math.max(0, Math.floor(Number(report.customers_registered) || 0)),
      customers_with_invoices: Math.max(0, Math.floor(Number(report.customers_with_invoices) || 0)),
      total_invoices_amount: Math.max(0, Number(report.total_invoices_amount) || 0),
      hot_leads_count: Math.max(0, Math.floor(Number(report.hot_leads_count) || 0)),
      follow_ups_done: Math.max(0, Math.floor(Number(report.follow_ups_done) || 0)),
      problems_faced: report.problems_faced.trim().slice(0, MAX_TEXT),
      best_deal_today: report.best_deal_today.trim().slice(0, MAX_TEXT),
      tomorrow_plan: report.tomorrow_plan.trim().slice(0, MAX_TEXT),
      general_notes: report.general_notes.trim().slice(0, MAX_TEXT),
      submitted_at: new Date().toISOString(),
    };

    const { error } = report.id
      ? await supabase.from("staff_daily_reports").update(payload).eq("id", report.id)
      : await supabase.from("staff_daily_reports").insert(payload);

    setSaving(false);

    if (error) {
      toast({ title: "فشل الحفظ", description: error.message, variant: "destructive" });
      return;
    }

    setSubmittedAt(payload.submitted_at);
    setShowReminder(false);

    // Save dynamic answers (upsert per question)
    const answerRows = dynQuestions
      .map((q) => {
        const a = dynAnswers[q.id];
        if (!a) return null;
        return {
          question_id: q.id,
          user_id: user.id,
          report_date: today,
          answer_text: a.text ?? null,
          answer_number: a.number ?? null,
          answer_boolean: a.boolean ?? null,
          answer_choice: a.choice ?? null,
        };
      })
      .filter(Boolean) as any[];
    if (answerRows.length) {
      await supabase
        .from("daily_report_answers")
        .upsert(answerRows, { onConflict: "question_id,user_id,report_date" });
    }

    toast({
      title: "✅ تم تقديم التقرير",
      description: "تم إرساله للأدمن وحفظه بنجاح",
    });

    // Reload to get the id
    if (!report.id) {
      const { data: fresh } = await supabase
        .from("staff_daily_reports")
        .select("id")
        .eq("staff_user_id", user.id)
        .eq("report_date", today)
        .maybeSingle();
      if (fresh) setReport((r) => ({ ...r, id: fresh.id }));
    }
  };

  const numField = (
    key: keyof ReportRow,
    label: string,
    icon: string,
    suffix?: string
  ) => (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold flex items-center gap-1.5">
        <span>{icon}</span>
        {label}
      </Label>
      <div className="relative">
        <Input
          type="number"
          min="0"
          value={report[key] as number}
          onChange={(e) =>
            setReport((r) => ({ ...r, [key]: e.target.value === "" ? 0 : Number(e.target.value) }))
          }
          className="text-lg font-bold tabular-nums h-11"
        />
        {suffix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );

  const textField = (key: keyof ReportRow, label: string, placeholder: string) => (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold">{label}</Label>
      <Textarea
        value={report[key] as string}
        onChange={(e) => setReport((r) => ({ ...r, [key]: e.target.value.slice(0, MAX_TEXT) }))}
        placeholder={placeholder}
        rows={2}
        maxLength={MAX_TEXT}
        className="resize-none text-sm"
      />
    </div>
  );

  if (loading) {
    return (
      <Card className="p-6 animate-pulse h-64 bg-muted/30" />
    );
  }

  // Compute missing required dynamic questions (live)
  const missingRequired = dynQuestions.filter((q) => {
    if (!q.is_required) return false;
    const a = dynAnswers[q.id];
    const filled =
      (q.question_type === "number" && a?.number != null) ||
      (q.question_type === "boolean" && a?.boolean != null) ||
      (q.question_type === "choice" && !!a?.choice) ||
      ((q.question_type === "text" || q.question_type === "textarea") && !!a?.text?.trim());
    return !filled;
  });
  const missingCount = missingRequired.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="p-5 md:p-6 border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card">
        {/* Header */}
        <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg md:text-xl font-bold flex items-center gap-2">
                التقرير اليومي
                <Sparkles className="w-4 h-4 text-amber-500" />
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {new Date().toLocaleDateString("ar-EG", { weekday: "long", day: "numeric", month: "long" })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 h-8 text-xs"
                  disabled={!!submittedAt}
                  title="استرجاع بيانات أمس كقيم افتراضية — تقدر تعدّلها قبل الحفظ"
                >
                  <HistoryIcon className="w-3.5 h-3.5" />
                  استرجع من أمس
                  <ChevronDown className="w-3 h-3 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel className="text-xs">اختر اللي تحب تسترجعه</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => previewRestore("both")} className="gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  <div className="flex-1">
                    <div className="text-xs font-semibold">الاتنين معاً</div>
                    <div className="text-[10px] text-muted-foreground">KPIs + الأسئلة الإضافية</div>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => previewRestore("kpis")} className="gap-2">
                  <ClipboardList className="w-3.5 h-3.5 text-emerald-600" />
                  <div className="flex-1">
                    <div className="text-xs font-semibold">KPIs والنصوص فقط</div>
                    <div className="text-[10px] text-muted-foreground">الأرقام والملاحظات الأساسية</div>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => previewRestore("dynamic")} className="gap-2">
                  <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
                  <div className="flex-1">
                    <div className="text-xs font-semibold">الأسئلة الإضافية فقط</div>
                    <div className="text-[10px] text-muted-foreground">إجابات أسئلة الإدارة/الفريق</div>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {submittedAt ? (
              <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 gap-1">
                <CheckCircle2 className="w-3 h-3" />
                تم التقديم — {new Date(submittedAt).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}
              </Badge>
            ) : showReminder ? (
              <Badge variant="destructive" className="gap-1 animate-pulse">
                <AlertCircle className="w-3 h-3" />
                لم يتم التقديم — تجاوز 6 مساءً
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1">
                <Clock className="w-3 h-3" />
                مسودّة
              </Badge>
            )}
          </div>
        </div>

        {!submittedAt && (
          <div className="mb-4 p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/20 text-[11px] text-amber-700 dark:text-amber-400 flex items-center gap-2">
            <HistoryIcon className="w-3.5 h-3.5 shrink-0" />
            <span>تقدر تضغط <strong>"استرجع تقرير أمس"</strong> فوق لتعبئة الحقول بإجابات يوم أمس — كلها قابلة للتعديل قبل الحفظ.</span>
          </div>
        )}

        {/* Numeric KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">
          {numField("customers_contacted", "عملاء تم التواصل معاهم", "📞")}
          {numField("customers_registered", "عملاء سجّلوا في المنصة", "✍️")}
          {numField("customers_with_invoices", "عملاء عملوا فاتورة", "🧾")}
          {numField("total_invoices_amount", "إجمالي الفواتير", "💰", "ج.م")}
          {numField("hot_leads_count", "Leads ساخنة", "🔥")}
          {numField("follow_ups_done", "متابعات تمت", "🔄")}
        </div>

        {/* Text fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {textField("best_deal_today", "أفضل صفقة اليوم", "أكبر فاتورة، عميل جديد مهم، ...")}
          {textField("problems_faced", "مشاكل واجهتك", "صنف ناقص، عميل صعب، عطل في النظام، ...")}
          {textField("tomorrow_plan", "خطة بكرة", "أهم 3 عملاء هتتصل بيهم، صفقة قيد التفاوض، ...")}
          {textField("general_notes", "ملاحظات عامة", "أي حاجة تاني تحب تنوّه عنها للأدمن")}
        </div>

        {/* Dynamic admin-defined questions */}
        {dynQuestions.length > 0 && (() => {
          const myTeamIds = new Set(teams.map((t) => t.id));
          const teamQs = dynQuestions
            .filter((q) => q.target_scope === "team" && q.target_team_ids.some((id) => myTeamIds.has(id)))
            .sort((a, b) => a.sort_order - b.sort_order);
          const generalQs = dynQuestions
            .filter((q) => !(q.target_scope === "team" && q.target_team_ids.some((id) => myTeamIds.has(id))))
            .sort((a, b) => a.sort_order - b.sort_order);

          const renderQ = (q: DynQuestion) => {
            const a = dynAnswers[q.id] || {};
            const setA = (patch: DynAnswer) =>
              setDynAnswers((prev) => ({ ...prev, [q.id]: { ...prev[q.id], ...patch } }));
            return (
              <div key={q.id} className="space-y-1.5">
                <Label className="text-xs font-semibold flex items-center gap-1.5">
                  {q.question_text}
                  {q.is_required && <span className="text-destructive">*</span>}
                </Label>
                {q.question_type === "text" && (
                  <Input value={a.text ?? ""} onChange={(e) => setA({ text: e.target.value })} placeholder={q.placeholder ?? ""} />
                )}
                {q.question_type === "textarea" && (
                  <Textarea value={a.text ?? ""} onChange={(e) => setA({ text: e.target.value })} placeholder={q.placeholder ?? ""} rows={2} className="resize-none text-sm" />
                )}
                {q.question_type === "number" && (
                  <Input type="number" value={a.number ?? ""} onChange={(e) => setA({ number: e.target.value === "" ? undefined : Number(e.target.value) })} placeholder={q.placeholder ?? ""} className="font-bold tabular-nums" />
                )}
                {q.question_type === "boolean" && (
                  <div className="flex items-center gap-2 h-10">
                    <Switch checked={!!a.boolean} onCheckedChange={(v) => setA({ boolean: v })} />
                    <span className="text-sm">{a.boolean ? "نعم" : "لا"}</span>
                  </div>
                )}
                {q.question_type === "choice" && (
                  <Select value={a.choice ?? ""} onValueChange={(v) => setA({ choice: v })}>
                    <SelectTrigger><SelectValue placeholder="اختر..." /></SelectTrigger>
                    <SelectContent>
                      {q.options.map((opt) => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            );
          };

          const teamRequired = teamQs.filter((q) => q.is_required).length;
          const generalRequired = generalQs.filter((q) => q.is_required).length;
          const myTeams = teams.filter((t) => teamQs.some((q) => q.target_team_ids.includes(t.id)));

          return (
            <>
              {teamQs.length > 0 && (
                <div className="mt-5 pt-5 border-t-2 border-primary/30">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <Users2 className="w-4 h-4 text-primary" />
                    <h3 className="text-sm font-bold">أسئلة فريقك</h3>
                    <Badge variant="secondary" className="text-[10px]">{teamQs.length} سؤال</Badge>
                    {teamRequired > 0 && (
                      <Badge variant="destructive" className="text-[10px] gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {teamRequired} إجباري
                      </Badge>
                    )}
                    {myTeams.map((t) => (
                      <Badge
                        key={t.id}
                        variant="outline"
                        className="text-[10px]"
                        style={t.color ? { borderColor: t.color, color: t.color } : undefined}
                      >
                        {t.name}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-[11px] text-muted-foreground mb-3">
                    أسئلة موجّهة خصيصاً لفريقك من الإدارة — مرتّبة حسب الأولوية
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {teamQs.map(renderQ)}
                  </div>
                </div>
              )}

              {generalQs.length > 0 && (
                <div className="mt-5 pt-5 border-t border-dashed border-primary/30">
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <HelpCircle className="w-4 h-4 text-primary" />
                    <h3 className="text-sm font-bold">أسئلة إضافية من الإدارة</h3>
                    <Badge variant="outline" className="text-[10px]">{generalQs.length} سؤال</Badge>
                    {generalRequired > 0 && (
                      <Badge variant="destructive" className="text-[10px] gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {generalRequired} إجباري
                      </Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {generalQs.map(renderQ)}
                  </div>
                </div>
              )}
            </>
          );
        })()}

        {/* Required-missing live banner */}
        {missingCount > 0 && (
          <div className="mt-5 p-3 rounded-lg bg-destructive/10 border-2 border-destructive/40 text-destructive flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold mb-1">
                ناقص {missingCount} {missingCount === 1 ? "سؤال إجباري" : "أسئلة إجبارية"} — لازم تكمّلها قبل الحفظ
              </p>
              <ul className="text-xs space-y-0.5 list-disc pr-4 opacity-90">
                {missingRequired.slice(0, 5).map((q) => (
                  <li key={q.id} className="truncate">{q.question_text}</li>
                ))}
                {missingRequired.length > 5 && (
                  <li className="opacity-70">+ {missingRequired.length - 5} أخرى…</li>
                )}
              </ul>
            </div>
          </div>
        )}

        {/* Submit */}
        <div className="mt-5 flex items-center justify-between gap-3 pt-4 border-t border-border/50">
          <p className="text-xs text-muted-foreground">
            {submittedAt
              ? "تقدر تعدّل وتعيد الحفظ — الأدمن هيشوف آخر نسخة"
              : missingCount > 0
                ? `كمّل ${missingCount} سؤال إجباري قبل ما تقدر تحفظ`
                : "ادخل الأرقام واضغط حفظ — الأدمن هيستلم إشعار فوري"}
          </p>
          <Button onClick={handleSubmit} disabled={saving || missingCount > 0} size="lg" className="gap-2">
            <Save className="w-4 h-4" />
            {saving ? "جارٍ الحفظ..." : submittedAt ? "حفظ التعديلات" : "تقديم التقرير"}
          </Button>
        </div>
      </Card>

      <AlertDialog open={!!restorePreview} onOpenChange={(o) => !o && setRestorePreview(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <HistoryIcon className="w-5 h-5 text-primary" />
              تأكيد استرجاع بيانات أمس
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm">
                <p className="text-foreground">
                  هتستبدل القيم الحالية ببيانات أمس. تقدر تعدّل أي قيمة قبل ما تضغط حفظ.
                </p>
                {restorePreview && (
                  <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                    {(restorePreview.mode === "kpis" || restorePreview.mode === "both") && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5">
                          <ClipboardList className="w-3.5 h-3.5 text-emerald-600" />
                          KPIs والنصوص
                        </span>
                        <Badge variant={restorePreview.hasReport ? "secondary" : "outline"} className="text-[10px]">
                          {restorePreview.hasReport ? "✓ متوفّرة" : "غير موجودة"}
                        </Badge>
                      </div>
                    )}
                    {(restorePreview.mode === "dynamic" || restorePreview.mode === "both") && (
                      <>
                        <div className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1.5">
                            <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
                            أسئلة إضافية مطابقة (نشطة اليوم)
                          </span>
                          <Badge className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                            {restorePreview.activeMatchedCount} سؤال
                          </Badge>
                        </div>
                        {restorePreview.skippedInactive > 0 && (
                          <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1.5 border-t border-dashed">
                            <span className="flex items-center gap-1.5">
                              <AlertCircle className="w-3 h-3" />
                              تم تجاهل أسئلة لم تعد نشطة
                            </span>
                            <span>{restorePreview.skippedInactive}</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRestore}>استرجاع</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
};

export default StaffDailyReport;
