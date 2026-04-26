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
  Sparkles, ChevronRight, Phone, Timer, TrendingUp,
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
  urgentOrdersCount: number;
  hotLeadsCount: number;
  chatbotPendingCount: number;
  onJumpToTab: (tab: "urgent" | "chatbot" | "search" | "yesterday") => void;
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

  const fetchHero = async () => {
    if (!user) return;
    const now = Date.now();
    const since30m = new Date(now - 30 * 60 * 1000).toISOString();
    const since24h = new Date(now - 24 * 3600 * 1000).toISOString();

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
  };

  useEffect(() => {
    fetchHero();
    const t = setInterval(fetchHero, 60_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const { overdue, todayList, upcomingList } = useMemo(() => {
    const nowMs = Date.now();
    const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);
    let overdue = 0;
    const todayList: Reminder[] = [];
    const upcomingList: Reminder[] = [];
    for (const r of reminders) {
      const t = new Date(r.reminder_at).getTime();
      if (t < nowMs) { overdue++; todayList.push(r); }
      else if (t <= todayEnd.getTime()) todayList.push(r);
      else upcomingList.push(r);
    }
    return { overdue, todayList, upcomingList };
  }, [reminders]);

  const totalNewToday = newOrders24h + newSignups24h + instapayPending + partRequestsNew;
  const totalUrgent = urgentOrdersCount + chatbotPendingCount + hotLeadsCount;
  const totalFollowups = todayList.length;

  const fmtTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
  };
  const fmtRel = (iso: string) => {
    const diff = Math.round((new Date(iso).getTime() - Date.now()) / 60000);
    if (diff < -60 * 24) return `متأخر ${Math.floor(-diff / (60 * 24))}ي`;
    if (diff < -60) return `متأخر ${Math.floor(-diff / 60)}س`;
    if (diff < 0) return `متأخر ${-diff}د`;
    if (diff < 60) return `بعد ${diff}د`;
    if (diff < 60 * 24) return `بعد ${Math.floor(diff / 60)}س`;
    return `بعد ${Math.floor(diff / (60 * 24))}ي`;
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
              to="/admin?section=orders"
            />
            <MiniStat
              label="تسجيلات جديدة"
              value={newSignups24h}
              icon={<UserPlus className="w-3.5 h-3.5" />}
              tone="emerald"
              to="/admin?section=customers"
            />
            <MiniStat
              label="إيصالات InstaPay"
              value={instapayPending}
              icon={<Wallet className="w-3.5 h-3.5" />}
              tone="emerald"
              to="/admin?section=instapay"
              urgent={instapayPending > 0}
            />
            <MiniStat
              label="طلبات قطع غيار"
              value={partRequestsNew}
              icon={<FileSearch className="w-3.5 h-3.5" />}
              tone="emerald"
              to="/admin?section=part-requests"
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
          totalLabel={`${totalFollowups} عميل`}
        >
          {todayList.length === 0 ? (
            <div className="text-xs text-muted-foreground py-4 text-center">
              لا توجد متابعات لليوم 🎉
            </div>
          ) : (
            <div className="space-y-1.5 max-h-[140px] overflow-y-auto">
              {todayList.slice(0, 5).map((r) => {
                const isOverdue = new Date(r.reminder_at).getTime() < Date.now();
                return (
                  <div
                    key={r.id}
                    className={cn(
                      "flex items-center gap-2 p-1.5 rounded border text-[11px]",
                      isOverdue
                        ? "bg-red-50 dark:bg-red-950/30 border-red-200"
                        : "bg-card border-border"
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-foreground truncate">{r.customer_name}</div>
                      {r.note && <div className="text-muted-foreground truncate">{r.note}</div>}
                    </div>
                    <span className={cn(
                      "text-[10px] font-mono shrink-0",
                      isOverdue ? "text-red-600 font-bold" : "text-amber-600"
                    )}>
                      {fmtRel(r.reminder_at)}
                    </span>
                    {r.customer_phone && (
                      <a
                        href={`tel:${r.customer_phone}`}
                        className="p-1 rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-700 shrink-0"
                        title="اتصال"
                      >
                        <Phone className="w-3 h-3" />
                      </a>
                    )}
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
            <div className="space-y-1.5 max-h-[140px] overflow-y-auto">
              {upcomingList.slice(0, 5).map((r) => (
                <div
                  key={r.id}
                  className="flex items-center gap-2 p-1.5 rounded border bg-card text-[11px]"
                >
                  <Clock className="w-3 h-3 text-purple-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-foreground truncate">{r.customer_name}</div>
                    <div className="text-muted-foreground text-[10px]">
                      {new Date(r.reminder_at).toLocaleDateString("ar-EG", { weekday: "short", day: "numeric", month: "short" })} — {fmtTime(r.reminder_at)}
                    </div>
                  </div>
                </div>
              ))}
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
              <Link to="/admin/staff-home">
                <Users className="w-3 h-3" />
                التفصيلية
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
  urgent?: boolean;
}

function MiniStat({ label, value, icon, to, urgent }: MiniStatProps) {
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
