import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut, Loader2 } from "lucide-react";
import DealerSidebar, { type DealerTab } from "@/components/dealer/DealerSidebar";
import DealerMobileNav from "@/components/dealer/DealerMobileNav";
import DealerOverview from "@/components/dealer/DealerOverview";
import DealerOrdersList from "@/components/dealer/DealerOrdersList";
import DealerNotificationsList from "@/components/dealer/DealerNotificationsList";
import DealerOffers from "@/components/dealer/DealerOffers";
import DealerCatalogs from "@/components/DealerCatalogs";
import DealerQuoteBuilder from "@/components/dealer/DealerQuoteBuilder";
import DealerPriceLists from "@/components/dealer/DealerPriceLists";
import DealerFavorites from "@/components/dealer/DealerFavorites";
import DealerQuickOrder from "@/components/dealer/DealerQuickOrder";

const DealerDashboard = () => {
  const { user, dealerAccount, isDealer, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<DealerTab>("overview");
  const [profile, setProfile] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) { navigate("/auth"); return; }
    if (!authLoading && user && !isDealer) { navigate("/"); return; }
    if (user && isDealer) fetchData();
  }, [user, authLoading, isDealer]);

  const fetchData = async () => {
    const [profileRes, ordersRes, notifRes] = await Promise.all([
      supabase.from("profiles").select("full_name, email, phone").eq("user_id", user!.id).maybeSingle(),
      supabase.from("orders").select("*").eq("user_id", user!.id).order("created_at", { ascending: false }),
      supabase.from("notifications").select("id").eq("user_id", user!.id).eq("is_read", false),
    ]);
    setProfile(profileRes.data);
    setOrders(ordersRes.data || []);
    setUnreadCount(notifRes.data?.length || 0);
    setLoadingData(false);
  };

  if (authLoading || loadingData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const dealerName = profile?.full_name || user?.user_metadata?.full_name || "التاجر";
  const totalSpent = orders.reduce((sum: number, o: any) => sum + Number(o.total_amount), 0);
  const invoicesCount = orders.filter((o: any) => o.invoice_url).length;

  const handleSignOut = () => { signOut(); navigate("/"); };

  const renderContent = () => {
    switch (activeTab) {
      case "overview":
        return (
          <DealerOverview
            dealerAccount={dealerAccount as any}
            dealerName={dealerName}
            email={user?.email || ""}
            ordersCount={orders.length}
            totalSpent={totalSpent}
            invoicesCount={invoicesCount}
          />
        );
      case "quotes":
        return <DealerQuoteBuilder />;
      case "quick_order":
        return <DealerQuickOrder />;
      case "orders":
        return <DealerOrdersList userId={user!.id} />;
      case "price_lists":
        return <DealerPriceLists />;
      case "favorites":
        return <DealerFavorites />;
      case "notifications":
        return <DealerNotificationsList userId={user!.id} />;
      case "offers":
        return <DealerOffers />;
      case "catalogs":
        return (
          <DealerCatalogs
            isWholesale={
              isDealer &&
              !!dealerAccount?.is_active &&
              (dealerAccount?.tier === "wholesale_tier1" || dealerAccount?.tier === "wholesale_tier2")
            }
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-secondary border-b border-border sticky top-0 z-40">
        <div className="flex items-center justify-between h-14 px-4">
          <a href="/" className="text-lg font-bold text-secondary-foreground shrink-0">
            المصرية <span className="text-primary">جروب</span>
          </a>
          <div className="hidden sm:flex items-center gap-2 bg-primary/10 border border-primary/30 rounded-full px-4 py-1.5">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-semibold text-primary">بوابة التوزيع B2B</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-secondary-foreground/60 hidden md:inline truncate max-w-[150px]">
              {user?.email}
            </span>
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-secondary-foreground/60 lg:hidden">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        <DealerSidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          dealerName={dealerName}
          tier={dealerAccount?.tier || "retail"}
          onSignOut={handleSignOut}
          unreadCount={unreadCount}
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 pb-20 lg:pb-8">
          {renderContent()}
        </main>
      </div>

      <DealerMobileNav activeTab={activeTab} onTabChange={setActiveTab} unreadCount={unreadCount} />
    </div>
  );
};

export default DealerDashboard;
