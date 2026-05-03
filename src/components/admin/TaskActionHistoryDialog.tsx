import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { History, Phone, MessageCircle, CheckCircle2, StickyNote, Loader2, User, Filter, X, ArrowDownWideNarrow, ArrowUpNarrowWide } from "lucide-react";
import { cn } from "@/lib/utils";
import { StaffInfoDialog } from "./StaffInfoDialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

interface ActionLogRow {
  id: string;
  task_id: string;
  staff_user_id: string;
  staff_name: string | null;
  action: string;
  note: string | null;
  created_at: string;
}

interface Props {
  taskId: string | null;
  taskTitle?: string;
  customerName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ACTION_META: Record<string, { label: string; icon: any; cls: string }> = {
  call: { label: "اتصال", icon: Phone, cls: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-300/60" },
  whatsapp: { label: "واتساب", icon: MessageCircle, cls: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-300/60" },
  done: { label: "تم", icon: CheckCircle2, cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-300/60" },
  note: { label: "ملاحظة", icon: StickyNote, cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-300/60" },
  outcome: { label: "نتيجة مكالمة", icon: StickyNote, cls: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-300/60" },
  manual: { label: "يدوي", icon: CheckCircle2, cls: "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400 border-slate-300/60" },
};

export function TaskActionHistoryDialog({ taskId, taskTitle, customerName, open, onOpenChange }: Props) {
  const [rows, setRows] = useState<ActionLogRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [staffOpen, setStaffOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<{ id: string; name: string | null } | null>(null);

  useEffect(() => {
    if (!open || !taskId) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from("staff_task_action_log" as any)
        .select("id, task_id, staff_user_id, staff_name, action, note, created_at")
        .eq("task_id", taskId)
        .order("created_at", { ascending: false });
      if (!cancelled) {
        setRows((data as any) || []);
        setLoading(false);
      }
    })();

    const ch = supabase
      .channel(`task_action_log_${taskId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "staff_task_action_log", filter: `task_id=eq.${taskId}` },
        (payload: any) => {
          setRows((prev) => [payload.new as ActionLogRow, ...prev]);
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(ch);
    };
  }, [open, taskId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <History className="w-4 h-4 text-primary" />
            سجل الإجراءات على المهمة
          </DialogTitle>
          {(taskTitle || customerName) && (
            <div className="text-xs text-muted-foreground space-y-0.5 pt-1">
              {customerName && <div className="font-semibold">العميل: <span className="text-foreground">{customerName}</span></div>}
              {taskTitle && <div>المهمة: <span className="text-foreground">{taskTitle}</span></div>}
            </div>
          )}
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-10 text-sm text-muted-foreground">
            لا توجد إجراءات مسجلة على هذه المهمة بعد.
          </div>
        ) : (
          <div className="space-y-2 mt-2">
            <div className="text-[11px] text-muted-foreground font-semibold mb-2">
              إجمالي {rows.length} إجراء — الأحدث أولاً
            </div>
            {rows.map((row, idx) => {
              const meta = ACTION_META[row.action] || { label: row.action, icon: CheckCircle2, cls: "bg-muted text-muted-foreground border-border" };
              const Icon = meta.icon;
              const isLatest = idx === 0;
              return (
                <div
                  key={row.id}
                  className={cn(
                    "rounded-lg border p-3 flex gap-3 transition-all",
                    isLatest ? "bg-primary/5 border-primary/30 shadow-sm" : "bg-card border-border/50"
                  )}
                >
                  <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0 border", meta.cls)}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border", meta.cls)}>
                          {meta.label}
                        </span>
                        {isLatest && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-primary text-primary-foreground">
                            الأحدث
                          </span>
                        )}
                      </div>
                      <time className="text-[10px] text-muted-foreground tabular-nums">
                        {format(new Date(row.created_at), "dd MMM • HH:mm", { locale: ar })}
                      </time>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1.5 text-xs">
                      <User className="w-3 h-3 text-muted-foreground" />
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedStaff({ id: row.staff_user_id, name: row.staff_name });
                          setStaffOpen(true);
                        }}
                        className="font-semibold text-primary hover:underline underline-offset-2 transition-colors"
                      >
                        {row.staff_name || "موظف"}
                      </button>
                      <span className="text-[10px] text-muted-foreground">(اضغط للتفاصيل)</span>
                    </div>
                    {row.note && (
                      <div className="mt-2 text-xs text-foreground bg-muted/40 rounded p-2 whitespace-pre-wrap leading-relaxed">
                        {row.note}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>

      <StaffInfoDialog
        staffUserId={selectedStaff?.id || null}
        fallbackName={selectedStaff?.name || null}
        open={staffOpen}
        onOpenChange={setStaffOpen}
      />
    </Dialog>
  );
}
