import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  ClipboardList, ShoppingCart, Users, AlertTriangle,
  Clock, TrendingUp, CheckCircle, Loader2, ArrowLeft,
  Search, UserX, MessageCircle, UserPlus, Shield, Eye, Phone
} from "lucide-react";
import WhatsAppQuickChat from "./WhatsAppQuickChat";

interface DashboardStats {
  pendingOrders: number;
  newLeads: number;
  pendingPayments: number;
  staleOrders: number;
  todayOrders: number;
  todayLeadsContacted: number;
  totalOrdersHandled: number;
  totalLeadsConverted: number;
  activeStaff: number;
  todayVisitors: number;
  todaySearches: number;
  // ===== Quick KPI strip (الرئيسية) =====
  todayWhatsappLeads: number;  // زوار واتساب جدد اليوم (visitor_leads)
  todayNewCustomers: number;   // عملاء (profiles) جدد اليوم
}

interface TopSearch {
  query: string;
  count: number;
}

interface SearchContact {
  userId: string;
  name: string;
  phone: string | null;
  lastQuery: string;
  searchCount: number;
}

interface BehavioralAlert {
  type: "high_search" | "inactive";
  userId: string;
  name: string;
  phone: string | null;
  email: string | null;
  detail: string;
}

interface StaffDailyDashboardProps {
  onNavigate?: (section: string) => void;
}

export default function StaffDailyDashboard({ onNavigate }: StaffDailyDashboardProps) {
  const { user, isAdmin } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [alerts, setAlerts] = useState<BehavioralAlert[]>([]);
  const [loading, setLoading] = useState(true);

  const [topSearches, setTopSearches] = useState<TopSearch[]>([]);
  const [searchContacts, setSearchContacts] = useState<SearchContact[]>([]);

  // Persisted accordion state — kept at top to satisfy Rules of Hooks
  const STORAGE_KEY = "staff-dashboard-open-section";
  const [openSection, setOpenSection] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch { /* ignore */ }
    return "urgent";
  });

  useEffect(() => {
    fetchStats();
    fetchBehavioralAlerts();
    fetchTodaySearchInsights();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();

    const [
      { count: pendingOrders },
      { count: pendingPayments },
      { count: staleOrders },
      { count: newLeads },
      { count: todayOrders },
      { count: todayLeadsContacted },
      { count: totalOrdersHandled },
      { count: totalLeadsConverted },
      { data: staffRoles },
      { data: visitorRows },
      { count: todaySearches },
      { count: todayWhatsappLeads },
      { count: todayNewCustomers },
    ] = await Promise.all([
      supabase.from("orders").select("*", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("orders").select("*", { count: "exact", head: true }).eq("status", "awaiting_payment"),
      supabase.from("orders").select("*", { count: "exact", head: true }).in("status", ["pending", "confirmed"]).lt("created_at", twoDaysAgo),
      supabase.from("leads").select("*", { count: "exact", head: true }).eq("status", "new"),
      supabase.from("orders").select("*", { count: "exact", head: true }).gte("created_at", todayStart),
      supabase.from("leads").select("*", { count: "exact", head: true }).eq("status", "contacted").gte("updated_at", todayStart),
      supabase.from("orders").select("*", { count: "exact", head: true }).in("status", ["processing", "ready", "shipped", "delivered"]),
      supabase.from("leads").select("*", { count: "exact", head: true }).eq("status", "converted"),
      supabase.from("user_roles").select("user_id, role").in("role", ["admin", "moderator"]),
      supabase.from("page_visits").select("session_key, user_id").gte("visited_at", todayStart),
      supabase.from("customer_search_logs").select("*", { count: "exact", head: true }).gte("created_at", todayStart),
      supabase.from("visitor_leads" as any).select("*", { count: "exact", head: true }).gte("created_at", todayStart),
      supabase.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", todayStart),
    ]);

    const activeStaff = new Set((staffRoles || []).map((r: any) => r.user_id)).size;
    // Distinct visitors today (by session_key, fallback to user_id)
    const visitorKeys = new Set<string>();
    (visitorRows || []).forEach((r: any) => {
      const k = r.session_key || r.user_id;
      if (k) visitorKeys.add(k);
    });

    setStats({
      pendingOrders: pendingOrders || 0,
      newLeads: newLeads || 0,
      pendingPayments: pendingPayments || 0,
      staleOrders: staleOrders || 0,
      todayOrders: todayOrders || 0,
      todayLeadsContacted: todayLeadsContacted || 0,
      totalOrdersHandled: totalOrdersHandled || 0,
      totalLeadsConverted: totalLeadsConverted || 0,
      activeStaff,
      todayVisitors: visitorKeys.size,
      todaySearches: todaySearches || 0,
      todayWhatsappLeads: todayWhatsappLeads || 0,
      todayNewCustomers: todayNewCustomers || 0,
    });
    setLoading(false);
  };

  const fetchTodaySearchInsights = async () => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { data: logs } = await supabase
      .from("customer_search_logs")
      .select("search_query, user_id, created_at")
      .gte("created_at", todayStart.toISOString())
      .order("created_at", { ascending: false })
      .limit(500);

    if (!logs || logs.length === 0) {
      setTopSearches([]);
      setSearchContacts([]);
      return;
    }

    // Top queries (case-insensitive, trimmed)
    const queryCounts: Record<string, number> = {};
    for (const l of logs) {
      const q = (l.search_query || "").trim().toLowerCase();
      if (!q) continue;
      queryCounts[q] = (queryCounts[q] || 0) + 1;
    }
    const top = Object.entries(queryCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([query, count]) => ({ query, count }));
    setTopSearches(top);

    // Per-user search aggregation (only logged-in users)
    const perUser: Record<string, { count: number; lastQuery: string }> = {};
    for (const l of logs) {
      if (!l.user_id) continue;
      if (!perUser[l.user_id]) {
        perUser[l.user_id] = { count: 0, lastQuery: l.search_query || "" };
      }
      perUser[l.user_id].count += 1;
    }
    const userIds = Object.keys(perUser).slice(0, 50);
    if (userIds.length === 0) {
      setSearchContacts([]);
      return;
    }
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, phone")
      .in("user_id", userIds);

    const contacts: SearchContact[] = (profiles || [])
      .filter((p: any) => p.phone)
      .map((p: any) => ({
        userId: p.user_id,
        name: p.full_name || "بدون اسم",
        phone: p.phone,
        lastQuery: perUser[p.user_id]?.lastQuery || "",
        searchCount: perUser[p.user_id]?.count || 0,
      }))
      .sort((a, b) => b.searchCount - a.searchCount)
      .slice(0, 10);
    setSearchContacts(contacts);
  };

  const fetchBehavioralAlerts = async () => {
    const behavioralAlerts: BehavioralAlert[] = [];

    // 1) High search, no orders — users with 5+ searches and 0 orders
    const { data: searchLogs } = await supabase
      .from("customer_search_logs")
      .select("user_id")
      .not("user_id", "is", null);

    if (searchLogs && searchLogs.length > 0) {
      // Count searches per user
      const searchCounts: Record<string, number> = {};
      for (const log of searchLogs) {
        if (log.user_id) {
          searchCounts[log.user_id] = (searchCounts[log.user_id] || 0) + 1;
        }
      }

      // Filter users with 5+ searches
      const highSearchUsers = Object.entries(searchCounts)
        .filter(([, count]) => count >= 5)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20);

      for (const [userId, count] of highSearchUsers) {
        // Check if they have any orders
        const { count: orderCount } = await supabase
          .from("orders")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId);

        if ((orderCount || 0) === 0) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, phone, email")
            .eq("user_id", userId)
            .maybeSingle();

          if (profile) {
            behavioralAlerts.push({
              type: "high_search",
              userId,
              name: profile.full_name || profile.email || "مستخدم",
              phone: profile.phone,
              email: profile.email,
              detail: `بحث ${count} مرة بدون أي طلب`,
            });
          }
        }
      }
    }

    // 2) Inactive dealers — had orders but none in last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: activeDealers } = await supabase
      .from("dealer_accounts")
      .select("user_id, erp_customer_name")
      .eq("is_active", true);

    if (activeDealers) {
      for (const dealer of activeDealers.slice(0, 30)) {
        // Check if they have ANY order
        const { count: totalOrders } = await supabase
          .from("orders")
          .select("*", { count: "exact", head: true })
          .eq("user_id", dealer.user_id);

        if ((totalOrders || 0) > 0) {
          // Check recent orders
          const { count: recentOrders } = await supabase
            .from("orders")
            .select("*", { count: "exact", head: true })
            .eq("user_id", dealer.user_id)
            .gte("created_at", thirtyDaysAgo);

          if ((recentOrders || 0) === 0) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("full_name, phone, email")
              .eq("user_id", dealer.user_id)
              .maybeSingle();

            behavioralAlerts.push({
              type: "inactive",
              userId: dealer.user_id,
              name: dealer.erp_customer_name || profile?.full_name || "تاجر",
              phone: profile?.phone || null,
              email: profile?.email || null,
              detail: `لم يطلب منذ أكثر من 30 يوم (إجمالي طلباته: ${totalOrders})`,
            });
          }
        }
      }
    }

    setAlerts(behavioralAlerts);
  };

  const resolvedStats = stats ?? {
    pendingOrders: 0,
    newLeads: 0,
    pendingPayments: 0,
    staleOrders: 0,
    todayOrders: 0,
    todayLeadsContacted: 0,
    totalOrdersHandled: 0,
    totalLeadsConverted: 0,
    activeStaff: 0,
    todayVisitors: 0,
    todaySearches: 0,
  };

  const urgentTasks = [
    { label: "طلبات جديدة بانتظار المراجعة", count: resolvedStats.pendingOrders, icon: ShoppingCart, color: "text-blue-600", bg: "bg-blue-50", section: "orders" },
    { label: "طلبات بانتظار الدفع", count: resolvedStats.pendingPayments, icon: Clock, color: "text-amber-600", bg: "bg-amber-50", section: "orders" },
    { label: "طلبات معلقة أكثر من 48 ساعة ⚠️", count: resolvedStats.staleOrders, icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50", section: "orders" },
    { label: "عملاء محتملين جدد", count: resolvedStats.newLeads, icon: Users, color: "text-emerald-600", bg: "bg-emerald-50", section: "leads" },
  ].filter((task) => task.count > 0);

  const highSearchAlerts = alerts.filter((alert) => alert.type === "high_search");
  const inactiveAlerts = alerts.filter((alert) => alert.type === "inactive");
  const totalUrgent = urgentTasks.reduce((sum, task) => sum + task.count, 0);
  const totalAlerts = highSearchAlerts.length + inactiveAlerts.length;
  const priorityOpen =
    totalUrgent > 0 ? "urgent"
    : searchContacts.length > 0 ? "contacts"
    : totalAlerts > 0 ? "alerts"
    : "performance";

  useEffect(() => {
    if (loading) return;
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        setOpenSection(priorityOpen);
      }
    } catch {
      /* ignore */
    }
  }, [loading, priorityOpen, STORAGE_KEY]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!stats) return null;

  const handleAccordionChange = (value: string) => {
    setOpenSection(value);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    } catch { /* ignore quota */ }
  };

  return (
    <div className="space-y-6">
      {/* ============ HEADER ============ */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-primary" />
            لوحة المهام اليومية
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">ملخص اليوم وأولويات العمل</p>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <Button
              size="sm"
              className="gap-1.5 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground"
              onClick={() => onNavigate?.("staff-roles")}
            >
              <UserPlus className="w-4 h-4" />
              موظف
            </Button>
          )}
          <Button
            size="sm"
            className="gap-1.5 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white"
            onClick={() => onNavigate?.("leads")}
          >
            <UserPlus className="w-4 h-4" />
            عميل جديد
          </Button>
        </div>
      </div>

      {/* ============ HERO KPIs (4 cards, all clickable) ============ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          icon={Users}
          label="زائر اليوم"
          value={stats.todayVisitors}
          colorBar="bg-indigo-500"
          colorBg="bg-indigo-50"
          colorText="text-indigo-600"
          hint="افتح تقرير الزوار"
          onClick={() => (window.location.href = "/admin/active-visitors")}
        />
        <KpiCard
          icon={Search}
          label="عملية بحث اليوم"
          value={stats.todaySearches}
          colorBar="bg-purple-500"
          colorBg="bg-purple-50"
          colorText="text-purple-600"
          hint="عرض سجل البحث"
          onClick={() => onNavigate?.("customer-intel")}
        />
        <KpiCard
          icon={ShoppingCart}
          label="طلب اليوم"
          value={stats.todayOrders}
          colorBar="bg-emerald-500"
          colorBg="bg-emerald-50"
          colorText="text-emerald-600"
          hint="افتح الطلبات"
          onClick={() => onNavigate?.("orders")}
        />
        <KpiCard
          icon={AlertTriangle}
          label="مهام عاجلة"
          value={totalUrgent}
          colorBar={totalUrgent > 0 ? "bg-red-500" : "bg-gray-300"}
          colorBg={totalUrgent > 0 ? "bg-red-50" : "bg-gray-50"}
          colorText={totalUrgent > 0 ? "text-red-600" : "text-gray-500"}
          hint={totalUrgent > 0 ? "افتح المهام" : "كل شيء تمام"}
          onClick={() => {
            setOpenSection("urgent");
            document.getElementById("urgent-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
        />
      </div>


      {/* ============ COLLAPSIBLE SECTIONS ============ */}
      <Accordion type="single" collapsible value={openSection} onValueChange={handleAccordionChange} className="space-y-3">
        {/* 1) Urgent tasks */}
        <AccordionItem id="urgent-section" value="urgent" className="border rounded-xl bg-card overflow-hidden scroll-mt-20">
          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/40">
            <div className="flex items-center gap-2 flex-1">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <span className="font-bold text-sm">مهام عاجلة</span>
              {totalUrgent > 0 ? (
                <Badge className="bg-red-100 text-red-700 hover:bg-red-100">{totalUrgent}</Badge>
              ) : (
                <Badge variant="outline" className="text-emerald-600 border-emerald-300">لا يوجد</Badge>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            {urgentTasks.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {urgentTasks.map((task, i) => (
                  <Card
                    key={i}
                    className="cursor-pointer hover:shadow-md transition-shadow border-l-4"
                    style={{ borderLeftColor: task.color.includes("red") ? "#dc2626" : task.color.includes("amber") ? "#d97706" : task.color.includes("blue") ? "#2563eb" : "#059669" }}
                    onClick={() => onNavigate?.(task.section)}
                  >
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className={`w-11 h-11 rounded-xl ${task.bg} flex items-center justify-center shrink-0`}>
                        <task.icon className={`w-5 h-5 ${task.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-2xl font-bold">{task.count}</p>
                        <p className="text-xs text-muted-foreground">{task.label}</p>
                      </div>
                      <ArrowLeft className="w-4 h-4 text-muted-foreground" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                <p className="font-bold text-emerald-700">ممتاز! لا توجد مهام عاجلة 🎉</p>
              </div>
            )}
          </AccordionContent>
        </AccordionItem>

        {/* 2) Search contacts + top searches */}
        <AccordionItem value="contacts" className="border rounded-xl bg-card overflow-hidden">
          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/40">
            <div className="flex items-center gap-2 flex-1">
              <Phone className="w-4 h-4 text-emerald-600" />
              <span className="font-bold text-sm">عملاء بحثوا اليوم — جاهزين للتواصل</span>
              {searchContacts.length > 0 && (
                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">{searchContacts.length}</Badge>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 space-y-4">
            {/* Top searches strip */}
            {topSearches.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                  <Search className="w-3 h-3" /> أكثر الكلمات بحثاً اليوم
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {topSearches.map((s, i) => (
                    <Badge key={i} variant="secondary" className="gap-1 py-1">
                      <span className="font-mono">#{i + 1}</span>
                      <span>{s.query}</span>
                      <span className="text-muted-foreground">·{s.count}</span>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Contact list */}
            {searchContacts.length > 0 ? (
              <div className="space-y-2">
                {searchContacts.map((c) => (
                  <div key={c.userId} className="flex items-center gap-2 p-3 rounded-lg border bg-card hover:shadow-sm transition flex-wrap">
                    <div className="flex-1 min-w-0 min-w-[180px]">
                      <p className="text-sm font-bold truncate">{c.name}</p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        آخر بحث: <span className="font-mono">{c.lastQuery}</span> · {c.searchCount} عملية
                      </p>
                      {c.phone && (
                        <a href={`tel:${c.phone}`} className="text-xs text-primary hover:underline font-mono" dir="ltr">📞 {c.phone}</a>
                      )}
                    </div>
                    {c.phone && (
                      <div className="flex gap-1 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 px-2 gap-1"
                          onClick={() => (window.location.href = `/admin/visitor/${c.userId}`)}
                        >
                          <Eye className="w-3 h-3" /> الملف
                        </Button>
                        <WhatsAppQuickChat phone={c.phone} customerName={c.name} context={`بحث عن: ${c.lastQuery}`} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">لا يوجد عملاء بحثوا اليوم بأرقام مسجلة.</p>
            )}
          </AccordionContent>
        </AccordionItem>

        {/* 3) Behavioral alerts */}
        <AccordionItem value="alerts" className="border rounded-xl bg-card overflow-hidden">
          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/40">
            <div className="flex items-center gap-2 flex-1">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span className="font-bold text-sm">تنبيهات سلوكية</span>
              {totalAlerts > 0 && (
                <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">{totalAlerts}</Badge>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 space-y-4">
            {highSearchAlerts.length > 0 && (
              <AlertGroup
                title={`بيبحث كتير ومش بيطلب (${highSearchAlerts.length})`}
                icon={Search}
                color="orange"
                items={highSearchAlerts}
                ctaContext="لاحظنا اهتمامك بمنتجاتنا. هل نقدر نساعدك في إيجاد القطعة المناسبة؟"
                ctaBadge="فرصة تحويل"
              />
            )}
            {inactiveAlerts.length > 0 && (
              <AlertGroup
                title={`تجار توقفوا من شهر (${inactiveAlerts.length})`}
                icon={UserX}
                color="red"
                items={inactiveAlerts}
                ctaContext="افتقدناك! نقدم لك عروض مميزة على قطع الغيار. تحب نوريك أحدث الكشوفات؟"
                ctaBadge="خامل"
              />
            )}
            {totalAlerts === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">لا توجد تنبيهات حالياً ✓</p>
            )}
          </AccordionContent>
        </AccordionItem>

        {/* 4) Performance summary */}
        <AccordionItem value="performance" className="border rounded-xl bg-card overflow-hidden">
          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/40">
            <div className="flex items-center gap-2 flex-1">
              <TrendingUp className="w-4 h-4 text-primary" />
              <span className="font-bold text-sm">ملخص الأداء</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <MiniStat label="عملاء تم التواصل معهم اليوم" value={stats.todayLeadsContacted} icon={Phone} />
              <MiniStat label="إجمالي الطلبات المعالجة" value={stats.totalOrdersHandled} highlight icon={ShoppingCart} />
              <MiniStat label="عملاء تم تحويلهم لتجار" value={stats.totalLeadsConverted} highlight icon={UserPlus} />
              <MiniStat
                label="الموظفين النشطين"
                value={stats.activeStaff}
                highlight
                icon={Shield}
                onClick={isAdmin ? () => onNavigate?.("staff-roles") : undefined}
              />
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

/* ============ Sub-components ============ */

interface KpiCardProps {
  icon: any;
  label: string;
  value: number;
  colorBar: string;
  colorBg: string;
  colorText: string;
  hint?: string;
  onClick?: () => void;
}
function KpiCard({ icon: Icon, label, value, colorBar, colorBg, colorText, hint, onClick }: KpiCardProps) {
  return (
    <Card
      className={`relative overflow-hidden ${onClick ? "cursor-pointer hover:shadow-md transition group" : ""}`}
      onClick={onClick}
    >
      <div className={`absolute inset-y-0 right-0 w-1 ${colorBar}`} />
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`w-11 h-11 rounded-xl ${colorBg} flex items-center justify-center shrink-0 ${onClick ? "group-hover:scale-105 transition" : ""}`}>
          <Icon className={`w-5 h-5 ${colorText}`} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-2xl font-bold leading-tight">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
          {hint && onClick && <p className={`text-[10px] ${colorText} mt-0.5`}>{hint} ←</p>}
        </div>
      </CardContent>
    </Card>
  );
}

interface MiniStatProps {
  label: string;
  value: number;
  highlight?: boolean;
  icon?: any;
  onClick?: () => void;
}
function MiniStat({ label, value, highlight, icon: Icon, onClick }: MiniStatProps) {
  return (
    <Card
      className={`${onClick ? "cursor-pointer hover:shadow-md transition" : ""} ${highlight ? "border-primary/30 bg-primary/5" : ""}`}
      onClick={onClick}
    >
      <CardContent className="p-4 text-center">
        {Icon && <Icon className="w-5 h-5 text-primary mx-auto mb-1" />}
        <p className={`text-2xl font-bold ${highlight ? "text-primary" : "text-foreground"}`}>{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

interface AlertGroupProps {
  title: string;
  icon: any;
  color: "orange" | "red";
  items: BehavioralAlert[];
  ctaContext: string;
  ctaBadge: string;
}
function AlertGroup({ title, icon: Icon, color, items, ctaContext, ctaBadge }: AlertGroupProps) {
  const styles = color === "orange"
    ? { border: "border-orange-200", text: "text-orange-700", bg: "bg-orange-50/50", chip: "text-orange-600 border-orange-300" }
    : { border: "border-red-200", text: "text-red-700", bg: "bg-red-50/50", chip: "text-red-600 border-red-300" };

  return (
    <div className={`rounded-lg border ${styles.border} overflow-hidden`}>
      <div className={`px-3 py-2 ${styles.bg} flex items-center gap-2 border-b ${styles.border}`}>
        <Icon className={`w-4 h-4 ${styles.text}`} />
        <span className={`text-sm font-bold ${styles.text}`}>{title}</span>
      </div>
      <div className="p-2 space-y-2">
        {items.slice(0, 5).map((alert, i) => (
          <div key={i} className="flex items-center justify-between gap-3 p-2 rounded-lg border bg-card flex-wrap">
            <div className="flex-1 min-w-[180px]">
              <p className="font-semibold text-sm truncate">{alert.name}</p>
              <p className="text-xs text-muted-foreground">{alert.detail}</p>
              {alert.phone ? (
                <a href={`tel:${alert.phone}`} className="text-xs text-primary hover:underline font-mono" dir="ltr">📞 {alert.phone}</a>
              ) : (
                <p className="text-[11px] text-muted-foreground italic">لا يوجد رقم موبايل</p>
              )}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {alert.phone && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 gap-1 text-xs"
                    onClick={() => (window.location.href = `/admin/visitor/${alert.userId}`)}
                  >
                    <Eye className="w-3 h-3" /> الملف
                  </Button>
                  <WhatsAppQuickChat phone={alert.phone} customerName={alert.name} context={ctaContext} size="sm" />
                </>
              )}
              <Badge variant="outline" className={`${styles.chip} text-[10px]`}>{ctaBadge}</Badge>
            </div>
          </div>
        ))}
        {items.length > 5 && (
          <p className="text-xs text-muted-foreground text-center pt-1">+{items.length - 5} آخرين</p>
        )}
      </div>
    </div>
  );
}
