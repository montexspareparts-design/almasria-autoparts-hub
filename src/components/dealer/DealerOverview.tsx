import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import {
  ClipboardList, TrendingUp, FileText, CreditCard, Package,
  Clock, Search, Upload, Heart, Bell, ChevronLeft
} from "lucide-react";

interface DealerAccount {
  id: string;
  tier: string;
  is_active: boolean;
  custom_discount: number | null;
  min_order_amount: number | null;
  credit_limit?: number | null;
}

interface DealerOverviewProps {
  dealerAccount: DealerAccount | null;
  dealerName: string;
  email: string;
  ordersCount: number;
  totalSpent: number;
  invoicesCount: number;
  pendingOrders: number;
  userId: string;
  onNavigate?: (tab: string) => void;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

const tierLabels: Record<string, string> = {
  wholesale_tier1: "تاجر جملة — درجة أولى",
  wholesale_tier2: "تاجر جملة — درجة ثانية",
  corporate: "شركة / مؤسسة",
  retail: "عميل قطاعي",
};

const DealerOverview = ({
  dealerAccount, dealerName, email, ordersCount,
  totalSpent, invoicesCount, pendingOrders, userId, onNavigate
}: DealerOverviewProps) => {
  const [recentNotifications, setRecentNotifications] = useState<Notification[]>([]);
  const [dailyQuotes, setDailyQuotes] = useState(0);

  useEffect(() => {
    supabase
      .from("notifications")
      .select("id, title, message, type, is_read, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5)
      .then(({ data }) => setRecentNotifications((data as Notification[]) || []));

    supabase
      .rpc("get_daily_view_count", { _user_id: userId })
      .then(({ data }) => setDailyQuotes(data || 0));
  }, [userId]);

  const stats = [
    { icon: ClipboardList, label: "إجمالي الطلبات", value: ordersCount.toString(), sub: "كل الفترات" },
    { icon: Package, label: "الأصناف المتاحة", value: "+5,000", sub: "في الكتالوج" },
    { icon: Search, label: "عروض الأسعار اليوم", value: `${dailyQuotes}/20`, sub: "الحد اليومي" },
    { icon: Clock, label: "طلبات قيد التنفيذ", value: pendingOrders.toString(), sub: "جاري المعالجة" },
  ];

  const quickActions = [
    { icon: Search, label: "بحث القطع", desc: "ابحث واطلب عرض سعر", tab: "quotes" },
    { icon: Upload, label: "طلب سريع", desc: "رفع ملف Excel بأرقام القطع", tab: "quick_order" },
    { icon: FileText, label: "كشوفات الأسعار", desc: "تحميل آخر كشوفات الأسعار", tab: "price_lists" },
    { icon: Heart, label: "المفضلة", desc: "الأصناف التي تطلبها باستمرار", tab: "favorites" },
  ];

  const typeIcons: Record<string, string> = {
    info: "🔵",
    success: "✅",
    warning: "⚠️",
    order: "📦",
  };

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div>
          <p className="text-[11px] text-muted-foreground font-medium mb-1">بوابة التوزيع B2B</p>
          <h1 className="text-2xl font-bold text-foreground">مرحباً، {dealerName}</h1>
          <div className="flex items-center gap-2 mt-1.5">
            {dealerAccount && (
              <span className="text-[11px] font-semibold bg-secondary text-secondary-foreground px-3 py-1 rounded-md">
                {tierLabels[dealerAccount.tier] || dealerAccount.tier}
              </span>
            )}
            {dealerAccount?.custom_discount && dealerAccount.custom_discount > 0 && (
              <span className="text-[11px] font-semibold bg-primary/10 text-primary px-3 py-1 rounded-md">
                خصم {dealerAccount.custom_discount}%
              </span>
            )}
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground">{email}</p>
      </div>

      {/* Account Summary Bar */}
      {dealerAccount && (
        <div className="flex flex-wrap items-center gap-4 p-3.5 rounded-xl bg-secondary/50 border border-border">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">حد الائتمان:</span>
            <span className="text-xs font-bold text-foreground">
              {(dealerAccount as any).credit_limit ? `${Number((dealerAccount as any).credit_limit).toLocaleString("ar-EG")} ج.م` : "غير محدد"}
            </span>
          </div>
          <div className="w-px h-4 bg-border hidden sm:block" />
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">إجمالي المشتريات:</span>
            <span className="text-xs font-bold text-foreground">{totalSpent.toLocaleString("ar-EG")} ج.م</span>
          </div>
          <div className="w-px h-4 bg-border hidden sm:block" />
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">الفواتير:</span>
            <span className="text-xs font-bold text-foreground">{invoicesCount}</span>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s, i) => (
          <Card key={i} className="border-border">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
                  <s.icon className="w-4.5 h-4.5 text-muted-foreground" />
                </div>
              </div>
              <p className="text-2xl font-bold text-foreground tracking-tight">{s.value}</p>
              <p className="text-xs font-medium text-muted-foreground mt-0.5">{s.label}</p>
              <p className="text-[10px] text-muted-foreground/60">{s.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Quick Actions */}
        <div className="lg:col-span-2 space-y-3">
          <h3 className="text-sm font-bold text-foreground">إجراءات سريعة</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {quickActions.map((action, i) => (
              <button
                key={i}
                onClick={() => onNavigate?.(action.tab)}
                className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:border-primary/30 hover:shadow-sm transition-all text-right group"
              >
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                  <action.icon className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{action.label}</p>
                  <p className="text-[11px] text-muted-foreground">{action.desc}</p>
                </div>
                <ChevronLeft className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary transition-colors shrink-0" />
              </button>
            ))}
          </div>
        </div>

        {/* Notifications Panel */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground">آخر الإشعارات</h3>
            <button
              onClick={() => onNavigate?.("notifications")}
              className="text-[11px] text-primary hover:underline font-medium"
            >
              عرض الكل
            </button>
          </div>
          <Card className="border-border">
            <CardContent className="p-0 divide-y divide-border">
              {recentNotifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
                  <p className="text-xs text-muted-foreground">لا توجد إشعارات</p>
                </div>
              ) : (
                recentNotifications.map(n => (
                  <div key={n.id} className={`p-3.5 ${!n.is_read ? "bg-primary/[0.03]" : ""}`}>
                    <div className="flex items-start gap-2.5">
                      <span className="text-sm mt-0.5">{typeIcons[n.type] || "🔵"}</span>
                      <div className="min-w-0 flex-1">
                        <p className={`text-xs leading-relaxed ${!n.is_read ? "font-bold text-foreground" : "text-muted-foreground"}`}>
                          {n.title}
                        </p>
                        <p className="text-[10px] text-muted-foreground/70 mt-0.5 truncate">{n.message}</p>
                        <p className="text-[9px] text-muted-foreground/50 mt-1">
                          {new Date(n.created_at).toLocaleDateString("ar-EG", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                      {!n.is_read && <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DealerOverview;
