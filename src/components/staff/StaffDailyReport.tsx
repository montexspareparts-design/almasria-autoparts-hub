import { useEffect, useMemo, useRef, useState } from "react";
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
import { ClipboardList, CheckCircle2, AlertCircle, Save, Sparkles, Clock, HelpCircle, Users2, History as HistoryIcon, ChevronDown, ArrowRight, Eye, Loader2, MessageCircle, Download } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle, DrawerFooter, DrawerClose } from "@/components/ui/drawer";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { computeMissingRequired, isAnswerFilled } from "./dailyReportValidation";

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
  customers_contacted: number | null;
  customers_registered: number | null;
  customers_with_invoices: number | null;
  total_invoices_amount: number | null;
  hot_leads_count: number | null;
  follow_ups_done: number | null;
  problems_faced: string;
  best_deal_today: string;
  tomorrow_plan: string;
  general_notes: string;
  submitted_at?: string;
}

const EMPTY: ReportRow = {
  customers_contacted: null,
  customers_registered: null,
  customers_with_invoices: null,
  total_invoices_amount: null,
  hot_leads_count: null,
  follow_ups_done: null,
  problems_faced: "",
  best_deal_today: "",
  tomorrow_plan: "",
  general_notes: "",
};

const MAX_TEXT = 1000;
const MIN_TEXT = 10;

// KPI fields that must be filled (entered value, even if 0)
const REQUIRED_KPI_FIELDS: Array<{ key: keyof ReportRow; label: string }> = [
  { key: "customers_contacted", label: "عملاء تم التواصل معاهم" },
  { key: "customers_registered", label: "عملاء سجّلوا في المنصة" },
  { key: "customers_with_invoices", label: "عملاء عملوا فاتورة" },
  { key: "total_invoices_amount", label: "إجمالي الفواتير" },
  { key: "hot_leads_count", label: "Leads ساخنة" },
  { key: "follow_ups_done", label: "متابعات تمت" },
];

// Text fields that are mandatory with minimum length
const REQUIRED_TEXT_FIELDS: Array<{ key: keyof ReportRow; label: string }> = [
  { key: "best_deal_today", label: "أفضل صفقة اليوم" },
  { key: "tomorrow_plan", label: "خطة بكرة" },
];

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
  const [submitAttempted, setSubmitAttempted] = useState(false);

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
          customers_contacted: data.customers_contacted ?? null,
          customers_registered: data.customers_registered ?? null,
          customers_with_invoices: data.customers_with_invoices ?? null,
          total_invoices_amount: data.total_invoices_amount != null ? Number(data.total_invoices_amount) : null,
          hot_leads_count: data.hot_leads_count ?? null,
          follow_ups_done: data.follow_ups_done ?? null,
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
    // Note: we no longer clear the highlight on a timer.
    // It auto-clears via the effect below once the question is filled.
  };

  // Auto-clear the "quick jump" highlight as soon as the targeted question is answered.
  useEffect(() => {
    if (!highlightedQId) return;
    const target = dynQuestions.find((q) => q.id === highlightedQId);
    if (!target) {
      setHighlightedQId(null);
      return;
    }
    if (isAnswerFilled(target, dynAnswers[highlightedQId])) {
      setHighlightedQId(null);
    }
  }, [highlightedQId, dynAnswers, dynQuestions]);

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

  // ===== Live validation (KPIs + required text + dynamic) =====
  // KPI must have explicit value (null = not entered). 0 is allowed.
  const kpiErrors = REQUIRED_KPI_FIELDS.filter((f) => report[f.key] == null);
  const textErrors = REQUIRED_TEXT_FIELDS.filter(
    (f) => (report[f.key] as string).trim().length < MIN_TEXT
  );

  const handleSubmit = async () => {
    if (!user) return;
    setSubmitAttempted(true);

    // Validate KPI numeric fields (must be entered)
    if (kpiErrors.length > 0) {
      toast({
        title: `ناقص ${kpiErrors.length} رقم في الـ KPIs`,
        description: `أدخل قيمة (حتى لو 0) في: ${kpiErrors.map((f) => f.label).join("، ")}`,
        variant: "destructive",
      });
      const first = document.getElementById(`kpi-${kpiErrors[0].key}`);
      first?.scrollIntoView({ behavior: "smooth", block: "center" });
      (first?.querySelector("input") as HTMLInputElement | null)?.focus();
      return;
    }

    // Validate required text fields (min 10 chars)
    if (textErrors.length > 0) {
      toast({
        title: `تعليق إجباري ناقص`,
        description: `اكتب ${MIN_TEXT} أحرف على الأقل في: ${textErrors.map((f) => f.label).join("، ")}`,
        variant: "destructive",
      });
      const first = document.getElementById(`txt-${textErrors[0].key}`);
      first?.scrollIntoView({ behavior: "smooth", block: "center" });
      (first?.querySelector("textarea") as HTMLTextAreaElement | null)?.focus();
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
        scrollToQuestion(dq.id);
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
  ) => {
    const isRequired = REQUIRED_KPI_FIELDS.some((f) => f.key === key);
    const value = report[key] as number | null;
    const isEmpty = value == null;
    const showError = isRequired && isEmpty && submitAttempted;
    return (
      <div className="space-y-1.5" id={`kpi-${key}`}>
        <Label className="text-xs font-semibold flex items-center gap-1.5">
          <span>{icon}</span>
          <span>{label}</span>
          {isRequired && <span className="text-destructive">*</span>}
        </Label>
        <div className="relative">
          <Input
            type="number"
            min="0"
            value={value ?? ""}
            placeholder="—"
            onChange={(e) =>
              setReport((r) => ({
                ...r,
                [key]: e.target.value === "" ? null : Number(e.target.value),
              }))
            }
            className={`text-lg font-bold tabular-nums h-11 ${
              showError
                ? "border-destructive focus-visible:ring-destructive bg-destructive/5"
                : !isEmpty
                  ? "border-emerald-500/40"
                  : ""
            }`}
          />
          {suffix && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
              {suffix}
            </span>
          )}
        </div>
        {showError && (
          <p className="text-[10px] text-destructive flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            مطلوب — أدخل رقم (حتى لو 0)
          </p>
        )}
      </div>
    );
  };

  const textField = (key: keyof ReportRow, label: string, placeholder: string) => {
    const isRequired = REQUIRED_TEXT_FIELDS.some((f) => f.key === key);
    const value = report[key] as string;
    const trimmedLen = value.trim().length;
    const tooShort = isRequired && trimmedLen < MIN_TEXT;
    const showError = tooShort && submitAttempted;
    return (
      <div className="space-y-1.5" id={`txt-${key}`}>
        <Label className="text-xs font-semibold flex items-center gap-1.5">
          <span>{label}</span>
          {isRequired && <span className="text-destructive">*</span>}
        </Label>
        <Textarea
          value={value}
          onChange={(e) => setReport((r) => ({ ...r, [key]: e.target.value.slice(0, MAX_TEXT) }))}
          placeholder={placeholder}
          rows={2}
          maxLength={MAX_TEXT}
          className={`resize-none text-sm ${
            showError
              ? "border-destructive focus-visible:ring-destructive bg-destructive/5"
              : isRequired && trimmedLen >= MIN_TEXT
                ? "border-emerald-500/40"
                : ""
          }`}
        />
        <div className="flex items-center justify-between text-[10px]">
          {showError ? (
            <span className="text-destructive flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              مطلوب — اكتب {MIN_TEXT} أحرف على الأقل ({trimmedLen}/{MIN_TEXT})
            </span>
          ) : isRequired ? (
            <span className={trimmedLen >= MIN_TEXT ? "text-emerald-600" : "text-muted-foreground"}>
              {trimmedLen}/{MIN_TEXT} حرف على الأقل
            </span>
          ) : (
            <span />
          )}
          <span className="text-muted-foreground">{value.length}/{MAX_TEXT}</span>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <Card className="p-6 animate-pulse h-64 bg-muted/30" />
    );
  }

  // Compute missing required dynamic questions (live)
  const missingRequired = computeMissingRequired(dynQuestions, dynAnswers);
  const missingCount = missingRequired.length;
  const totalErrors = kpiErrors.length + textErrors.length + missingCount;

  // If the staff already submitted today, hide the form and show a clean confirmation card
  // with a back button and quick links (view details / last reports history).
  if (submittedAt) {
    return (
      <SubmittedSuccessCard
        submittedAt={submittedAt}
        report={report}
        dynQuestions={dynQuestions}
        dynAnswers={dynAnswers}
        userId={user?.id ?? null}
      />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="overflow-hidden border border-border/60 shadow-lg shadow-primary/5 bg-card">
        {/* Premium Header — corporate, dark, refined */}
        <div className="relative bg-gradient-to-l from-slate-900 via-slate-900 to-slate-800 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 px-5 md:px-7 py-5 border-b border-primary/20">
          {/* subtle gold accent line */}
          <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400/60 to-transparent" />
          {/* subtle pattern overlay */}
          <div
            className="absolute inset-0 opacity-[0.04] pointer-events-none"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
              backgroundSize: "20px 20px",
            }}
          />

          <div className="relative flex items-start justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              {/* Refined icon badge */}
              <div className="relative">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/30 flex items-center justify-center shadow-inner shadow-primary/20">
                  <ClipboardList className="w-5 h-5 text-primary" strokeWidth={2.2} />
                </div>
                <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-amber-400 ring-2 ring-slate-900 dark:ring-slate-950 animate-pulse" />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base md:text-lg font-bold text-white tracking-tight">
                    التقرير اليومي للموظف
                  </h2>
                  <Badge className="bg-amber-400/15 text-amber-300 border-amber-400/30 text-[10px] px-2 py-0 h-5 font-semibold">
                    إلزامي
                  </Badge>
                </div>
                <p className="text-[11px] md:text-xs text-slate-400 mt-1 flex items-center gap-1.5 flex-wrap">
                  <Clock className="w-3 h-3" />
                  <span>
                    {new Date().toLocaleDateString("ar-EG", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                  <span className="text-slate-600">•</span>
                  <span className="text-slate-400">آخر موعد للتقديم: 6:00 مساءً</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 h-8 text-xs bg-white/5 border-white/15 text-slate-200 hover:bg-white/10 hover:text-white hover:border-white/25"
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
                <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-400/30 gap-1 h-8 px-3">
                  <CheckCircle2 className="w-3 h-3" />
                  تم التقديم — {new Date(submittedAt).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}
                </Badge>
              ) : showReminder ? (
                <Badge className="bg-red-500/20 text-red-300 border-red-400/40 gap-1 animate-pulse h-8 px-3">
                  <AlertCircle className="w-3 h-3" />
                  متأخر — تجاوز 6 مساءً
                </Badge>
              ) : (
                <Badge className="bg-white/5 text-slate-300 border-white/15 gap-1 h-8 px-3">
                  <Clock className="w-3 h-3" />
                  مسودّة
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 md:p-6">

        {!submittedAt && (
          <div className="mb-4 p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/20 text-[11px] text-amber-700 dark:text-amber-400 flex items-center gap-2">
            <HistoryIcon className="w-3.5 h-3.5 shrink-0" />
            <span>تقدر تضغط <strong>"استرجع من أمس"</strong> فوق لتعبئة الحقول بإجابات يوم أمس — كلها قابلة للتعديل قبل الحفظ.</span>
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
            const isHighlighted = highlightedQId === q.id;
            return (
              <div
                key={q.id}
                id={`dyn-q-${q.id}`}
                className={`space-y-1.5 rounded-lg p-2 -m-2 transition-all duration-500 ${
                  isHighlighted
                    ? "ring-2 ring-destructive bg-destructive/10 shadow-[0_0_0_4px_hsl(var(--destructive)/0.15)] animate-pulse"
                    : "ring-0"
                }`}
              >
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

        {/* Required-missing live banner — KPIs + text + dynamic */}
        {totalErrors > 0 && (
          <div className="mt-5 p-3 rounded-lg bg-destructive/10 border-2 border-destructive/40 text-destructive flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold mb-2">
                ناقص {totalErrors} حقل إجباري — لازم تكمّلهم قبل الحفظ
              </p>
              <ul className="text-xs space-y-1 pr-1">
                {kpiErrors.map((f) => (
                  <li key={`kpi-${f.key}`}>
                    <button
                      type="button"
                      onClick={() => {
                        const el = document.getElementById(`kpi-${f.key}`);
                        el?.scrollIntoView({ behavior: "smooth", block: "center" });
                        (el?.querySelector("input") as HTMLInputElement | null)?.focus();
                      }}
                      className="text-right w-full truncate underline underline-offset-2 hover:no-underline flex items-center gap-1.5"
                    >
                      <span>›</span>
                      <span className="truncate">رقم: {f.label}</span>
                    </button>
                  </li>
                ))}
                {textErrors.map((f) => (
                  <li key={`txt-${f.key}`}>
                    <button
                      type="button"
                      onClick={() => {
                        const el = document.getElementById(`txt-${f.key}`);
                        el?.scrollIntoView({ behavior: "smooth", block: "center" });
                        (el?.querySelector("textarea") as HTMLTextAreaElement | null)?.focus();
                      }}
                      className="text-right w-full truncate underline underline-offset-2 hover:no-underline flex items-center gap-1.5"
                    >
                      <span>›</span>
                      <span className="truncate">تعليق: {f.label} (≥ {MIN_TEXT} حرف)</span>
                    </button>
                  </li>
                ))}
                {missingRequired.slice(0, 5).map((q) => (
                  <li key={q.id}>
                    <button
                      type="button"
                      onClick={() => scrollToQuestion(q.id)}
                      className="text-right w-full truncate underline underline-offset-2 hover:no-underline flex items-center gap-1.5"
                      title="افتح السؤال وحدّد مكانه"
                    >
                      <span>›</span>
                      <span className="truncate">سؤال: {q.question_text}</span>
                    </button>
                  </li>
                ))}
                {missingRequired.length > 5 && (
                  <li className="opacity-70 text-[11px] pr-3">+ {missingRequired.length - 5} سؤال آخر…</li>
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
              : totalErrors > 0
                ? `كمّل ${totalErrors} حقل إجباري قبل الحفظ`
                : "كل الحقول الإجبارية مكتملة — اضغط حفظ"}
          </p>
          <Button onClick={handleSubmit} disabled={saving || totalErrors > 0} size="lg" className="gap-2">
            <Save className="w-4 h-4" />
            {saving ? "جارٍ الحفظ..." : submittedAt ? "حفظ التعديلات" : "تقديم التقرير"}
          </Button>
        </div>

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

// ─────────────────────────────────────────────────────────────────────────────
// Success card shown after the daily report has been submitted.
// Provides: back button, view-details toggle, and last reports history.
// ─────────────────────────────────────────────────────────────────────────────

interface SubmittedSuccessCardProps {
  submittedAt: string;
  report: ReportRow;
  dynQuestions: DynQuestion[];
  dynAnswers: Record<string, DynAnswer>;
  userId: string | null;
}

interface HistoryItem {
  id: string;
  report_date: string;
  submitted_at: string | null;
  customers_contacted: number | null;
  total_invoices_amount: number | null;
}

const SubmittedSuccessCard = ({
  submittedAt,
  report,
  dynQuestions,
  dynAnswers,
  userId,
}: SubmittedSuccessCardProps) => {
  const [showDetails, setShowDetails] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<HistoryItem[] | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [staffName, setStaffName] = useState<string>("");

  // جلب اسم الموظف لعرضه في ترويسة "تفاصيل تقرير اليوم"
  useEffect(() => {
    if (!userId) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", userId)
        .maybeSingle();
      const { data: { user: authUser } } = await supabase.auth.getUser();
      setStaffName(data?.full_name || authUser?.email?.split("@")[0] || "موظف");
    })();
  }, [userId]);

  const submittedTime = useMemo(
    () =>
      new Date(submittedAt).toLocaleTimeString("ar-EG", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    [submittedAt]
  );
  const submittedDate = useMemo(
    () =>
      new Date(submittedAt).toLocaleDateString("ar-EG", {
        weekday: "long",
        day: "numeric",
        month: "long",
      }),
    [submittedAt]
  );

  const navigate = useNavigate();
  const handleBack = () => {
    // Use SPA-friendly navigation; fall back to home if there's no history entry.
    if (window.history.state && window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/", { replace: true });
    }
  };

  const loadHistory = async () => {
    if (!userId || history) {
      setShowHistory((s) => !s);
      return;
    }
    setHistoryLoading(true);
    setShowHistory(true);
    const client: any = supabase;
    const res = await client
      .from("staff_daily_reports")
      .select("id, report_date, submitted_at, customers_contacted, total_invoices_amount")
      .eq("user_id", userId)
      .order("report_date", { ascending: false })
      .limit(7);
    setHistory((res?.data as HistoryItem[]) ?? []);
    setHistoryLoading(false);
  };

  const dynAnsweredList = dynQuestions
    .map((q) => ({ q, a: dynAnswers[q.id] }))
    .filter(({ q, a }) => {
      if (!a) return false;
      if (q.question_type === "number") return a.number != null;
      if (q.question_type === "boolean") return a.boolean != null;
      if (q.question_type === "choice") return !!a.choice;
      return !!a.text?.trim();
    });

  const renderAnswerValue = (q: DynQuestion, a: DynAnswer) => {
    if (q.question_type === "number") return String(a.number);
    if (q.question_type === "boolean") return a.boolean ? "نعم" : "لا";
    if (q.question_type === "choice") return a.choice || "—";
    return a.text || "—";
  };

  // ── Export & Share ────────────────────────────────────────────
  const reportRef = useRef<HTMLDivElement>(null);
  const [savingImage, setSavingImage] = useState(false);

  const buildWhatsAppText = () => {
    const lines = [
      `📋 *تقرير يومي* — ${staffName || "موظف"}`,
      `📅 ${submittedDate} — الساعة ${submittedTime}`,
      ``,
      `*ملخص KPIs*`,
      `• عملاء تم التواصل: ${report.customers_contacted ?? 0}`,
      `• عملاء سجّلوا: ${report.customers_registered ?? 0}`,
      `• عملاء عملوا فاتورة: ${report.customers_with_invoices ?? 0}`,
      `• إجمالي الفواتير: ${report.total_invoices_amount ?? 0} ج.م`,
      `• Leads ساخنة: ${report.hot_leads_count ?? 0}`,
      `• متابعات تمت: ${report.follow_ups_done ?? 0}`,
    ];
    if (report.best_deal_today) lines.push(``, `🏆 *أفضل صفقة:* ${report.best_deal_today}`);
    if (report.problems_faced) lines.push(`⚠️ *مشاكل:* ${report.problems_faced}`);
    if (report.tomorrow_plan) lines.push(`📌 *خطة بكرة:* ${report.tomorrow_plan}`);
    if (report.general_notes) lines.push(`📝 *ملاحظات:* ${report.general_notes}`);
    if (dynAnsweredList.length > 0) {
      lines.push(``, `*الأسئلة الإضافية:*`);
      dynAnsweredList.forEach(({ q, a }) => {
        lines.push(`• ${q.question_text}: ${renderAnswerValue(q, a!)}`);
      });
    }
    return lines.join("\n");
  };

  const sendToWhatsApp = () => {
    const text = encodeURIComponent(buildWhatsAppText());
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  const saveAsImage = async () => {
    if (!reportRef.current) return;
    setSavingImage(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(reportRef.current, {
        backgroundColor: "#ffffff",
        scale: 2,
        useCORS: true,
      });
      const link = document.createElement("a");
      link.download = `daily-report-${staffName || "staff"}-${submittedDate}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (e) {
      console.error("[saveAsImage]", e);
    } finally {
      setSavingImage(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="p-6 md:p-8 border-2 border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-card to-card">
        {/* Hero */}
        <div className="text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/15 flex items-center justify-center mb-4">
            <CheckCircle2 className="w-9 h-9 text-emerald-600" />
          </div>
          <h2 className="text-lg md:text-xl font-bold mb-1.5">تم تقديم تقرير اليوم ✅</h2>
          <p className="text-sm text-muted-foreground mb-1">
            شكراً لك! تم استلام تقريرك بنجاح.
          </p>
          <p className="text-xs text-muted-foreground">
            {submittedDate} — الساعة {submittedTime}
          </p>
        </div>

        {/* Quick action buttons */}
        <div className="flex flex-wrap items-center justify-center gap-2 mt-5">
          <Button
            size="sm"
            variant="default"
            className="gap-1.5 h-9"
            onClick={handleBack}
          >
            <ArrowRight className="w-4 h-4" />
            رجوع للصفحة السابقة
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 h-9"
            onClick={() => setShowDetails(true)}
          >
            <Eye className="w-4 h-4" />
            عرض تفاصيل التقرير
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 h-9"
            onClick={loadHistory}
          >
            <HistoryIcon className="w-4 h-4" />
            تاريخ آخر التقارير
          </Button>
        </div>

        {/* Details Drawer (slides up from bottom) */}
        <Drawer open={showDetails} onOpenChange={setShowDetails}>
          <DrawerContent className="max-h-[85vh]">
            <DrawerHeader className="text-right">
              <DrawerTitle className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-primary" />
                تفاصيل تقرير اليوم
                {staffName && (
                  <span className="text-xs font-normal text-muted-foreground">
                    — {staffName}
                  </span>
                )}
              </DrawerTitle>
              <DrawerDescription className="text-xs">
                {submittedDate} — تم التقديم الساعة {submittedTime}
              </DrawerDescription>
            </DrawerHeader>
            <div ref={reportRef} className="px-4 pb-2 overflow-y-auto space-y-4 bg-background">
              <section className="space-y-2">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  ملخص KPIs
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                  <KpiPill label="عملاء تم التواصل" value={report.customers_contacted} />
                  <KpiPill label="عملاء سجّلوا" value={report.customers_registered} />
                  <KpiPill label="عملاء عملوا فاتورة" value={report.customers_with_invoices} />
                  <KpiPill label="إجمالي الفواتير" value={`${report.total_invoices_amount} ج.م`} />
                  <KpiPill label="Leads ساخنة" value={report.hot_leads_count} />
                  <KpiPill label="متابعات تمت" value={report.follow_ups_done} />
                </div>
              </section>

              {(report.best_deal_today || report.problems_faced || report.tomorrow_plan || report.general_notes) && (
                <section className="space-y-2">
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    ملاحظات
                  </h3>
                  <div className="space-y-1.5 text-xs">
                    {report.best_deal_today && <NoteRow label="أفضل صفقة" value={report.best_deal_today} />}
                    {report.problems_faced && <NoteRow label="مشاكل" value={report.problems_faced} />}
                    {report.tomorrow_plan && <NoteRow label="خطة بكرة" value={report.tomorrow_plan} />}
                    {report.general_notes && <NoteRow label="عام" value={report.general_notes} />}
                  </div>
                </section>
              )}

              {dynAnsweredList.length > 0 && (
                <section className="space-y-2">
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    الأسئلة الإضافية ({dynAnsweredList.length})
                  </h3>
                  <ul className="space-y-1.5 text-xs">
                    {dynAnsweredList.map(({ q, a }) => (
                      <li key={q.id} className="flex items-start gap-2 border-b border-border/40 pb-1.5">
                        <span className="text-muted-foreground shrink-0">{q.question_text}:</span>
                        <span className="font-semibold">{renderAnswerValue(q, a!)}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
            <DrawerFooter className="gap-2">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white"
                  onClick={sendToWhatsApp}
                >
                  <MessageCircle className="w-4 h-4 ml-1" />
                  إرسال على واتساب
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={saveAsImage}
                  disabled={savingImage}
                >
                  {savingImage ? <Loader2 className="w-4 h-4 ml-1 animate-spin" /> : <Download className="w-4 h-4 ml-1" />}
                  حفظ كصورة
                </Button>
              </div>
              <DrawerClose asChild>
                <Button variant="outline" size="sm">إغلاق</Button>
              </DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>

        {/* History panel */}
        {showHistory && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mt-4 overflow-hidden"
          >
            <div className="rounded-lg border border-emerald-500/20 bg-card/60 p-4">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                آخر 7 تقارير
              </h3>
              {historyLoading ? (
                <div className="flex items-center justify-center py-4 text-muted-foreground text-xs gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  جاري التحميل…
                </div>
              ) : !history || history.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-3">لا توجد تقارير سابقة.</p>
              ) : (
                <ul className="divide-y divide-border/50">
                  {history.map((h) => {
                    const d = new Date(h.report_date).toLocaleDateString("ar-EG", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                    });
                    return (
                      <li key={h.id} className="py-2 flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2">
                          <Badge variant={h.submitted_at ? "default" : "outline"} className="h-5 text-[10px]">
                            {h.submitted_at ? "تم التقديم" : "مسودة"}
                          </Badge>
                          <span className="font-semibold">{d}</span>
                        </div>
                        <div className="flex items-center gap-3 text-muted-foreground">
                          <span>📞 {h.customers_contacted ?? 0}</span>
                          <span>💰 {h.total_invoices_amount ?? 0} ج.م</span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </motion.div>
        )}
      </Card>
    </motion.div>
  );
};

const KpiPill = ({ label, value }: { label: string; value: number | string }) => (
  <div className="flex flex-col items-center justify-center rounded-md bg-muted/40 p-2">
    <span className="text-[10px] text-muted-foreground">{label}</span>
    <span className="font-bold tabular-nums text-sm">{value}</span>
  </div>
);

const NoteRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-start gap-2">
    <span className="text-muted-foreground shrink-0 font-semibold">{label}:</span>
    <span className="line-clamp-2">{value}</span>
  </div>
);

export default StaffDailyReport;
