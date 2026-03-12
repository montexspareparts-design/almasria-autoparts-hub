import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, TrendingUp, Clock, ShoppingBag, Wallet } from "lucide-react";
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
}

const tierLabels: Record<string, string> = {
  wholesale_tier1: "تاجر جملة — درجة أولى",
  wholesale_tier2: "تاجر جملة — درجة ثانية",
  corporate: "شركة / مؤسسة",
  retail: "عميل قطاعي",
};

const orderStatusLabels: Record<string, { text: string; bg: string; text_color: string }> = {
  pending: { text: "قيد المراجعة", bg: "bg-amber-50", text_color: "text-amber-700" },
  confirmed: { text: "تم التأكيد", bg: "bg-blue-50", text_color: "text-blue-700" },
  processing: { text: "جاري التجهيز", bg: "bg-orange-50", text_color: "text-orange-700" },
  shipped: { text: "تم الشحن", bg: "bg-violet-50", text_color: "text-violet-700" },
  delivered: { text: "تم التسليم", bg: "bg-emerald-50", text_color: "text-emerald-700" },
  cancelled: { text: "ملغي", bg: "bg-red-50", text_color: "text-red-700" },
  awaiting_payment: { text: "بانتظار الدفع", bg: "bg-yellow-50", text_color: "text-yellow-700" },
};

const quoteStatusLabels: Record<string, { text: string; bg: string; text_color: string }> = {
  draft: { text: "مسودة", bg: "bg-muted", text_color: "text-muted-foreground" },
  sent: { text: "مرسل", bg: "bg-blue-50", text_color: "text-blue-700" },
  accepted: { text: "مقبول", bg: "bg-emerald-50", text_color: "text-emerald-700" },
  rejected: { text: "مرفوض", bg: "bg-red-50", text_color: "text-red-700" },
};

const DealerOverview = ({
  dealerAccount, dealerName, email, ordersCount,
  totalSpent, invoicesCount, pendingOrders, userId, onNavigate
}: DealerOverviewProps) => {
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [recentQuotes, setRecentQuotes] = useState<RecentQuote[]>([]);
  const [accountSummary, setAccountSummary] = useState<OrderSummary>({
    delivered_total: 0, delivered_count: 0, pending_total: 0, pending_count: 0,
  });

  useEffect(() => {
    Promise.all([
      supabase.from("orders").select("id, order_number, status, total_amount, created_at, invoice_url")
        .eq("user_id", userId).neq("status", "cancelled").order("created_at", { ascending: false }).limit(3),
      supabase.from("dealer_quotes").select("id, quote_number, status, total_amount, created_at")
        .eq("user_id", userId).order("created_at", { ascending: false }).limit(3),
      supabase.from("orders").select("status, total_amount").eq("user_id", userId),
    ]).then(([ordersRes, quotesRes, summaryRes]) => {
      setRecentOrders((ordersRes.data as RecentOrder[]) || []);
      setRecentQuotes((quotesRes.data as RecentQuote[]) || []);

      const orders = summaryRes.data || [];
      const delivered = orders.filter(o => o.status === "delivered");
      const pending = orders.filter(o => !["delivered", "cancelled"].includes(o.status));
      setAccountSummary({
        delivered_total: delivered.reduce((s, o) => s + Number(o.total_amount), 0),
        delivered_count: delivered.length,
        pending_total: pending.reduce((s, o) => s + Number(o.total_amount), 0),
        pending_count: pending.length,
      });
    });
  }, [userId]);

  const stats = [
    {
      label: "إجمالي الطلبات",
      value: ordersCount,
      icon: ShoppingBag,
      color: "from-primary/10 to-primary/5",
      iconColor: "text-primary",
      tab: "orders",
    },
    {
      label: "قيد التنفيذ",
      value: pendingOrders,
      icon: Clock,
      color: "from-amber-500/10 to-amber-500/5",
      iconColor: "text-amber-600",
      tab: "orders",
      highlight: pendingOrders > 0,
    },
    {
      label: "مشترياتك",
      value: `${accountSummary.delivered_total.toLocaleString("ar-EG")}`,
      suffix: "ج.م",
      icon: TrendingUp,
      color: "from-emerald-500/10 to-emerald-500/5",
      iconColor: "text-emerald-600",
      tab: "statement",
    },
    {
      label: "مبالغ معلقة",
      value: `${accountSummary.pending_total.toLocaleString("ar-EG")}`,
      suffix: "ج.م",
      icon: Wallet,
      color: "from-violet-500/10 to-violet-500/5",
      iconColor: "text-violet-600",
      tab: "statement",
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-5 max-w-5xl mx-auto">
      {/* Header: Name + Tier */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg sm:text-2xl font-black text-foreground leading-tight">
            مرحباً {dealerName} 👋
          </h1>
          {dealerAccount && (
            <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
              {tierLabels[dealerAccount.tier] || dealerAccount.tier}
            </p>
          )}
        </div>
      </div>

      {/* 1. Stats — نظرة سريعة */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        {stats.map((s, i) => (
          <button
            key={i}
            onClick={() => onNavigate?.(s.tab)}
            className={`relative bg-gradient-to-br ${s.color} border border-border/60 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-right transition-all hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.97] group overflow-hidden`}
          >
            {s.highlight && (
              <span className="absolute top-2 left-2 w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-amber-500 animate-pulse" />
            )}
            <s.icon className={`w-4 h-4 sm:w-5 sm:h-5 ${s.iconColor} mb-1 sm:mb-2 opacity-70`} />
            <p className="text-xl sm:text-2xl font-black text-foreground leading-none">
              {s.value}
              {s.suffix && <span className="text-[10px] sm:text-xs font-medium text-muted-foreground mr-1">{s.suffix}</span>}
            </p>
            <p className="text-[10px] sm:text-[11px] text-muted-foreground font-medium mt-1">{s.label}</p>
          </button>
        ))}
      </div>

      {/* 2. Quick Actions — مضغوطة على الموبايل */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <button
          onClick={() => onNavigate?.("quotes")}
          className="bg-primary text-primary-foreground rounded-xl sm:rounded-2xl p-3 sm:p-5 text-center sm:text-right hover:brightness-110 transition-all shadow-md shadow-primary/20 active:scale-[0.98] group"
        >
          <span className="text-2xl sm:text-3xl block">🔍</span>
          <p className="text-xs sm:text-base font-bold mt-1.5 sm:mt-3 leading-tight">اطلب قطع غيار</p>
          <p className="text-[9px] sm:text-xs opacity-75 mt-0.5 hidden sm:block">ابحث واطلب عرض سعر</p>
        </button>

        <button
          onClick={() => onNavigate?.("price_lists")}
          className="bg-card border border-border rounded-xl sm:rounded-2xl p-3 sm:p-5 text-center sm:text-right hover:border-primary/40 hover:shadow-md transition-all active:scale-[0.98] group"
        >
          <span className="text-2xl sm:text-3xl block">📋</span>
          <p className="text-xs sm:text-base font-bold text-foreground mt-1.5 sm:mt-3 leading-tight">كشوفات الأسعار</p>
          <p className="text-[9px] sm:text-xs text-muted-foreground mt-0.5 hidden sm:block">الأسعار المحدثة</p>
        </button>

        <button
          onClick={() => onNavigate?.("orders")}
          className="bg-card border border-border rounded-xl sm:rounded-2xl p-3 sm:p-5 text-center sm:text-right hover:border-primary/40 hover:shadow-md transition-all active:scale-[0.98] group"
        >
          <span className="text-2xl sm:text-3xl block">📦</span>
          <p className="text-xs sm:text-base font-bold text-foreground mt-1.5 sm:mt-3 leading-tight">تابع طلباتك</p>
          <p className="text-[9px] sm:text-xs text-muted-foreground mt-0.5 hidden sm:block">
            {pendingOrders > 0 ? `${pendingOrders} قيد التنفيذ` : "حالة الطلبات"}
          </p>
        </button>
      </div>

      {/* 3. Recent Orders & Quotes — آخر النشاط */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Orders */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="text-sm font-bold text-foreground">📦 آخر الطلبات</h3>
            <button
              onClick={() => onNavigate?.("orders")}
              className="text-[11px] text-primary hover:underline font-bold flex items-center gap-0.5"
            >
              الكل <ArrowLeft className="w-3 h-3" />
            </button>
          </div>
          {recentOrders.length === 0 ? (
            <div className="p-10 text-center">
              <span className="text-4xl block mb-2">📭</span>
              <p className="text-sm text-muted-foreground mb-3">لا توجد طلبات بعد</p>
              <button onClick={() => onNavigate?.("quotes")} className="text-sm text-primary font-bold hover:underline">
                اطلب الآن ←
              </button>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {recentOrders.map(o => {
                const st = orderStatusLabels[o.status] || orderStatusLabels.pending;
                return (
                  <div
                    key={o.id}
                    className="px-4 py-3.5 hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => onNavigate?.("orders")}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[13px] font-bold text-foreground font-mono tracking-tight">{o.order_number}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${st.bg} ${st.text_color}`}>
                        {st.text}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-[11px] text-muted-foreground">
                        {new Date(o.created_at).toLocaleDateString("ar-EG", { month: "short", day: "numeric" })}
                      </span>
                      <span className="text-[13px] font-black text-foreground">
                        {Number(o.total_amount).toLocaleString("ar-EG")} <span className="text-[10px] font-medium text-muted-foreground">ج.م</span>
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
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="text-sm font-bold text-foreground">📝 آخر عروض الأسعار</h3>
            <button
              onClick={() => onNavigate?.("quotes")}
              className="text-[11px] text-primary hover:underline font-bold flex items-center gap-0.5"
            >
              الكل <ArrowLeft className="w-3 h-3" />
            </button>
          </div>
          {recentQuotes.length === 0 ? (
            <div className="p-10 text-center">
              <span className="text-4xl block mb-2">📝</span>
              <p className="text-sm text-muted-foreground mb-3">لا توجد عروض أسعار</p>
              <button onClick={() => onNavigate?.("quotes")} className="text-sm text-primary font-bold hover:underline">
                اطلب عرض سعر ←
              </button>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {recentQuotes.map(q => {
                const st = quoteStatusLabels[q.status] || quoteStatusLabels.draft;
                return (
                  <div
                    key={q.id}
                    className="px-4 py-3.5 hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => onNavigate?.("quotes")}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[13px] font-bold text-foreground font-mono tracking-tight">{q.quote_number}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${st.bg} ${st.text_color}`}>
                        {st.text}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-[11px] text-muted-foreground">
                        {new Date(q.created_at).toLocaleDateString("ar-EG", { month: "short", day: "numeric" })}
                      </span>
                      <span className="text-[13px] font-black text-foreground">
                        {Number(q.total_amount).toLocaleString("ar-EG")} <span className="text-[10px] font-medium text-muted-foreground">ج.م</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 4. Recommendations */}
      <DealerRecommendations userId={userId} tier={dealerAccount?.tier} onNavigateToQuotes={() => onNavigate?.("quotes")} />
    </div>
  );
};

export default DealerOverview;
