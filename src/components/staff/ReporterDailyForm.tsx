import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, Send, Loader2, Sparkles } from "lucide-react";

/**
 * ReporterDailyForm — Ultra-simple daily report form designed for the
 * "reporter" role (Al-Faisal staff). Shows ONLY the dynamic questions
 * configured by admin in /admin?section=daily-report-editor.
 *
 * No KPIs, no restore-from-yesterday, no team logic — just questions in,
 * answers out. Built to feel like a quick checklist they fill at end of day.
 */

type QType = "text" | "textarea" | "number" | "choice" | "boolean";

interface DynQuestion {
  id: string;
  question_text: string;
  question_type: QType;
  options: string[];
  placeholder: string | null;
  is_required: boolean;
  sort_order: number;
}

interface DynAnswer {
  text?: string;
  number?: number;
  boolean?: boolean;
  choice?: string;
}

const isAnswered = (q: DynQuestion, a: DynAnswer | undefined): boolean => {
  if (!a) return false;
  switch (q.question_type) {
    case "number": return a.number != null && !Number.isNaN(a.number);
    case "boolean": return a.boolean != null;
    case "choice": return !!a.choice;
    case "text":
    case "textarea": return !!a.text?.trim();
  }
};

export default function ReporterDailyForm() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [questions, setQuestions] = useState<DynQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, DynAnswer>>({});
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [qRes, aRes] = await Promise.all([
        supabase
          .from("daily_report_questions")
          .select("id, question_text, question_type, options, placeholder, is_required, sort_order")
          .eq("is_active", true)
          .order("sort_order", { ascending: true }),
        supabase
          .from("daily_report_answers")
          .select("question_id, answer_text, answer_number, answer_boolean, answer_choice, created_at")
          .eq("user_id", user.id)
          .eq("report_date", today),
      ]);

      if (qRes.data) {
        setQuestions(
          qRes.data.map((q: any) => ({
            id: q.id,
            question_text: q.question_text,
            question_type: q.question_type as QType,
            options: Array.isArray(q.options) ? q.options : [],
            placeholder: q.placeholder,
            is_required: q.is_required,
            sort_order: q.sort_order ?? 0,
          }))
        );
      }
      if (aRes.data && aRes.data.length > 0) {
        const map: Record<string, DynAnswer> = {};
        aRes.data.forEach((a: any) => {
          map[a.question_id] = {
            text: a.answer_text ?? undefined,
            number: a.answer_number != null ? Number(a.answer_number) : undefined,
            boolean: a.answer_boolean ?? undefined,
            choice: a.answer_choice ?? undefined,
          };
        });
        setAnswers(map);
        // If we already have answers for today, mark as submitted (most recent created_at)
        const latest = aRes.data
          .map((a: any) => a.created_at)
          .sort()
          .pop();
        setSubmittedAt(latest ?? null);
      }
      setLoading(false);
    })();
  }, [user, today]);

  const answeredCount = useMemo(
    () => questions.filter((q) => isAnswered(q, answers[q.id])).length,
    [questions, answers]
  );
  const requiredQuestions = useMemo(() => questions.filter((q) => q.is_required), [questions]);
  const unansweredRequired = useMemo(
    () => requiredQuestions.filter((q) => !isAnswered(q, answers[q.id])),
    [requiredQuestions, answers]
  );
  const progressPct = questions.length === 0 ? 0 : Math.round((answeredCount / questions.length) * 100);

  const updateAnswer = (qid: string, patch: Partial<DynAnswer>) => {
    setAnswers((prev) => ({ ...prev, [qid]: { ...prev[qid], ...patch } }));
  };

  const handleSubmit = async () => {
    if (!user) return;
    if (unansweredRequired.length > 0) {
      const first = unansweredRequired[0];
      toast({
        title: "سؤال إجباري ناقص",
        description: first.question_text,
        variant: "destructive",
      });
      const el = document.getElementById(`rq-${first.id}`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setSaving(true);
    const rows = questions
      .filter((q) => isAnswered(q, answers[q.id]))
      .map((q) => {
        const a = answers[q.id];
        return {
          question_id: q.id,
          user_id: user.id,
          report_date: today,
          answer_text: a.text ?? null,
          answer_number: a.number ?? null,
          answer_boolean: a.boolean ?? null,
          answer_choice: a.choice ?? null,
        };
      });

    // Delete existing answers for today, then insert fresh
    await supabase
      .from("daily_report_answers")
      .delete()
      .eq("user_id", user.id)
      .eq("report_date", today);

    if (rows.length > 0) {
      const { error } = await supabase.from("daily_report_answers").insert(rows);
      if (error) {
        setSaving(false);
        toast({ title: "فشل الحفظ", description: error.message, variant: "destructive" });
        return;
      }
    }

    setSaving(false);
    setSubmittedAt(new Date().toISOString());
    toast({
      title: "✅ تم تسليم تقرير اليوم",
      description: `${rows.length} إجابة محفوظة بنجاح`,
    });
  };

  if (loading) {
    return (
      <div className="grid place-items-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Sparkles className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <h3 className="text-base font-bold mb-1">لا توجد أسئلة بعد</h3>
        <p className="text-sm text-muted-foreground">
          الإدارة لم تُضف أسئلة التقرير اليومي بعد. تابع لاحقاً.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4" dir="rtl">
      {/* Progress + status */}
      <Card className="p-4 bg-gradient-to-l from-primary/5 to-transparent border-primary/20">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {submittedAt ? (
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              ) : (
                <Sparkles className="w-5 h-5 text-primary" />
              )}
              <h2 className="text-base font-bold">
                {submittedAt ? "تم تسليم تقرير اليوم" : "تقرير اليوم"}
              </h2>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {answeredCount} من {questions.length} سؤال — تقدر تعدّل وتعيد التسليم في أي وقت قبل نهاية اليوم
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-2xl font-black text-primary tabular-nums">{progressPct}%</div>
          </div>
        </div>
        {/* Progress bar */}
        <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-l from-primary to-primary/70"
            initial={{ width: 0 }}
            animate={{ width: `${progressPct}%` }}
            transition={{ type: "spring", stiffness: 180, damping: 20 }}
          />
        </div>
      </Card>

      {/* Questions */}
      <div className="space-y-3">
        {questions.map((q, idx) => {
          const a = answers[q.id];
          const filled = isAnswered(q, a);
          return (
            <motion.div
              key={q.id}
              id={`rq-${q.id}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04 }}
            >
              <Card className={`p-4 transition-colors ${filled ? "border-green-200 bg-green-50/30" : ""}`}>
                <div className="flex items-start gap-2 mb-3">
                  <span className="shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold grid place-items-center mt-0.5">
                    {idx + 1}
                  </span>
                  <Label className="text-sm font-semibold leading-relaxed flex-1">
                    {q.question_text}
                    {q.is_required && <span className="text-destructive mr-1">*</span>}
                  </Label>
                  {filled && <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />}
                </div>

                {/* Render input by type */}
                <div className="ps-8">
                  {q.question_type === "text" && (
                    <Input
                      value={a?.text ?? ""}
                      onChange={(e) => updateAnswer(q.id, { text: e.target.value })}
                      placeholder={q.placeholder ?? "اكتب إجابتك..."}
                      maxLength={500}
                    />
                  )}

                  {q.question_type === "textarea" && (
                    <Textarea
                      value={a?.text ?? ""}
                      onChange={(e) => updateAnswer(q.id, { text: e.target.value })}
                      placeholder={q.placeholder ?? "اكتب تفاصيل..."}
                      rows={3}
                      maxLength={2000}
                    />
                  )}

                  {q.question_type === "number" && (
                    <Input
                      type="number"
                      inputMode="numeric"
                      value={a?.number ?? ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        updateAnswer(q.id, { number: v === "" ? undefined : Number(v) });
                      }}
                      placeholder={q.placeholder ?? "0"}
                    />
                  )}

                  {q.question_type === "choice" && q.options.length > 0 && (
                    <Select
                      value={a?.choice ?? ""}
                      onValueChange={(v) => updateAnswer(q.id, { choice: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={q.placeholder ?? "اختر..."} />
                      </SelectTrigger>
                      <SelectContent>
                        {q.options.map((opt) => (
                          <SelectItem key={opt} value={opt}>
                            {opt}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {q.question_type === "boolean" && (
                    <div className="flex items-center gap-3 py-1">
                      <Switch
                        checked={a?.boolean ?? false}
                        onCheckedChange={(checked) => updateAnswer(q.id, { boolean: checked })}
                      />
                      <span className="text-sm text-muted-foreground">
                        {a?.boolean ? "نعم" : "لا"}
                      </span>
                    </div>
                  )}
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Submit */}
      <div className="sticky bottom-0 -mx-3 sm:-mx-6 px-3 sm:px-6 py-3 bg-background/95 backdrop-blur-md border-t">
        <Button
          onClick={handleSubmit}
          disabled={saving || unansweredRequired.length > 0}
          size="lg"
          className="w-full gap-2 text-base font-bold"
        >
          {saving ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              جاري الحفظ...
            </>
          ) : submittedAt ? (
            <>
              <CheckCircle2 className="w-5 h-5" />
              تحديث تقرير اليوم
            </>
          ) : (
            <>
              <Send className="w-5 h-5" />
              تسليم التقرير
            </>
          )}
        </Button>
        {unansweredRequired.length > 0 && (
          <p className="text-xs text-center text-destructive mt-2">
            باقي {unansweredRequired.length} سؤال إجباري
          </p>
        )}
      </div>
    </div>
  );
}
