import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ListChecks,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  ShoppingCart,
  Package,
  UserCheck,
  Flame,
  ExternalLink,
  Phone,
  MessageCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

/**
 * StaffAutoTasksPanel
 *
 * يولّد مهام يومية تلقائياً للموظف مبنية على حالات النظام الحقيقية:
 *  1. متابعة عرض السعر (Quote) لم يُحوّل لطلب خلال 24 ساعة.
 *  2. طلبات معلّقة (pending) لم يتم التواصل مع عميلها (first_contacted_at IS NULL) > 2 ساعة.
 *  3. سلات مهجورة: تاجر أضاف منتجات للسلة من >6 ساعات ولم يطلب.
 *  4. طلبات تجار جديدة (dealer_applications) بحالة pending.
 *
 * كل مهمة لها زرّان:
 *  - "تم": يُسجّل تواصل في customer_communications + يُخفي المهمة (اختيارياً يضع
 *          first_contacted_at على الطلب المرتبط) — تتم إعادة الاحتساب فوراً.
 *  - "أجّل": يفتح اختيار سريع (1س/3س/غدًا) فيُنشئ تذكير في customer_communications.reminder_at.
 *
 * المهام محسوبة عميل-جانب من جدوال موجودة دون أي migration جديد. الإخفاء يعتمد
 * على وجود سجل تواصل أو تذكير معلّق لنفس العميل أنشأه نفس الموظف اليوم.
 */

type TaskKind = "quote_followup" | "pending_order" | "abandoned_cart" | "dealer_application";

interface AutoTask {
  id: string; // synthetic stable id (kind:refId)
  kind: TaskKind;
  refId: string; // DB row id (quote/order/cart-user/application)
  customerUserId: string | null;
  customerName: string | null;
  customerPhone: string | null;
  title: string;
  subtitle: string;
  agedAtIso: string; // when the underlying state started aging
  severity: "high" | "medium" | "low";
  href?: string;
  amount?: number;
}

interface DismissedRow {
  customer_user_id: string | null;
  staff_user_id: string;
  comm_type: string;
  is_done: boolean;
  reminder_at: string | null;
  created_at: string;
}

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

// Derive how stale a task is (used for severity coloring)
const ageSeverity = (iso: string, threshold: number): "high" | "medium" | "low" => {
  const age = Date.now() - new Date(iso).getTime();
  if (age >= threshold * 2) return "high";
  if (age >= threshold) return "medium";
  return "low";
};

const kindMeta: Record<TaskKind, { label: string; icon: any; color: string }> = {
  quote_followup: { label: "متابعة عرض سعر", icon: FileText, color: "text-violet-600" },
  pending_order: { label: "طلب لم يُتواصل", icon: Package, color: "text-red-600" },
  abandoned_cart: { label: "سلة مهجورة", icon: ShoppingCart, color: "text-amber-600" },
  dealer_application: { label: "طلب تاجر جديد", icon: UserCheck, color: "text-blue-600" },
};

const StaffAutoTasksPanel = ({ limit = 8 }: { limit?: number }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<AutoTask[]>([]);
  const [dismissedKeys, setDismissedKeys] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Compute dismissal key — "kind:refId" — ensures both Done and Snooze remove the task.
  const taskKey = (t: { kind: TaskKind; refId: string }) => `${t.kind}:${t.refId}`;

  const fetchTasks = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const nowMs = Date.now();
      const dayStart = new Date();
      dayStart.setHours(0, 0, 0, 0);

      // Parallel fetches — all read-only queries
      const [quotesRes, ordersRes, cartRes, appsRes, dismissedRes] = await Promise.all([
        // 1) Quotes draft/sent older than 24h
        supabase
          .from("dealer_quotes")
          .select("id, user_id, quote_number, total_amount, status, created_at, updated_at")
          .in("status", ["draft", "sent"])
          .lt("created_at", new Date(nowMs - TWENTY_FOUR_HOURS_MS).toISOString())
          .order("created_at", { ascending: true })
          .limit(50),
        // 2) Pending orders not yet contacted, aged > 2h
        supabase
          .from("orders")
          .select("id, user_id, order_number, total_amount, status, created_at, first_contacted_at")
          .in("status", ["pending", "pending_approval", "confirmed"])
          .is("first_contacted_at", null)
          .lt("created_at", new Date(nowMs - TWO_HOURS_MS).toISOString())
          .order("created_at", { ascending: true })
          .limit(50),
        // 3) Cart items aged > 6h
        supabase
          .from("dealer_cart_items")
          .select("user_id, created_at, quantity")
          .lt("created_at", new Date(nowMs - SIX_HOURS_MS).toISOString())
          .order("created_at", { ascending: false })
          .limit(200),
        // 4) Pending dealer applications
        supabase
          .from("dealer_applications")
          .select("id, user_id, business_name, phone, status, created_at")
          .eq("status", "pending")
          .order("created_at", { ascending: true })
          .limit(50),
        // Dismissed today: communications by THIS staff today (done OR with future reminder)
        supabase
          .from("customer_communications")
          .select("customer_user_id, staff_user_id, comm_type, is_done, reminder_at, created_at, note")
          .eq("staff_user_id", user.id)
          .gte("created_at", dayStart.toISOString())
          .limit(500),
      ]);

      // Build dismissed-keys set: a task is dismissed if THIS staff today either
      // marked-done (is_done=true) or scheduled a future reminder for the same
      // customer with a note containing "auto-task:<key>".
      const dismissed = new Set<string>();
      const dismissRows = (dismissedRes.data || []) as Array<DismissedRow & { note: string | null }>;
      for (const row of dismissRows) {
        const note = row.note || "";
        const m = note.match(/auto-task:([^\s]+)/);
        if (m) dismissed.add(m[1]);
      }
      setDismissedKeys(dismissed);

      // Buyer user_ids who already ordered today — used to drop their cart task
      const recentBuyers = new Set(
        (ordersRes.data || [])
          .filter((o: any) => new Date(o.created_at).getTime() >= nowMs - 24 * 60 * 60 * 1000)
          .map((o: any) => o.user_id)
      );

      // Aggregate cart by user (only oldest add per user, skip recent buyers)
      const cartByUser = new Map<string, { user_id: string; oldest: string; items: number }>();
      for (const c of cartRes.data || []) {
        if (!c.user_id || recentBuyers.has(c.user_id)) continue;
        const cur = cartByUser.get(c.user_id);
        if (cur) {
          cur.items += 1;
          if (c.created_at < cur.oldest) cur.oldest = c.created_at;
        } else {
          cartByUser.set(c.user_id, { user_id: c.user_id, oldest: c.created_at, items: 1 });
        }
      }

      // Hydrate profiles for all involved user_ids
      const allUserIds = new Set<string>();
      (quotesRes.data || []).forEach((q: any) => q.user_id && allUserIds.add(q.user_id));
      (ordersRes.data || []).forEach((o: any) => o.user_id && allUserIds.add(o.user_id));
      cartByUser.forEach((c) => allUserIds.add(c.user_id));
      (appsRes.data || []).forEach((a: any) => a.user_id && allUserIds.add(a.user_id));

      const profilesRes = allUserIds.size
        ? await supabase.from("profiles").select("user_id, full_name, phone").in("user_id", Array.from(allUserIds))
        : { data: [] };
      const profileMap = new Map(((profilesRes as any).data || []).map((p: any) => [p.user_id, p]));

      const out: AutoTask[] = [];

      // 1. Quote follow-ups
      for (const q of quotesRes.data || []) {
        const p = profileMap.get(q.user_id) as any;
        out.push({
          id: `quote_followup:${q.id}`,
          kind: "quote_followup",
          refId: q.id,
          customerUserId: q.user_id,
          customerName: p?.full_name || null,
          customerPhone: p?.phone || null,
          title: `عرض سعر ${q.quote_number || "#"} بانتظار المتابعة`,
          subtitle: `الإجمالي ${Number(q.total_amount || 0).toLocaleString("ar-EG")} ج.م · مرّ ${formatDistanceToNow(new Date(q.created_at), { locale: ar })}`,
          agedAtIso: q.created_at,
          severity: ageSeverity(q.created_at, TWENTY_FOUR_HOURS_MS),
          amount: Number(q.total_amount || 0),
          href: `/admin/orders`,
        });
      }

      // 2. Pending orders not contacted
      for (const o of ordersRes.data || []) {
        const p = profileMap.get(o.user_id) as any;
        out.push({
          id: `pending_order:${o.id}`,
          kind: "pending_order",
          refId: o.id,
          customerUserId: o.user_id,
          customerName: p?.full_name || null,
          customerPhone: p?.phone || null,
          title: `طلب ${o.order_number} لم يُتواصل مع العميل`,
          subtitle: `${Number(o.total_amount || 0).toLocaleString("ar-EG")} ج.م · مرّ ${formatDistanceToNow(new Date(o.created_at), { locale: ar })}`,
          agedAtIso: o.created_at,
          severity: ageSeverity(o.created_at, TWO_HOURS_MS),
          amount: Number(o.total_amount || 0),
          href: `/admin/orders`,
        });
      }

      // 3. Abandoned carts
      for (const c of cartByUser.values()) {
        const p = profileMap.get(c.user_id) as any;
        out.push({
          id: `abandoned_cart:${c.user_id}`,
          kind: "abandoned_cart",
          refId: c.user_id,
          customerUserId: c.user_id,
          customerName: p?.full_name || null,
          customerPhone: p?.phone || null,
          title: `سلة مهجورة (${c.items} صنف)`,
          subtitle: `أُضيف من ${formatDistanceToNow(new Date(c.oldest), { locale: ar })} ولم يتم الطلب`,
          agedAtIso: c.oldest,
          severity: ageSeverity(c.oldest, SIX_HOURS_MS),
          href: `/admin/visitor/${c.user_id}`,
        });
      }

      // 4. Pending dealer applications
      for (const a of appsRes.data || []) {
        const p = profileMap.get(a.user_id) as any;
        out.push({
          id: `dealer_application:${a.id}`,
          kind: "dealer_application",
          refId: a.id,
          customerUserId: a.user_id,
          customerName: p?.full_name || a.business_name || null,
          customerPhone: p?.phone || a.phone || null,
          title: `طلب تاجر جديد: ${a.business_name}`,
          subtitle: `بانتظار المراجعة منذ ${formatDistanceToNow(new Date(a.created_at), { locale: ar })}`,
          agedAtIso: a.created_at,
          severity: ageSeverity(a.created_at, TWENTY_FOUR_HOURS_MS),
          href: `/admin`,
        });
      }

      // Sort: high severity first, then oldest first
      out.sort((a, b) => {
        const sevRank = { high: 0, medium: 1, low: 2 } as const;
        if (sevRank[a.severity] !== sevRank[b.severity]) return sevRank[a.severity] - sevRank[b.severity];
        return new Date(a.agedAtIso).getTime() - new Date(b.agedAtIso).getTime();
      });

      setTasks(out);
    } catch (e: any) {
      console.error("[AutoTasks] fetch error", e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchTasks();
    const t = setInterval(fetchTasks, 90_000); // refresh every 90s
    return () => clearInterval(t);
  }, [fetchTasks]);

  // Mark a task as done — write a customer_communications record tagged with the task key
  const handleDone = async (t: AutoTask) => {
    if (!user || busyId) return;
    setBusyId(t.id);
    try {
      const key = taskKey(t);
      const { error } = await supabase.from("customer_communications").insert({
        staff_user_id: user.id,
        customer_user_id: t.customerUserId,
        comm_type: "auto_task",
        is_done: true,
        done_at: new Date().toISOString(),
        note: `auto-task:${key} · ${t.title}`,
      });
      if (error) throw error;

      // Side effect: if this is a pending_order task, set first_contacted_at on the order
      if (t.kind === "pending_order") {
        await supabase
          .from("orders")
          .update({ first_contacted_at: new Date().toISOString() })
          .eq("id", t.refId);
      }

      setDismissedKeys((p) => new Set(p).add(key));
      setTasks((p) => p.filter((x) => x.id !== t.id));
      toast({ title: "✓ تم تنفيذ المهمة", description: t.title });
    } catch (e: any) {
      toast({ title: "تعذّر تسجيل المهمة", description: e.message, variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  // Snooze a task — write a reminder for +N hours
  const handleSnooze = async (t: AutoTask, hours: number) => {
    if (!user || busyId) return;
    setBusyId(t.id);
    try {
      const key = taskKey(t);
      const remindAt = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
      const { error } = await supabase.from("customer_communications").insert({
        staff_user_id: user.id,
        customer_user_id: t.customerUserId,
        comm_type: "auto_task",
        is_done: false,
        reminder_at: remindAt,
        note: `auto-task:${key} · مؤجل · ${t.title}`,
      });
      if (error) throw error;
      setDismissedKeys((p) => new Set(p).add(key));
      setTasks((p) => p.filter((x) => x.id !== t.id));
      toast({ title: `⏰ تم التأجيل ${hours} ساعة`, description: t.title });
    } catch (e: any) {
      toast({ title: "تعذّر التأجيل", description: e.message, variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  // Filter out tasks already dismissed today (defensive — also done client-side after action)
  const visibleTasks = useMemo(
    () => tasks.filter((t) => !dismissedKeys.has(taskKey(t))),
    [tasks, dismissedKeys]
  );

  const shownTasks = expanded ? visibleTasks : visibleTasks.slice(0, limit);
  const highCount = visibleTasks.filter((t) => t.severity === "high").length;

  if (loading) {
    return (
      <Card className="p-4 space-y-2">
        <Skeleton className="h-5 w-48" />
        {[...Array(2)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        "overflow-hidden border",
        highCount > 0
          ? "border-red-300 bg-gradient-to-l from-red-50/40 to-transparent dark:from-red-950/20 dark:border-red-900"
          : "border-border/60"
      )}
    >
      <div className="px-4 py-3 flex items-center justify-between border-b border-border/60">
        <div className="flex items-center gap-2 flex-wrap">
          <ListChecks className={cn("w-4 h-4", highCount > 0 ? "text-red-600" : "text-primary")} />
          <h3 className="text-sm font-bold">مهام اليوم التلقائية</h3>
          <Badge variant={highCount > 0 ? "destructive" : "secondary"} className="text-[10px]">
            {visibleTasks.length}
          </Badge>
          {highCount > 0 && (
            <Badge variant="destructive" className="text-[10px] gap-1">
              <AlertTriangle className="w-3 h-3" />
              {highCount} عاجل
            </Badge>
          )}
        </div>
        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={fetchTasks}>
          تحديث
        </Button>
      </div>

      {visibleTasks.length === 0 ? (
        <div className="p-6 text-center text-xs text-muted-foreground">
          <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-40 text-emerald-500" />
          مفيش مهام تلقائية النهاردة — كل الحالات تحت السيطرة 🎯
        </div>
      ) : (
        <>
          <div className="divide-y divide-border/40">
            {shownTasks.map((t) => {
              const meta = kindMeta[t.kind];
              const Icon = meta.icon;
              return (
                <div
                  key={t.id}
                  className={cn(
                    "px-4 py-3 flex items-start gap-3 hover:bg-muted/30 transition-colors",
                    t.severity === "high" && "bg-red-50/40 dark:bg-red-950/10"
                  )}
                >
                  <div
                    className={cn(
                      "shrink-0 w-8 h-8 rounded-lg flex items-center justify-center",
                      t.severity === "high"
                        ? "bg-red-100 dark:bg-red-900/30"
                        : t.severity === "medium"
                          ? "bg-amber-100 dark:bg-amber-900/30"
                          : "bg-muted"
                    )}
                  >
                    <Icon className={cn("w-4 h-4", meta.color)} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                        {meta.label}
                      </Badge>
                      {t.severity === "high" && (
                        <Badge variant="destructive" className="text-[10px] h-4 px-1.5 gap-1">
                          <Flame className="w-2.5 h-2.5" />
                          عاجل
                        </Badge>
                      )}
                      <span className="text-[10px] text-muted-foreground inline-flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {formatDistanceToNow(new Date(t.agedAtIso), { locale: ar })}
                      </span>
                    </div>
                    <div className="text-sm font-medium mt-0.5 truncate">{t.title}</div>
                    <div className="text-[11px] text-muted-foreground truncate">{t.subtitle}</div>
                    {(t.customerName || t.customerPhone) && (
                      <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
                        👤 {t.customerName || "—"}
                        {t.customerPhone ? ` · ${t.customerPhone}` : ""}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {t.customerPhone && (
                      <>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="w-7 h-7 text-emerald-600"
                          title="اتصال"
                          onClick={() => window.open(`tel:${t.customerPhone}`)}
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="w-7 h-7 text-green-600"
                          title="واتساب"
                          onClick={() =>
                            window.open(`https://wa.me/${t.customerPhone?.replace(/\D/g, "")}`)
                          }
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                        </Button>
                      </>
                    )}
                    {t.href && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="w-7 h-7"
                        title="فتح"
                        onClick={() => navigate(t.href!)}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-[11px] gap-1 text-amber-700 dark:text-amber-400"
                          disabled={busyId === t.id}
                        >
                          <Clock className="w-3 h-3" />
                          أجّل
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent align="end" className="w-44 p-1" dir="rtl">
                        <div className="text-[11px] text-muted-foreground px-2 py-1.5">تأجيل لـ:</div>
                        {[
                          { label: "ساعة", h: 1 },
                          { label: "3 ساعات", h: 3 },
                          { label: "بكرة الصبح", h: 16 },
                          { label: "بعد يومين", h: 48 },
                        ].map((o) => (
                          <button
                            key={o.h}
                            className="w-full text-right px-2 py-1.5 text-xs rounded hover:bg-muted transition-colors"
                            onClick={() => handleSnooze(t, o.h)}
                          >
                            {o.label}
                          </button>
                        ))}
                      </PopoverContent>
                    </Popover>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-[11px] gap-1"
                      onClick={() => handleDone(t)}
                      disabled={busyId === t.id}
                      title="تم التنفيذ"
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      تم
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
          {visibleTasks.length > limit && (
            <div className="px-4 py-2 text-center bg-muted/20 border-t border-border/40">
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-[11px] gap-1"
                onClick={() => setExpanded((v) => !v)}
              >
                {expanded ? (
                  <>
                    <ChevronUp className="w-3 h-3" /> تصغير
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3 h-3" /> عرض كل المهام ({visibleTasks.length})
                  </>
                )}
              </Button>
            </div>
          )}
        </>
      )}
    </Card>
  );
};

export default StaffAutoTasksPanel;
