import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Bell, BellRing, CheckCircle2, Clock, ExternalLink, Phone, MessageCircle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { formatDistanceToNow, format, isPast, isToday, isTomorrow } from "date-fns";
import { ar } from "date-fns/locale";

interface Reminder {
  id: string;
  customer_user_id: string | null;
  visitor_session_key: string | null;
  staff_user_id: string;
  comm_type: string;
  note: string | null;
  reminder_at: string;
  is_done: boolean;
  created_at: string;
  // Hydrated client-side
  customer_name?: string | null;
  customer_phone?: string | null;
}

interface Props {
  /** When provided, only show reminders this staff created. Default: all staff. */
  staffOnly?: boolean;
  /** Show maximum N rows (with "view more" link). Default: 5. */
  limit?: number;
}

const StaffRemindersPanel = ({ staffOnly = true, limit = 5 }: Props) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReminders = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      let query = supabase
        .from("customer_communications")
        .select("id, customer_user_id, visitor_session_key, staff_user_id, comm_type, note, reminder_at, is_done, created_at")
        .not("reminder_at", "is", null)
        .eq("is_done", false)
        .order("reminder_at", { ascending: true })
        .limit(limit + 1);

      if (staffOnly) query = query.eq("staff_user_id", user.id);

      const { data, error } = await query;
      if (error) throw error;

      // Hydrate customer names from profiles
      const userIds = Array.from(new Set((data || []).map((r) => r.customer_user_id).filter(Boolean) as string[]));
      const profiles = userIds.length
        ? (await supabase.from("profiles").select("user_id, full_name, phone").in("user_id", userIds)).data || []
        : [];
      const profileMap = new Map(profiles.map((p) => [p.user_id, p]));

      const hydrated: Reminder[] = (data || []).map((r) => {
        const profile = r.customer_user_id ? profileMap.get(r.customer_user_id) : null;
        return {
          ...r,
          customer_name: profile?.full_name || null,
          customer_phone: profile?.phone || null,
        };
      });
      setReminders(hydrated);
    } catch (e) {
      console.error("[Reminders] fetch error", e);
    } finally {
      setLoading(false);
    }
  }, [user, staffOnly, limit]);

  useEffect(() => {
    fetchReminders();
    // Auto-refresh every 60s so reminders that come due appear without page reload
    const t = setInterval(fetchReminders, 60_000);
    return () => clearInterval(t);
  }, [fetchReminders]);

  const markDone = async (id: string) => {
    try {
      const { error } = await supabase
        .from("customer_communications")
        .update({ is_done: true, done_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      setReminders((p) => p.filter((r) => r.id !== id));
      toast({ title: "✓ تم تعليم التذكير كمنفّذ" });
    } catch (e: any) {
      toast({ title: "فشل تحديث التذكير", description: e.message, variant: "destructive" });
    }
  };

  const formatDue = (iso: string) => {
    const d = new Date(iso);
    if (isPast(d)) {
      return { text: `متأخر · ${formatDistanceToNow(d, { locale: ar })}`, severity: "overdue" as const };
    }
    if (isToday(d)) return { text: `اليوم · ${format(d, "HH:mm")}`, severity: "today" as const };
    if (isTomorrow(d)) return { text: `بكرة · ${format(d, "HH:mm")}`, severity: "soon" as const };
    return { text: format(d, "EEEE d MMM · HH:mm", { locale: ar }), severity: "later" as const };
  };

  const overdueCount = reminders.filter((r) => isPast(new Date(r.reminder_at))).length;
  const visibleReminders = reminders.slice(0, limit);
  const hasMore = reminders.length > limit;

  if (loading) {
    return (
      <Card className="p-4 space-y-2">
        <Skeleton className="h-5 w-40" />
        {[...Array(2)].map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </Card>
    );
  }

  return (
    <Card className={cn(
      "overflow-hidden border",
      overdueCount > 0 ? "border-red-300 bg-gradient-to-l from-red-50/50 to-transparent dark:from-red-950/20 dark:border-red-900" : "border-border/60"
    )}>
      <div className="px-4 py-3 flex items-center justify-between border-b border-border/60">
        <div className="flex items-center gap-2">
          {overdueCount > 0 ? (
            <BellRing className="w-4 h-4 text-red-600 animate-pulse" />
          ) : (
            <Bell className="w-4 h-4 text-primary" />
          )}
          <h3 className="text-sm font-bold">
            {staffOnly ? "تذكيراتي" : "تذكيرات الفريق"}
          </h3>
          <Badge variant={overdueCount > 0 ? "destructive" : "secondary"} className="text-[10px]">
            {reminders.length}
          </Badge>
          {overdueCount > 0 && (
            <Badge variant="destructive" className="text-[10px] gap-1">
              <AlertCircle className="w-3 h-3" />
              {overdueCount} متأخر
            </Badge>
          )}
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-xs"
          onClick={() => fetchReminders()}
        >
          تحديث
        </Button>
      </div>

      {visibleReminders.length === 0 ? (
        <div className="p-6 text-center text-xs text-muted-foreground">
          <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-40 text-emerald-500" />
          مفيش تذكيرات نشطة — كل المتابعات مكتملة 🎉
        </div>
      ) : (
        <div className="divide-y divide-border/40">
          {visibleReminders.map((r) => {
            const due = formatDue(r.reminder_at);
            const customerLabel = r.customer_name || (r.customer_phone ? `📱 ${r.customer_phone}` : "زائر مجهول");
            return (
              <div
                key={r.id}
                className={cn(
                  "px-4 py-2.5 flex items-center gap-3 hover:bg-muted/30 transition-colors",
                  due.severity === "overdue" && "bg-red-50/50 dark:bg-red-950/10"
                )}
              >
                <div className="shrink-0">
                  <Clock className={cn(
                    "w-4 h-4",
                    due.severity === "overdue" && "text-red-600",
                    due.severity === "today" && "text-amber-600",
                    due.severity === "soon" && "text-blue-600",
                    due.severity === "later" && "text-muted-foreground",
                  )} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium truncate">{customerLabel}</span>
                    <span
                      className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded font-medium",
                        due.severity === "overdue" && "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
                        due.severity === "today" && "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
                        due.severity === "soon" && "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
                        due.severity === "later" && "bg-muted text-muted-foreground",
                      )}
                    >
                      {due.text}
                    </span>
                  </div>
                  {r.note && (
                    <div className="text-[11px] text-muted-foreground truncate mt-0.5">{r.note}</div>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {r.customer_phone && (
                    <>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="w-7 h-7 text-emerald-600"
                        title="اتصال"
                        onClick={() => window.open(`tel:${r.customer_phone}`)}
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="w-7 h-7 text-green-600"
                        title="واتساب"
                        onClick={() => window.open(`https://wa.me/${r.customer_phone?.replace(/\D/g, "")}`)}
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                      </Button>
                    </>
                  )}
                  {r.customer_user_id && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="w-7 h-7"
                      title="فتح ملف الزائر"
                      onClick={() => navigate(`/admin/visitor/${r.customer_user_id}`)}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-[11px] gap-1"
                    onClick={() => markDone(r.id)}
                    title="تم التنفيذ"
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    تم
                  </Button>
                </div>
              </div>
            );
          })}
          {hasMore && (
            <div className="px-4 py-2 text-center bg-muted/20">
              <span className="text-[11px] text-muted-foreground">+{reminders.length - limit} تذكيرات أخرى</span>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};

export default StaffRemindersPanel;
