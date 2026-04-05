import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { LayoutDashboard, ShoppingCart, FileText, ClipboardList, Bell, TrendingUp, Gift, Clock, Star, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const DealerWelcomeBanner = () => {
  const { user, isDealer, dealerAccount } = useAuth();

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: unreadCount } = useQuery({
    queryKey: ["unread-notifications", user?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user!.id)
        .eq("is_read", false);
      return count || 0;
    },
    enabled: !!user,
  });

  // Fetch dealer activity stats
  const { data: activityStats } = useQuery({
    queryKey: ["dealer-activity-stats", user?.id],
    queryFn: async () => {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const [ordersRes, recentOrdersRes, favoritesRes, offersRes] = await Promise.all([
        supabase
          .from("orders")
          .select("id, total_amount, created_at", { count: "exact" })
          .eq("user_id", user!.id)
          .gte("created_at", thirtyDaysAgo.toISOString()),
        supabase
          .from("orders")
          .select("id")
          .eq("user_id", user!.id)
          .gte("created_at", sevenDaysAgo.toISOString()),
        supabase
          .from("dealer_favorites")
          .select("id", { count: "exact" })
          .eq("user_id", user!.id),
        supabase
          .from("products")
          .select("id", { count: "exact" })
          .eq("is_active", true)
          .eq("is_on_sale", true),
      ]);

      const monthlyOrders = ordersRes.data || [];
      const monthlyTotal = monthlyOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
      const recentOrderCount = recentOrdersRes.data?.length || 0;
      const favCount = favoritesRes.count || 0;
      const activeOffers = offersRes.count || 0;

      return {
        monthlyOrderCount: monthlyOrders.length,
        monthlyTotal,
        recentOrderCount,
        favCount,
        activeOffers,
      };
    },
    enabled: !!user && !!isDealer,
    staleTime: 5 * 60 * 1000,
  });

  if (!isDealer || !user) return null;

  const displayName = profile?.full_name || user.user_metadata?.full_name || "تاجرنا";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "صباح الخير" : hour < 18 ? "مساء الخير" : "مساء النور";

  // Personalized message based on activity
  const getPersonalizedMessage = () => {
    if (!activityStats) return null;
    const { monthlyOrderCount, recentOrderCount, activeOffers, favCount } = activityStats;

    if (activeOffers > 0) {
      return { icon: Gift, text: `🎉 ${activeOffers} عرض خاص متاح حالياً — لا تفوّتهم!`, color: "text-amber-600", link: "/dealer?tab=offers" };
    }
    if (monthlyOrderCount >= 5) {
      return { icon: Star, text: `⭐ عميل مميز! ${monthlyOrderCount} طلب هذا الشهر — شكراً لثقتك`, color: "text-primary" };
    }
    if (recentOrderCount === 0 && monthlyOrderCount > 0) {
      return { icon: Clock, text: "مرحباً بعودتك! اطلع على آخر المنتجات والعروض", color: "text-blue-600", link: "/products" };
    }
    if (favCount > 0) {
      return { icon: Sparkles, text: `لديك ${favCount} منتج في المفضلة — تابع توفرهم`, color: "text-emerald-600", link: "/dealer?tab=favorites" };
    }
    return { icon: TrendingUp, text: "ابدأ بتصفح المنتجات واطلب أول طلبية!", color: "text-primary", link: "/products" };
  };

  const personalizedMsg = getPersonalizedMessage();

  const quickLinks = [
    { label: "لوحة التحكم", icon: LayoutDashboard, to: "/dealer", color: "from-primary to-primary/80" },
    { label: "اطلب قطع غيار", icon: ShoppingCart, to: "/products", color: "from-emerald-600 to-emerald-500" },
    { label: "طلباتي", icon: ClipboardList, to: "/dealer?tab=orders", color: "from-blue-600 to-blue-500" },
    { label: "عروض الأسعار", icon: FileText, to: "/dealer?tab=prices", color: "from-amber-600 to-amber-500" },
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="bg-gradient-to-l from-secondary via-secondary to-secondary/95 border-b border-primary/10"
    >
      <div className="container mx-auto px-4 py-5 md:py-6">
        {/* Welcome + Notification */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
              <span className="text-primary font-bold text-lg">
                {displayName.charAt(0)}
              </span>
            </div>
            <div>
              <h2 className="text-secondary-foreground font-bold text-base md:text-lg">
                {greeting}، {displayName} 👋
              </h2>
              <p className="text-muted-foreground text-xs md:text-sm">
                {dealerAccount?.tier === "wholesale_tier1" ? "تاجر جملة - الفئة الأولى" :
                 dealerAccount?.tier === "wholesale_tier2" ? "تاجر جملة - الفئة الثانية" :
                 dealerAccount?.tier === "corporate" ? "حساب مؤسسي" : "حساب تجزئة"}
              </p>
            </div>
          </div>
          {(unreadCount ?? 0) > 0 && (
            <Link
              to="/dealer?tab=notifications"
              className="flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-3 py-1.5 text-primary text-xs font-bold hover:bg-primary/20 transition-colors"
            >
              <Bell className="w-3.5 h-3.5" />
              {unreadCount} إشعار جديد
            </Link>
          )}
        </div>

        {/* Personalized Activity Message */}
        {personalizedMsg && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="mb-3"
          >
            {personalizedMsg.link ? (
              <Link
                to={personalizedMsg.link}
                className={`flex items-center gap-2.5 bg-card/80 backdrop-blur border border-border rounded-xl px-4 py-2.5 hover:border-primary/30 hover:shadow-sm transition-all ${personalizedMsg.color}`}
              >
                <personalizedMsg.icon className="w-4.5 h-4.5 shrink-0" />
                <span className="text-sm font-medium">{personalizedMsg.text}</span>
              </Link>
            ) : (
              <div className={`flex items-center gap-2.5 bg-card/80 backdrop-blur border border-border rounded-xl px-4 py-2.5 ${personalizedMsg.color}`}>
                <personalizedMsg.icon className="w-4.5 h-4.5 shrink-0" />
                <span className="text-sm font-medium">{personalizedMsg.text}</span>
              </div>
            )}
          </motion.div>
        )}

        {/* Monthly Stats Strip (if has orders) */}
        {activityStats && activityStats.monthlyOrderCount > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex items-center gap-4 mb-3 text-xs text-muted-foreground"
          >
            <span className="flex items-center gap-1">
              <ClipboardList className="w-3.5 h-3.5" />
              {activityStats.monthlyOrderCount} طلب هذا الشهر
            </span>
            <span className="text-border">|</span>
            <span className="flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" />
              {activityStats.monthlyTotal.toLocaleString("ar-EG")} ج.م إجمالي
            </span>
          </motion.div>
        )}

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          {quickLinks.map((link, i) => (
            <motion.div
              key={link.to}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.08 }}
            >
              <Link
                to={link.to}
                className="flex items-center gap-2.5 bg-card border border-border rounded-xl px-4 py-3 hover:border-primary/30 hover:shadow-md transition-all duration-200 group"
              >
                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${link.color} flex items-center justify-center shrink-0`}>
                  <link.icon className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm font-semibold text-secondary-foreground group-hover:text-primary transition-colors">
                  {link.label}
                </span>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.section>
  );
};

export default DealerWelcomeBanner;
