import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ClipboardList, ChevronLeft, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

/**
 * Compact card that replaces the inline daily-report form on StaffHome.
 * Acts as a "tab" — clicking it navigates to /admin/daily-report
 * where the staff member fills out the full form.
 *
 * Shows the live status badge:
 *   - "تم التقديم" (green) if today's report exists
 *   - "متبقّي X سؤال" (amber) if some answers are missing
 *   - "لم يبدأ" (red) otherwise
 */
export default function DailyReportTabCard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<"submitted" | "partial" | "empty">("empty");
  const [partialCount, setPartialCount] = useState<{ answered: number; total: number }>({
    answered: 0,
    total: 0,
  });

  useEffect(() => {
    if (!user) return;
    let alive = true;
    (async () => {
      const today = new Date().toISOString().slice(0, 10);

      // 1) Check if a submitted report row exists for today
      const { data: submission } = await supabase
        .from("staff_daily_reports")
        .select("id, submitted_at")
        .eq("user_id", user.id)
        .eq("report_date", today)
        .maybeSingle();

      // 2) Count visible questions vs answered for today
      const { data: questions } = await supabase
        .from("daily_report_questions")
        .select("id")
        .eq("is_active", true);

      const { data: answers } = await supabase
        .from("daily_report_answers")
        .select("question_id, answer_text, answer_number, answer_boolean, answer_choice")
        .eq("user_id", user.id)
        .eq("report_date", today);

      if (!alive) return;

      const total = questions?.length || 0;
      const answered = (answers || []).filter(
        (a: any) =>
          a.answer_text != null ||
          a.answer_number != null ||
          a.answer_boolean != null ||
          a.answer_choice != null
      ).length;

      setPartialCount({ answered, total });

      if (submission && (submission as any).submitted_at) {
        setStatus("submitted");
      } else if (answered > 0) {
        setStatus("partial");
      } else {
        setStatus("empty");
      }
      setLoading(false);
    })();

    return () => {
      alive = false;
    };
  }, [user]);

  const today = new Date().toLocaleDateString("ar-EG", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const config = {
    submitted: {
      icon: CheckCircle2,
      label: "✅ تم التقديم",
      pillClass: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500/30",
      borderClass: "border-emerald-500/40",
      hint: "تم تقديم تقرير اليوم. اضغط للمراجعة أو التعديل.",
    },
    partial: {
      icon: Clock,
      label: `⏳ غير مكتمل (${partialCount.answered}/${partialCount.total})`,
      pillClass: "bg-amber-500/15 text-amber-700 dark:text-amber-300 ring-1 ring-amber-500/30",
      borderClass: "border-amber-500/50",
      hint: "بدأت التقرير ولم تكمله — اضغط لإكمال الإجابات وتقديمه.",
    },
    empty: {
      icon: AlertCircle,
      label: "🔴 لم يُقدَّم بعد",
      pillClass: "bg-red-500/15 text-red-700 dark:text-red-300 ring-1 ring-red-500/30",
      borderClass: "border-red-500/50",
      hint: "آخر موعد للتقديم 6:00 مساءً — اضغط لفتح التقرير.",
    },
  }[status];

  const StatusIcon = config.icon;

  return (
    <section dir="rtl">
      <button
        type="button"
        onClick={() => navigate("/admin/daily-report")}
        className={`group w-full text-right rounded-2xl overflow-hidden border-2 ${config.borderClass}
          bg-gradient-to-br from-card via-card to-muted/20
          shadow-sm hover:shadow-xl hover:-translate-y-0.5
          transition-all duration-300 ease-out
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2`}
        aria-label="افتح التقرير اليومي"
      >
        <div className="flex items-stretch gap-0">
          {/* Right strip — icon */}
          <div className="shrink-0 w-14 sm:w-16 bg-gradient-to-b from-primary/15 to-primary/5 flex items-center justify-center">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-primary to-primary/70 grid place-items-center shadow-md group-hover:scale-110 transition-transform duration-300">
              <ClipboardList className="w-5 h-5 text-primary-foreground" />
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 min-w-0 p-3 sm:p-4 flex flex-col justify-center gap-1.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 min-w-0">
                <h3 className="text-sm sm:text-base font-bold leading-tight truncate">
                  التقرير اليومي للموظف
                </h3>
                <Badge variant="outline" className="text-[9px] sm:text-[10px] px-1.5 py-0 leading-none border-primary/40 text-primary">
                  إلزامي
                </Badge>
              </div>
              {!loading && (
                <span className={`inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-bold px-2 py-1 rounded-md leading-none ${config.pillClass}`}>
                  <StatusIcon className="w-3 h-3" />
                  {config.label}
                </span>
              )}
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground leading-snug">
              {today} • {config.hint}
            </p>
          </div>

          {/* Left chevron */}
          <div className="shrink-0 self-center pl-3 sm:pl-4 text-muted-foreground group-hover:text-primary group-hover:-translate-x-1 transition-all duration-300">
            <ChevronLeft className="w-5 h-5" />
          </div>
        </div>
      </button>
    </section>
  );
}
