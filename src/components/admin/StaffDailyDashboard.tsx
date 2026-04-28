import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ClipboardList, ShoppingCart, Users, AlertTriangle,
  Clock, TrendingUp, CheckCircle, Loader2, ArrowLeft,
  Search, UserX, MessageCircle, UserPlus, Shield
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

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!stats) return null;

  const urgentTasks = [
    { label: "طلبات جديدة بانتظار المراجعة", count: stats.pendingOrders, icon: ShoppingCart, color: "text-blue-600", bg: "bg-blue-50", section: "orders" },
    { label: "طلبات بانتظار الدفع", count: stats.pendingPayments, icon: Clock, color: "text-amber-600", bg: "bg-amber-50", section: "orders" },
    { label: "طلبات معلقة أكثر من 48 ساعة ⚠️", count: stats.staleOrders, icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50", section: "orders" },
    { label: "عملاء محتملين جدد", count: stats.newLeads, icon: Users, color: "text-emerald-600", bg: "bg-emerald-50", section: "leads" },
  ].filter(t => t.count > 0);

  const highSearchAlerts = alerts.filter(a => a.type === "high_search");
  const inactiveAlerts = alerts.filter(a => a.type === "inactive");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-primary" />
          لوحة المهام اليومية
        </h2>
        <p className="text-sm text-muted-foreground">ملخص اليوم وأولويات العمل</p>
      </div>

      {/* Today's Visitor & Search KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card className="border-l-4 border-l-indigo-500">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5 text-indigo-600" />
            </div>
            <div className="min-w-0">
              <p className="text-2xl font-bold">{stats.todayVisitors}</p>
              <p className="text-xs text-muted-foreground">زائر اليوم</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
              <Search className="w-5 h-5 text-purple-600" />
            </div>
            <div className="min-w-0">
              <p className="text-2xl font-bold">{stats.todaySearches}</p>
              <p className="text-xs text-muted-foreground">عملية بحث اليوم</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="min-w-0">
              <p className="text-2xl font-bold">{stats.todayOrders}</p>
              <p className="text-xs text-muted-foreground">طلب اليوم</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Searches Today */}
      {topSearches.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Search className="w-4 h-4 text-purple-600" />
              أهم عمليات البحث اليوم
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {topSearches.map((s, i) => (
              <div key={i} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-muted/40 hover:bg-muted/60 transition">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="text-xs font-bold text-muted-foreground w-5">#{i + 1}</span>
                  <span className="text-sm font-medium truncate">{s.query}</span>
                </div>
                <Badge variant="secondary" className="shrink-0">{s.count} مرة</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Search Contacts Today — phones to call */}
      {searchContacts.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-emerald-600" />
              أرقام تواصل (عملاء بحثوا اليوم)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {searchContacts.map((c) => (
              <div key={c.userId} className="flex items-center gap-2 p-2 rounded-lg border bg-card hover:shadow-sm transition">
                <div className="flex-1 min-w-0">
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
                    <Button size="sm" variant="outline" className="h-8 px-2" onClick={() => window.location.href = `tel:${c.phone}`}>
                      اتصال
                    </Button>
                    <WhatsAppQuickChat phone={c.phone} customerName={c.name} context={`بحث عن: ${c.lastQuery}`} />
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Urgent Tasks */}
      {urgentTasks.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {urgentTasks.map((task, i) => (
            <Card
              key={i}
              className="cursor-pointer hover:shadow-md transition-shadow border-l-4"
              style={{ borderLeftColor: task.color.replace("text-", "").includes("red") ? "#dc2626" : task.color.includes("amber") ? "#d97706" : task.color.includes("blue") ? "#2563eb" : "#059669" }}
              onClick={() => onNavigate?.(task.section)}
            >
              <CardContent className="p-4 flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl ${task.bg} flex items-center justify-center shrink-0`}>
                  <task.icon className={`w-6 h-6 ${task.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-2xl font-bold text-foreground">{task.count}</p>
                  <p className="text-sm text-muted-foreground">{task.label}</p>
                </div>
                <ArrowLeft className="w-4 h-4 text-muted-foreground" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-emerald-200 bg-emerald-50/50">
          <CardContent className="p-6 text-center">
            <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
            <p className="font-bold text-emerald-700">ممتاز! لا توجد مهام عاجلة 🎉</p>
            <p className="text-sm text-emerald-600">كل شيء تحت السيطرة</p>
          </CardContent>
        </Card>
      )}

      {/* Behavioral Alerts */}
      {(highSearchAlerts.length > 0 || inactiveAlerts.length > 0) && (
        <div className="space-y-4">
          <h3 className="text-base font-bold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            تنبيهات سلوكية
          </h3>

          {/* High search, no orders */}
          {highSearchAlerts.length > 0 && (
            <Card className="border-orange-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-orange-700">
                  <Search className="w-4 h-4" />
                  بيبحث كتير ومش بيطلب ({highSearchAlerts.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {highSearchAlerts.slice(0, 5).map((alert, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 p-3 bg-orange-50/50 rounded-lg border border-orange-100 flex-wrap">
                    <div className="flex-1 min-w-[180px]">
                      <p className="font-semibold text-sm text-foreground truncate">{alert.name}</p>
                      <p className="text-xs text-muted-foreground">{alert.detail}</p>
                      {alert.phone ? (
                        <a href={`tel:${alert.phone}`} className="text-xs text-primary hover:underline flex items-center gap-1 mt-0.5 font-mono" dir="ltr">
                          📞 {alert.phone}
                        </a>
                      ) : (
                        <p className="text-[11px] text-muted-foreground italic">لا يوجد رقم موبايل</p>
                      )}
                      {alert.email && <p className="text-xs text-muted-foreground truncate">{alert.email}</p>}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {alert.phone && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 gap-1 text-xs border-blue-300 text-blue-700 hover:bg-blue-50"
                            onClick={() => window.location.href = `tel:${alert.phone}`}
                          >
                            <MessageCircle className="w-3 h-3" />
                            اتصال
                          </Button>
                          <WhatsAppQuickChat
                            phone={alert.phone}
                            customerName={alert.name}
                            context="لاحظنا اهتمامك بمنتجاتنا. هل نقدر نساعدك في إيجاد القطعة المناسبة؟"
                            size="sm"
                          />
                        </>
                      )}
                      <Badge variant="outline" className="text-orange-600 border-orange-300 text-[10px]">
                        فرصة تحويل
                      </Badge>
                    </div>
                  </div>
                ))}
                {highSearchAlerts.length > 5 && (
                  <p className="text-xs text-muted-foreground text-center">
                    +{highSearchAlerts.length - 5} عميل آخر
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Inactive dealers */}
          {inactiveAlerts.length > 0 && (
            <Card className="border-red-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-red-700">
                  <UserX className="w-4 h-4" />
                  تاجر توقف من شهر ({inactiveAlerts.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {inactiveAlerts.slice(0, 5).map((alert, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 p-3 bg-red-50/50 rounded-lg border border-red-100 flex-wrap">
                    <div className="flex-1 min-w-[180px]">
                      <p className="font-semibold text-sm text-foreground truncate">{alert.name}</p>
                      <p className="text-xs text-muted-foreground">{alert.detail}</p>
                      {alert.phone ? (
                        <a href={`tel:${alert.phone}`} className="text-xs text-primary hover:underline flex items-center gap-1 mt-0.5 font-mono" dir="ltr">
                          📞 {alert.phone}
                        </a>
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
                            className="h-7 gap-1 text-xs border-blue-300 text-blue-700 hover:bg-blue-50"
                            onClick={() => window.location.href = `tel:${alert.phone}`}
                          >
                            <MessageCircle className="w-3 h-3" />
                            اتصال
                          </Button>
                          <WhatsAppQuickChat
                            phone={alert.phone}
                            customerName={alert.name}
                            context="افتقدناك! نقدم لك عروض مميزة على قطع الغيار. تحب نوريك أحدث الكشوفات؟"
                            size="sm"
                          />
                        </>
                      )}
                      <Badge variant="outline" className="text-red-600 border-red-300 text-[10px]">
                        خامل
                      </Badge>
                    </div>
                  </div>
                ))}
                {inactiveAlerts.length > 5 && (
                  <p className="text-xs text-muted-foreground text-center">
                    +{inactiveAlerts.length - 5} تاجر آخر
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Performance Summary */}
      <div>
        <h3 className="text-base font-bold mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          ملخص الأداء
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{stats.todayOrders}</p>
              <p className="text-xs text-muted-foreground">طلبات اليوم</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{stats.todayLeadsContacted}</p>
              <p className="text-xs text-muted-foreground">عملاء تم التواصل معهم اليوم</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-primary">{stats.totalOrdersHandled}</p>
              <p className="text-xs text-muted-foreground">إجمالي الطلبات المعالجة</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-primary">{stats.totalLeadsConverted}</p>
              <p className="text-xs text-muted-foreground">عملاء تم تحويلهم لتجار</p>
            </CardContent>
          </Card>
          <Card
            className={isAdmin ? "cursor-pointer hover:shadow-md transition-shadow border-primary/30 bg-primary/5" : "border-primary/30 bg-primary/5"}
            onClick={() => isAdmin && onNavigate?.("staff-roles")}
          >
            <CardContent className="p-4 text-center">
              <Shield className="w-5 h-5 text-primary mx-auto mb-1" />
              <p className="text-2xl font-bold text-primary">{stats.activeStaff}</p>
              <p className="text-xs text-muted-foreground">الموظفين النشطين</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Navigation */}
      <div>
        <h3 className="text-base font-bold mb-3">وصول سريع</h3>
        <div className="flex flex-wrap gap-2">
          {isAdmin && (
            <Button
              size="sm"
              className="gap-1.5 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-md hover:shadow-lg"
              onClick={() => onNavigate?.("staff-roles")}
            >
              <UserPlus className="w-4 h-4" />
              إضافة موظف جديد
            </Button>
          )}
          <Button
            size="sm"
            className="gap-1.5 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-md hover:shadow-lg"
            onClick={() => onNavigate?.("leads")}
          >
            <UserPlus className="w-4 h-4" />
            إضافة عميل جديد
          </Button>
          {[
            { label: "الطلبات", section: "orders", icon: "🛒" },
            { label: "إدخال العملاء", section: "leads", icon: "👥" },
            { label: "ملف العملاء", section: "customers", icon: "📋" },
            { label: "كشوف الأسعار", section: "price-lists", icon: "💰" },
            { label: "ذكاء العملاء", section: "customer-intel", icon: "🧠" },
          ].map(item => (
            <Button
              key={item.section}
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => onNavigate?.(item.section)}
            >
              <span>{item.icon}</span>
              {item.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
