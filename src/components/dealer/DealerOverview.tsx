import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ClipboardList, TrendingUp, FileText, CreditCard, Package,
  Clock, Search, Upload, Heart, Bell, ArrowLeft
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
  wholesale_tier1: "Wholesale — Tier 1",
  wholesale_tier2: "Wholesale — Tier 2",
  corporate: "Corporate Account",
  retail: "Retail Account",
};

const DealerOverview = ({
  dealerAccount, dealerName, email, ordersCount,
  totalSpent, invoicesCount, pendingOrders, userId, onNavigate
}: DealerOverviewProps) => {
  const [recentNotifications, setRecentNotifications] = useState<Notification[]>([]);
  const [dailyQuotes, setDailyQuotes] = useState(0);

  useEffect(() => {
    // Fetch recent notifications
    supabase
      .from("notifications")
      .select("id, title, message, type, is_read, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5)
      .then(({ data }) => setRecentNotifications((data as Notification[]) || []));

    // Fetch daily quote count
    supabase
      .rpc("get_daily_view_count", { _user_id: userId })
      .then(({ data }) => setDailyQuotes(data || 0));
  }, [userId]);

  const stats = [
    { icon: ClipboardList, label: "Total Orders", value: ordersCount.toString(), sub: "All time" },
    { icon: Package, label: "Available Parts", value: "5,000+", sub: "In catalog" },
    { icon: Search, label: "Quotations Today", value: `${dailyQuotes}/20`, sub: "Daily limit" },
    { icon: Clock, label: "Pending Orders", value: pendingOrders.toString(), sub: "In progress" },
  ];

  const quickActions = [
    { icon: Search, label: "Search Parts", desc: "Find parts & request pricing", tab: "quotes" },
    { icon: Upload, label: "Quick Order", desc: "Upload Excel with part numbers", tab: "quick_order" },
    { icon: FileText, label: "Price Lists", desc: "Download latest price sheets", tab: "price_lists" },
    { icon: Heart, label: "Favorites", desc: "Your frequently ordered items", tab: "favorites" },
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
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Distribution Portal</p>
          <h1 className="text-2xl font-bold text-foreground">Welcome, {dealerName}</h1>
          <div className="flex items-center gap-2 mt-1">
            {dealerAccount && (
              <span className="text-[11px] font-medium bg-secondary text-secondary-foreground px-2.5 py-0.5 rounded">
                {tierLabels[dealerAccount.tier] || dealerAccount.tier}
              </span>
            )}
            {dealerAccount?.custom_discount && dealerAccount.custom_discount > 0 && (
              <span className="text-[11px] font-medium bg-primary/10 text-primary px-2.5 py-0.5 rounded">
                {dealerAccount.custom_discount}% Discount
              </span>
            )}
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground">{email}</p>
      </div>

      {/* Account Summary Bar */}
      {dealerAccount && (
        <div className="flex flex-wrap items-center gap-4 p-3 rounded-lg bg-secondary/50 border border-border">
          <div className="flex items-center gap-2">
            <CreditCard className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Credit Limit:</span>
            <span className="text-xs font-semibold text-foreground">
              {(dealerAccount as any).credit_limit ? `${Number((dealerAccount as any).credit_limit).toLocaleString()} EGP` : "N/A"}
            </span>
          </div>
          <div className="w-px h-4 bg-border hidden sm:block" />
          <div className="flex items-center gap-2">
            <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Total Purchases:</span>
            <span className="text-xs font-semibold text-foreground">{totalSpent.toLocaleString()} EGP</span>
          </div>
          <div className="w-px h-4 bg-border hidden sm:block" />
          <div className="flex items-center gap-2">
            <FileText className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Invoices:</span>
            <span className="text-xs font-semibold text-foreground">{invoicesCount}</span>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s, i) => (
          <Card key={i} className="border-border">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <s.icon className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="text-2xl font-bold text-foreground tracking-tight">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
              <p className="text-[10px] text-muted-foreground/60">{s.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Quick Actions */}
        <div className="lg:col-span-2 space-y-3">
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Quick Actions</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {quickActions.map((action, i) => (
              <button
                key={i}
                onClick={() => onNavigate?.(action.tab)}
                className="flex items-center gap-3 p-3.5 rounded-lg border border-border bg-card hover:border-primary/30 transition-all text-right group"
              >
                <div className="w-9 h-9 rounded bg-muted flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                  <action.icon className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{action.label}</p>
                  <p className="text-[11px] text-muted-foreground">{action.desc}</p>
                </div>
                <ArrowLeft className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-primary transition-colors shrink-0" />
              </button>
            ))}
          </div>
        </div>

        {/* Notifications Panel */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Notifications</h3>
            <button
              onClick={() => onNavigate?.("notifications")}
              className="text-[11px] text-primary hover:underline"
            >
              View All
            </button>
          </div>
          <Card className="border-border">
            <CardContent className="p-0 divide-y divide-border">
              {recentNotifications.length === 0 ? (
                <div className="p-6 text-center">
                  <Bell className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
                  <p className="text-xs text-muted-foreground">No notifications</p>
                </div>
              ) : (
                recentNotifications.map(n => (
                  <div key={n.id} className={`p-3 ${!n.is_read ? "bg-primary/[0.02]" : ""}`}>
                    <div className="flex items-start gap-2.5">
                      <span className="text-sm mt-0.5">{typeIcons[n.type] || "🔵"}</span>
                      <div className="min-w-0 flex-1">
                        <p className={`text-xs ${!n.is_read ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                          {n.title}
                        </p>
                        <p className="text-[10px] text-muted-foreground/70 mt-0.5 truncate">{n.message}</p>
                        <p className="text-[9px] text-muted-foreground/50 mt-1">
                          {new Date(n.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                      {!n.is_read && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 mt-1.5" />}
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
