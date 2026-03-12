import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  ClipboardList, TrendingUp, FileText, CreditCard, Package,
  Search, Bell, Receipt, Download, ChevronLeft, ArrowLeft
} from "lucide-react";
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

const orderStatusLabels: Record<string, { text: string; color: string }> = {
  pending: { text: "قيد المراجعة", color: "bg-yellow-100 text-yellow-700" },
  confirmed: { text: "تم التأكيد", color: "bg-blue-100 text-blue-700" },
  processing: { text: "جاري التجهيز", color: "bg-orange-100 text-orange-700" },
  shipped: { text: "تم الشحن", color: "bg-purple-100 text-purple-700" },
  delivered: { text: "تم التسليم", color: "bg-green-100 text-green-700" },
  cancelled: { text: "ملغي", color: "bg-red-100 text-red-700" },
};

const quoteStatusLabels: Record<string, { text: string; color: string }> = {
  draft: { text: "مسودة", color: "bg-muted text-muted-foreground" },
  sent: { text: "مرسل", color: "bg-blue-100 text-blue-700" },
  accepted: { text: "مقبول", color: "bg-green-100 text-green-700" },
  rejected: { text: "مرفوض", color: "bg-red-100 text-red-700" },
};

const DealerOverview = ({
  dealerAccount, dealerName, email, ordersCount,
  totalSpent, invoicesCount, pendingOrders, userId, onNavigate
}: DealerOverviewProps) => {
  const [recentNotifications, setRecentNotifications] = useState<Notification[]>([]);
  const [dailyQuotes, setDailyQuotes] = useState(0);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [recentQuotes, setRecentQuotes] = useState<RecentQuote[]>([]);
  const [accountSummary, setAccountSummary] = useState<OrderSummary>({
    delivered_total: 0, delivered_count: 0, pending_total: 0, pending_count: 0, cancelled_total: 0,
  });

  useEffect(() => {
    Promise.all([
      supabase.from("notifications").select("id, title, message, type, is_read, created_at")
        .eq("user_id", userId).order("created_at", { ascending: false }).limit(4),
      supabase.rpc("get_daily_view_count", { _user_id: userId }),
      supabase.from("orders").select("id, order_number, status, total_amount, created_at, invoice_url")
        .eq("user_id", userId).neq("status", "cancelled").order("created_at", { ascending: false }).limit(3),
      supabase.from("dealer_quotes").select("id, quote_number, status, total_amount, created_at")
        .eq("user_id", userId).order("created_at", { ascending: false }).limit(3),
      supabase.from("orders").select("status, total_amount").eq("user_id", userId),
    ]).then(([notifRes, quotesCountRes, ordersRes, quotesRes, summaryRes]) => {
      setRecentNotifications((notifRes.data as Notification[]) || []);
      setDailyQuotes(quotesCountRes.data || 0);
      setRecentOrders((ordersRes.data as RecentOrder[]) || []);
      setRecentQuotes((quotesRes.data as RecentQuote[]) || []);

      const orders = summaryRes.data || [];
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

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-card border border-border rounded-2xl p-5 sm:p-6">
        <h1 className="text-2xl sm:text-3xl font-black text-foreground">
          أهلاً، {dealerName} 👋
        </h1>
        <div className="flex flex-wrap items-center gap-2 mt-2">
          {dealerAccount && (
            <span className="text-xs font-bold bg-primary/10 text-primary px-3 py-1.5 rounded-lg">
              {tierLabels[dealerAccount.tier] || dealerAccount.tier}
            </span>
          )}
          <span className="text-xs text-muted-foreground">{email}</span>
        </div>
      </div>

      {/* Quick Actions - Big, clear buttons for non-tech users */}
      <div>
        <h2 className="text-base font-bold text-foreground mb-3">🚀 ماذا تريد أن تفعل؟</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <button
            onClick={() => onNavigate?.("quotes")}
            className="bg-primary text-primary-foreground rounded-2xl p-5 text-right hover:opacity-90 transition-all shadow-md active:scale-[0.98]"
          >
            <span className="text-3xl block mb-2">🔍</span>
            <p className="text-lg font-bold">اطلب قطع غيار</p>
            <p className="text-sm opacity-80 mt-1">ابحث عن أي قطعة واطلب عرض سعر</p>
          </button>

          <button
            onClick={() => onNavigate?.("price_lists")}
            className="bg-card border-2 border-primary/20 rounded-2xl p-5 text-right hover:border-primary/40 hover:shadow-md transition-all active:scale-[0.98]"
          >
            <span className="text-3xl block mb-2">📋</span>
            <p className="text-lg font-bold text-foreground">كشوفات الأسعار</p>
            <p className="text-sm text-muted-foreground mt-1">اطلع على الأسعار المحدثة</p>
          </button>

          <button
            onClick={() => onNavigate?.("orders")}
            className="bg-card border border-border rounded-2xl p-5 text-right hover:border-primary/30 hover:shadow-md transition-all active:scale-[0.98]"
          >
            <span className="text-3xl block mb-2">📦</span>
            <p className="text-lg font-bold text-foreground">تابع طلباتك</p>
            <p className="text-sm text-muted-foreground mt-1">
              {pendingOrders > 0
                ? `عندك ${pendingOrders} طلب قيد التنفيذ`
                : "اعرف حالة طلباتك"}
            </p>
          </button>
        </div>
      </div>

      {/* Stats Summary - Simplified */}
      <div>
        <h2 className="text-base font-bold text-foreground mb-3">📊 ملخص حسابك</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div
            className="bg-card border border-border rounded-xl p-4 cursor-pointer hover:shadow-md hover:border-primary/30 transition-all active:scale-[0.98]"
            onClick={() => onNavigate?.("orders")}
          >
            <span className="text-2xl block mb-1">📦</span>
            <p className="text-2xl font-black text-foreground">{ordersCount}</p>
            <p className="text-xs text-muted-foreground font-medium">إجمالي الطلبات</p>
          </div>

          <div
            className="bg-card border border-border rounded-xl p-4 cursor-pointer hover:shadow-md hover:border-primary/30 transition-all active:scale-[0.98]"
            onClick={() => onNavigate?.("orders")}
          >
            <span className="text-2xl block mb-1">⏳</span>
            <p className="text-2xl font-black text-foreground">{pendingOrders}</p>
            <p className="text-xs text-muted-foreground font-medium">قيد التنفيذ</p>
          </div>

          <div
            className="bg-card border border-border rounded-xl p-4 cursor-pointer hover:shadow-md hover:border-primary/30 transition-all active:scale-[0.98]"
            onClick={() => onNavigate?.("statement")}
          >
            <span className="text-2xl block mb-1">💰</span>
            <p className="text-2xl font-black text-foreground">{accountSummary.delivered_total.toLocaleString("ar-EG")}</p>
            <p className="text-xs text-muted-foreground font-medium">ج.م — مشترياتك</p>
          </div>

          <div
            className="bg-card border border-border rounded-xl p-4 cursor-pointer hover:shadow-md hover:border-primary/30 transition-all active:scale-[0.98]"
            onClick={() => onNavigate?.("statement")}
          >
            <span className="text-2xl block mb-1">📄</span>
            <p className="text-2xl font-black text-foreground">{accountSummary.pending_total.toLocaleString("ar-EG")}</p>
            <p className="text-xs text-muted-foreground font-medium">ج.م — مبالغ معلقة</p>
          </div>
        </div>
      </div>

      {/* Recent Orders & Quotes - Side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Orders */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <span>📦</span> آخر الطلبات
            </h3>
            <button
              onClick={() => onNavigate?.("orders")}
              className="text-xs text-primary hover:underline font-bold flex items-center gap-1"
            >
              عرض الكل <ArrowLeft className="w-3 h-3" />
            </button>
          </div>
          {recentOrders.length === 0 ? (
            <div className="p-8 text-center">
              <span className="text-4xl block mb-2">📭</span>
              <p className="text-sm text-muted-foreground mb-3">لا توجد طلبات بعد</p>
              <button
                onClick={() => onNavigate?.("quotes")}
                className="text-sm text-primary font-bold hover:underline"
              >
                اطلب قطع غيار الآن ←
              </button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {recentOrders.map(o => {
                const st = orderStatusLabels[o.status] || orderStatusLabels.pending;
                return (
                  <div
                    key={o.id}
                    className="p-4 hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => onNavigate?.("orders")}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-foreground">{o.order_number}</span>
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${st.color}`}>
                        {st.text}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-muted-foreground">
                        {new Date(o.created_at).toLocaleDateString("ar-EG", { month: "long", day: "numeric" })}
                      </span>
                      <span className="text-sm font-black text-foreground">
                        {Number(o.total_amount).toLocaleString("ar-EG")} ج.م
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Quotes */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <span>📝</span> آخر عروض الأسعار
            </h3>
            <button
              onClick={() => onNavigate?.("quotes")}
              className="text-xs text-primary hover:underline font-bold flex items-center gap-1"
            >
              عرض الكل <ArrowLeft className="w-3 h-3" />
            </button>
          </div>
          {recentQuotes.length === 0 ? (
            <div className="p-8 text-center">
              <span className="text-4xl block mb-2">📝</span>
              <p className="text-sm text-muted-foreground mb-3">لا توجد عروض أسعار</p>
              <button
                onClick={() => onNavigate?.("quotes")}
                className="text-sm text-primary font-bold hover:underline"
              >
                اطلب عرض سعر الآن ←
              </button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {recentQuotes.map(q => {
                const st = quoteStatusLabels[q.status] || quoteStatusLabels.draft;
                return (
                  <div
                    key={q.id}
                    className="p-4 hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => onNavigate?.("quotes")}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-foreground">{q.quote_number}</span>
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${st.color}`}>
                        {st.text}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-muted-foreground">
                        {new Date(q.created_at).toLocaleDateString("ar-EG", { month: "long", day: "numeric" })}
                      </span>
                      <span className="text-sm font-black text-foreground">
                        {Number(q.total_amount).toLocaleString("ar-EG")} ج.م
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Notifications - Simplified */}
      {recentNotifications.length > 0 && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <span>🔔</span> آخر الإشعارات
            </h3>
            <button
              onClick={() => onNavigate?.("notifications")}
              className="text-xs text-primary hover:underline font-bold"
            >
              عرض الكل
            </button>
          </div>
          <div className="divide-y divide-border">
            {recentNotifications.map(n => (
              <div
                key={n.id}
                className={`p-4 cursor-pointer hover:bg-muted/30 transition-colors ${!n.is_read ? "bg-primary/[0.03]" : ""}`}
                onClick={() => onNavigate?.("notifications")}
              >
                <div className="flex items-start gap-3">
                  {!n.is_read && <span className="w-2.5 h-2.5 rounded-full bg-primary shrink-0 mt-1.5" />}
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm leading-relaxed ${!n.is_read ? "font-bold text-foreground" : "text-muted-foreground"}`}>
                      {n.title}
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      {new Date(n.created_at).toLocaleDateString("ar-EG", { month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      <DealerRecommendations userId={userId} tier={dealerAccount?.tier} onNavigateToQuotes={() => onNavigate?.("quotes")} />
    </div>
  );
};

export default DealerOverview;
