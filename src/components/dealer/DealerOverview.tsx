import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  ClipboardList, TrendingUp, TrendingDown, FileText, CreditCard, Package,
  Clock, Search, Bell, Receipt, Download, ChevronLeft
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import DealerRecommendations from "./DealerRecommendations";

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

interface RecentOrder {
  id: string;
  order_number: string;
  status: string;
  total_amount: number;
  created_at: string;
  invoice_url: string | null;
}

interface RecentQuote {
  id: string;
  quote_number: string;
  status: string;
  total_amount: number;
  created_at: string;
}

interface OrderSummary {
  delivered_total: number;
  delivered_count: number;
  pending_total: number;
  pending_count: number;
  cancelled_total: number;
}

const tierLabels: Record<string, string> = {
  wholesale_tier1: "تاجر جملة — درجة أولى",
  wholesale_tier2: "تاجر جملة — درجة ثانية",
  corporate: "شركة / مؤسسة",
  retail: "عميل قطاعي",
};

const typeIcons: Record<string, string> = {
  info: "🔵",
  success: "✅",
  warning: "⚠️",
  order: "📦",
};

const orderStatusLabels: Record<string, { text: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { text: "قيد المراجعة", variant: "secondary" },
  confirmed: { text: "تم التأكيد", variant: "outline" },
  processing: { text: "جاري التجهيز", variant: "outline" },
  shipped: { text: "تم الشحن", variant: "default" },
  delivered: { text: "تم التسليم", variant: "default" },
  cancelled: { text: "ملغي", variant: "destructive" },
};

const quoteStatusLabels: Record<string, { text: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { text: "مسودة", variant: "secondary" },
  sent: { text: "مرسل", variant: "outline" },
  accepted: { text: "مقبول", variant: "default" },
  rejected: { text: "مرفوض", variant: "destructive" },
};

const DealerOverview = ({
  dealerAccount, dealerName, email, ordersCount,
  totalSpent, invoicesCount, pendingOrders, userId, onNavigate
}: DealerOverviewProps) => {
  const [recentNotifications, setRecentNotifications] = useState<Notification[]>([]);
  const [dailyQuotes, setDailyQuotes] = useState(0);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [recentQuotes, setRecentQuotes] = useState<RecentQuote[]>([]);
  const [recentInvoices, setRecentInvoices] = useState<RecentOrder[]>([]);
  const [accountSummary, setAccountSummary] = useState<OrderSummary>({
    delivered_total: 0, delivered_count: 0, pending_total: 0, pending_count: 0, cancelled_total: 0,
  });

  useEffect(() => {
    // Fetch notifications
    supabase
      .from("notifications")
      .select("id, title, message, type, is_read, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5)
      .then(({ data }) => setRecentNotifications((data as Notification[]) || []));

    // Fetch daily quotes count
    supabase
      .rpc("get_daily_view_count", { _user_id: userId })
      .then(({ data }) => setDailyQuotes(data || 0));

    // Fetch recent orders (all statuses to match count)
    supabase
      .from("orders")
      .select("id, order_number, status, total_amount, created_at, invoice_url")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5)
      .then(({ data }) => setRecentOrders((data as RecentOrder[]) || []));

    // Fetch recent quotes
    supabase
      .from("dealer_quotes")
      .select("id, quote_number, status, total_amount, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5)
      .then(({ data }) => setRecentQuotes((data as RecentQuote[]) || []));

    // Fetch recent invoices (orders with invoice_url)
    supabase
      .from("orders")
      .select("id, order_number, status, total_amount, created_at, invoice_url")
      .eq("user_id", userId)
      .not("invoice_url", "is", null)
      .order("created_at", { ascending: false })
      .limit(5)
      .then(({ data }) => setRecentInvoices((data as RecentOrder[]) || []));

    // Fetch account summary
    supabase
      .from("orders")
      .select("status, total_amount")
      .eq("user_id", userId)
      .then(({ data }) => {
        const orders = data || [];
        const delivered = orders.filter(o => o.status === "delivered");
        const pending = orders.filter(o => !["delivered", "cancelled"].includes(o.status));
        const cancelled = orders.filter(o => o.status === "cancelled");
        setAccountSummary({
          delivered_total: delivered.reduce((s, o) => s + Number(o.total_amount), 0),
          delivered_count: delivered.length,
          pending_total: pending.reduce((s, o) => s + Number(o.total_amount), 0),
          pending_count: pending.length,
          cancelled_total: cancelled.reduce((s, o) => s + Number(o.total_amount), 0),
        });
      });
  }, [userId]);

  const creditLimit = Number((dealerAccount as any)?.credit_limit || 0);
  const availableCredit = Math.max(0, creditLimit - accountSummary.pending_total);

  const stats = [
    { icon: Search, label: "عروض الأسعار اليوم", value: `${dailyQuotes}/20`, sub: "الحد اليومي", tab: "quotes" },
    { icon: Package, label: "الأصناف المتاحة", value: "+5,000", sub: "في الكتالوج", tab: "quotes" },
    { icon: ClipboardList, label: "إجمالي الطلبات", value: ordersCount.toString(), sub: "كل الفترات", tab: "orders" },
    { icon: Clock, label: "طلبات قيد التنفيذ", value: pendingOrders.toString(), sub: "جاري المعالجة", tab: "orders" },
  ];

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

      {/* KPI Cards */}
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

      {/* Recent Quotes, Orders, Invoices — 3 columns (QUOTES FIRST) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Quotes */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground">عروض الأسعار</h3>
            <button onClick={() => onNavigate?.("quotes")} className="text-[11px] text-primary hover:underline font-medium">
              عرض الكل
            </button>
          </div>
          <div
            className="bg-card border border-border rounded-lg divide-y divide-border cursor-pointer hover:border-primary/30 hover:shadow-sm transition-all"
            onClick={() => onNavigate?.("quotes")}
          >
            {recentQuotes.length === 0 ? (
              <div className="p-6 text-center">
                <Search className="w-7 h-7 mx-auto text-muted-foreground/30 mb-1.5" />
                <p className="text-xs text-muted-foreground mb-2">لا توجد عروض أسعار</p>
                <span className="text-[11px] text-primary font-medium">إنشاء عرض سعر ←</span>
              </div>
            ) : (
              recentQuotes.map(q => {
                const st = quoteStatusLabels[q.status] || quoteStatusLabels.draft;
                return (
                  <div key={q.id} className="p-3 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-foreground">{q.quote_number}</span>
                      <Badge variant={st.variant} className="text-[9px] px-1.5 py-0">{st.text}</Badge>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(q.created_at).toLocaleDateString("ar-EG", { month: "short", day: "numeric" })}
                      </span>
                      <span className="text-xs font-bold text-foreground">{Number(q.total_amount).toLocaleString("ar-EG")} ج.م</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Recent Orders */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground">الطلبية</h3>
            <button onClick={() => onNavigate?.("orders")} className="text-[11px] text-primary hover:underline font-medium">
              عرض الكل
            </button>
          </div>
          <div
            className="bg-card border border-border rounded-lg divide-y divide-border cursor-pointer hover:border-primary/30 hover:shadow-sm transition-all"
            onClick={() => onNavigate?.("orders")}
          >
            {recentOrders.length === 0 ? (
              <div className="p-6 text-center">
                <ClipboardList className="w-7 h-7 mx-auto text-muted-foreground/30 mb-1.5" />
                <p className="text-xs text-muted-foreground mb-2">لا توجد طلبات</p>
                <span className="text-[11px] text-primary font-medium">عرض الطلبية ←</span>
              </div>
            ) : (
              recentOrders.map(o => {
                const st = orderStatusLabels[o.status] || orderStatusLabels.pending;
                return (
                  <div key={o.id} className="p-3 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-foreground">{o.order_number}</span>
                      <Badge variant={st.variant} className="text-[9px] px-1.5 py-0">{st.text}</Badge>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(o.created_at).toLocaleDateString("ar-EG", { month: "short", day: "numeric" })}
                      </span>
                      <span className="text-xs font-bold text-foreground">{Number(o.total_amount).toLocaleString("ar-EG")} ج.م</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Recent Invoices */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground">الفواتير</h3>
            <button onClick={() => onNavigate?.("invoices")} className="text-[11px] text-primary hover:underline font-medium">
              عرض الكل
            </button>
          </div>
          <div
            className="bg-card border border-border rounded-lg divide-y divide-border cursor-pointer hover:border-primary/30 hover:shadow-sm transition-all"
            onClick={() => onNavigate?.("invoices")}
          >
            {recentInvoices.length === 0 ? (
              <div className="p-6 text-center">
                <FileText className="w-7 h-7 mx-auto text-muted-foreground/30 mb-1.5" />
                <p className="text-xs text-muted-foreground mb-2">لا توجد فواتير</p>
                <span className="text-[11px] text-primary font-medium">عرض الفواتير ←</span>
              </div>
            ) : (
              recentInvoices.map(inv => (
                <div key={inv.id} className="p-3 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-foreground">{inv.order_number}</span>
                    {inv.invoice_url && (
                      <a href={inv.invoice_url} target="_blank" rel="noreferrer" className="text-primary hover:text-primary/80" onClick={e => e.stopPropagation()}>
                        <Download className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(inv.created_at).toLocaleDateString("ar-EG", { month: "short", day: "numeric" })}
                    </span>
                    <span className="text-xs font-bold text-foreground">{Number(inv.total_amount).toLocaleString("ar-EG")} ج.م</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Account Statement Summary */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-foreground">كشف الحساب</h3>
          <button onClick={() => onNavigate?.("statement")} className="text-[11px] text-primary hover:underline font-medium">
            عرض التفاصيل
          </button>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-card border border-border rounded-lg p-3.5">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-green-500/10 flex items-center justify-center">
                <TrendingUp className="w-3.5 h-3.5 text-green-600" />
              </div>
            </div>
            <p className="text-lg font-bold text-foreground">{accountSummary.delivered_total.toLocaleString("ar-EG")}</p>
            <p className="text-[11px] text-muted-foreground">ج.م — المشتريات</p>
            <p className="text-[10px] text-muted-foreground/60">{accountSummary.delivered_count} طلب مكتمل</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-3.5">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Receipt className="w-3.5 h-3.5 text-amber-600" />
              </div>
            </div>
            <p className="text-lg font-bold text-foreground">{accountSummary.pending_total.toLocaleString("ar-EG")}</p>
            <p className="text-[11px] text-muted-foreground">ج.م — معلقة</p>
            <p className="text-[10px] text-muted-foreground/60">{accountSummary.pending_count} طلب</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-3.5">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                <CreditCard className="w-3.5 h-3.5 text-primary" />
              </div>
            </div>
            <p className="text-lg font-bold text-foreground">{creditLimit > 0 ? creditLimit.toLocaleString("ar-EG") : "—"}</p>
            <p className="text-[11px] text-muted-foreground">ج.م — حد الائتمان</p>
            <p className="text-[10px] text-muted-foreground/60">{creditLimit > 0 ? `متاح: ${availableCredit.toLocaleString("ar-EG")}` : "غير محدد"}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-3.5">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-destructive/10 flex items-center justify-center">
                <TrendingDown className="w-3.5 h-3.5 text-destructive" />
              </div>
            </div>
            <p className="text-lg font-bold text-foreground">{accountSummary.cancelled_total.toLocaleString("ar-EG")}</p>
            <p className="text-[11px] text-muted-foreground">ج.م — ملغاة</p>
          </div>
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

      {/* Recommendations */}
      <DealerRecommendations userId={userId} tier={dealerAccount?.tier} onNavigateToQuotes={() => onNavigate?.("quotes")} />
    </div>
  );
};

export default DealerOverview;
