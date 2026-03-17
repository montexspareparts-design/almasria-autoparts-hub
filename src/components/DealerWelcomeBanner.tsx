import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { LayoutDashboard, ShoppingCart, FileText, ClipboardList, Bell } from "lucide-react";
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

  if (!isDealer || !user) return null;

  const displayName = profile?.full_name || user.user_metadata?.full_name || "تاجرنا";

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
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
              <span className="text-primary font-bold text-lg">
                {displayName.charAt(0)}
              </span>
            </div>
            <div>
              <h2 className="text-secondary-foreground font-bold text-base md:text-lg">
                أهلاً {displayName} 👋
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
