import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft } from "lucide-react";
import DealerRecommendations from "./DealerRecommendations";
import { requestPushPermission, isPushSubscribed } from "@/lib/pushNotifications";

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
  pending_total: number;
}

const tierLabels: Record<string, string> = {
  wholesale_tier1: "تاجر جملة — درجة أولى",
  wholesale_tier2: "تاجر جملة — درجة ثانية",
  corporate: "شركة / مؤسسة",
  retail: "عميل قطاعي",
};

const orderStatusLabels: Record<string, { text: string; emoji: string }> = {
  pending: { text: "قيد المراجعة", emoji: "⏳" },
  confirmed: { text: "تم التأكيد", emoji: "✅" },
  processing: { text: "جاري التجهيز", emoji: "⚙️" },
  shipped: { text: "تم الشحن", emoji: "🚚" },
  delivered: { text: "تم التسليم", emoji: "📦" },
  cancelled: { text: "ملغي", emoji: "❌" },
  awaiting_payment: { text: "بانتظار الدفع", emoji: "💳" },
};

const quoteStatusLabels: Record<string, { text: string; emoji: string }> = {
  draft: { text: "مسودة", emoji: "📝" },
  sent: { text: "مرسل", emoji: "📤" },
  accepted: { text: "مقبول", emoji: "✅" },
  rejected: { text: "مرفوض", emoji: "❌" },
};

const DealerOverview = ({
  dealerAccount, dealerName, ordersCount,
  pendingOrders, userId, onNavigate
}: DealerOverviewProps) => {
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [recentQuotes, setRecentQuotes] = useState<RecentQuote[]>([]);
  const [accountSummary, setAccountSummary] = useState<OrderSummary>({
    delivered_total: 0, pending_total: 0,
  });
  const [showPushBanner, setShowPushBanner] = useState(false);

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
        pending_total: pending.reduce((s, o) => s + Number(o.total_amount), 0),
      });
    });

    // Check if push notifications are supported but not subscribed
    if ("Notification" in window && "serviceWorker" in navigator) {
      isPushSubscribed().then((subscribed) => {
        if (!subscribed && Notification.permission !== "denied") {
          setShowPushBanner(true);
        }
      });
    }
  }, [userId]);

  const firstName = dealerName?.split(" ")[0] || "تاجر";

  return (
    <div className="space-y-5 max-w-lg mx-auto pb-8">

      {/* Header — big greeting */}
      <div className="text-center pt-2">
        <p className="text-3xl mb-1">👋</p>
        <h1 className="text-xl font-black text-foreground">أهلاً {firstName}</h1>
        {dealerAccount && (
          <p className="text-xs text-muted-foreground mt-1">
            {tierLabels[dealerAccount.tier] || dealerAccount.tier}
          </p>
        )}
      </div>

      {/* Big CTA — اطلب قطع غيار */}
      <button
        onClick={() => onNavigate?.("quotes")}
        className="w-full bg-primary text-primary-foreground rounded-2xl p-5 text-center active:scale-[0.97] transition-transform shadow-lg shadow-primary/25"
      >
        <span className="text-4xl block mb-2">🔍</span>
        <p className="text-lg font-black">اطلب قطع غيار</p>
        <p className="text-xs opacity-80 mt-1">ابحث عن أي قطعة واطلب عرض سعر</p>
      </button>

      {/* Quick actions — 2 big buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => onNavigate?.("orders")}
          className="bg-card border-2 border-border rounded-2xl p-4 text-center active:scale-[0.97] transition-transform hover:border-primary/30"
        >
          <span className="text-3xl block mb-2">📦</span>
          <p className="text-sm font-bold text-foreground">طلباتي</p>
          {pendingOrders > 0 && (
            <span className="inline-block mt-1.5 text-[11px] font-bold bg-amber-100 text-amber-700 px-2.5 py-0.5 rounded-full">
              {pendingOrders} جارية
            </span>
          )}
        </button>

        <button
          onClick={() => onNavigate?.("price_lists")}
          className="bg-card border-2 border-border rounded-2xl p-4 text-center active:scale-[0.97] transition-transform hover:border-primary/30"
        >
          <span className="text-3xl block mb-2">📋</span>
          <p className="text-sm font-bold text-foreground">كشوفات الأسعار</p>
          <span className="inline-block mt-1.5 text-[11px] text-muted-foreground">الأسعار المحدثة</span>
        </button>
      </div>

      {/* Mini stats — simple row */}
      <div className="bg-card border border-border rounded-2xl divide-y divide-border overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3.5">
          <span className="text-sm text-muted-foreground">إجمالي طلباتك</span>
          <span className="text-base font-black text-foreground">{ordersCount}</span>
        </div>
        <div className="flex items-center justify-between px-4 py-3.5">
          <span className="text-sm text-muted-foreground">مشترياتك</span>
          <span className="text-base font-black text-foreground">
            {accountSummary.delivered_total.toLocaleString("ar-EG")} <span className="text-xs font-medium text-muted-foreground">ج.م</span>
          </span>
        </div>
        {accountSummary.pending_total > 0 && (
          <div className="flex items-center justify-between px-4 py-3.5">
            <span className="text-sm text-muted-foreground">مبالغ معلقة</span>
            <span className="text-base font-black text-amber-600">
              {accountSummary.pending_total.toLocaleString("ar-EG")} <span className="text-xs font-medium">ج.م</span>
            </span>
          </div>
        )}
      </div>

      {/* More shortcuts */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { emoji: "💳", label: "الدفع", tab: "payment" },
          { emoji: "❤️", label: "المفضلة", tab: "favorites" },
          { emoji: "🔔", label: "تنبيهات", tab: "stock_alerts" },
        ].map(item => (
          <button
            key={item.tab}
            onClick={() => onNavigate?.(item.tab)}
            className="bg-card border border-border rounded-xl py-3 text-center active:scale-[0.96] transition-transform hover:border-primary/30"
          >
            <span className="text-xl block">{item.emoji}</span>
            <p className="text-[11px] font-bold text-foreground mt-1">{item.label}</p>
          </button>
        ))}
      </div>

      {/* Recent Orders */}
      {recentOrders.length > 0 && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="text-sm font-bold text-foreground">آخر الطلبات</h3>
            <button
              onClick={() => onNavigate?.("orders")}
              className="text-[11px] text-primary font-bold flex items-center gap-0.5"
            >
              الكل <ArrowLeft className="w-3 h-3" />
            </button>
          </div>
          <div className="divide-y divide-border/60">
            {recentOrders.map(o => {
              const st = orderStatusLabels[o.status] || orderStatusLabels.pending;
              return (
                <button
                  key={o.id}
                  className="w-full px-4 py-3.5 flex items-center justify-between gap-3 active:bg-muted/40 transition-colors text-right"
                  onClick={() => onNavigate?.("orders")}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-foreground font-mono">{o.order_number}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {new Date(o.created_at).toLocaleDateString("ar-EG", { month: "short", day: "numeric" })}
                      {" · "}
                      {Number(o.total_amount).toLocaleString("ar-EG")} ج.م
                    </p>
                  </div>
                  <span className="text-xs font-bold shrink-0">
                    {st.emoji} {st.text}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Quotes */}
      {recentQuotes.length > 0 && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="text-sm font-bold text-foreground">آخر عروض الأسعار</h3>
            <button
              onClick={() => onNavigate?.("quotes")}
              className="text-[11px] text-primary font-bold flex items-center gap-0.5"
            >
              الكل <ArrowLeft className="w-3 h-3" />
            </button>
          </div>
          <div className="divide-y divide-border/60">
            {recentQuotes.map(q => {
              const st = quoteStatusLabels[q.status] || quoteStatusLabels.draft;
              return (
                <button
                  key={q.id}
                  className="w-full px-4 py-3.5 flex items-center justify-between gap-3 active:bg-muted/40 transition-colors text-right"
                  onClick={() => onNavigate?.("quotes")}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-foreground font-mono">{q.quote_number}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {new Date(q.created_at).toLocaleDateString("ar-EG", { month: "short", day: "numeric" })}
                      {" · "}
                      {Number(q.total_amount).toLocaleString("ar-EG")} ج.م
                    </p>
                  </div>
                  <span className="text-xs font-bold shrink-0">
                    {st.emoji} {st.text}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {recentOrders.length === 0 && recentQuotes.length === 0 && (
        <div className="text-center py-8">
          <span className="text-5xl block mb-3">🚀</span>
          <p className="text-sm text-muted-foreground mb-4">ابدأ أول طلب لك الآن!</p>
          <button
            onClick={() => onNavigate?.("quotes")}
            className="bg-primary text-primary-foreground text-sm font-bold px-6 py-2.5 rounded-xl active:scale-95 transition-transform"
          >
            اطلب قطع غيار ←
          </button>
        </div>
      )}

      {/* Recommendations */}
      <DealerRecommendations userId={userId} tier={dealerAccount?.tier} onNavigateToQuotes={() => onNavigate?.("quotes")} />
    </div>
  );
};

export default DealerOverview;
