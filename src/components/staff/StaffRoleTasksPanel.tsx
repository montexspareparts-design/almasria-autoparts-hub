import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Briefcase,
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
  ShieldCheck,
  CreditCard,
  Database,
  ClipboardList,
  TrendingDown,
  Users as UsersIcon,
  Bell,
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
 * StaffRoleTasksPanel
 *
 * لوحة مهام ديناميكية تعرض حتى 10 مهام مخصصة بناءً على دور الموظف:
 *  - admin (مشرف): مهام إشرافية (تجار جدد، إيصالات/مدفوعات معلّقة، تنبيهات ERP،
 *    موظفين بدون تقرير يومي، طلبات عالية القيمة معلّقة، تنبيهات مخزون).
 *  - moderator (مندوب/مبيعات): مهام تنفيذية (متابعة عروض أسعار، طلبات بدون
 *    تواصل، سلات مهجورة، Leads غير مُتابعة، جلسات نشطة طويلة بدون تواصل).
 *
 * الإخفاء يعتمد على وجود سجل auto-task مطابق للموظف نفسه.
 */

type StaffRole = "admin" | "moderator";

type RoleTaskKind =
  // --- Moderator (sales rep) tasks ---
  | "quote_followup"
  | "pending_order_contact"
  | "abandoned_cart"
  | "lead_followup"
  | "active_visitor_engage"
  // --- Admin (supervisor) tasks ---
  | "review_dealer_application"
  | "review_high_value_order"
  | "erp_sync_alert"
  | "staff_no_daily_report"
  | "stale_payment_transaction"
  | "stock_alert_pending";

interface RoleTask {
  id: string;
  kind: RoleTaskKind;
  refId: string;
  customerUserId: string | null;
  title: string;
  subtitle: string;
  agedAtIso: string;
  severity: "high" | "medium" | "low";
  href?: string;
  phone?: string | null;
  amount?: number;
}

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

/** SLA in hours per task kind. Tasks aged beyond this are flagged "متأخر/Breached". */
const KIND_META: Record<
  RoleTaskKind,
  {
    label: string;
    icon: typeof FileText;
    color: string;
    role: StaffRole | "both";
    /** SLA window — task is "on track" until this many hours pass. */
    slaHours: number;
  }
> = {
  // Moderator
  quote_followup: { label: "متابعة عرض سعر", icon: FileText, color: "text-blue-600", role: "moderator", slaHours: 24 },
  pending_order_contact: { label: "تواصل مع طلب جديد", icon: ShoppingCart, color: "text-amber-600", role: "moderator", slaHours: 4 },
  abandoned_cart: { label: "سلة مهجورة", icon: Package, color: "text-orange-600", role: "moderator", slaHours: 12 },
  lead_followup: { label: "متابعة Lead", icon: Flame, color: "text-rose-600", role: "moderator", slaHours: 24 },
  active_visitor_engage: { label: "زائر نشط الآن", icon: UsersIcon, color: "text-cyan-600", role: "moderator", slaHours: 1 },
  // Admin
  review_dealer_application: { label: "مراجعة طلب تاجر جديد", icon: UserCheck, color: "text-indigo-600", role: "admin", slaHours: 24 },
  review_high_value_order: { label: "اعتماد طلب عالي القيمة", icon: ShieldCheck, color: "text-purple-600", role: "admin", slaHours: 6 },
  erp_sync_alert: { label: "تنبيه مزامنة ERP", icon: Database, color: "text-red-600", role: "admin", slaHours: 12 },
  staff_no_daily_report: { label: "موظف بدون تقرير يومي", icon: ClipboardList, color: "text-amber-700", role: "admin", slaHours: 8 },
  stale_payment_transaction: { label: "معاملة دفع معلّقة", icon: CreditCard, color: "text-pink-600", role: "admin", slaHours: 12 },
  stock_alert_pending: { label: "تنبيه مخزون لم يُبلَّغ", icon: TrendingDown, color: "text-emerald-700", role: "admin", slaHours: 48 },
};

/**
 * SLA status derived from age vs SLA window:
 *  - on_track : age < 70% of SLA            (green)
 *  - warning  : 70% ≤ age < 100% of SLA     (amber)
 *  - breached : age ≥ SLA but < 24h         (red)
 *  - critical : age ≥ 24h regardless of SLA (red + pulse, dedicated banner)
 */
type SlaStatus = "on_track" | "warning" | "breached" | "critical";

interface SlaInfo {
  status: SlaStatus;
  ageHours: number;
  slaHours: number;
  /** 0..1 progress within SLA window (capped at 1). */
  progress: number;
  /** Human-readable remaining time (negative = overdue). */
  remainingLabel: string;
}

function computeSla(agedAtIso: string, slaHours: number): SlaInfo {
  const ageHrs = (Date.now() - new Date(agedAtIso).getTime()) / HOUR;
  const progress = Math.min(1, ageHrs / slaHours);
  let status: SlaStatus;
  if (ageHrs >= 24) status = "critical";
  else if (ageHrs >= slaHours) status = "breached";
  else if (ageHrs >= slaHours * 0.7) status = "warning";
  else status = "on_track";

  const remaining = slaHours - ageHrs;
  const remainingLabel =
    remaining >= 1
      ? `${Math.round(remaining)}س متبقية`
      : remaining >= 0
      ? `أقل من ساعة`
      : remaining > -24
      ? `متأخر ${Math.round(-remaining)}س`
      : `متأخر ${Math.round(-remaining / 24)} يوم`;

  return { status, ageHours: ageHrs, slaHours, progress, remainingLabel };
}

const SLA_STYLES: Record<SlaStatus, { bar: string; ring: string; cardBorder: string; cardBg: string; chip: string; chipText: string; pulse: boolean }> = {
  on_track: {
    bar: "bg-emerald-500",
    ring: "ring-emerald-200",
    cardBorder: "border-border",
    cardBg: "bg-card",
    chip: "bg-emerald-100 border-emerald-200",
    chipText: "text-emerald-800",
    pulse: false,
  },
  warning: {
    bar: "bg-amber-500",
    ring: "ring-amber-200",
    cardBorder: "border-amber-300",
    cardBg: "bg-amber-50/40",
    chip: "bg-amber-100 border-amber-200",
    chipText: "text-amber-800",
    pulse: false,
  },
  breached: {
    bar: "bg-red-500",
    ring: "ring-red-200",
    cardBorder: "border-red-300",
    cardBg: "bg-red-50/40",
    chip: "bg-red-100 border-red-200",
    chipText: "text-red-800",
    pulse: false,
  },
  critical: {
    bar: "bg-red-600",
    ring: "ring-red-300",
    cardBorder: "border-red-500",
    cardBg: "bg-red-50",
    chip: "bg-red-600 border-red-700",
    chipText: "text-white",
    pulse: true,
  },
};

function severityBadge(sev: RoleTask["severity"]) {
  if (sev === "high") {
    return (
      <Badge variant="destructive" className="gap-1 text-[10px] px-1.5 py-0">
        <AlertTriangle className="w-3 h-3" /> عاجل
      </Badge>
    );
  }
  if (sev === "medium") {
    return (
      <Badge variant="secondary" className="gap-1 text-[10px] px-1.5 py-0 bg-amber-100 text-amber-800 border-amber-200">
        <Clock className="w-3 h-3" /> مهم
      </Badge>
    );
  }
  return null;
}

function SlaBadge({ sla }: { sla: SlaInfo }) {
  const s = SLA_STYLES[sla.status];
  const label =
    sla.status === "critical"
      ? `🚨 SLA متأخر +24س`
      : sla.status === "breached"
      ? `⛔ SLA منتهي`
      : sla.status === "warning"
      ? `⚠️ قارب SLA`
      : `✓ ضمن SLA`;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md border",
        s.chip,
        s.chipText,
        sla.pulse && "animate-pulse"
      )}
      title={`${sla.remainingLabel} (SLA ${sla.slaHours}س)`}
    >
      {label}
    </span>
  );
}


interface Props {
  /** Maximum tasks rendered. Defaults to 10. */
  limit?: number;
}

export default function StaffRoleTasksPanel({ limit = 10 }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState<StaffRole | null>(null);
  const [tasks, setTasks] = useState<RoleTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [snoozeOpenFor, setSnoozeOpenFor] = useState<string | null>(null);

  // Load role first
  useEffect(() => {
    if (!user) return;
    let cancel = false;
    (async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      if (cancel) return;
      const roles = (data || []).map((r) => r.role);
      // admin takes precedence over moderator
      if (roles.includes("admin")) setRole("admin");
      else if (roles.includes("moderator")) setRole("moderator");
      else setRole(null);
    })();
    return () => {
      cancel = true;
    };
  }, [user]);

  const fetchTasks = useCallback(async () => {
    if (!user || !role) return;
    setLoading(true);
    try {
      // Pull dismissed auto-task markers for this staff in last 48h
      const since = new Date(Date.now() - 2 * DAY).toISOString();
      const { data: dismissedRows } = await supabase
        .from("customer_communications")
        .select("note, reminder_at, is_done, created_at")
        .eq("staff_user_id", user.id)
        .eq("comm_type", "role_task")
        .gte("created_at", since);

      const dismissedIds = new Set<string>();
      const snoozedUntil: Record<string, number> = {};
      for (const row of dismissedRows || []) {
        const note = (row.note || "").trim();
        const m = note.match(/^role-task:([a-z_]+):([^\s·]+)/i);
        if (!m) continue;
        const id = `${m[1]}:${m[2]}`;
        if (row.is_done) {
          dismissedIds.add(id);
        } else if (row.reminder_at) {
          const t = new Date(row.reminder_at).getTime();
          if (t > Date.now()) snoozedUntil[id] = t;
        }
      }

      const isHidden = (id: string) =>
        dismissedIds.has(id) || (snoozedUntil[id] && snoozedUntil[id] > Date.now());

      const collected: RoleTask[] = [];

      if (role === "moderator") {
        await Promise.all([
          fetchQuoteFollowups(collected, isHidden),
          fetchPendingOrderContacts(collected, isHidden),
          fetchAbandonedCarts(collected, isHidden),
          fetchLeadFollowups(collected, isHidden),
          fetchActiveVisitors(collected, isHidden),
        ]);
      } else if (role === "admin") {
        await Promise.all([
          fetchDealerApplications(collected, isHidden),
          fetchHighValueOrders(collected, isHidden),
          fetchErpSyncAlerts(collected, isHidden),
          fetchStaleDailyReports(collected, isHidden),
          fetchStalePayments(collected, isHidden),
          fetchPendingStockAlerts(collected, isHidden),
        ]);
      }

      // Sort by severity then age (oldest first)
      const sevWeight = { high: 3, medium: 2, low: 1 } as const;
      collected.sort((a, b) => {
        const s = sevWeight[b.severity] - sevWeight[a.severity];
        if (s !== 0) return s;
        return new Date(a.agedAtIso).getTime() - new Date(b.agedAtIso).getTime();
      });

      setTasks(collected.slice(0, limit));
    } catch (e) {
      console.error("[StaffRoleTasksPanel] fetch error", e);
    } finally {
      setLoading(false);
    }
  }, [user, role, limit]);

  useEffect(() => {
    if (role) fetchTasks();
  }, [role, fetchTasks]);

  const handleDone = async (t: RoleTask) => {
    if (!user) return;
    setBusyId(t.id);
    try {
      const { error } = await supabase.from("customer_communications").insert({
        staff_user_id: user.id,
        customer_user_id: t.customerUserId,
        comm_type: "role_task",
        is_done: true,
        done_at: new Date().toISOString(),
        note: `role-task:${t.id} · ${t.title}`,
      });
      if (error) throw error;

      // Side effect: mark order as first-contacted
      if (t.kind === "pending_order_contact") {
        await supabase
          .from("orders")
          .update({ first_contacted_at: new Date().toISOString() })
          .eq("id", t.refId)
          .is("first_contacted_at", null);
      }

      setTasks((prev) => prev.filter((x) => x.id !== t.id));
      toast({ title: "تم إنجاز المهمة", description: t.title });
    } catch (e: any) {
      toast({ title: "تعذر التنفيذ", description: e.message || "خطأ غير معروف", variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  const handleSnooze = async (t: RoleTask, hours: number) => {
    if (!user) return;
    setBusyId(t.id);
    try {
      const reminderAt = new Date(Date.now() + hours * HOUR).toISOString();
      const { error } = await supabase.from("customer_communications").insert({
        staff_user_id: user.id,
        customer_user_id: t.customerUserId,
        comm_type: "role_task",
        is_done: false,
        reminder_at: reminderAt,
        note: `role-task:${t.id} · ${t.title}`,
      });
      if (error) throw error;
      setTasks((prev) => prev.filter((x) => x.id !== t.id));
      setSnoozeOpenFor(null);
      toast({ title: "تم التأجيل", description: `سيظهر مرة أخرى بعد ${hours}س` });
    } catch (e: any) {
      toast({ title: "تعذر التأجيل", description: e.message || "خطأ", variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  const titleLabel = useMemo(() => {
    if (role === "admin") return "مهام المشرف";
    if (role === "moderator") return "مهام المندوب";
    return "مهام الموظف";
  }, [role]);

  const subtitle = useMemo(() => {
    if (role === "admin") return "10 إجراءات إشرافية مقترحة بناءً على حالة النظام";
    if (role === "moderator") return "10 إجراءات مبيعات مقترحة بناءً على نشاط العملاء";
    return "";
  }, [role]);

  if (!user || !role) return null;

  return (
    <Card className="p-4 border-2 border-primary/15 bg-gradient-to-br from-primary/5 via-background to-background">
      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Briefcase className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-bold text-base flex items-center gap-2">
              {titleLabel}
              <Badge variant="outline" className="text-[10px]">
                {role === "admin" ? "Admin" : "Moderator"}
              </Badge>
              {tasks.length > 0 && (
                <Badge className="text-[10px]">{tasks.length}</Badge>
              )}
            </h3>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" onClick={fetchTasks} disabled={loading}>
            تحديث
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setCollapsed((c) => !c)}>
            {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {!collapsed && (
        <>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : tasks.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-green-500" />
              لا توجد مهام معلّقة الآن — أداء ممتاز! 🎉
            </div>
          ) : (
            <ul className="space-y-2">
              {tasks.map((t) => {
                const meta = KIND_META[t.kind];
                const Icon = meta.icon;
                return (
                  <li
                    key={t.id}
                    className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/30 transition-colors"
                  >
                    <div className={cn("mt-0.5 shrink-0", meta.color)}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-muted-foreground">
                          {meta.label}
                        </span>
                        {severityBadge(t.severity)}
                        <span className="text-[10px] text-muted-foreground">
                          منذ {formatDistanceToNow(new Date(t.agedAtIso), { locale: ar, addSuffix: false })}
                        </span>
                      </div>
                      <div className="font-medium text-sm mt-0.5 truncate">{t.title}</div>
                      <div className="text-xs text-muted-foreground truncate">{t.subtitle}</div>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        {t.href && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => navigate(t.href!)}
                          >
                            <ExternalLink className="w-3 h-3 ml-1" />
                            فتح
                          </Button>
                        )}
                        {t.phone && (
                          <>
                            <a href={`tel:${t.phone}`}>
                              <Button size="sm" variant="outline" className="h-7 text-xs">
                                <Phone className="w-3 h-3 ml-1" /> اتصال
                              </Button>
                            </a>
                            <a
                              href={`https://wa.me/${t.phone.replace(/\D/g, "")}`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              <Button size="sm" variant="outline" className="h-7 text-xs text-green-700">
                                <MessageCircle className="w-3 h-3 ml-1" /> واتساب
                              </Button>
                            </a>
                          </>
                        )}
                        <Button
                          size="sm"
                          className="h-7 text-xs"
                          disabled={busyId === t.id}
                          onClick={() => handleDone(t)}
                        >
                          <CheckCircle2 className="w-3 h-3 ml-1" /> تم
                        </Button>
                        <Popover
                          open={snoozeOpenFor === t.id}
                          onOpenChange={(o) => setSnoozeOpenFor(o ? t.id : null)}
                        >
                          <PopoverTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              disabled={busyId === t.id}
                            >
                              <Clock className="w-3 h-3 ml-1" /> أجّل
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-44 p-2">
                            <div className="text-xs font-semibold mb-1">تأجيل لـ:</div>
                            <div className="flex flex-col gap-1">
                              <Button size="sm" variant="ghost" className="justify-start h-7 text-xs" onClick={() => handleSnooze(t, 1)}>
                                ساعة
                              </Button>
                              <Button size="sm" variant="ghost" className="justify-start h-7 text-xs" onClick={() => handleSnooze(t, 3)}>
                                3 ساعات
                              </Button>
                              <Button size="sm" variant="ghost" className="justify-start h-7 text-xs" onClick={() => handleSnooze(t, 24)}>
                                غداً
                              </Button>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </Card>
  );
}

/* ============================================================
 * Task fetchers — each pushes RoleTask items into `out`
 * ============================================================ */

type Hidden = (id: string) => boolean;

// --- Moderator fetchers ---

async function fetchQuoteFollowups(out: RoleTask[], hidden: Hidden) {
  const cutoff = new Date(Date.now() - DAY).toISOString();
  const { data } = await supabase
    .from("dealer_quotes")
    .select("id, quote_number, status, total_amount, user_id, created_at")
    .in("status", ["draft", "sent"])
    .lt("created_at", cutoff)
    .order("created_at", { ascending: true })
    .limit(15);
  if (!data?.length) return;
  const userIds = Array.from(new Set(data.map((d) => d.user_id).filter(Boolean)));
  const profiles = await loadProfiles(userIds);
  for (const q of data) {
    const id = `quote_followup:${q.id}`;
    if (hidden(id)) continue;
    const p = profiles[q.user_id];
    out.push({
      id,
      kind: "quote_followup",
      refId: q.id,
      customerUserId: q.user_id,
      title: `عرض سعر ${q.quote_number} — ${p?.name || "تاجر"}`,
      subtitle: `قيمة ${Number(q.total_amount || 0).toLocaleString("ar-EG")} ج.م — لم يُحوّل لطلب`,
      agedAtIso: q.created_at,
      severity: ageHours(q.created_at) > 48 ? "high" : "medium",
      href: `/admin/visitor/${q.user_id}`,
      phone: p?.phone || null,
      amount: Number(q.total_amount || 0),
    });
  }
}

async function fetchPendingOrderContacts(out: RoleTask[], hidden: Hidden) {
  const cutoff = new Date(Date.now() - 2 * HOUR).toISOString();
  const { data } = await supabase
    .from("orders")
    .select("id, order_number, total_amount, user_id, created_at, status, first_contacted_at")
    .eq("status", "pending")
    .is("first_contacted_at", null)
    .lt("created_at", cutoff)
    .order("created_at", { ascending: true })
    .limit(15);
  if (!data?.length) return;
  const userIds = Array.from(new Set(data.map((d) => d.user_id).filter(Boolean)));
  const profiles = await loadProfiles(userIds);
  for (const o of data) {
    const id = `pending_order_contact:${o.id}`;
    if (hidden(id)) continue;
    const p = profiles[o.user_id];
    out.push({
      id,
      kind: "pending_order_contact",
      refId: o.id,
      customerUserId: o.user_id,
      title: `طلب ${o.order_number} — ${p?.name || "عميل"}`,
      subtitle: `قيمة ${Number(o.total_amount || 0).toLocaleString("ar-EG")} ج.م — تواصل أولي مطلوب`,
      agedAtIso: o.created_at,
      severity: ageHours(o.created_at) > 6 ? "high" : "medium",
      href: `/admin/orders`,
      phone: p?.phone || null,
      amount: Number(o.total_amount || 0),
    });
  }
}

async function fetchAbandonedCarts(out: RoleTask[], hidden: Hidden) {
  const cutoff = new Date(Date.now() - 6 * HOUR).toISOString();
  const { data } = await supabase
    .from("dealer_cart_items")
    .select("user_id, updated_at")
    .lt("updated_at", cutoff)
    .order("updated_at", { ascending: true })
    .limit(50);
  if (!data?.length) return;
  // group by user
  const byUser: Record<string, { count: number; oldest: string }> = {};
  for (const r of data) {
    const u = byUser[r.user_id] || { count: 0, oldest: r.updated_at };
    u.count += 1;
    if (new Date(r.updated_at) < new Date(u.oldest)) u.oldest = r.updated_at;
    byUser[r.user_id] = u;
  }
  const userIds = Object.keys(byUser);
  // exclude users with recent orders
  const { data: recentOrders } = await supabase
    .from("orders")
    .select("user_id, created_at")
    .in("user_id", userIds)
    .gte("created_at", cutoff);
  const recentSet = new Set((recentOrders || []).map((o) => o.user_id));
  const profiles = await loadProfiles(userIds);
  for (const uid of userIds) {
    if (recentSet.has(uid)) continue;
    const id = `abandoned_cart:${uid}`;
    if (hidden(id)) continue;
    const info = byUser[uid];
    const p = profiles[uid];
    out.push({
      id,
      kind: "abandoned_cart",
      refId: uid,
      customerUserId: uid,
      title: `سلة مهجورة — ${p?.name || "تاجر"}`,
      subtitle: `${info.count} منتج بدون إتمام طلب`,
      agedAtIso: info.oldest,
      severity: "low",
      href: `/admin/visitor/${uid}`,
      phone: p?.phone || null,
    });
  }
}

async function fetchLeadFollowups(out: RoleTask[], hidden: Hidden) {
  const { data } = await supabase
    .from("leads")
    .select("id, name, phone, status, created_at, shop_name")
    .in("status", ["new", "contacted"])
    .order("created_at", { ascending: true })
    .limit(20);
  if (!data?.length) return;
  for (const l of data) {
    if (ageHours(l.created_at) < 6) continue;
    const id = `lead_followup:${l.id}`;
    if (hidden(id)) continue;
    out.push({
      id,
      kind: "lead_followup",
      refId: l.id,
      customerUserId: null,
      title: `Lead: ${l.name}${l.shop_name ? ` (${l.shop_name})` : ""}`,
      subtitle: `حالة: ${l.status === "new" ? "جديد" : "تم التواصل"} — يحتاج متابعة`,
      agedAtIso: l.created_at,
      severity: ageHours(l.created_at) > 48 ? "high" : "medium",
      href: `/admin/leads`,
      phone: l.phone,
    });
  }
}

async function fetchActiveVisitors(out: RoleTask[], hidden: Hidden) {
  const since = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from("page_visits")
    .select("user_id, visited_at, path")
    .gte("visited_at", since)
    .not("user_id", "is", null)
    .order("visited_at", { ascending: false })
    .limit(50);
  if (!data?.length) return;
  // group by user — pick those with 3+ views (high engagement)
  const byUser: Record<string, { views: number; latest: string }> = {};
  for (const v of data) {
    const u = byUser[v.user_id!] || { views: 0, latest: v.visited_at };
    u.views += 1;
    if (new Date(v.visited_at) > new Date(u.latest)) u.latest = v.visited_at;
    byUser[v.user_id!] = u;
  }
  const candidates = Object.entries(byUser)
    .filter(([, info]) => info.views >= 3)
    .slice(0, 5);
  const userIds = candidates.map(([uid]) => uid);
  const profiles = await loadProfiles(userIds);
  for (const [uid, info] of candidates) {
    const id = `active_visitor_engage:${uid}`;
    if (hidden(id)) continue;
    const p = profiles[uid];
    out.push({
      id,
      kind: "active_visitor_engage",
      refId: uid,
      customerUserId: uid,
      title: `زائر نشط الآن — ${p?.name || "عميل"}`,
      subtitle: `${info.views} صفحة في آخر 30د — فرصة تواصل فورية`,
      agedAtIso: info.latest,
      severity: "medium",
      href: `/admin/visitor/${uid}`,
      phone: p?.phone || null,
    });
  }
}

// --- Admin fetchers ---

async function fetchDealerApplications(out: RoleTask[], hidden: Hidden) {
  const { data } = await supabase
    .from("dealer_applications")
    .select("id, business_name, phone, status, created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(10);
  if (!data?.length) return;
  for (const a of data) {
    const id = `review_dealer_application:${a.id}`;
    if (hidden(id)) continue;
    out.push({
      id,
      kind: "review_dealer_application",
      refId: a.id,
      customerUserId: null,
      title: `طلب تاجر جديد: ${a.business_name}`,
      subtitle: `بانتظار المراجعة والاعتماد`,
      agedAtIso: a.created_at,
      severity: ageHours(a.created_at) > 24 ? "high" : "medium",
      href: `/admin/dealer-applications`,
      phone: a.phone,
    });
  }
}

async function fetchHighValueOrders(out: RoleTask[], hidden: Hidden) {
  const { data } = await supabase
    .from("orders")
    .select("id, order_number, total_amount, user_id, created_at, status")
    .in("status", ["pending", "pending_approval"])
    .gte("total_amount", 5000)
    .order("created_at", { ascending: true })
    .limit(10);
  if (!data?.length) return;
  const userIds = Array.from(new Set(data.map((d) => d.user_id).filter(Boolean)));
  const profiles = await loadProfiles(userIds);
  for (const o of data) {
    const id = `review_high_value_order:${o.id}`;
    if (hidden(id)) continue;
    const p = profiles[o.user_id];
    out.push({
      id,
      kind: "review_high_value_order",
      refId: o.id,
      customerUserId: o.user_id,
      title: `طلب ${o.order_number} — ${Number(o.total_amount).toLocaleString("ar-EG")} ج.م`,
      subtitle: `${p?.name || "عميل"} — يحتاج اعتماد إشرافي`,
      agedAtIso: o.created_at,
      severity: "high",
      href: `/admin/orders`,
      phone: p?.phone || null,
      amount: Number(o.total_amount),
    });
  }
}

async function fetchErpSyncAlerts(out: RoleTask[], hidden: Hidden) {
  const since = new Date(Date.now() - 7 * DAY).toISOString();
  const { data } = await supabase
    .from("erp_sync_alerts")
    .select("id, alert_type, alert_key, sync_type, created_at")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(10);
  if (!data?.length) return;
  for (const a of data) {
    const id = `erp_sync_alert:${a.id}`;
    if (hidden(id)) continue;
    out.push({
      id,
      kind: "erp_sync_alert",
      refId: a.id,
      customerUserId: null,
      title: `تنبيه ERP: ${a.alert_type}`,
      subtitle: `${a.sync_type || "مزامنة"} — ${a.alert_key}`,
      agedAtIso: a.created_at,
      severity: "high",
      href: `/admin/erp-logs`,
    });
  }
}

async function fetchStaleDailyReports(out: RoleTask[], hidden: Hidden) {
  // Find moderators who haven't submitted any daily report answer today
  const today = new Date().toISOString().slice(0, 10);
  const { data: mods } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("role", "moderator")
    .limit(50);
  if (!mods?.length) return;
  const modIds = mods.map((m) => m.user_id);
  const { data: answeredToday } = await supabase
    .from("daily_report_answers")
    .select("user_id")
    .eq("report_date", today)
    .in("user_id", modIds);
  const answeredSet = new Set((answeredToday || []).map((a) => a.user_id));
  const missing = modIds.filter((uid) => !answeredSet.has(uid));
  if (!missing.length) return;
  const profiles = await loadProfiles(missing);
  // Only flag after 14:00 local
  const now = new Date();
  if (now.getHours() < 14) return;
  for (const uid of missing.slice(0, 5)) {
    const id = `staff_no_daily_report:${uid}`;
    if (hidden(id)) continue;
    const p = profiles[uid];
    out.push({
      id,
      kind: "staff_no_daily_report",
      refId: uid,
      customerUserId: null,
      title: `${p?.name || "موظف"} لم يُسلّم تقرير اليوم`,
      subtitle: `الوقت تجاوز 2:00 ظهراً — يلزم متابعته`,
      agedAtIso: new Date(`${today}T08:00:00`).toISOString(),
      severity: now.getHours() >= 17 ? "high" : "medium",
      href: `/admin/staff-roles`,
    });
  }
}

async function fetchStalePayments(out: RoleTask[], hidden: Hidden) {
  const cutoff = new Date(Date.now() - 2 * HOUR).toISOString();
  const { data } = await supabase
    .from("payment_transactions")
    .select("id, order_number, amount_cents, status, created_at")
    .eq("status", "pending")
    .lt("created_at", cutoff)
    .order("created_at", { ascending: true })
    .limit(10);
  if (!data?.length) return;
  for (const p of data) {
    const id = `stale_payment_transaction:${p.id}`;
    if (hidden(id)) continue;
    out.push({
      id,
      kind: "stale_payment_transaction",
      refId: p.id,
      customerUserId: null,
      title: `معاملة دفع معلّقة — ${p.order_number || "—"}`,
      subtitle: `${((p.amount_cents || 0) / 100).toLocaleString("ar-EG")} ج.م — تحتاج مراجعة`,
      agedAtIso: p.created_at,
      severity: ageHours(p.created_at) > 24 ? "high" : "medium",
      href: `/admin/orders`,
    });
  }
}

async function fetchPendingStockAlerts(out: RoleTask[], hidden: Hidden) {
  const { data } = await supabase
    .from("stock_alerts")
    .select("id, user_id, product_id, alert_type, created_at")
    .eq("is_active", true)
    .is("notified_at", null)
    .order("created_at", { ascending: true })
    .limit(10);
  if (!data?.length) return;
  for (const a of data) {
    const id = `stock_alert_pending:${a.id}`;
    if (hidden(id)) continue;
    out.push({
      id,
      kind: "stock_alert_pending",
      refId: a.id,
      customerUserId: a.user_id,
      title: `تنبيه مخزون لم يُبلَّغ`,
      subtitle: `تاجر ينتظر إشعار توفر منتج (${a.alert_type})`,
      agedAtIso: a.created_at,
      severity: ageHours(a.created_at) > 72 ? "high" : "low",
      href: `/admin/stock-alerts`,
    });
  }
}

/* ============================================================
 * Helpers
 * ============================================================ */

function ageHours(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / HOUR;
}

async function loadProfiles(
  userIds: string[]
): Promise<Record<string, { name: string | null; phone: string | null }>> {
  if (!userIds.length) return {};
  const { data } = await supabase
    .from("profiles")
    .select("user_id, full_name, phone")
    .in("user_id", userIds);
  const out: Record<string, { name: string | null; phone: string | null }> = {};
  for (const p of data || []) {
    out[p.user_id] = { name: p.full_name, phone: p.phone };
  }
  return out;
}
