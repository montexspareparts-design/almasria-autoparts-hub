import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ShoppingBag, TrendingUp, Eye, Package, Sparkles } from "lucide-react";

interface Stats {
  ordersThisMonth: number;
  spentThisMonth: number;
  pricedToday: number;
  pendingOrders: number;
}

const DealerPersonalStats = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({
    ordersThisMonth: 0,
    spentThisMonth: 0,
    pricedToday: 0,
    pendingOrders: 0,
  });
  const [greeting, setGreeting] = useState("");

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("صباح الخير");
    else if (hour < 18) setGreeting("مساء الخير");
    else setGreeting("مساء الخير");
  }, []);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const today = new Date().toISOString().split("T")[0];

      const [ordersRes, pricedRes] = await Promise.all([
        supabase
          .from("orders")
          .select("total_amount, status, created_at")
          .eq("user_id", user.id)
          .gte("created_at", monthStart.toISOString()),
        supabase
          .from("dealer_price_views")
          .select("product_id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("view_date", today),
      ]);

      const orders = ordersRes.data || [];
      const ordersThisMonth = orders.filter((o) => o.status !== "cancelled").length;
      const spentThisMonth = orders
        .filter((o) => o.status !== "cancelled")
        .reduce((sum, o) => sum + Number(o.total_amount), 0);
      const pendingOrders = orders.filter((o) =>
        ["pending", "confirmed", "processing", "awaiting_payment"].includes(o.status)
      ).length;

      setStats({
        ordersThisMonth,
        spentThisMonth,
        pricedToday: pricedRes.count || 0,
        pendingOrders,
      });
    };
    load();
  }, [user]);

  const cards = [
    {
      icon: ShoppingBag,
      label: "طلبات الشهر",
      value: stats.ordersThisMonth.toString(),
      color: "from-blue-500/10 to-blue-500/5",
      iconColor: "text-blue-600",
    },
    {
      icon: TrendingUp,
      label: "إنفاق الشهر",
      value: `${stats.spentThisMonth.toLocaleString("ar-EG", { maximumFractionDigits: 0 })} ج.م`,
      color: "from-emerald-500/10 to-emerald-500/5",
      iconColor: "text-emerald-600",
    },
    {
      icon: Eye,
      label: "تم تسعيره اليوم",
      value: `${stats.pricedToday}/20`,
      color: "from-amber-500/10 to-amber-500/5",
      iconColor: "text-amber-600",
    },
    {
      icon: Package,
      label: "طلبات نشطة",
      value: stats.pendingOrders.toString(),
      color: "from-primary/10 to-primary/5",
      iconColor: "text-primary",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-2xl bg-gradient-to-l from-primary/5 via-card to-card border border-border/50 p-4 md:p-5 shadow-sm"
    >
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-primary" />
        <p className="text-sm font-bold text-foreground">{greeting}، نظرة سريعة على نشاطك</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        {cards.map((c, i) => (
          <motion.div
            key={c.label}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05, duration: 0.25 }}
            className={`rounded-xl bg-gradient-to-br ${c.color} border border-border/30 p-3`}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <c.icon className={`w-3.5 h-3.5 ${c.iconColor}`} />
              <p className="text-[10px] text-muted-foreground font-medium">{c.label}</p>
            </div>
            <p className="text-base md:text-lg font-bold text-foreground tabular-nums leading-tight">
              {c.value}
            </p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export default DealerPersonalStats;
