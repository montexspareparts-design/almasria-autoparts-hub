import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Printer,
  ShoppingCart,
  Phone,
  CheckCheck,
  Users as UsersIcon,
  ShieldCheck,
  CreditCard,
  Database,
  ClipboardList,
  TrendingUp,
  TrendingDown,
  Flame,
  FileText,
  AlertTriangle,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

/**
 * StaffDailyBriefPage — Auto-generated single-page daily brief per staff role.
 *
 * - admin    : supervisor KPIs (orders today, dealer apps, ERP alerts, missing reports)
 * - moderator: sales KPIs    (calls/whatsapp/tasks done, leads contacted, conversions)
 *
 * All numbers come from live queries — no manual entry. Page is print-ready (one A4).
 */

type StaffRole = "admin" | "moderator";

interface KpiCard {
  label: string;
  value: number | string;
  hint?: string;
  icon: typeof ShoppingCart;
  tone: "primary" | "success" | "warning" | "danger" | "info" | "neutral";
}

const TONE_STYLES: Record<KpiCard["tone"], { bg: string; ring: string; icon: string; value: string }> = {
  primary: { bg: "bg-primary/5",   ring: "border-primary/30",   icon: "text-primary",       value: "text-primary" },
  success: { bg: "bg-emerald-50",  ring: "border-emerald-200",  icon: "text-emerald-600",   value: "text-emerald-700" },
  warning: { bg: "bg-amber-50",    ring: "border-amber-200",    icon: "text-amber-600",     value: "text-amber-800" },
  danger:  { bg: "bg-red-50",      ring: "border-red-200",      icon: "text-red-600",       value: "text-red-700" },
  info:    { bg: "bg-blue-50",     ring: "border-blue-200",     icon: "text-blue-600",      value: "text-blue-700" },
  neutral: { bg: "bg-muted/40",    ring: "border-border",       icon: "text-muted-foreground", value: "text-foreground" },
};

const HOUR = 60 * 60 * 1000;

export default function StaffDailyBriefPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState<StaffRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<KpiCard[]>([]);
  const [highlights, setHighlights] = useState<string[]>([]);
  const [actions, setActions] = useState<string[]>([]);
  const [generatedAt, setGeneratedAt] = useState<Date>(new Date());
  const [staffName, setStaffName] = useState<string>("");

  // Determine role + name
  useEffect(() => {
    if (!user) return;
    let cancel = false;
    (async () => {
      const [roles, profile] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", user.id),
        supabase.from("profiles").select("full_name").eq("user_id", user.id).maybeSingle(),
      ]);
      if (cancel) return;
      const list = (roles.data || []).map((r) => r.role);
      if (list.includes("admin")) setRole("admin");
      else if (list.includes("moderator")) setRole("moderator");
      else setRole(null);
      setStaffName(profile.data?.full_name || user.email || "موظف");
    })();
    return () => { cancel = true; };
  }, [user]);

  const loadBrief = async () => {
    if (!user || !role) return;
    setLoading(true);
    try {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const startIso = startOfDay.toISOString();
      const dayKey = startOfDay.toISOString().slice(0, 10);
      const yesterdayStart = new Date(startOfDay.getTime() - 24 * HOUR).toISOString();

      if (role === "admin") {
        // Aggregate supervisor-level numbers
        const [
          ordersToday,
          ordersYesterday,
          pendingApps,
          erpAlerts,
          stalePayments,
          modsCount,
          answeredToday,
          stockAlertsPending,
          highValueOpen,
        ] = await Promise.all([
          supabase.from("orders").select("id, total_amount, status, first_contacted_at, created_at").gte("created_at", startIso),
          supabase.from("orders").select("id, total_amount").gte("created_at", yesterdayStart).lt("created_at", startIso),
          supabase.from("dealer_applications").select("id").eq("status", "pending"),
          supabase.from("erp_sync_alerts").select("id").gte("created_at", startIso),
          supabase.from("payment_transactions").select("id").eq("status", "pending").lt("created_at", new Date(Date.now() - 2 * HOUR).toISOString()),
          supabase.from("user_roles").select("user_id").eq("role", "moderator"),
          supabase.from("daily_report_answers").select("user_id").eq("report_date", dayKey),
          supabase.from("stock_alerts").select("id").eq("is_active", true).is("notified_at", null),
          supabase.from("orders").select("id").in("status", ["pending", "pending_approval"]).gte("total_amount", 5000),
        ]);

        const ot = ordersToday.data || [];
        const oy = ordersYesterday.data || [];
        const totalToday = ot.reduce((s, o) => s + Number(o.total_amount || 0), 0);
        const totalYest = oy.reduce((s, o) => s + Number(o.total_amount || 0), 0);
        const confirmed = ot.filter((o) => o.status === "confirmed" || o.status === "shipped" || o.status === "delivered").length;
        const pending = ot.filter((o) => o.status === "pending" || o.status === "pending_approval").length;
        const contacted = ot.filter((o) => !!o.first_contacted_at).length;
        const conversionRate = ot.length ? Math.round((confirmed / ot.length) * 100) : 0;

        const modIds = (modsCount.data || []).map((m) => m.user_id);
        const answeredSet = new Set((answeredToday.data || []).map((a) => a.user_id));
        const missingReports = modIds.filter((id) => !answeredSet.has(id)).length;

        const trend = totalYest === 0
          ? (totalToday > 0 ? "+∞" : "0%")
          : `${totalToday >= totalYest ? "+" : ""}${Math.round(((totalToday - totalYest) / totalYest) * 100)}%`;

        setKpis([
          { label: "طلبات اليوم", value: ot.length, hint: `قيمتها ${totalToday.toLocaleString("ar-EG")} ج.م (${trend} من أمس)`, icon: ShoppingCart, tone: "primary" },
          { label: "طلبات معتمدة", value: confirmed, hint: `${conversionRate}% من إجمالي اليوم`, icon: CheckCheck, tone: "success" },
          { label: "بانتظار اعتماد", value: pending, hint: pending ? "تحتاج مراجعة" : "صفر — ممتاز", icon: AlertTriangle, tone: pending > 0 ? "warning" : "neutral" },
          { label: "تواصل أولي", value: contacted, hint: `من أصل ${ot.length} طلب`, icon: Phone, tone: "info" },
          { label: "طلبات تجار جديدة", value: pendingApps.data?.length || 0, hint: "بانتظار اعتمادك", icon: UsersIcon, tone: (pendingApps.data?.length || 0) > 0 ? "warning" : "neutral" },
          { label: "طلبات عالية القيمة", value: highValueOpen.data?.length || 0, hint: "≥ 5,000 ج.م", icon: ShieldCheck, tone: (highValueOpen.data?.length || 0) > 0 ? "warning" : "neutral" },
          { label: "تنبيهات ERP اليوم", value: erpAlerts.data?.length || 0, hint: "مزامنة الفيصل", icon: Database, tone: (erpAlerts.data?.length || 0) > 0 ? "danger" : "success" },
          { label: "مدفوعات معلّقة", value: stalePayments.data?.length || 0, hint: "أكثر من ساعتين", icon: CreditCard, tone: (stalePayments.data?.length || 0) > 0 ? "warning" : "neutral" },
          { label: "موظفون بدون تقرير", value: missingReports, hint: `من ${modIds.length} مندوب`, icon: ClipboardList, tone: missingReports > 0 ? "warning" : "success" },
          { label: "تنبيهات مخزون لم تُبلَّغ", value: stockAlertsPending.data?.length || 0, hint: "تجار ينتظرون توفر منتجات", icon: TrendingDown, tone: (stockAlertsPending.data?.length || 0) > 0 ? "info" : "neutral" },
        ]);

        const hl: string[] = [];
        if (totalToday > totalYest && totalYest > 0) hl.push(`📈 المبيعات أعلى من أمس بنسبة ${trend}`);
        if (conversionRate >= 60) hl.push(`✅ معدّل اعتماد الطلبات ممتاز (${conversionRate}%)`);
        if (confirmed === 0 && ot.length > 0) hl.push(`⚠️ لا توجد طلبات معتمدة بعد اليوم`);
        if ((pendingApps.data?.length || 0) >= 3) hl.push(`🔔 ${pendingApps.data!.length} طلبات تجار تنتظر مراجعتك`);
        if (missingReports > 0) hl.push(`📋 ${missingReports} موظف لم يُسلّم تقرير اليوم`);
        if ((erpAlerts.data?.length || 0) > 0) hl.push(`🚨 ${erpAlerts.data!.length} تنبيه مزامنة ERP يحتاج مراجعة`);
        setHighlights(hl);

        const ac: string[] = [];
        if (pending > 0) ac.push(`اعتماد ${pending} طلب معلّق`);
        if ((pendingApps.data?.length || 0) > 0) ac.push(`مراجعة ${pendingApps.data!.length} طلب تاجر جديد`);
        if ((stalePayments.data?.length || 0) > 0) ac.push(`متابعة ${stalePayments.data!.length} معاملة دفع معلّقة`);
        if (missingReports > 0) ac.push(`متابعة ${missingReports} موظف بدون تقرير`);
        if ((erpAlerts.data?.length || 0) > 0) ac.push(`فحص ${erpAlerts.data!.length} تنبيه ERP`);
        setActions(ac);

      } else {
        // moderator brief
        const [
          myComms,
          myCommsYest,
          myTasksDone,
          quotesOld,
          ordersUncontacted,
          leadsContactedToday,
          activeNow,
          newOrdersToday,
        ] = await Promise.all([
          supabase.from("customer_communications").select("comm_type").eq("staff_user_id", user.id).gte("created_at", startIso),
          supabase.from("customer_communications").select("id").eq("staff_user_id", user.id).gte("created_at", yesterdayStart).lt("created_at", startIso),
          supabase.from("customer_communications").select("id").eq("staff_user_id", user.id).eq("is_done", true).gte("done_at", startIso),
          supabase.from("dealer_quotes").select("id").in("status", ["draft", "sent"]).lt("created_at", new Date(Date.now() - 24 * HOUR).toISOString()),
          supabase.from("orders").select("id").eq("status", "pending").is("first_contacted_at", null).lt("created_at", new Date(Date.now() - 2 * HOUR).toISOString()),
          supabase.from("leads").select("id").eq("status", "contacted").gte("updated_at", startIso),
          supabase.from("page_visits").select("user_id").gte("visited_at", new Date(Date.now() - 30 * 60 * 1000).toISOString()).not("user_id", "is", null),
          supabase.from("orders").select("id, first_contacted_at").gte("created_at", startIso),
        ]);

        const comms = myComms.data || [];
        const calls = comms.filter((c) => c.comm_type === "phone").length;
        const wa = comms.filter((c) => c.comm_type === "whatsapp").length;
        const tasks = (myTasksDone.data || []).length;
        const yesterdayTotal = (myCommsYest.data || []).length;
        const trend = yesterdayTotal === 0
          ? (comms.length > 0 ? "+∞" : "0%")
          : `${comms.length >= yesterdayTotal ? "+" : ""}${Math.round(((comms.length - yesterdayTotal) / yesterdayTotal) * 100)}%`;

        const ordersAll = newOrdersToday.data || [];
        const orderConvRate = ordersAll.length
          ? Math.round((ordersAll.filter((o) => !!o.first_contacted_at).length / ordersAll.length) * 100)
          : 0;

        const activeUserIds = new Set((activeNow.data || []).map((v) => v.user_id));

        setKpis([
          { label: "إجمالي تواصل اليوم", value: comms.length, hint: `${trend} من أمس`, icon: Phone, tone: "primary" },
          { label: "مكالمات", value: calls, hint: "اضغط زر الاتصال يسجّل تلقائي", icon: Phone, tone: "info" },
          { label: "رسائل واتساب", value: wa, hint: "تم تسجيلها أوتوماتيكياً", icon: Sparkles, tone: "success" },
          { label: "مهام مُنجزة", value: tasks, hint: "من لوحة المهام", icon: CheckCheck, tone: "success" },
          { label: "طلبات اليوم", value: ordersAll.length, hint: `${orderConvRate}% منها تم التواصل`, icon: ShoppingCart, tone: "primary" },
          { label: "بدون تواصل", value: ordersUncontacted.data?.length || 0, hint: "أولوية عاجلة", icon: AlertTriangle, tone: (ordersUncontacted.data?.length || 0) > 0 ? "danger" : "success" },
          { label: "عروض أسعار قديمة", value: quotesOld.data?.length || 0, hint: "أكثر من 24 ساعة", icon: FileText, tone: (quotesOld.data?.length || 0) > 0 ? "warning" : "neutral" },
          { label: "Leads حُوّلت", value: leadsContactedToday.data?.length || 0, hint: "إلى حالة تم التواصل", icon: Flame, tone: "success" },
          { label: "زوار نشطون الآن", value: activeUserIds.size, hint: "آخر 30 دقيقة", icon: UsersIcon, tone: "info" },
          { label: "معدّل تحويل تواصل", value: `${orderConvRate}%`, hint: "طلبات تم التواصل / الإجمالي", icon: TrendingUp, tone: orderConvRate >= 70 ? "success" : "warning" },
        ]);

        const hl: string[] = [];
        if (comms.length > yesterdayTotal && yesterdayTotal > 0) hl.push(`📈 تواصلك اليوم أعلى من أمس بنسبة ${trend}`);
        if (calls + wa >= 20) hl.push(`💪 ${calls + wa} تواصل عميل اليوم — أداء قوي`);
        if (tasks >= 10) hl.push(`✅ أنجزت ${tasks} مهمة من لوحة المهام`);
        if ((ordersUncontacted.data?.length || 0) > 0) hl.push(`⚠️ ${ordersUncontacted.data!.length} طلب بدون تواصل أولي`);
        if ((quotesOld.data?.length || 0) >= 3) hl.push(`📄 ${quotesOld.data!.length} عرض سعر قديم يحتاج متابعة`);
        if (activeUserIds.size > 0) hl.push(`🟢 ${activeUserIds.size} عميل نشط حالياً — فرصة تواصل`);
        setHighlights(hl);

        const ac: string[] = [];
        if ((ordersUncontacted.data?.length || 0) > 0) ac.push(`الاتصال بـ ${ordersUncontacted.data!.length} عميل طلباته بدون تواصل`);
        if ((quotesOld.data?.length || 0) > 0) ac.push(`متابعة ${quotesOld.data!.length} عرض سعر قديم`);
        if (activeUserIds.size > 0) ac.push(`اقتناص ${activeUserIds.size} زائر نشط الآن`);
        if (calls + wa < 10) ac.push(`زيادة عدد التواصل اليومي (الحالي ${calls + wa})`);
        setActions(ac);
      }

      setGeneratedAt(new Date());
    } catch (e) {
      console.error("[StaffDailyBriefPage] load error", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (role) loadBrief(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [role]);

  const headerLabel = useMemo(() => {
    if (role === "admin") return "تقرير المشرف اليومي";
    if (role === "moderator") return "تقرير المندوب اليومي";
    return "التقرير اليومي";
  }, [role]);

  if (!user) return null;
  if (role === null && !loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="p-6 max-w-md text-center">
          <p className="text-sm">هذه الصفحة متاحة فقط للموظفين (admin / moderator).</p>
          <Button className="mt-4" onClick={() => navigate("/")}>العودة للرئيسية</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/20">
      {/* Header — hidden on print */}
      <header className="sticky top-0 z-20 bg-background border-b print:hidden">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-4 h-4 ml-1" /> رجوع
            </Button>
            <div>
              <h1 className="font-bold text-base">{headerLabel}</h1>
              <p className="text-xs text-muted-foreground">
                مُولَّد تلقائياً — {format(generatedAt, "EEEE d MMMM yyyy · HH:mm", { locale: ar })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="outline" onClick={loadBrief} disabled={loading}>
              <RefreshCw className={cn("w-4 h-4 ml-1", loading && "animate-spin")} /> تحديث
            </Button>
            <Button size="sm" onClick={() => window.print()}>
              <Printer className="w-4 h-4 ml-1" /> طباعة / PDF
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 print:py-2 print:px-0">
        {/* Print header */}
        <div className="hidden print:block mb-4 text-center border-b pb-3">
          <h1 className="text-xl font-bold">{headerLabel}</h1>
          <p className="text-xs">
            {staffName} — {format(generatedAt, "EEEE d MMMM yyyy · HH:mm", { locale: ar })}
          </p>
        </div>

        <Card className="p-4 mb-4 print:shadow-none print:border-0">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-4 h-4 text-primary" />
            <h2 className="font-bold text-sm">ملخّص اليوم — {staffName}</h2>
            <Badge variant="outline" className="text-[10px]">
              {role === "admin" ? "Supervisor" : "Sales Rep"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            تقرير صفحة واحدة قابل للطباعة، يُحدَّث لحظياً من بيانات النظام دون تدخل يدوي.
          </p>
        </Card>

        {/* KPI grid */}
        <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
          {loading
            ? Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)
            : kpis.map((k, i) => {
                const Icon = k.icon;
                const t = TONE_STYLES[k.tone];
                return (
                  <div
                    key={i}
                    className={cn(
                      "rounded-lg border-2 p-3 transition-colors",
                      t.bg,
                      t.ring,
                      "print:break-inside-avoid"
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <Icon className={cn("w-4 h-4", t.icon)} />
                    </div>
                    <div className={cn("text-2xl font-bold leading-tight", t.value)}>
                      {k.value}
                    </div>
                    <div className="text-xs font-semibold mt-0.5">{k.label}</div>
                    {k.hint && <div className="text-[10px] text-muted-foreground mt-0.5">{k.hint}</div>}
                  </div>
                );
              })}
        </section>

        {/* Highlights & actions */}
        <div className="grid md:grid-cols-2 gap-3">
          <Card className="p-4 print:shadow-none">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <h3 className="font-bold text-sm">أبرز الإحصائيات</h3>
            </div>
            {loading ? (
              <Skeleton className="h-24 w-full" />
            ) : highlights.length === 0 ? (
              <p className="text-xs text-muted-foreground">لا توجد ملاحظات بارزة اليوم.</p>
            ) : (
              <ul className="space-y-1.5 text-xs">
                {highlights.map((h, i) => (
                  <li key={i} className="leading-relaxed">{h}</li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="p-4 print:shadow-none">
            <div className="flex items-center gap-2 mb-2">
              <CheckCheck className="w-4 h-4 text-primary" />
              <h3 className="font-bold text-sm">الإجراءات المقترحة لاليوم</h3>
            </div>
            {loading ? (
              <Skeleton className="h-24 w-full" />
            ) : actions.length === 0 ? (
              <p className="text-xs text-muted-foreground">جميع المهام محدّثة — أداء ممتاز ✨</p>
            ) : (
              <ol className="space-y-1.5 text-xs list-decimal list-inside">
                {actions.map((a, i) => (
                  <li key={i} className="leading-relaxed">{a}</li>
                ))}
              </ol>
            )}
          </Card>
        </div>

        <p className="text-[10px] text-muted-foreground text-center mt-6 print:mt-3">
          المصرية جروب — تقرير يُولَّد آلياً من لوحة المهام · {format(generatedAt, "yyyy-MM-dd HH:mm")}
        </p>
      </main>
    </div>
  );
}
