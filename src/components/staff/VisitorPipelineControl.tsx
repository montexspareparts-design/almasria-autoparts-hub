import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Sparkles,
  Heart,
  FileText,
  PhoneCall,
  XCircle,
  Trophy,
  ChevronDown,
  Phone,
  MessageCircle,
  CalendarClock,
  StickyNote,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Pipeline stages — matches the SQL enum visitor_pipeline_stage ────────────
export type PipelineStage =
  | "new"
  | "interested"
  | "quote_sent"
  | "contacted"
  | "not_interested"
  | "won";

const STAGE_META: Record<
  PipelineStage,
  { label: string; icon: typeof Sparkles; cls: string; dot: string }
> = {
  new: {
    label: "جديد",
    icon: Sparkles,
    cls: "bg-blue-500/15 text-blue-700 border-blue-200 hover:bg-blue-500/25",
    dot: "bg-blue-500",
  },
  interested: {
    label: "مهتم",
    icon: Heart,
    cls: "bg-pink-500/15 text-pink-700 border-pink-200 hover:bg-pink-500/25",
    dot: "bg-pink-500",
  },
  quote_sent: {
    label: "عرض سعر مرسل",
    icon: FileText,
    cls: "bg-amber-500/15 text-amber-700 border-amber-200 hover:bg-amber-500/25",
    dot: "bg-amber-500",
  },
  contacted: {
    label: "تم التواصل",
    icon: PhoneCall,
    cls: "bg-violet-500/15 text-violet-700 border-violet-200 hover:bg-violet-500/25",
    dot: "bg-violet-500",
  },
  not_interested: {
    label: "غير مهتم",
    icon: XCircle,
    cls: "bg-muted text-muted-foreground border-border hover:bg-muted/80",
    dot: "bg-muted-foreground",
  },
  won: {
    label: "تم البيع",
    icon: Trophy,
    cls: "bg-emerald-500/15 text-emerald-700 border-emerald-200 hover:bg-emerald-500/25",
    dot: "bg-emerald-500",
  },
};

// Quick-action templates per stage — verbs the staff member is most likely to do next.
type QuickAction = {
  label: string;
  icon: typeof Phone;
  build: (ctx: { phone: string | null; name: string | null }) => string | null;
  kind: "call" | "whatsapp" | "reminder" | "note";
};

const QUICK_ACTIONS: Record<PipelineStage, QuickAction[]> = {
  new: [
    {
      label: "مكالمة ترحيب",
      icon: Phone,
      kind: "call",
      build: ({ phone }) => (phone ? `tel:${phone}` : null),
    },
    {
      label: "واتساب: تعريف بالشركة",
      icon: MessageCircle,
      kind: "whatsapp",
      build: ({ phone, name }) =>
        phone
          ? `https://wa.me/${phone.replace(/^0/, "20").replace(/[^\d]/g, "")}?text=${encodeURIComponent(
              `أهلاً ${name || ""}، معاك المصرية جروب — موزع رسمي قطع غيار تويوتا الأصلية. شكراً لزيارتك موقعنا، حابب أساعدك في إيه؟`
            )}`
          : null,
    },
  ],
  interested: [
    {
      label: "اتصال متابعة",
      icon: Phone,
      kind: "call",
      build: ({ phone }) => (phone ? `tel:${phone}` : null),
    },
    {
      label: "واتساب: عرض المنتجات",
      icon: MessageCircle,
      kind: "whatsapp",
      build: ({ phone, name }) =>
        phone
          ? `https://wa.me/${phone.replace(/^0/, "20").replace(/[^\d]/g, "")}?text=${encodeURIComponent(
              `أهلاً ${name || ""}، لاحظنا اهتمامك بمنتجاتنا. تحب أبعتلك تفاصيل أكتر أو عرض سعر؟`
            )}`
          : null,
    },
  ],
  quote_sent: [
    {
      label: "متابعة العرض",
      icon: Phone,
      kind: "call",
      build: ({ phone }) => (phone ? `tel:${phone}` : null),
    },
    {
      label: "واتساب: تأكيد الاستلام",
      icon: MessageCircle,
      kind: "whatsapp",
      build: ({ phone, name }) =>
        phone
          ? `https://wa.me/${phone.replace(/^0/, "20").replace(/[^\d]/g, "")}?text=${encodeURIComponent(
              `أهلاً ${name || ""}، حابب أتأكد إن عرض السعر وصلك. لو محتاج توضيح في أي بند أنا تحت أمرك.`
            )}`
          : null,
    },
  ],
  contacted: [
    {
      label: "اتصال إعادة محاولة",
      icon: Phone,
      kind: "call",
      build: ({ phone }) => (phone ? `tel:${phone}` : null),
    },
    {
      label: "واتساب: تذكير لطيف",
      icon: MessageCircle,
      kind: "whatsapp",
      build: ({ phone, name }) =>
        phone
          ? `https://wa.me/${phone.replace(/^0/, "20").replace(/[^\d]/g, "")}?text=${encodeURIComponent(
              `أهلاً ${name || ""}، عاوز أتأكد إن طلبك ماشي تمام. لو محتاج أي مساعدة أنا هنا.`
            )}`
          : null,
    },
  ],
  not_interested: [
    {
      label: "ملاحظة سبب",
      icon: StickyNote,
      kind: "note",
      build: () => null,
    },
  ],
  won: [
    {
      label: "واتساب: شكر بعد البيع",
      icon: MessageCircle,
      kind: "whatsapp",
      build: ({ phone, name }) =>
        phone
          ? `https://wa.me/${phone.replace(/^0/, "20").replace(/[^\d]/g, "")}?text=${encodeURIComponent(
              `أهلاً ${name || ""}، شكراً لثقتك في المصرية جروب. لو احتجت أي شيء بعد البيع، احنا هنا.`
            )}`
          : null,
    },
  ],
};

interface Props {
  userId: string | null;
  sessionKey: string | null;
  phone: string | null;
  fullName: string | null;
  /** Optional callback so parent can refresh totals when stage changes. */
  onChange?: (next: PipelineStage) => void;
}

/**
 * Inline pipeline control for visitor cards on Staff Home.
 *
 * Renders a colored badge of the current stage. Clicking opens a popover with:
 *   1. Stage picker (one tap to advance/regress)
 *   2. Quick-action buttons tailored to the active stage (call / whatsapp / note)
 *   3. Free-text note that's saved alongside the stage
 *
 * State is persisted to `visitor_pipeline_status` keyed by user_id (registered
 * visitors) or session_key (anonymous). Upserts use the matching unique index.
 */
export default function VisitorPipelineControl({
  userId,
  sessionKey,
  phone,
  fullName,
  onChange,
}: Props) {
  const { user } = useAuth();
  const [stage, setStage] = useState<PipelineStage>("new");
  const [notes, setNotes] = useState("");
  const [draftNotes, setDraftNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);

  // Load existing status on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!userId && !sessionKey) {
        setLoading(false);
        return;
      }
      const q = supabase.from("visitor_pipeline_status").select("stage, notes");
      const { data, error } = userId
        ? await q.eq("customer_user_id", userId).maybeSingle()
        : await q.eq("visitor_session_key", sessionKey!).is("customer_user_id", null).maybeSingle();
      if (cancelled) return;
      if (!error && data) {
        setStage(data.stage as PipelineStage);
        setNotes(data.notes || "");
        setDraftNotes(data.notes || "");
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, sessionKey]);

  const persist = async (nextStage: PipelineStage, nextNotes: string) => {
    if (!user?.id) {
      toast.error("لازم تسجّل دخول كموظف أولاً");
      return false;
    }
    if (!userId && !sessionKey) {
      toast.error("لا يمكن تحديد الزائر");
      return false;
    }
    setSaving(true);

    // Manual upsert: the unique indexes on this table are PARTIAL
    // (filtered with WHERE clauses), so PostgREST's onConflict can't match
    // them. We do find-then-update / insert ourselves to stay compatible.
    const findQ = supabase
      .from("visitor_pipeline_status")
      .select("id")
      .limit(1);
    const { data: existing, error: findErr } = userId
      ? await findQ.eq("customer_user_id", userId).maybeSingle()
      : await findQ
          .eq("visitor_session_key", sessionKey!)
          .is("customer_user_id", null)
          .maybeSingle();

    if (findErr) {
      console.error("[VisitorPipelineControl] lookup failed", findErr);
      toast.error("فشل قراءة الحالة الحالية");
      setSaving(false);
      return false;
    }

    let error;
    if (existing?.id) {
      ({ error } = await supabase
        .from("visitor_pipeline_status")
        .update({
          stage: nextStage,
          notes: nextNotes || null,
          updated_by: user.id,
        })
        .eq("id", existing.id));
    } else {
      ({ error } = await supabase.from("visitor_pipeline_status").insert({
        customer_user_id: userId,
        visitor_session_key: userId ? null : sessionKey,
        stage: nextStage,
        notes: nextNotes || null,
        updated_by: user.id,
      }));
    }
    setSaving(false);
    if (error) {
      console.error("[VisitorPipelineControl] save failed", error);
      toast.error(`فشل حفظ الحالة: ${error.message}`);
      return false;
    }
    return true;
  };

  const handleStageChange = async (next: PipelineStage) => {
    const prev = stage;
    setStage(next); // optimistic
    const ok = await persist(next, notes);
    if (!ok) {
      setStage(prev);
      return;
    }
    toast.success(`الحالة: ${STAGE_META[next].label}`);
    onChange?.(next);
  };

  const handleSaveNotes = async () => {
    const ok = await persist(stage, draftNotes);
    if (ok) {
      setNotes(draftNotes);
      toast.success("الملاحظة اتحفظت");
    }
  };

  // Insert a quick communication log row — used by call/whatsapp/reminder buttons
  // so every contact action is auditable, not just the stage change.
  const logCommunication = async (
    commType: "phone" | "whatsapp" | "note",
    note: string,
    reminderMinutes?: number
  ) => {
    if (!user?.id) return;
    const reminderAt =
      reminderMinutes != null
        ? new Date(Date.now() + reminderMinutes * 60_000).toISOString()
        : null;
    await supabase.from("customer_communications").insert({
      customer_user_id: userId,
      visitor_session_key: userId ? null : sessionKey,
      staff_user_id: user.id,
      comm_type: commType,
      note,
      reminder_at: reminderAt,
    });
  };

  if (loading) {
    return (
      <Badge variant="outline" className="text-[10px] h-5 gap-1 opacity-60">
        <Loader2 className="w-3 h-3 animate-spin" />
        تحميل…
      </Badge>
    );
  }

  const meta = STAGE_META[stage];
  const StageIcon = meta.icon;
  const actions = QUICK_ACTIONS[stage];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[10px] font-bold transition cursor-pointer",
            meta.cls
          )}
          title="تغيير حالة الزائر + تنفيذ سريع"
        >
          <span className={cn("w-1.5 h-1.5 rounded-full", meta.dot)} />
          <StageIcon className="w-3 h-3" />
          {meta.label}
          <ChevronDown className="w-3 h-3 opacity-70" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        side="bottom"
        className="w-80 p-3 z-[110] pointer-events-auto"
        dir="rtl"
      >
        {/* ── Stage picker ──────────────────────────────────────────────── */}
        <div className="space-y-1.5">
          <p className="text-[11px] font-bold text-muted-foreground">حالة الزائر</p>
          <div className="grid grid-cols-2 gap-1.5">
            {(Object.keys(STAGE_META) as PipelineStage[]).map((s) => {
              const m = STAGE_META[s];
              const Icon = m.icon;
              const active = s === stage;
              return (
                <button
                  key={s}
                  type="button"
                  disabled={saving}
                  onClick={() => handleStageChange(s)}
                  className={cn(
                    "flex items-center gap-1.5 px-2 py-1.5 rounded border text-[11px] font-medium transition text-right",
                    active ? m.cls + " ring-2 ring-offset-1 ring-current" : "hover:bg-muted",
                    saving && "opacity-60 cursor-wait"
                  )}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{m.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Quick actions for current stage ───────────────────────────── */}
        {actions.length > 0 && (
          <div className="mt-3 pt-3 border-t space-y-1.5">
            <p className="text-[11px] font-bold text-muted-foreground">
              تنفيذ سريع لهذه الحالة
            </p>
            <div className="flex flex-col gap-1.5">
              {actions.map((a, i) => {
                const url = a.build({ phone, name: fullName });
                const ActionIcon = a.icon;
                const disabled = a.kind !== "note" && !url;
                if (a.kind === "note") {
                  return null; // note is handled by the textarea below
                }
                return (
                  <Button
                    key={i}
                    asChild={!disabled}
                    size="sm"
                    variant="outline"
                    disabled={disabled}
                    className="h-8 text-xs justify-start gap-2"
                    onClick={() => {
                      if (!disabled) {
                        logCommunication(
                          a.kind === "whatsapp" ? "whatsapp" : "phone",
                          `${a.label}${notes ? ` — ${notes}` : ""}`
                        );
                      }
                    }}
                  >
                    {disabled ? (
                      <span>
                        <ActionIcon className="w-3.5 h-3.5" />
                        {a.label} (لا يوجد رقم)
                      </span>
                    ) : (
                      <a href={url!} target={a.kind === "whatsapp" ? "_blank" : undefined} rel="noreferrer">
                        <ActionIcon className="w-3.5 h-3.5" />
                        {a.label}
                      </a>
                    )}
                  </Button>
                );
              })}
              {/* Universal: schedule a reminder for tomorrow */}
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs justify-start gap-2"
                onClick={async () => {
                  await logCommunication("note", `متابعة (${meta.label})`, 24 * 60);
                  toast.success("تذكير بكرة في نفس الميعاد");
                }}
              >
                <CalendarClock className="w-3.5 h-3.5" />
                تذكير بكرة لمتابعة هذا العميل
              </Button>
            </div>
          </div>
        )}

        {/* ── Notes ──────────────────────────────────────────────────────── */}
        <div className="mt-3 pt-3 border-t space-y-1.5">
          <p className="text-[11px] font-bold text-muted-foreground flex items-center gap-1">
            <StickyNote className="w-3 h-3" />
            ملاحظة على الحالة
          </p>
          <Textarea
            value={draftNotes}
            onChange={(e) => setDraftNotes(e.target.value)}
            placeholder="مثال: طلب عرض على فلاتر تويوتا كامري 2018"
            rows={2}
            className="text-xs"
            dir="rtl"
          />
          <div className="flex gap-1.5 justify-end">
            {draftNotes !== notes && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-[11px]"
                onClick={() => setDraftNotes(notes)}
              >
                تراجع
              </Button>
            )}
            <Button
              size="sm"
              className="h-7 text-[11px]"
              disabled={saving || draftNotes === notes}
              onClick={handleSaveNotes}
            >
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : "حفظ الملاحظة"}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
