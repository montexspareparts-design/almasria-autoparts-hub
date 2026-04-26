/**
 * StaffBentoHero — لوحة مهام الموظف الرئيسية (Bento Grid).
 *
 * الصفحة الرئيسية اللي ينطلق منها الموظف. مقسمة لـ 5 أقسام واضحة:
 *   1) جديد اليوم        — طلبات/تسجيلات/إيصالات InstaPay/طلبات قطع غيار آخر 24س
 *   2) مهام عاجلة         — طلبات بدون تواصل + chatbot pending + ليدز ساخنة
 *   3) متابعة العملاء     — تذكيرات اليوم + المتأخرة (من customer_communications)
 *   4) مواعيد/تذكيرات     — التايملاين الأسبوعي للتذكيرات القادمة
 *   5) سجلات الزوار       — زوار الآن + بوابة /admin/staff-home التفصيلية
 *
 * كل قسم له:
 *   - عنوان واضح + أيقونة + لون مميّز
 *   - أرقام حية + بطاقات صغيرة لأهم عنصرين/ثلاثة
 *   - أزرار "افتح القسم" للانتقال السريع
 *
 * Polling كل 60 ثانية.
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
  Users, ShoppingBag, BellRing, Flame, ArrowLeft, Wallet, FileSearch,
  MessageSquare, UserPlus, Clock, AlertTriangle, CalendarDays, Eye,
  Sparkles, ChevronRight, Phone, Timer, TrendingUp, CheckCircle2, Loader2, Activity, Clock3,
} from "lucide-react";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface Reminder {
  id: string;
  customer_user_id: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  reminder_at: string;
  note: string | null;
  comm_type: string;
  /** آخر تواصل للعميل (أحدث customer_communications.created_at). null لو الموظف لم يتواصل قبل كده */
  last_contact_at?: string | null;
}

/** درجة الأولوية المحسوبة لكل مهمة */
type Priority = "critical" | "high" | "medium" | "low";

/** التبويبات المتاحة في لوحة المهام (نفس قيم Tabs في StaffCRMCommandCenter) */
export type StaffJumpTab = "urgent" | "chatbot" | "search" | "yesterday";

interface Props {
  urgentOrdersCount: number;
  hotLeadsCount: number;
  chatbotPendingCount: number;
  onJumpToTab: (tab: StaffJumpTab) => void;
}

export default function StaffBentoHero({
  urgentOrdersCount,
  hotLeadsCount,
  chatbotPendingCount,
  onJumpToTab,
}: Props) {
  const { user } = useAuth();

  // جديد اليوم
  const [newOrders24h, setNewOrders24h] = useState(0);
  const [newSignups24h, setNewSignups24h] = useState(0);
  const [instapayPending, setInstapayPending] = useState(0);
  const [partRequestsNew, setPartRequestsNew] = useState(0);

  // زوار / تذكيرات
  const [visitorsNow, setVisitorsNow] = useState(0);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [contactingId, setContactingId] = useState<string | null>(null);
  const [snoozingId, setSnoozingId] = useState<string | null>(null);

  // ===== شريط مختصرات اليوم =====
  const [newVisitorsToday, setNewVisitorsToday] = useState(0);
  const [overdueTasksTotal, setOverdueTasksTotal] = useState(0);
  const [avgResponseMin, setAvgResponseMin] = useState<number | null>(null);

  const fetchHero = async () => {
    if (!user) return;
    const now = Date.now();
    const since30m = new Date(now - 30 * 60 * 1000).toISOString();
    const since24h = new Date(now - 24 * 3600 * 1000).toISOString();
    const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
    const startOfDayIso = startOfDay.toISOString();

    // 1) زوار الآن
    const { count: vCount } = await supabase
      .from("customer_sessions")
      .select("user_id", { count: "exact", head: true })
      .gte("last_seen_at", since30m);
    setVisitorsNow(vCount || 0);

    // 2) جديد اليوم — طلبات
    const { count: oCount } = await supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since24h);
    setNewOrders24h(oCount || 0);

    // 3) جديد اليوم — تسجيلات
    const { count: sCount } = await supabase
      .from("profiles")
      .select("user_id", { count: "exact", head: true })
      .gte("created_at", since24h);
    setNewSignups24h(sCount || 0);

    // 4) إيصالات InstaPay معلّقة
    try {
      const { count: ipCount } = await (supabase as any)
        .from("instapay_receipts")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending");
      setInstapayPending(ipCount || 0);
    } catch { /* */ }

    // 5) طلبات قطع غيار جديدة
    try {
      const { count: prCount } = await supabase
        .from("part_requests")
        .select("id", { count: "exact", head: true })
        .eq("status", "new");
      setPartRequestsNew(prCount || 0);
    } catch { /* */ }

    // 6) تذكيرات الموظف للأسبوع
    const horizon = new Date(now + 7 * 86400000).toISOString();
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
    // جلب آخر تواصل لكل عميل (أحدث customer_communications.created_at قبل وقت التذكير)
    const lastContactMap = new Map<string, string>();
    if (customerIds.length) {
      const { data: lastComms } = await supabase
        .from("customer_communications")
        .select("customer_user_id, created_at")
        .in("customer_user_id", customerIds)
        .order("created_at", { ascending: false })
        .limit(500);
      // أول ظهور لكل عميل = أحدث تواصل (مرتّب تنازلياً)
      for (const c of (lastComms || []) as any[]) {
        if (c.customer_user_id && !lastContactMap.has(c.customer_user_id)) {
          lastContactMap.set(c.customer_user_id, c.created_at);
        }
      }
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
        last_contact_at: r.customer_user_id ? lastContactMap.get(r.customer_user_id) || null : null,
      }))
    );

    // ===== شريط مختصرات اليوم =====
    // (أ) عدد الزوار الجدد اليوم — جلسات بدأت بعد منتصف الليل لمستخدمين ليست لهم session سابقة
    try {
      const { data: todaySessions } = await supabase
        .from("customer_sessions")
        .select("user_id, session_key, first_seen_at")
        .gte("first_seen_at", startOfDayIso)
        .limit(1000);
      // اعتبر فريدًا حسب user_id (أو session_key للزوار المجهولين)
      const uniq = new Set<string>();
      (todaySessions || []).forEach((s: any) => {
        uniq.add(s.user_id || `anon:${s.session_key}`);
      });
      setNewVisitorsToday(uniq.size);
    } catch {
      // fallback: page_visits اليوم (مميّز حسب session_key)
      try {
        const { data: pv } = await supabase
          .from("page_visits")
          .select("session_key, user_id")
          .gte("visited_at", startOfDayIso)
          .limit(2000);
        const uniq = new Set<string>();
        (pv || []).forEach((r: any) => uniq.add(r.user_id || `anon:${r.session_key}`));
        setNewVisitorsToday(uniq.size);
      } catch { /* */ }
    }

    // (ب) عدد المهام المتأخرة — تذكيرات الموظف الحالي (reminder_at < now AND !done)
    const { count: overdueCount } = await supabase
      .from("customer_communications")
      .select("id", { count: "exact", head: true })
      .eq("staff_user_id", user.id)
      .eq("is_done", false)
      .not("reminder_at", "is", null)
      .lt("reminder_at", new Date(now).toISOString());
    setOverdueTasksTotal(overdueCount || 0);

    // (ج) متوسط وقت الاستجابة — support_requests اللي اتقفلت اليوم
    try {
      const { data: closed } = await supabase
        .from("support_requests")
        .select("created_at, resolved_at, claimed_at")
        .gte("created_at", startOfDayIso)
        .not("resolved_at", "is", null)
        .limit(200);
      const diffs = (closed || [])
        .map((r: any) => {
          // نفضّل claimed_at (أول رد من الموظف) إن وُجد، وإلا resolved_at
          const respondedAt = r.claimed_at || r.resolved_at;
          if (!respondedAt || !r.created_at) return null;
          return (new Date(respondedAt).getTime() - new Date(r.created_at).getTime()) / 60000;
        })
        .filter((v): v is number => v !== null && v >= 0);
      if (diffs.length > 0) {
        const avg = diffs.reduce((a, b) => a + b, 0) / diffs.length;
        setAvgResponseMin(Math.round(avg));
      } else {
        setAvgResponseMin(null);
      }
    } catch { /* */ }
  };

  useEffect(() => {
    fetchHero();
    const t = setInterval(fetchHero, 60_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  /**
   * منطق الأولوية التلقائية:
   *   - critical: متأخر > ٢ ساعة، أو لم يتم التواصل أبداً ومتأخر
   *   - high:     متأخر، أو موعده خلال الساعة القادمة، أو لم يُتواصل من >٧ أيام
   *   - medium:   موعده اليوم
   *   - low:      موعده قادم لاحقاً
   * + ترتيب القائمة: critical → high → medium → low ثم بالأقدم متأخراً
   */
  const computePriority = (r: Reminder): Priority => {
    const nowMs = Date.now();
    const reminderMs = new Date(r.reminder_at).getTime();
    const diffMin = (reminderMs - nowMs) / 60000;
    const lastContactDays = r.last_contact_at
      ? (nowMs - new Date(r.last_contact_at).getTime()) / 86400000
      : null;

    // critical: متأخر >2س، أو متأخر ولم يُتواصل أبداً
    if (diffMin < -120) return "critical";
    if (diffMin < 0 && lastContactDays === null) return "critical";

    // high: متأخر بسيط، أو خلال الساعة القادمة، أو فجوة تواصل >7 أيام
    if (diffMin < 0) return "high";
    if (diffMin <= 60) return "high";
    if (lastContactDays !== null && lastContactDays > 7) return "high";

    // medium: موعده اليوم
    const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);
    if (reminderMs <= todayEnd.getTime()) return "medium";

    return "low";
  };

  const priorityWeight: Record<Priority, number> = { critical: 0, high: 1, medium: 2, low: 3 };

  const { overdue, todayList, upcomingList, criticalCount, highCount } = useMemo(() => {
    const nowMs = Date.now();
    const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);
    let overdue = 0, criticalCount = 0, highCount = 0;
    const todayList: Reminder[] = [];
    const upcomingList: Reminder[] = [];
    for (const r of reminders) {
      const t = new Date(r.reminder_at).getTime();
      const p = computePriority(r);
      if (p === "critical") criticalCount++;
      else if (p === "high") highCount++;
      if (t < nowMs) { overdue++; todayList.push(r); }
      else if (t <= todayEnd.getTime()) todayList.push(r);
      else upcomingList.push(r);
    }
    // ترتيب: الأولوية الأعلى أولاً، ثم الأقدم متأخراً
    const sortByPriority = (a: Reminder, b: Reminder) => {
      const dp = priorityWeight[computePriority(a)] - priorityWeight[computePriority(b)];
      if (dp !== 0) return dp;
      return new Date(a.reminder_at).getTime() - new Date(b.reminder_at).getTime();
    };
    todayList.sort(sortByPriority);
    upcomingList.sort(sortByPriority);
    return { overdue, todayList, upcomingList, criticalCount, highCount };
  }, [reminders]);

  /**
   * زر سريع: "تم التواصل"
   *  - يقفل التذكير الحالي (is_done = true)
   *  - يسجّل تواصل جديد مكتمل (تحديث آلي لـ last_contact_at)
   *  - يعيد حساب الأولوية فوراً عبر تحديث state محلياً + إعادة جلب
   */
  const handleMarkContacted = async (r: Reminder) => {
    if (!user || contactingId) return;
    setContactingId(r.id);
    const nowIso = new Date().toISOString();
    try {
      const { error: e1 } = await supabase
        .from("customer_communications")
        .update({ is_done: true, done_at: nowIso })
        .eq("id", r.id);
      if (e1) throw e1;

      const { error: e2 } = await supabase
        .from("customer_communications")
        .insert({
          staff_user_id: user.id,
          customer_user_id: r.customer_user_id,
          comm_type: r.comm_type || "phone",
          note: `تم التواصل ✓ ${r.note ? `— ${r.note}` : ""}`.trim(),
          is_done: true,
          done_at: nowIso,
        });
      if (e2) throw e2;

      // تحديث محلي فوري — يشيل المهمة ويُحدّث "آخر تواصل" لباقي مهام نفس العميل
      setReminders((prev) =>
        prev
          .filter((x) => x.id !== r.id)
          .map((x) =>
            x.customer_user_id && x.customer_user_id === r.customer_user_id
              ? { ...x, last_contact_at: nowIso }
              : x
          )
      );
      toast.success(`تم تسجيل التواصل مع ${r.customer_name || "العميل"} ✓`);
      fetchHero();
    } catch (err: any) {
      console.error("[markContacted]", err);
      toast.error("فشل تسجيل التواصل — حاول مرة أخرى");
    } finally {
      setContactingId(null);
    }
  };

  /**
   * زر سريع: "تأجيل" — يحدّث reminder_at بكمية دقائق محددة (15د/1س/3س/غداً).
   * يعيد حساب الأولوية لحظياً + يفرز المهام تلقائياً.
   */
  const handleSnooze = async (r: Reminder, minutes: number, label: string) => {
    if (!user || snoozingId) return;
    setSnoozingId(r.id);
    const newReminderAt = new Date(Date.now() + minutes * 60_000).toISOString();
    try {
      const { error } = await supabase
        .from("customer_communications")
        .update({ reminder_at: newReminderAt, is_done: false })
        .eq("id", r.id);
      if (error) throw error;

      setReminders((prev) =>
        prev.map((x) => (x.id === r.id ? { ...x, reminder_at: newReminderAt } : x))
      );
      toast.success(`تم تأجيل "${r.customer_name || "التذكير"}" — ${label}`);
      fetchHero();
    } catch (err: any) {
      console.error("[snooze]", err);
      toast.error("فشل تأجيل التذكير — حاول مرة أخرى");
    } finally {
      setSnoozingId(null);
    }
  };

  const totalNewToday = newOrders24h + newSignups24h + instapayPending + partRequestsNew;
  const totalUrgent = urgentOrdersCount + chatbotPendingCount + hotLeadsCount;
  const totalFollowups = todayList.length;

  const fmtTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
  };

  /** عدّ تنازلي للموعد القادم أو "متأخر منذ ..." للماضي */
  const fmtCountdown = (iso: string): { text: string; isOverdue: boolean } => {
    const diffMin = Math.round((new Date(iso).getTime() - Date.now()) / 60000);
    const abs = Math.abs(diffMin);
    let text: string;
    if (abs < 60) text = `${abs}د`;
    else if (abs < 60 * 24) text = `${Math.floor(abs / 60)}س ${abs % 60}د`;
    else text = `${Math.floor(abs / (60 * 24))}ي`;
    return diffMin < 0
      ? { text: `⏰ متأخر ${text}`, isOverdue: true }
      : { text: `⏳ بعد ${text}`, isOverdue: false };
  };

  /** مدة منذ آخر تواصل (للعرض كـ chip ثاني) */
  const fmtSinceLastContact = (iso: string | null | undefined): string => {
    if (!iso) return "لم يتم التواصل أبداً";
    const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
    if (days === 0) {
      const hrs = Math.floor((Date.now() - new Date(iso).getTime()) / 3600000);
      if (hrs === 0) return "تواصل قبل دقائق";
      return `تواصل قبل ${hrs}س`;
    }
    if (days === 1) return "تواصل أمس";
    if (days < 7) return `تواصل قبل ${days} أيام`;
    if (days < 30) return `تواصل قبل ${Math.floor(days / 7)} أسابيع`;
    return `تواصل قبل ${Math.floor(days / 30)} شهر`;
  };

  return (
    <div className="space-y-4">
      {/* رأس اللوحة */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <h2 className="text-base sm:text-lg font-bold text-foreground">لوحة مهام الموظف</h2>
          <span className="text-[11px] text-muted-foreground hidden sm:inline">
            ({new Date().toLocaleDateString("ar-EG", { weekday: "long", day: "numeric", month: "long" })})
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px]">
          <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-100 dark:bg-emerald-900/40 px-2 py-0.5 rounded-full font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            تحديث مباشر كل دقيقة
          </span>
        </div>
      </div>

      {/* ===== شريط مختصرات اليوم ===== */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <ShortcutTile
          icon={<TrendingUp className="w-4 h-4" />}
          label="زوار جدد اليوم"
          value={newVisitorsToday.toString()}
          hint="منذ منتصف الليل"
          tone="emerald"
          onClick={() => onJumpToTab("yesterday")}
          ctaLabel="عرض الزوار"
        />
        <ShortcutTile
          icon={<AlertTriangle className="w-4 h-4" />}
          label="مهام متأخرة"
          value={overdueTasksTotal.toString()}
          hint={overdueTasksTotal > 0 ? "تحتاج تواصل فوراً" : "كل شيء تمام ✓"}
          tone={overdueTasksTotal > 0 ? "red" : "slate"}
          onClick={() => onJumpToTab("urgent")}
          ctaLabel="فتح المهام"
          urgent={overdueTasksTotal > 0}
        />
        <ShortcutTile
          icon={<Timer className="w-4 h-4" />}
          label="متوسط وقت الاستجابة"
          value={avgResponseMin !== null ? `${avgResponseMin}د` : "—"}
          hint={avgResponseMin === null ? "لا طلبات اليوم" : avgResponseMin <= 15 ? "ممتاز 🚀" : avgResponseMin <= 60 ? "مقبول" : "بطيء — ركّز"}
          tone={avgResponseMin === null ? "slate" : avgResponseMin <= 15 ? "emerald" : avgResponseMin <= 60 ? "amber" : "red"}
          onClick={() => onJumpToTab("chatbot")}
          ctaLabel="طلبات الدعم"
        />
      </div>

      {/* Bento Grid — 5 sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">

        {/* ================ 1) جديد اليوم ================ */}
        <SectionCard
          className="lg:col-span-3 from-emerald-500/10 to-transparent border-emerald-200 dark:border-emerald-900"
          icon={<UserPlus className="w-5 h-5 text-emerald-600" />}
          title="جديد اليوم"
          subtitle="آخر 24 ساعة"
          tone="emerald"
          totalLabel={`${totalNewToday} عنصر`}
        >
          <div className="grid grid-cols-2 gap-2">
            <MiniStat
              label="طلبات جديدة"
              value={newOrders24h}
              icon={<ShoppingBag className="w-3.5 h-3.5" />}
              tone="emerald"
              onClick={() => onJumpToTab("urgent")}
            />
            <MiniStat
              label="تسجيلات جديدة"
              value={newSignups24h}
              icon={<UserPlus className="w-3.5 h-3.5" />}
              tone="emerald"
              onClick={() => onJumpToTab("yesterday")}
            />
            <MiniStat
              label="إيصالات InstaPay"
              value={instapayPending}
              icon={<Wallet className="w-3.5 h-3.5" />}
              tone="emerald"
              onClick={() => onJumpToTab("urgent")}
              urgent={instapayPending > 0}
            />
            <MiniStat
              label="طلبات قطع غيار"
              value={partRequestsNew}
              icon={<FileSearch className="w-3.5 h-3.5" />}
              tone="emerald"
              onClick={() => onJumpToTab("chatbot")}
              urgent={partRequestsNew > 0}
            />
          </div>
        </SectionCard>

        {/* ================ 2) مهام عاجلة ================ */}
        <SectionCard
          className={cn(
            "lg:col-span-3 from-red-500/10 to-transparent border-red-200 dark:border-red-900",
            totalUrgent > 0 && "ring-2 ring-red-300 dark:ring-red-800"
          )}
          icon={<AlertTriangle className={cn("w-5 h-5 text-red-600", totalUrgent > 0 && "animate-pulse")} />}
          title="مهام عاجلة"
          subtitle="تحتاج تدخل فوري"
          tone="red"
          totalLabel={totalUrgent > 0 ? `${totalUrgent} عاجل` : "كل شيء تمام ✓"}
        >
          <div className="grid grid-cols-3 gap-2">
            <UrgentTile
              label="طلبات بدون تواصل"
              hint="آخر 48س"
              value={urgentOrdersCount}
              icon={<ShoppingBag className="w-4 h-4" />}
              onClick={() => onJumpToTab("urgent")}
            />
            <UrgentTile
              label="طلبات شات بوت"
              hint="بانتظار رد"
              value={chatbotPendingCount}
              icon={<MessageSquare className="w-4 h-4" />}
              onClick={() => onJumpToTab("chatbot")}
            />
            <UrgentTile
              label="ليدز ساخنة"
              hint="بحث ٣+ ولم يشترِ"
              value={hotLeadsCount}
              icon={<Flame className="w-4 h-4" />}
              onClick={() => onJumpToTab("search")}
            />
          </div>
        </SectionCard>

        {/* ================ 3) متابعة العملاء ================ */}
        <SectionCard
          className="lg:col-span-2 from-amber-500/10 to-transparent border-amber-200 dark:border-amber-900"
          icon={<Phone className="w-5 h-5 text-amber-600" />}
          title="متابعة العملاء"
          subtitle="مكالمات اليوم"
          tone="amber"
          totalLabel={
            criticalCount + highCount > 0 ? (
              <span className="inline-flex items-center gap-1">
                {criticalCount > 0 && <span className="px-1.5 py-0.5 rounded-full bg-red-600 text-white font-bold">{criticalCount} حرج</span>}
                {highCount > 0 && <span className="px-1.5 py-0.5 rounded-full bg-orange-500 text-white font-bold">{highCount} عالي</span>}
              </span>
            ) : `${totalFollowups} عميل`
          }
        >
          {todayList.length === 0 ? (
            <div className="text-xs text-muted-foreground py-4 text-center">
              لا توجد متابعات لليوم 🎉
            </div>
          ) : (
            <div className="space-y-1.5 max-h-[180px] overflow-y-auto">
              {todayList.slice(0, 5).map((r) => {
                const priority = computePriority(r);
                const cd = fmtCountdown(r.reminder_at);
                const lastContactText = fmtSinceLastContact(r.last_contact_at);
                return (
                  <div
                    key={r.id}
                    className={cn(
                      "flex items-center gap-2 p-2 rounded border-l-4 text-[11px]",
                      priority === "critical" && "bg-red-50 dark:bg-red-950/40 border-l-red-600 border-y border-r border-red-200",
                      priority === "high" && "bg-orange-50 dark:bg-orange-950/30 border-l-orange-500 border-y border-r border-orange-200",
                      priority === "medium" && "bg-amber-50/50 dark:bg-amber-950/20 border-l-amber-500 border-y border-r border-amber-200",
                      priority === "low" && "bg-card border-l-muted-foreground/30 border-y border-r border-border"
                    )}
                  >
                    <PriorityBadge priority={priority} />
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-foreground truncate">{r.customer_name}</div>
                      <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground mt-0.5 flex-wrap">
                        <span className={cn("font-mono font-bold", cd.isOverdue ? "text-red-600" : "text-emerald-600")}>
                          {cd.text}
                        </span>
                        <span className="opacity-50">·</span>
                        <span className={cn(!r.last_contact_at && "text-red-600 font-bold")}>{lastContactText}</span>
                      </div>
                      {r.note && <div className="text-muted-foreground truncate text-[10px] mt-0.5">{r.note}</div>}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {r.customer_phone && (
                        <a
                          href={`tel:${r.customer_phone}`}
                          className="p-1.5 rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-700"
                          title="اتصال"
                        >
                          <Phone className="w-3 h-3" />
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => handleMarkContacted(r)}
                        disabled={contactingId === r.id}
                        className={cn(
                          "inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold transition-colors",
                          "bg-emerald-600 hover:bg-emerald-700 text-white",
                          "disabled:opacity-60 disabled:cursor-not-allowed"
                        )}
                        title="تسجيل تواصل سريع"
                      >
                        {contactingId === r.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-3 h-3" />
                        )}
                        تم التواصل
                      </button>
                    </div>
                  </div>
                );
              })}
              {todayList.length > 5 && (
                <div className="text-[10px] text-center text-muted-foreground pt-1">
                  +{todayList.length - 5} متابعات أخرى
                </div>
              )}
            </div>
          )}
          {overdue > 0 && (
            <div className="mt-2 pt-2 border-t text-[10px] text-red-600 font-bold">
              ⚠️ {overdue} متأخّر — تواصل فوراً
            </div>
          )}
        </SectionCard>

        {/* ================ 4) مواعيد/تذكيرات قادمة ================ */}
        <SectionCard
          className="lg:col-span-2 from-purple-500/10 to-transparent border-purple-200 dark:border-purple-900"
          icon={<CalendarDays className="w-5 h-5 text-purple-600" />}
          title="تذكيرات قادمة"
          subtitle="خلال ٧ أيام"
          tone="purple"
          totalLabel={`${upcomingList.length} موعد`}
        >
          {upcomingList.length === 0 ? (
            <div className="text-xs text-muted-foreground py-4 text-center">
              لا مواعيد قادمة
            </div>
          ) : (
            <div className="space-y-1.5 max-h-[160px] overflow-y-auto">
              {upcomingList.slice(0, 5).map((r) => {
                const priority = computePriority(r);
                const cd = fmtCountdown(r.reminder_at);
                return (
                  <div
                    key={r.id}
                    className={cn(
                      "flex items-center gap-2 p-1.5 rounded border-l-4 border-y border-r bg-card text-[11px]",
                      priority === "high" ? "border-l-orange-500 border-orange-200" : "border-l-purple-400 border-border"
                    )}
                  >
                    <PriorityBadge priority={priority} compact />
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-foreground truncate">{r.customer_name}</div>
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground flex-wrap">
                        <Clock className="w-2.5 h-2.5" />
                        {new Date(r.reminder_at).toLocaleDateString("ar-EG", { weekday: "short", day: "numeric", month: "short" })} {fmtTime(r.reminder_at)}
                        <span className="opacity-50">·</span>
                        <span className="font-mono text-emerald-600 font-bold">{cd.text}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
              {upcomingList.length > 5 && (
                <div className="text-[10px] text-center text-muted-foreground pt-1">
                  +{upcomingList.length - 5} موعد آخر
                </div>
              )}
            </div>
          )}
        </SectionCard>

        {/* ================ 5) سجلات الزوار ================ */}
        <SectionCard
          className="lg:col-span-2 from-blue-500/10 to-transparent border-blue-200 dark:border-blue-900"
          icon={<Eye className="w-5 h-5 text-blue-600" />}
          title="سجلات الزوار"
          subtitle="مين بيتصفّح دلوقتي"
          tone="blue"
          totalLabel={
            visitorsNow > 0 ? (
              <span className="inline-flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {visitorsNow} مباشر
              </span>
            ) : "لا زوار الآن"
          }
        >
          <div className="flex flex-col items-center justify-center py-2">
            <div className="text-5xl font-black text-blue-700 dark:text-blue-300 leading-none">
              {visitorsNow}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">زائر آخر ٣٠ دقيقة</div>
          </div>
          <div className="grid grid-cols-2 gap-1.5 mt-2">
            <Button asChild size="sm" variant="outline" className="h-8 text-[11px] gap-1">
              <Link to="/admin/active-visitors">
                <Activity className="w-3 h-3" />
                النشطون الآن
              </Link>
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-[11px] gap-1"
              onClick={() => onJumpToTab("yesterday")}
            >
              زوار أمس
              <ArrowLeft className="w-3 h-3" />
            </Button>
          </div>
        </SectionCard>

      </div>
    </div>
  );
}

// ===================== Sub-components =====================

interface SectionCardProps {
  className?: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  tone: "emerald" | "red" | "amber" | "purple" | "blue";
  totalLabel: React.ReactNode;
  children: React.ReactNode;
}

function SectionCard({ className, icon, title, subtitle, totalLabel, children }: SectionCardProps) {
  return (
    <Card className={cn(
      "p-3 bg-gradient-to-br border-2 flex flex-col",
      className
    )}>
      <div className="flex items-start justify-between gap-2 mb-2.5 pb-2 border-b border-border/50">
        <div className="flex items-center gap-2 min-w-0">
          <div className="shrink-0">{icon}</div>
          <div className="min-w-0">
            <div className="text-sm font-bold text-foreground truncate">{title}</div>
            <div className="text-[10px] text-muted-foreground truncate">{subtitle}</div>
          </div>
        </div>
        <div className="text-[10px] font-bold text-muted-foreground shrink-0 text-left">
          {totalLabel}
        </div>
      </div>
      <div className="flex-1">{children}</div>
    </Card>
  );
}

interface MiniStatProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone: string;
  to?: string;
  onClick?: () => void;
  urgent?: boolean;
}

function MiniStat({ label, value, icon, to, onClick, urgent }: MiniStatProps) {
  const inner = (
    <div className={cn(
      "p-2 rounded-lg border bg-card hover:shadow-sm transition flex items-center gap-2 cursor-pointer h-full",
      urgent && "border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20"
    )}>
      <div className="p-1.5 rounded bg-emerald-500/10 text-emerald-700 shrink-0">{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="text-lg font-black text-foreground leading-none">{value}</div>
        <div className="text-[10px] text-muted-foreground truncate mt-0.5">{label}</div>
      </div>
      {value > 0 && <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />}
    </div>
  );
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="text-right w-full">
        {inner}
      </button>
    );
  }
  return to ? <Link to={to}>{inner}</Link> : inner;
}

interface UrgentTileProps {
  label: string;
  hint: string;
  value: number;
  icon: React.ReactNode;
  onClick: () => void;
}

function UrgentTile({ label, hint, value, icon, onClick }: UrgentTileProps) {
  const isUrgent = value > 0;
  return (
    <button
      onClick={onClick}
      className={cn(
        "p-2 rounded-lg border-2 text-right transition hover:shadow-md cursor-pointer flex flex-col items-start gap-1",
        isUrgent
          ? "bg-red-50 dark:bg-red-950/30 border-red-300 dark:border-red-800"
          : "bg-card border-border"
      )}
    >
      <div className="flex items-center justify-between w-full">
        <div className={cn("p-1.5 rounded", isUrgent ? "bg-red-500/15 text-red-700" : "bg-muted text-muted-foreground")}>
          {icon}
        </div>
        {isUrgent && <Badge className="bg-red-600 text-white text-[9px] h-4 px-1">عاجل</Badge>}
      </div>
      <div className={cn("text-2xl font-black leading-none", isUrgent ? "text-red-700 dark:text-red-400" : "text-foreground")}>
        {value}
      </div>
      <div className="text-[10px] font-medium text-foreground leading-tight">{label}</div>
      <div className="text-[9px] text-muted-foreground">{hint}</div>
    </button>
  );
}

// ===== ShortcutTile — بطاقة مختصر علوي =====
interface ShortcutTileProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
  tone: "emerald" | "red" | "amber" | "slate";
  to?: string;
  onClick?: () => void;
  ctaLabel: string;
  urgent?: boolean;
}

const shortcutTones: Record<ShortcutTileProps["tone"], { wrap: string; valueColor: string; iconBg: string }> = {
  emerald: {
    wrap: "from-emerald-500/10 to-transparent border-emerald-200 dark:border-emerald-900",
    valueColor: "text-emerald-700 dark:text-emerald-300",
    iconBg: "bg-emerald-500/15 text-emerald-700",
  },
  red: {
    wrap: "from-red-500/10 to-transparent border-red-200 dark:border-red-900",
    valueColor: "text-red-700 dark:text-red-300",
    iconBg: "bg-red-500/15 text-red-700",
  },
  amber: {
    wrap: "from-amber-500/10 to-transparent border-amber-200 dark:border-amber-900",
    valueColor: "text-amber-700 dark:text-amber-300",
    iconBg: "bg-amber-500/15 text-amber-700",
  },
  slate: {
    wrap: "from-muted/30 to-transparent border-border",
    valueColor: "text-foreground",
    iconBg: "bg-muted text-muted-foreground",
  },
};

function ShortcutTile({ icon, label, value, hint, tone, to, onClick, ctaLabel, urgent }: ShortcutTileProps) {
  const t = shortcutTones[tone];
  const inner = (
    <Card className={cn(
      "p-3 bg-gradient-to-br border-2 hover:shadow-md transition cursor-pointer h-full",
      t.wrap,
      urgent && "ring-2 ring-red-300 dark:ring-red-800 animate-pulse"
    )}>
      <div className="flex items-center gap-3">
        <div className={cn("p-2 rounded-lg shrink-0", t.iconBg)}>{icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className={cn("text-2xl font-black leading-none", t.valueColor)}>{value}</span>
            <span className="text-[10px] text-muted-foreground truncate">{label}</span>
          </div>
          <div className="text-[10px] text-muted-foreground mt-1 truncate">{hint}</div>
        </div>
        <div className="flex items-center gap-1 text-[10px] font-bold text-foreground/70 shrink-0">
          {ctaLabel}
          <ChevronRight className="w-3 h-3" />
        </div>
      </div>
    </Card>
  );
  if (to) return <Link to={to} className="block">{inner}</Link>;
  return <button onClick={onClick} className="text-right w-full block">{inner}</button>;
}

// ===== شارة الأولوية =====
interface PriorityBadgeProps {
  priority: Priority;
  compact?: boolean;
}

const priorityStyles: Record<Priority, { bg: string; label: string; emoji: string }> = {
  critical: { bg: "bg-red-600 text-white", label: "حرج", emoji: "🔥" },
  high:     { bg: "bg-orange-500 text-white", label: "عالي", emoji: "⚡" },
  medium:   { bg: "bg-amber-400 text-amber-950", label: "متوسط", emoji: "•" },
  low:      { bg: "bg-muted text-muted-foreground", label: "عادي", emoji: "·" },
};

function PriorityBadge({ priority, compact }: PriorityBadgeProps) {
  const s = priorityStyles[priority];
  if (compact) {
    return (
      <span
        className={cn("inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold shrink-0", s.bg)}
        title={s.label}
      >
        {s.emoji}
      </span>
    );
  }
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0 leading-none h-5",
        s.bg
      )}
    >
      <span className="text-[10px]">{s.emoji}</span>
      {s.label}
    </span>
  );
}
