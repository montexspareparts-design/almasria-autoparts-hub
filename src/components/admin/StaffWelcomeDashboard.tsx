import { useEffect, useState, lazy, Suspense } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  MessageCircle, ShoppingCart, Clock, Loader2, ArrowLeft, UserCheck,
  PhoneCall, UserPlus, Search, Trophy, Star, Zap, Target,
  AlertTriangle, Flame, TimerOff, UserX,
  LayoutDashboard, ListChecks,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import { canAccessSection, buildSafeNavigate } from "@/lib/staffPermissions";

// Lazy-load the role tasks panel so the welcome dashboard renders fast
// while the panel hydrates its own data in the background.
const StaffRoleTasksPanel = lazy(() => import("@/components/staff/StaffRoleTasksPanel"));

interface WelcomeStats {
  assignedConversations: number;
  pendingOrdersCount: number;
  unreadMessagesCount: number;
  myCallsToday: number;
  myLeadsToday: number;
  myAvgRating: number | null;
  myRank: number | null;
  totalStaff: number;
}

interface StatusCounters {
  critical: number;       // طلبات pending > 30 دقيقة بدون رد
  slaBreached: number;    // طلبات pending > 60 دقيقة
  hotLeads: number;       // leads status=new خلال آخر 24س
  noContact: number;      // عملاء مسندين دون تواصل > 7 أيام (أو إطلاقاً)
}

interface RecentConversation {
  id: string;
  contact_name: string | null;
  phone: string;
  last_message_preview: string | null;
  last_message_at: string;
  unread_count: number;
}

interface PendingOrder {
  id: string;
  order_number: string;
  total_amount: number;
  created_at: string;
  status: string;
}

interface StaffWelcomeDashboardProps {
  onNavigate?: (section: string) => void;
}

export default function StaffWelcomeDashboard({ onNavigate }: StaffWelcomeDashboardProps) {
  const { user, isAdmin, isModerator } = useAuth();
  const [stats, setStats] = useState<WelcomeStats | null>(null);
  const [statusCounters, setStatusCounters] = useState<StatusCounters>({
    critical: 0, slaBreached: 0, hotLeads: 0, noContact: 0,
  });
  const [conversations, setConversations] = useState<RecentConversation[]>([]);
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([]);
  const [staffName, setStaffName] = useState<string>("");
  const [loading, setLoading] = useState(true);

  // Single source of truth for permissions — see src/lib/staffPermissions.ts.
  // The "صلاحيات الأدوار" admin screen renders the exact same lists.
  const roles = { isAdmin, isModerator };
  const canAccess = (section: string) => canAccessSection(section, roles);
  const safeNavigate = buildSafeNavigate(onNavigate, roles, "daily-dashboard");

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayIso = todayStart.toISOString();

    // Status thresholds
    const now = Date.now();
    const critical30 = new Date(now - 30 * 60 * 1000).toISOString();   // طلب pending أكتر من 30د
    const sla60 = new Date(now - 60 * 60 * 1000).toISOString();        // SLA متجاوز > 60د
    const last24h = new Date(now - 24 * 60 * 60 * 1000).toISOString(); // hot leads
    const days7Ago = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString(); // بدون تواصل > 7 أيام

    const [
      profileRes, assignedRes, unreadRes, pendingCountRes, recentConvRes, pendingOrdersRes,
      myCallsRes, myLeadsRes, myRatingsRes, allStaffRes, allCommsTodayRes,
      criticalRes, slaBreachedRes, hotLeadsRes, myAssignmentsRes,
    ] = await Promise.all([
      supabase.from("profiles").select("full_name, email").eq("user_id", user.id).maybeSingle(),
      supabase.from("whatsapp_conversations").select("*", { count: "exact", head: true }).eq("assigned_to", user.id).eq("is_archived", false),
      supabase.from("whatsapp_conversations").select("unread_count").eq("assigned_to", user.id).eq("is_archived", false),
      supabase.from("orders").select("*", { count: "exact", head: true }).in("status", ["pending", "awaiting_payment"]),
      supabase.from("whatsapp_conversations").select("id, contact_name, phone, last_message_preview, last_message_at, unread_count").eq("is_archived", false).order("last_message_at", { ascending: false }).limit(5),
      supabase.from("orders").select("id, order_number, total_amount, created_at, status").in("status", ["pending", "awaiting_payment"]).order("created_at", { ascending: false }).limit(5),
      supabase.from("customer_communications").select("*", { count: "exact", head: true }).eq("staff_user_id", user.id).gte("created_at", todayIso),
      supabase.from("leads").select("*", { count: "exact", head: true }).eq("created_by", user.id).gte("created_at", todayIso),
      supabase.from("support_request_ratings").select("rating").eq("staff_user_id", user.id),
      supabase.from("user_roles").select("user_id").in("role", ["admin", "moderator"]),
      supabase.from("customer_communications").select("staff_user_id").gte("created_at", todayIso),
      // Critical: طلبات pending أنشأت منذ أكتر من 30د بدون أول تواصل
      supabase.from("orders").select("*", { count: "exact", head: true })
        .in("status", ["pending", "awaiting_payment"])
        .lte("created_at", critical30)
        .is("first_contacted_at", null),
      // SLA متجاوز: طلبات pending > 60د بدون أول تواصل
      supabase.from("orders").select("*", { count: "exact", head: true })
        .in("status", ["pending", "awaiting_payment"])
        .lte("created_at", sla60)
        .is("first_contacted_at", null),
      // Hot Leads: leads جديدة آخر 24س
      supabase.from("leads").select("*", { count: "exact", head: true })
        .eq("status", "new")
        .gte("created_at", last24h),
      // عملاء مسندين لي بدون تواصل أبداً أو منذ > 7 أيام
      supabase.from("customer_assignments").select("last_contacted_at")
        .eq("assigned_staff_id", user.id),
    ]);

    setStaffName(profileRes.data?.full_name || profileRes.data?.email?.split("@")[0] || "");

    const unreadTotal = (unreadRes.data || []).reduce((sum, c) => sum + (c.unread_count || 0), 0);

    const myRatings = (myRatingsRes.data || []).map((r: any) => r.rating);
    const myAvgRating = myRatings.length > 0
      ? myRatings.reduce((a: number, b: number) => a + b, 0) / myRatings.length
      : null;

    const totalStaff = new Set((allStaffRes.data || []).map((r: any) => r.user_id)).size;
    const commsCount: Record<string, number> = {};
    (allCommsTodayRes.data || []).forEach((c: any) => {
      commsCount[c.staff_user_id] = (commsCount[c.staff_user_id] || 0) + 1;
    });
    const ranked = Object.entries(commsCount).sort((a, b) => b[1] - a[1]);
    const myRankIdx = ranked.findIndex(([sid]) => sid === user.id);
    const myRank = myRankIdx >= 0 ? myRankIdx + 1 : null;

    setStats({
      assignedConversations: assignedRes.count || 0,
      pendingOrdersCount: pendingCountRes.count || 0,
      unreadMessagesCount: unreadTotal,
      myCallsToday: myCallsRes.count || 0,
      myLeadsToday: myLeadsRes.count || 0,
      myAvgRating,
      myRank,
      totalStaff,
    });

    // عملاء بدون تواصل: لم يُتواصَل معهم نهائياً، أو آخر تواصل > 7 أيام
    const noContact = (myAssignmentsRes.data || []).filter((a: any) =>
      !a.last_contacted_at || a.last_contacted_at < days7Ago
    ).length;

    setStatusCounters({
      critical: criticalRes.count || 0,
      slaBreached: slaBreachedRes.count || 0,
      hotLeads: hotLeadsRes.count || 0,
      noContact,
    });

    setConversations(recentConvRes.data || []);
    setPendingOrders(pendingOrdersRes.data || []);
    setLoading(false);
  };

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "صباح الخير";
    if (h < 18) return "مساء الخير";
    return "مساء النور";
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const rankBadge = (rank: number | null) => {
    if (!rank) return null;
    if (rank === 1) return { emoji: "🥇", label: "الأول", color: "text-amber-600 bg-amber-50 border-amber-200" };
    if (rank === 2) return { emoji: "🥈", label: "الثاني", color: "text-slate-600 bg-slate-50 border-slate-200" };
    if (rank === 3) return { emoji: "🥉", label: "الثالث", color: "text-orange-600 bg-orange-50 border-orange-200" };
    return { emoji: "⭐", label: `#${rank}`, color: "text-primary bg-primary/10 border-primary/20" };
  };
  const rb = rankBadge(stats?.myRank ?? null);

  return (
    <div className="space-y-4 mb-6">
      {/* Compact Welcome Header — single row with greeting + rank */}
      <Card className="bg-gradient-to-l from-primary/10 via-primary/5 to-transparent border-primary/20">
        <CardContent className="p-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
              <UserCheck className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-bold text-foreground leading-tight">
                {greeting()}{staffName ? `، ${staffName}` : ""} 👋
              </h2>
              <p className="text-xs text-muted-foreground">
                {new Date().toLocaleDateString("ar-EG", { weekday: "long", day: "numeric", month: "long" })}
              </p>
            </div>
            {rb && (
              <button
                onClick={() => onNavigate?.("staff-performance")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold transition hover:scale-105 ${rb.color}`}
                title="عرض أداء الموظفين"
              >
                <Trophy className="w-3.5 h-3.5" />
                <span>{rb.emoji} ترتيبك {rb.label}</span>
                {stats?.totalStaff ? <span className="text-[10px] opacity-70">من {stats.totalStaff}</span> : null}
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* مؤشرات الحالة — Critical / SLA / Hot Leads / بدون تواصل */}
      <StatusIndicatorsBar counters={statusCounters} onNavigate={safeNavigate} canAccess={canAccess} />

      {/* Quick Actions Bar — يفضل ظاهر دايمًا فوق التبويبات */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Button
          variant="outline"
          className="h-auto py-3 flex-col gap-1.5 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700"
          onClick={() => safeNavigate("leads")}
        >
          <UserPlus className="w-5 h-5" />
          <span className="text-xs font-semibold">عميل جديد</span>
        </Button>
        <Button
          variant="outline"
          className="h-auto py-3 flex-col gap-1.5 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700"
          onClick={() => safeNavigate("customers")}
        >
          <PhoneCall className="w-5 h-5" />
          <span className="text-xs font-semibold">تسجيل مكالمة</span>
        </Button>
        <Button
          variant="outline"
          className="h-auto py-3 flex-col gap-1.5 hover:bg-purple-50 hover:border-purple-300 hover:text-purple-700"
          onClick={() => safeNavigate("customers")}
        >
          <Search className="w-5 h-5" />
          <span className="text-xs font-semibold">بحث عميل</span>
        </Button>
        {canAccess("whatsapp-inbox") ? (
          <Button
            variant="outline"
            className="h-auto py-3 flex-col gap-1.5 hover:bg-amber-50 hover:border-amber-300 hover:text-amber-700"
            onClick={() => onNavigate?.("whatsapp-inbox")}
          >
            <MessageCircle className="w-5 h-5" />
            <span className="text-xs font-semibold">صندوق الواتساب</span>
          </Button>
        ) : (
          <Button
            variant="outline"
            className="h-auto py-3 flex-col gap-1.5 hover:bg-amber-50 hover:border-amber-300 hover:text-amber-700"
            onClick={() => safeNavigate("customer-intel")}
          >
            <Zap className="w-5 h-5" />
            <span className="text-xs font-semibold">ذكاء العملاء</span>
          </Button>
        )}
      </div>

      {/* ============================================================
          تبويبات داخل نفس الصفحة — تجزئة المحتوى الطويل لتجربة أسرع.
          الترتيب يتبع تسلسل عمل الموظف:
            1) نظرة سريعة (إنجازي + KPIs)
            2) مهامي (الباقي من قائمة المهام الديناميكية)
            3) المحادثات (آخر واتساب)
            4) الطلبات (بانتظار الرد)
          ============================================================ */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid grid-cols-2 sm:grid-cols-4 w-full h-auto p-1 bg-muted/50">
          <TabsTrigger value="overview" className="gap-1.5 text-xs sm:text-sm py-2">
            <LayoutDashboard className="w-3.5 h-3.5" />
            نظرة سريعة
          </TabsTrigger>
          <TabsTrigger value="tasks" className="gap-1.5 text-xs sm:text-sm py-2">
            <ListChecks className="w-3.5 h-3.5" />
            مهامي
          </TabsTrigger>
          <TabsTrigger value="conversations" className="gap-1.5 text-xs sm:text-sm py-2">
            <MessageCircle className="w-3.5 h-3.5" />
            المحادثات
            {stats?.unreadMessagesCount ? (
              <Badge className="bg-emerald-600 text-white text-[10px] h-4 min-w-4 px-1">{stats.unreadMessagesCount}</Badge>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="orders" className="gap-1.5 text-xs sm:text-sm py-2">
            <ShoppingCart className="w-3.5 h-3.5" />
            الطلبات
            {stats?.pendingOrdersCount ? (
              <Badge className="bg-amber-600 text-white text-[10px] h-4 min-w-4 px-1">{stats.pendingOrdersCount}</Badge>
            ) : null}
          </TabsTrigger>
        </TabsList>

        {/* ----- Tab 1: نظرة سريعة (إنجازي اليوم + KPIs المختصرة) ----- */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          {/* My Achievements Today */}
          <Card className="border-primary/20 bg-gradient-to-l from-primary/[0.04] to-transparent">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" />
                إنجازي اليوم
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-3">
              <div className="text-center p-2 rounded-lg bg-blue-50/60 border border-blue-100">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <PhoneCall className="w-3.5 h-3.5 text-blue-600" />
                  <p className="text-[11px] text-blue-700 font-semibold">مكالماتي</p>
                </div>
                <p className="text-2xl font-bold text-blue-700">{stats?.myCallsToday || 0}</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-emerald-50/60 border border-emerald-100">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <Target className="w-3.5 h-3.5 text-emerald-600" />
                  <p className="text-[11px] text-emerald-700 font-semibold">عملاء جدد</p>
                </div>
                <p className="text-2xl font-bold text-emerald-700">{stats?.myLeadsToday || 0}</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-amber-50/60 border border-amber-100">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <Star className="w-3.5 h-3.5 text-amber-600 fill-amber-600" />
                  <p className="text-[11px] text-amber-700 font-semibold">تقييمي</p>
                </div>
                <p className="text-2xl font-bold text-amber-700">
                  {stats?.myAvgRating ? stats.myAvgRating.toFixed(1) : "—"}
                  <span className="text-[10px] font-normal text-amber-600">/5</span>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Inbox KPIs (compact strip) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Card
              className="cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-emerald-500"
              onClick={() => onNavigate?.("whatsapp-inbox")}
            >
              <CardContent className="p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                  <MessageCircle className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xl font-bold text-foreground">{stats?.assignedConversations || 0}</p>
                  <p className="text-[11px] text-muted-foreground">محادثات مسندة لي</p>
                </div>
                <ArrowLeft className="w-4 h-4 text-muted-foreground" />
              </CardContent>
            </Card>

            <Card
              className="cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-amber-500"
              onClick={() => onNavigate?.("whatsapp-inbox")}
            >
              <CardContent className="p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                  <MessageCircle className="w-4 h-4 text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xl font-bold text-foreground">{stats?.unreadMessagesCount || 0}</p>
                  <p className="text-[11px] text-muted-foreground">رسائل غير مقروءة</p>
                </div>
                <ArrowLeft className="w-4 h-4 text-muted-foreground" />
              </CardContent>
            </Card>

            <Card
              className="cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-blue-500"
              onClick={() => onNavigate?.("orders")}
            >
              <CardContent className="p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                  <ShoppingCart className="w-4 h-4 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xl font-bold text-foreground">{stats?.pendingOrdersCount || 0}</p>
                  <p className="text-[11px] text-muted-foreground">طلبات بانتظار الرد</p>
                </div>
                <ArrowLeft className="w-4 h-4 text-muted-foreground" />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ----- Tab 2: مهامي (Role Tasks Panel) ----- */}
        <TabsContent value="tasks" className="mt-4">
          <Suspense fallback={<div className="flex items-center justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>}>
            <StaffRoleTasksPanel limit={20} />
          </Suspense>
        </TabsContent>

        {/* ----- Tab 3: المحادثات ----- */}
        <TabsContent value="conversations" className="mt-4">
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-emerald-600" />
                آخر محادثات الواتساب
              </CardTitle>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onNavigate?.("whatsapp-inbox")}>
                الكل
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {conversations.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">لا توجد محادثات حديثة</p>
              ) : (
                conversations.map(conv => (
                  <div
                    key={conv.id}
                    className="flex items-center gap-3 p-2.5 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => onNavigate?.("whatsapp-inbox")}
                  >
                    <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-emerald-700">
                        {(conv.contact_name || conv.phone).slice(0, 2)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-sm text-foreground truncate">
                          {conv.contact_name || conv.phone}
                        </p>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: true, locale: ar })}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {conv.last_message_preview || "—"}
                      </p>
                    </div>
                    {conv.unread_count > 0 && (
                      <Badge className="bg-emerald-600 text-white text-[10px] h-5 min-w-5 px-1.5 shrink-0">
                        {conv.unread_count}
                      </Badge>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ----- Tab 4: الطلبات بانتظار الرد ----- */}
        <TabsContent value="orders" className="mt-4">
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600" />
                طلبات بانتظار الرد
              </CardTitle>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onNavigate?.("orders")}>
                الكل
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {pendingOrders.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">لا توجد طلبات بانتظار الرد 🎉</p>
              ) : (
                pendingOrders.map(order => (
                  <div
                    key={order.id}
                    className="flex items-center gap-3 p-2.5 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => onNavigate?.("orders")}
                  >
                    <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                      <ShoppingCart className="w-4 h-4 text-amber-700" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-sm text-foreground truncate">
                          #{order.order_number}
                        </p>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {formatDistanceToNow(new Date(order.created_at), { addSuffix: true, locale: ar })}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs text-muted-foreground">
                          {order.total_amount.toLocaleString("ar-EG")} ج.م
                        </p>
                        <Badge variant="outline" className="text-[10px] h-4 border-amber-300 text-amber-700">
                          {order.status === "pending" ? "بانتظار المراجعة" : "بانتظار الدفع"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ============================================================
   شريط مؤشرات الحالة — Critical / SLA / Hot Leads / بدون تواصل
   كل مؤشر له لون واضح + عدّاد + nav للقسم المناسب
   ============================================================ */
type StatusKind = "critical" | "slaBreached" | "hotLeads" | "noContact";

interface StatusItemConfig {
  key: StatusKind;
  label: string;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Tailwind classes for active (count > 0) state */
  active: string;
  /** Tailwind classes for empty (count === 0) state */
  empty: string;
  pulse?: boolean;
  navTo?: string;
}

const STATUS_ITEMS: StatusItemConfig[] = [
  {
    key: "critical",
    label: "حرج",
    hint: "طلبات > 30د بدون رد",
    icon: AlertTriangle,
    active: "bg-red-50 border-red-300 text-red-700 hover:bg-red-100",
    empty: "bg-muted/30 border-border text-muted-foreground",
    pulse: true,
    navTo: "orders",
  },
  {
    key: "slaBreached",
    label: "SLA متجاوز",
    hint: "طلبات > 60د بدون رد",
    icon: TimerOff,
    active: "bg-orange-50 border-orange-300 text-orange-700 hover:bg-orange-100",
    empty: "bg-muted/30 border-border text-muted-foreground",
    pulse: true,
    navTo: "orders",
  },
  {
    key: "hotLeads",
    label: "Hot Leads",
    hint: "ليدز جديدة (آخر 24س)",
    icon: Flame,
    active: "bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100",
    empty: "bg-muted/30 border-border text-muted-foreground",
    navTo: "leads",
  },
  {
    key: "noContact",
    label: "بدون تواصل",
    hint: "عملاء مسندين > 7 أيام",
    icon: UserX,
    active: "bg-violet-50 border-violet-300 text-violet-700 hover:bg-violet-100",
    empty: "bg-muted/30 border-border text-muted-foreground",
    navTo: "customers",
  },
];

function StatusIndicatorsBar({
  counters, onNavigate, canAccess,
}: {
  counters: StatusCounters;
  onNavigate?: (section: string) => void;
  canAccess?: (section: string) => boolean;
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
      {STATUS_ITEMS.map((item) => {
        const count = counters[item.key];
        const isActive = count > 0;
        const Icon = item.icon;
        // إذا كان للمؤشر مسار وغير مسموح للدور الحالي، نعطّل الزر
        const allowed = item.navTo ? (canAccess ? canAccess(item.navTo) : true) : false;
        const clickable = !!item.navTo && allowed;
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => clickable && item.navTo && onNavigate?.(item.navTo)}
            disabled={!clickable}
            title={!allowed && item.navTo ? "هذا القسم غير متاح لدورك" : undefined}
            className={`relative text-right rounded-xl border p-3 transition-all ${
              isActive ? item.active : item.empty
            } ${clickable ? "cursor-pointer hover:shadow-sm hover:-translate-y-0.5 active:scale-[0.98]" : "cursor-default"}`}
            aria-label={`${item.label}: ${count}`}
          >
            <div className="flex items-center justify-between mb-1">
              <Icon className={`w-4 h-4 ${isActive ? "" : "opacity-60"}`} />
              {isActive && item.pulse && (
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-current opacity-60 animate-ping" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-current" />
                </span>
              )}
            </div>
            <p className={`text-2xl font-black leading-none tabular-nums ${isActive ? "" : "opacity-50"}`}>
              {count.toLocaleString("ar-EG")}
            </p>
            <p className="text-[11px] font-bold mt-1">{item.label}</p>
            <p className="text-[10px] opacity-70 mt-0.5">{item.hint}</p>
          </button>
        );
      })}
    </div>
  );
}