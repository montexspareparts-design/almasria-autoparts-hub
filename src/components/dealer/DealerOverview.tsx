import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  ClipboardList, TrendingUp, FileText, CreditCard, Package,
  Clock, Search, Upload, Heart, Bell, ChevronLeft, Tag, BookOpen, Settings
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
    { icon: ClipboardList, label: "إجمالي الطلبات", value: ordersCount.toString(), sub: "كل الفترات", tab: "orders" },
    { icon: Package, label: "الأصناف المتاحة", value: "+5,000", sub: "في الكتالوج", tab: "quotes" },
    { icon: Search, label: "عروض الأسعار اليوم", value: `${dailyQuotes}/20`, sub: "الحد اليومي", tab: "quotes" },
    { icon: Clock, label: "طلبات قيد التنفيذ", value: pendingOrders.toString(), sub: "جاري المعالجة", tab: "orders" },
  ];

  const allActions = [
    { icon: Search, label: "بحث القطع وعروض الأسعار", tab: "quotes" },
    { icon: ClipboardList, label: "الطلبية", tab: "orders" },
    { icon: FileText, label: "الفواتير", tab: "invoices" },
    { icon: TrendingUp, label: "كشف الحساب", tab: "statement" },
    { icon: CreditCard, label: "كشوفات الأسعار", tab: "price_lists" },
    { icon: Heart, label: "المفضلة", tab: "favorites" },
    { icon: Bell, label: "الإشعارات", tab: "notifications" },
    { icon: Tag, label: "العروض الخاصة", tab: "offers" },
    { icon: Settings, label: "إعدادات الحساب", tab: "settings" },
    { icon: Upload, label: "طلب سريع", tab: "quick_order" },
  ];

  const typeIcons: Record<string, string> = {
    info: "🔵",
    success: "✅",
    warning: "⚠️",
    order: "📦",
  };

  return (
    <div className="space-y-5">
      {/* Welcome */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">مرحباً، {dealerName}</h1>
        <div className="flex flex-wrap items-center gap-2 mt-1.5">
          {dealerAccount && (
            <span className="text-[11px] font-semibold bg-secondary text-secondary-foreground px-3 py-1 rounded-md">
              {tierLabels[dealerAccount.tier] || dealerAccount.tier}
            </span>
          )}
          <span className="text-[11px] text-muted-foreground">{email}</span>
        </div>
      </div>

      {/* Account Bar */}
      {dealerAccount && (
        <div className="flex flex-wrap items-center gap-3 sm:gap-5 p-3 rounded-lg bg-card border border-border text-xs">
          <div className="flex items-center gap-1.5">
            <CreditCard className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">حد الائتمان:</span>
            <span className="font-bold text-foreground">
              {(dealerAccount as any).credit_limit ? `${Number((dealerAccount as any).credit_limit).toLocaleString("ar-EG")} ج.م` : "—"}
            </span>
          </div>
          <div className="hidden sm:block w-px h-4 bg-border" />
          <div className="flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">المشتريات:</span>
            <span className="font-bold text-foreground">{totalSpent.toLocaleString("ar-EG")} ج.م</span>
          </div>
          <div className="hidden sm:block w-px h-4 bg-border" />
          <div className="flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">الفواتير:</span>
            <span className="font-bold text-foreground">{invoicesCount}</span>
          </div>
        </div>
      )}

      {/* KPI Cards — clickable */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s, i) => (
          <button
            key={i}
            onClick={() => onNavigate?.(s.tab)}
            className="bg-card border border-border rounded-lg p-4 text-right hover:border-primary/40 hover:shadow-sm transition-all"
          >
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center mb-2">
              <s.icon className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className="text-xl sm:text-2xl font-bold text-foreground">{s.value}</p>
            <p className="text-xs font-medium text-muted-foreground mt-0.5">{s.label}</p>
            <p className="text-[10px] text-muted-foreground/60">{s.sub}</p>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* All Tabs as Grid */}
        <div className="lg:col-span-2 space-y-3">
          <h3 className="text-sm font-bold text-foreground">الأقسام</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {allActions.map((action, i) => (
              <button
                key={i}
                onClick={() => onNavigate?.(action.tab)}
                className="flex items-center gap-2.5 p-3 rounded-lg border border-border bg-card hover:border-primary/30 hover:shadow-sm transition-all text-right group"
              >
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                  <action.icon className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <span className="text-xs sm:text-sm font-medium text-foreground flex-1">{action.label}</span>
                <ChevronLeft className="w-3.5 h-3.5 text-muted-foreground/30 group-hover:text-primary transition-colors shrink-0" />
              </button>
            ))}
          </div>
        </div>

        {/* Notifications */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground">آخر الإشعارات</h3>
            <button onClick={() => onNavigate?.("notifications")} className="text-[11px] text-primary hover:underline font-medium">
              عرض الكل
            </button>
          </div>
          <div className="bg-card border border-border rounded-lg divide-y divide-border">
            {recentNotifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
                <p className="text-xs text-muted-foreground">لا توجد إشعارات</p>
              </div>
            ) : (
              recentNotifications.map(n => (
                <div key={n.id} className={`p-3 ${!n.is_read ? "bg-primary/[0.03]" : ""}`}>
                  <div className="flex items-start gap-2">
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default DealerOverview;
