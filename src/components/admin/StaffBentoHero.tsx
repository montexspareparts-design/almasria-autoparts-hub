/**
 * StaffBentoHero — Bento-style command hero for the staff daily dashboard.
 *
 * Sits at the very top of "لوحة المهام اليومية" and replaces the previous
 * flat KPI strip. It surfaces the four things a staff member needs to act
 * on first thing each shift, plus quick-jump buttons to deeper tools.
 *
 * Live data fetched here (independent of the parent CRM center, so the hero
 * stays responsive even while the deep tabs are loading):
 *   1. Visitors right now           — customer_sessions in the last 30 min
 *   2. New orders (last 24h)        — orders count, awaiting first contact
 *   3. My follow-up reminders       — customer_communications.reminder_at
 *      bucketed into "متأخرة" / "اليوم" / "قادمة"
 *   4. Hot leads (3+ searches, 0 orders this week) — surfaced from the parent
 *      via the `hotLeadsCount` prop (avoids double-fetching the same data)
 *
 * Quick links: my customers, instapay receipts, staff-home (detailed visitors
 * page), part requests.
 */
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Users, ShoppingBag, BellRing, Flame,
  ArrowLeft, Wallet, FileSearch, MessageSquare, Package, Sparkles,
} from "lucide-react";

interface Reminder {
  id: string;
  customer_user_id: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  reminder_at: string;
  note: string | null;
  comm_type: string;
}

interface Props {
  /** Number of urgent orders surfaced by the parent (sync, no extra fetch). */
  urgentOrdersCount: number;
  /** Number of hot search-only leads surfaced by the parent. */
  hotLeadsCount: number;
  /** Number of pending support / chatbot requests surfaced by the parent. */
  chatbotPendingCount: number;
  /** Switches to the matching tab inside the parent CRM center. */
  onJumpToTab: (tab: "urgent" | "chatbot" | "search" | "yesterday") => void;
}

export default function StaffBentoHero({
  urgentOrdersCount,
  hotLeadsCount,
  chatbotPendingCount,
  onJumpToTab,
}: Props) {
  const { user } = useAuth();

  const [visitorsNow, setVisitorsNow] = useState(0);
  const [newOrders24h, setNewOrders24h] = useState(0);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [instapayPending, setInstapayPending] = useState(0);
  const [partRequestsNew, setPartRequestsNew] = useState(0);

  const fetchHero = async () => {
    if (!user) return;
    const now = Date.now();
    const since30m = new Date(now - 30 * 60 * 1000).toISOString();
    const since24h = new Date(now - 24 * 3600 * 1000).toISOString();

    // 1) Visitors right now (sessions touched in the last 30 minutes)
    const { count: vCount } = await supabase
      .from("customer_sessions")
      .select("user_id", { count: "exact", head: true })
      .gte("last_seen_at", since30m);
    setVisitorsNow(vCount || 0);

    // 2) New orders in the last 24h
    const { count: oCount } = await supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since24h);
    setNewOrders24h(oCount || 0);

    // 3) My reminders (open, with a reminder time set)
    const horizon = new Date(now + 7 * 86400000).toISOString(); // next 7 days
    const { data: remRows } = await supabase
      .from("customer_communications")
      .select("id, customer_user_id, reminder_at, note, comm_type")
      .eq("staff_user_id", user.id)
      .eq("is_done", false)
      .not("reminder_at", "is", null)
      .lte("reminder_at", horizon)
      .order("reminder_at", { ascending: true })
      .limit(20);

    const customerIds = [...new Set(((remRows || []) as any[]).map(r => r.customer_user_id).filter(Boolean))];
    let nameMap = new Map<string, { name: string; phone: string | null }>();
    if (customerIds.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, full_name, phone")
        .in("user_id", customerIds);
      nameMap = new Map(
        (profs || []).map((p: any) => [p.user_id, { name: p.full_name || "عميل", phone: p.phone || null }])
      );
    }
    setReminders(
      ((remRows || []) as any[]).map((r) => ({
        id: r.id,
        customer_user_id: r.customer_user_id,
        customer_name: r.customer_user_id ? nameMap.get(r.customer_user_id)?.name || "عميل" : "عميل",
        customer_phone: r.customer_user_id ? nameMap.get(r.customer_user_id)?.phone || null : null,
        reminder_at: r.reminder_at,
        note: r.note,
        comm_type: r.comm_type,
      }))
    );

    // 4) Side widgets — instapay + part requests
    try {
      const { count: ipCount } = await (supabase as any)
        .from("instapay_receipts")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending");
      setInstapayPending(ipCount || 0);
    } catch { /* table may not exist */ }

    try {
      const { count: prCount } = await supabase
        .from("part_requests")
        .select("id", { count: "exact", head: true })
        .eq("status", "new");
      setPartRequestsNew(prCount || 0);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    fetchHero();
    const t = setInterval(fetchHero, 60_000); // refresh every minute
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Bucket reminders by urgency
  const { overdue, todayCount, upcoming, nextOne } = useMemo(() => {
    const nowMs = Date.now();
    const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);
    let overdue = 0, todayCount = 0, upcoming = 0;
    let nextOne: Reminder | null = null;
    for (const r of reminders) {
      const t = new Date(r.reminder_at).getTime();
      if (t < nowMs) overdue++;
      else if (t <= todayEnd.getTime()) todayCount++;
      else upcoming++;
      if (!nextOne) nextOne = r;
    }
    return { overdue, todayCount, upcoming, nextOne };
  }, [reminders]);

  const fmtRel = (iso: string) => {
    const diff = Math.round((new Date(iso).getTime() - Date.now()) / 60000);
    if (diff < -60 * 24) return `متأخر ${Math.floor(-diff / (60 * 24))} يوم`;
    if (diff < -60) return `متأخر ${Math.floor(-diff / 60)}س`;
    if (diff < 0) return `متأخر ${-diff}د`;
    if (diff < 60) return `بعد ${diff}د`;
    if (diff < 60 * 24) return `بعد ${Math.floor(diff / 60)}س`;
    return `بعد ${Math.floor(diff / (60 * 24))} يوم`;
  };

  return (
    <div className="space-y-3">
      {/* Section title */}
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-bold text-foreground">ابدأ يومك من هنا</h3>
        <span className="text-[11px] text-muted-foreground">
          ({new Date().toLocaleDateString("ar-EG", { weekday: "long", day: "numeric", month: "long" })})
        </span>
      </div>

      {/* Bento Grid — 4 main + 4 quick links */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 auto-rows-[minmax(120px,auto)]">
        {/* 1) Visitors right now — large blue */}
        <Card
          className="lg:col-span-2 lg:row-span-2 p-4 bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent border-blue-200 dark:border-blue-900 hover:shadow-lg transition cursor-pointer relative overflow-hidden"
          onClick={() => onJumpToTab("yesterday")}
        >
          <div className="absolute -left-6 -bottom-6 opacity-10">
            <Users className="w-32 h-32 text-blue-600" />
          </div>
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-lg bg-blue-500/15">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">زوار نشطين الآن</div>
                <div className="text-[10px] text-muted-foreground/70">آخر 30 دقيقة</div>
              </div>
              {visitorsNow > 0 && (
                <span className="ms-auto inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 dark:bg-emerald-900/40 px-1.5 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  مباشر
                </span>
              )}
            </div>
            <div className="flex items-baseline gap-2 mt-3">
              <span className="text-5xl font-black text-blue-700 dark:text-blue-300">{visitorsNow}</span>
              <span className="text-sm text-muted-foreground">زائر</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              شوف مين بيتصفّح الموقع دلوقتي، اعرف أرقامهم وتواصل معاهم قبل ما يخرجوا.
            </p>
            <Button asChild size="sm" variant="outline" className="mt-3 gap-1 h-8 text-xs">
              <Link to="/admin/staff-home" onClick={(e) => e.stopPropagation()}>
                فتح صفحة الزوار التفصيلية
                <ArrowLeft className="w-3 h-3" />
              </Link>
            </Button>
          </div>
        </Card>

        {/* 2) Urgent orders — red */}
        <Card
          className={cn(
            "p-4 hover:shadow-md transition cursor-pointer border-2",
            urgentOrdersCount > 0
              ? "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900 animate-pulse"
              : "bg-card border-border"
          )}
          onClick={() => onJumpToTab("urgent")}
        >
          <div className="flex items-start justify-between">
            <div className="p-2 rounded-lg bg-red-500/15">
              <ShoppingBag className="w-5 h-5 text-red-600" />
            </div>
            {urgentOrdersCount > 0 && (
              <Badge className="bg-red-600 text-white text-xs">عاجل</Badge>
            )}
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-red-700 dark:text-red-400">{urgentOrdersCount}</div>
            <div className="text-xs text-muted-foreground">طلبات بدون تواصل</div>
            <div className="text-[10px] text-muted-foreground/70 mt-0.5">آخر 48 ساعة</div>
          </div>
          {newOrders24h > urgentOrdersCount && (
            <div className="text-[10px] text-muted-foreground mt-2 pt-2 border-t">
              إجمالي طلبات اليوم: <strong className="text-foreground">{newOrders24h}</strong>
            </div>
          )}
        </Card>

        {/* 3) My reminders — purple */}
        <Card
          className={cn(
            "p-4 hover:shadow-md transition cursor-pointer border-2",
            overdue > 0
              ? "bg-purple-50 dark:bg-purple-950/30 border-purple-300 dark:border-purple-800"
              : "bg-card border-border"
          )}
        >
          <div className="flex items-start justify-between">
            <div className="p-2 rounded-lg bg-purple-500/15">
              <BellRing className={cn("w-5 h-5 text-purple-600", overdue > 0 && "animate-pulse")} />
            </div>
            {overdue > 0 && (
              <Badge className="bg-purple-600 text-white text-xs">{overdue} متأخر</Badge>
            )}
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-purple-700 dark:text-purple-400">
              {reminders.length}
            </div>
            <div className="text-xs text-muted-foreground">تذكيراتي للأسبوع</div>
          </div>
          <div className="text-[10px] text-muted-foreground mt-2 pt-2 border-t flex flex-wrap gap-x-2 gap-y-0.5">
            {overdue > 0 && <span className="text-red-600 font-bold">⚠️ متأخر: {overdue}</span>}
            {todayCount > 0 && <span className="text-amber-600 font-bold">اليوم: {todayCount}</span>}
            {upcoming > 0 && <span>قادمة: {upcoming}</span>}
            {reminders.length === 0 && <span>لا توجد متابعات معلّقة 🎉</span>}
          </div>
          {nextOne && (
            <div className="text-[10px] text-foreground mt-2 truncate">
              <span className="text-muted-foreground">الأقرب:</span> {nextOne.customer_name}{" "}
              <span className="text-purple-600 font-mono">({fmtRel(nextOne.reminder_at)})</span>
            </div>
          )}
        </Card>

        {/* 4) Hot leads — orange */}
        <Card
          className="p-4 hover:shadow-md transition cursor-pointer border-2 border-border"
          onClick={() => onJumpToTab("search")}
        >
          <div className="flex items-start justify-between">
            <div className="p-2 rounded-lg bg-orange-500/15">
              <Flame className="w-5 h-5 text-orange-600" />
            </div>
            {hotLeadsCount > 0 && (
              <Badge className="bg-orange-500 text-white text-xs">ساخن</Badge>
            )}
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-orange-700 dark:text-orange-400">{hotLeadsCount}</div>
            <div className="text-xs text-muted-foreground">عملاء بحثوا ولم يشتروا</div>
            <div className="text-[10px] text-muted-foreground/70 mt-0.5">3 عمليات بحث+ آخر 7 أيام</div>
          </div>
        </Card>

        {/* 5) Chatbot requests — purple light */}
        <Card
          className={cn(
            "p-4 hover:shadow-md transition cursor-pointer border-2 border-border",
            chatbotPendingCount > 0 && "bg-violet-50 dark:bg-violet-950/30 border-violet-300"
          )}
          onClick={() => onJumpToTab("chatbot")}
        >
          <div className="flex items-start justify-between">
            <div className="p-2 rounded-lg bg-violet-500/15">
              <MessageSquare className="w-5 h-5 text-violet-600" />
            </div>
            {chatbotPendingCount > 0 && (
              <Badge className="bg-violet-600 text-white text-xs">{chatbotPendingCount}</Badge>
            )}
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-violet-700 dark:text-violet-400">{chatbotPendingCount}</div>
            <div className="text-xs text-muted-foreground">طلبات شات بوت</div>
          </div>
        </Card>
      </div>

      {/* Quick-link rail */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <QuickLink to="/admin?section=orders" icon={ShoppingBag} label="كل الطلبات" tone="slate" />
        <QuickLink to="/admin?section=instapay" icon={Wallet} label="إيصالات InstaPay" tone="emerald" badge={instapayPending} />
        <QuickLink to="/admin?section=part-requests" icon={FileSearch} label="طلبات قطع غيار" tone="indigo" badge={partRequestsNew} />
        <QuickLink to="/admin?section=customers" icon={Package} label="ملف العملاء" tone="rose" />
      </div>
    </div>
  );
}

interface QuickLinkProps {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  tone: "slate" | "emerald" | "indigo" | "rose";
  badge?: number;
}

const toneClasses: Record<QuickLinkProps["tone"], string> = {
  slate: "hover:bg-slate-50 dark:hover:bg-slate-900/50 text-slate-600",
  emerald: "hover:bg-emerald-50 dark:hover:bg-emerald-900/30 text-emerald-600",
  indigo: "hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-indigo-600",
  rose: "hover:bg-rose-50 dark:hover:bg-rose-900/30 text-rose-600",
};

function QuickLink({ to, icon: Icon, label, tone, badge }: QuickLinkProps) {
  return (
    <Link
      to={to}
      className={cn(
        "flex items-center gap-2 px-3 py-2.5 rounded-lg border bg-card transition relative",
        toneClasses[tone]
      )}
    >
      <Icon className="w-4 h-4 shrink-0" />
      <span className="text-xs font-medium text-foreground truncate flex-1">{label}</span>
      {badge !== undefined && badge > 0 && (
        <Badge variant="secondary" className="text-[10px] h-5 px-1.5 shrink-0">{badge}</Badge>
      )}
    </Link>
  );
}
