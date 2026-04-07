import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ClipboardList, ShoppingCart, Users, AlertTriangle,
  Clock, TrendingUp, CheckCircle, Loader2, ArrowLeft
} from "lucide-react";

interface DashboardStats {
  pendingOrders: number;
  newLeads: number;
  pendingPayments: number;
  staleOrders: number;
  todayOrders: number;
  todayLeadsContacted: number;
  totalOrdersHandled: number;
  totalLeadsConverted: number;
}

interface StaffDailyDashboardProps {
  onNavigate?: (section: string) => void;
}

export default function StaffDailyDashboard({ onNavigate }: StaffDailyDashboardProps) {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
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
    ] = await Promise.all([
      supabase.from("orders").select("*", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("orders").select("*", { count: "exact", head: true }).eq("status", "awaiting_payment"),
      supabase.from("orders").select("*", { count: "exact", head: true }).in("status", ["pending", "confirmed"]).lt("created_at", twoDaysAgo),
      supabase.from("leads").select("*", { count: "exact", head: true }).eq("status", "new"),
      supabase.from("orders").select("*", { count: "exact", head: true }).gte("created_at", todayStart),
      supabase.from("leads").select("*", { count: "exact", head: true }).eq("status", "contacted").gte("updated_at", todayStart),
      supabase.from("orders").select("*", { count: "exact", head: true }).in("status", ["processing", "ready", "shipped", "delivered"]),
      supabase.from("leads").select("*", { count: "exact", head: true }).eq("status", "converted"),
    ]);

    setStats({
      pendingOrders: pendingOrders || 0,
      newLeads: newLeads || 0,
      pendingPayments: pendingPayments || 0,
      staleOrders: staleOrders || 0,
      todayOrders: todayOrders || 0,
      todayLeadsContacted: todayLeadsContacted || 0,
      totalOrdersHandled: totalOrdersHandled || 0,
      totalLeadsConverted: totalLeadsConverted || 0,
    });
    setLoading(false);
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-primary" />
          لوحة المهام اليومية
        </h2>
        <p className="text-sm text-muted-foreground">ملخص اليوم وأولويات العمل</p>
      </div>

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

      {/* Performance Summary */}
      <div>
        <h3 className="text-base font-bold mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          ملخص الأداء
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
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
        </div>
      </div>

      {/* Quick Navigation */}
      <div>
        <h3 className="text-base font-bold mb-3">وصول سريع</h3>
        <div className="flex flex-wrap gap-2">
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
