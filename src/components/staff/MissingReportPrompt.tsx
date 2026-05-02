import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { format, subDays } from "date-fns";
import { ar } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Palmtree, ThermometerSun, Brain, Coffee, MessageSquare, Loader2, CalendarX } from "lucide-react";
import { cn } from "@/lib/utils";

const REASON_OPTIONS = [
  { value: "day_off", label: "كانت إجازة رسمية", icon: Palmtree, color: "text-emerald-600 border-emerald-300 bg-emerald-50" },
  { value: "sick", label: "كنت مريض", icon: ThermometerSun, color: "text-rose-600 border-rose-300 bg-rose-50" },
  { value: "forgot", label: "نسيت أقدّم التقرير", icon: Brain, color: "text-amber-600 border-amber-300 bg-amber-50" },
  { value: "no_work", label: "مكنش في شغل / يوم هادي", icon: Coffee, color: "text-sky-600 border-sky-300 bg-sky-50" },
  { value: "other", label: "سبب آخر", icon: MessageSquare, color: "text-violet-600 border-violet-300 bg-violet-50" },
];

/**
 * يظهر تلقائياً للموظف لو امبارح مفيش تقرير ولا إجازة ولا مبرّر مسجّل.
 * عند الاختيار: يحفظ في reporter_missing_report_justifications.
 * لو اختار "إجازة رسمية" → يضيف صف في reporter_day_off بدلاً من المبرّر.
 */
export default function MissingReportPrompt() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [missedDate, setMissedDate] = useState<string>("");
  const [reasonType, setReasonType] = useState<string>("");
  const [reasonText, setReasonText] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      const yesterday = format(subDays(new Date(), 1), "yyyy-MM-dd");

      // 1) هل المستخدم staff/reporter أصلاً؟
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      const isReporter = (roles || []).some((r: any) =>
        ["reporter", "moderator", "admin"].includes(r.role)
      );
      if (!isReporter) return;

      // 2) قدّم تقرير امبارح؟
      const { data: rep } = await supabase
        .from("reporter_daily_reports")
        .select("id")
        .eq("user_id", user.id)
        .eq("report_date", yesterday)
        .maybeSingle();
      if (rep) return;

      // 3) عنده إجازة مسجلة امبارح؟
      const { data: doff } = await supabase
        .from("reporter_day_off")
        .select("id")
        .eq("user_id", user.id)
        .eq("off_date", yesterday)
        .maybeSingle();
      if (doff) return;

      // 4) عنده مبرّر مسجّل؟
      const { data: just } = await (supabase as any)
        .from("reporter_missing_report_justifications")
        .select("id")
        .eq("user_id", user.id)
        .eq("missed_date", yesterday)
        .maybeSingle();
      if (just) return;

      if (!cancelled) {
        setMissedDate(yesterday);
        setOpen(true);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  const submit = async () => {
    if (!user?.id || !missedDate || !reasonType) return;
    if (reasonType === "other" && reasonText.trim().length < 3) {
      toast({ title: "اكتب السبب", description: "محتاجين تكتب سبب موجز عشان الإدارة تفهم", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      if (reasonType === "day_off") {
        // يسجّل إجازة بدل مبرّر
        const { error } = await supabase
          .from("reporter_day_off" as any)
          .insert({ user_id: user.id, off_date: missedDate, reason: reasonText || "إجازة (تم التسجيل بأثر رجعي)" } as any);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from("reporter_missing_report_justifications")
          .insert({
            user_id: user.id,
            missed_date: missedDate,
            reason_type: reasonType,
            reason_text: reasonText.trim() || null,
          });
        if (error) throw error;
      }
      toast({ title: "✓ تم تسجيل السبب", description: "شكراً — الإدارة هتشوف الرد." });
      setOpen(false);
    } catch (e: any) {
      toast({ title: "تعذّر الحفظ", description: e?.message || "حاول تاني", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!saving) setOpen(v); }}>
      <DialogContent className="max-w-md" dir="rtl" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-rose-500 grid place-items-center shadow-lg mb-2">
            <CalendarX className="w-7 h-7 text-white" />
          </div>
          <DialogTitle className="text-center text-lg flex items-center justify-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            مقدمتش تقرير إمبارح!
          </DialogTitle>
          <DialogDescription className="text-center text-sm">
            الإدارة بتحتاج تعرف سبب عدم التقديم يوم{" "}
            <span className="font-bold text-foreground">
              {format(new Date(missedDate || new Date()), "EEEE d MMMM", { locale: ar })}
            </span>
            . اختار السبب بسرعة وكمل يومك 💪
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <RadioGroup value={reasonType} onValueChange={setReasonType} className="space-y-2">
            {REASON_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const active = reasonType === opt.value;
              return (
                <motion.label
                  key={opt.value}
                  htmlFor={`reason-${opt.value}`}
                  whileTap={{ scale: 0.98 }}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all",
                    active ? `${opt.color} shadow-sm scale-[1.01]` : "border-border bg-background hover:border-primary/40"
                  )}
                >
                  <RadioGroupItem id={`reason-${opt.value}`} value={opt.value} />
                  <Icon className={cn("w-5 h-5 shrink-0", active ? "" : "text-muted-foreground")} />
                  <span className="text-sm font-medium flex-1">{opt.label}</span>
                </motion.label>
              );
            })}
          </RadioGroup>

          {reasonType && (
            <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">
                {reasonType === "other" ? "اكتب السبب *" : "تفاصيل إضافية (اختياري)"}
              </Label>
              <Textarea
                value={reasonText}
                onChange={(e) => setReasonText(e.target.value)}
                placeholder={reasonType === "other" ? "مثلاً: كان عندي ظرف عائلي طارئ" : "اكتب أي تفاصيل تحب الإدارة تعرفها..."}
                className="text-sm min-h-[60px]"
                maxLength={300}
              />
            </motion.div>
          )}
        </div>

        <DialogFooter>
          <Button
            onClick={submit}
            disabled={!reasonType || saving}
            className="w-full gap-2 bg-gradient-to-l from-primary to-primary/80"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarX className="w-4 h-4" />}
            {saving ? "جاري الحفظ…" : "تسجيل السبب وإكمال اليوم"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
