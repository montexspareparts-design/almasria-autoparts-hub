import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft, Search, FileText, CreditCard, Receipt,
  Package, Truck, Heart, Bell, ChevronLeft, Sparkles,
} from "lucide-react";
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
  pending_total: number;
}

const tierLabels: Record<string, string> = {
  wholesale_tier1: "تاجر جملة — درجة أولى",
  wholesale_tier2: "تاجر جملة — درجة ثانية",
  corporate: "شركة / مؤسسة",
  retail: "عميل قطاعي",
};

const orderStatusLabels: Record<string, { text: string; color: string }> = {
  pending: { text: "قيد المراجعة", color: "bg-amber-500/10 text-amber-700 border-amber-200/50" },
  confirmed: { text: "تم التأكيد", color: "bg-emerald-500/10 text-emerald-700 border-emerald-200/50" },
  processing: { text: "جاري التجهيز", color: "bg-blue-500/10 text-blue-700 border-blue-200/50" },
  shipped: { text: "تم الشحن", color: "bg-violet-500/10 text-violet-700 border-violet-200/50" },
  delivered: { text: "تم التسليم", color: "bg-emerald-500/10 text-emerald-700 border-emerald-200/50" },
  cancelled: { text: "ملغي", color: "bg-destructive/10 text-destructive border-destructive/20" },
  awaiting_payment: { text: "بانتظار الدفع", color: "bg-amber-500/10 text-amber-700 border-amber-200/50" },
};

const quoteStatusLabels: Record<string, { text: string; color: string }> = {
  draft: { text: "مسودة", color: "bg-muted text-muted-foreground border-border" },
  sent: { text: "مرسل", color: "bg-blue-500/10 text-blue-700 border-blue-200/50" },
  accepted: { text: "مقبول", color: "bg-emerald-500/10 text-emerald-700 border-emerald-200/50" },
  rejected: { text: "مرفوض", color: "bg-destructive/10 text-destructive border-destructive/20" },
};

const ease = [0.22, 1, 0.36, 1] as const;

const GlassCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`relative overflow-hidden rounded-[20px] bg-white/[0.55] dark:bg-white/[0.08] backdrop-blur-xl border border-white/30 dark:border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.06)] ${className}`}>
    {children}
  </div>
);

const DealerOverview = ({
  dealerAccount, dealerName, ordersCount,
  pendingOrders, userId, onNavigate
}: DealerOverviewProps) => {
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [recentQuotes, setRecentQuotes] = useState<RecentQuote[]>([]);
  const [accountSummary, setAccountSummary] = useState<OrderSummary>({
    delivered_total: 0, pending_total: 0,
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
        pending_total: pending.reduce((s, o) => s + Number(o.total_amount), 0),
      });
    });
  }, [userId]);

  const firstName = dealerName?.split(" ")[0] || "تاجر";

  return (
    <div className="space-y-5 max-w-lg mx-auto pb-8 relative">

      {/* Ambient bg orbs */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute top-10 -right-32 w-[400px] h-[400px] rounded-full bg-primary/[0.03] blur-[80px]" />
        <div className="absolute bottom-20 -left-20 w-[300px] h-[300px] rounded-full bg-blue-400/[0.04] blur-[60px]" />
      </div>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease }}
        className="text-center pt-3"
      >
        <div className="w-16 h-16 rounded-[22px] bg-gradient-to-br from-primary/15 to-primary/5 backdrop-blur-sm border border-white/20 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-primary/10">
          <span className="text-3xl">👋</span>
        </div>
        <h1 className="text-xl font-black text-foreground">أهلاً {firstName}</h1>
        {dealerAccount && (
          <span className="inline-block mt-2 text-[11px] font-semibold text-muted-foreground bg-white/40 dark:bg-white/10 backdrop-blur-sm px-3 py-1 rounded-full border border-white/20">
            {tierLabels[dealerAccount.tier] || dealerAccount.tier}
          </span>
        )}
      </motion.div>

      {/* Big CTA — اطلب قطع غيار */}
      <motion.button
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08, duration: 0.5, ease }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => onNavigate?.("quotes")}
        className="w-full relative overflow-hidden rounded-[22px] p-6 text-center shadow-xl shadow-primary/20 group"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-primary/90" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
        {/* Decorative glass circle */}
        <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-white/10 blur-sm" />
        <div className="absolute -bottom-8 -left-8 w-24 h-24 rounded-full bg-white/5 blur-sm" />
        <div className="relative z-10">
          <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center mx-auto mb-3">
            <Search className="w-7 h-7 text-primary-foreground" />
          </div>
          <p className="text-lg font-black text-primary-foreground">اطلب قطع غيار</p>
          <p className="text-xs text-primary-foreground/70 mt-1 font-medium">ابحث عن أي قطعة واطلب عرض سعر</p>
        </div>
      </motion.button>

      {/* Quick actions — 2 glass cards */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12, duration: 0.5, ease }}
        className="grid grid-cols-2 gap-3"
      >
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => onNavigate?.("orders")}
        >
          <GlassCard className="p-5 text-center h-full hover:shadow-[0_12px_40px_rgba(0,0,0,0.1)] transition-all duration-300 cursor-pointer group">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500/12 to-blue-500/5 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform duration-300">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
            <p className="text-sm font-bold text-foreground">طلباتي</p>
            {pendingOrders > 0 && (
              <span className="inline-block mt-2 text-[10px] font-bold bg-amber-500/10 text-amber-700 backdrop-blur-sm px-2.5 py-0.5 rounded-full border border-amber-200/30">
                {pendingOrders} جارية
              </span>
            )}
          </GlassCard>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => onNavigate?.("price_lists")}
        >
          <GlassCard className="p-5 text-center h-full hover:shadow-[0_12px_40px_rgba(0,0,0,0.1)] transition-all duration-300 cursor-pointer group">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/12 to-amber-500/5 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform duration-300">
              <FileText className="w-6 h-6 text-amber-600" />
            </div>
            <p className="text-sm font-bold text-foreground">كشوفات المصرية</p>
            <span className="inline-block mt-2 text-[10px] text-muted-foreground font-medium">الأسعار المحدثة</span>
          </GlassCard>
        </motion.button>
      </motion.div>

      {/* Stats — Glass card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.16, duration: 0.5, ease }}
      >
        <GlassCard className="divide-y divide-white/10 dark:divide-white/5">
          <div className="flex items-center justify-between px-5 py-4">
            <span className="text-sm text-muted-foreground font-medium">إجمالي طلباتك</span>
            <span className="text-lg font-black text-foreground tabular-nums">{ordersCount}</span>
          </div>
          <div className="flex items-center justify-between px-5 py-4">
            <span className="text-sm text-muted-foreground font-medium">مشترياتك</span>
            <span className="text-lg font-black text-foreground tabular-nums">
              {accountSummary.delivered_total.toLocaleString("ar-EG")} <span className="text-xs font-medium text-muted-foreground">ج.م</span>
            </span>
          </div>
          {accountSummary.pending_total > 0 && (
            <div className="flex items-center justify-between px-5 py-4">
              <span className="text-sm text-muted-foreground font-medium">مبالغ معلقة</span>
              <span className="text-lg font-black text-amber-600 tabular-nums">
                {accountSummary.pending_total.toLocaleString("ar-EG")} <span className="text-xs font-medium">ج.م</span>
              </span>
            </div>
          )}
        </GlassCard>
      </motion.div>

      {/* Shortcuts — 3 glass pills */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5, ease }}
        className="grid grid-cols-3 gap-2.5"
      >
        {[
          { icon: CreditCard, label: "الدفع", tab: "payment", gradient: "from-emerald-500/12 to-emerald-500/5", iconColor: "text-emerald-600" },
          { icon: Heart, label: "المفضلة", tab: "favorites", gradient: "from-pink-500/12 to-pink-500/5", iconColor: "text-pink-600" },
          { icon: Bell, label: "تنبيهات", tab: "stock_alerts", gradient: "from-violet-500/12 to-violet-500/5", iconColor: "text-violet-600" },
        ].map(item => (
          <motion.button
            key={item.tab}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onNavigate?.(item.tab)}
          >
            <GlassCard className="py-4 text-center hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] transition-all duration-300 cursor-pointer group">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${item.gradient} flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform duration-300`}>
                <item.icon className={`w-5 h-5 ${item.iconColor}`} />
              </div>
              <p className="text-[11px] font-bold text-foreground">{item.label}</p>
            </GlassCard>
          </motion.button>
        ))}
      </motion.div>

      {/* Recent Orders */}
      {recentOrders.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.24, duration: 0.5, ease }}
        >
          <GlassCard>
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10">
              <h3 className="text-sm font-bold text-foreground">آخر الطلبات</h3>
              <button
                onClick={() => onNavigate?.("orders")}
                className="text-[11px] text-primary font-bold flex items-center gap-0.5 hover:opacity-70 transition-opacity"
              >
                الكل <ArrowLeft className="w-3 h-3" />
              </button>
            </div>
            <div className="divide-y divide-white/[0.06]">
              {recentOrders.map((o, idx) => {
                const st = orderStatusLabels[o.status] || orderStatusLabels.pending;
                return (
                  <motion.button
                    key={o.id}
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.26 + idx * 0.04 }}
                    className="w-full px-5 py-4 flex items-center justify-between gap-3 hover:bg-white/10 dark:hover:bg-white/[0.03] transition-colors text-right"
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
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border backdrop-blur-sm ${st.color}`}>
                      {st.text}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </GlassCard>
        </motion.div>
      )}

      {/* Recent Quotes */}
      {recentQuotes.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5, ease }}
        >
          <GlassCard>
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                آخر عروض الأسعار
              </h3>
              <button
                onClick={() => onNavigate?.("quotes")}
                className="text-[11px] text-primary font-bold flex items-center gap-0.5 hover:opacity-70 transition-opacity"
              >
                الكل <ArrowLeft className="w-3 h-3" />
              </button>
            </div>
            <div className="divide-y divide-white/[0.06]">
              {recentQuotes.map((q, idx) => {
                const st = quoteStatusLabels[q.status] || quoteStatusLabels.draft;
                return (
                  <motion.button
                    key={q.id}
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.32 + idx * 0.04 }}
                    className="w-full px-5 py-4 flex items-center justify-between gap-3 hover:bg-white/10 dark:hover:bg-white/[0.03] transition-colors text-right"
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
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border backdrop-blur-sm ${st.color}`}>
                      {st.text}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </GlassCard>
        </motion.div>
      )}

      {/* Empty state */}
      {recentOrders.length === 0 && recentQuotes.length === 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          <GlassCard className="text-center py-10 px-6">
            <div className="w-16 h-16 rounded-[22px] bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">🚀</span>
            </div>
            <p className="text-sm text-muted-foreground mb-5 font-medium">ابدأ أول طلب لك الآن!</p>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onNavigate?.("quotes")}
              className="bg-primary text-primary-foreground text-sm font-bold px-7 py-3 rounded-2xl shadow-lg shadow-primary/20"
            >
              اطلب قطع غيار ←
            </motion.button>
          </GlassCard>
        </motion.div>
      )}

      {/* Recommendations */}
      <DealerRecommendations userId={userId} tier={dealerAccount?.tier} onNavigateToQuotes={() => onNavigate?.("quotes")} />
    </div>
  );
};

export default DealerOverview;
