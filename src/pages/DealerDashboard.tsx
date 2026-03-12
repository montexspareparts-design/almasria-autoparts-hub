import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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

import DealerQuoteBuilder, { type PriceListQuoteData } from "@/components/dealer/DealerQuoteBuilder";
import DealerPriceLists from "@/components/dealer/DealerPriceLists";
import DealerFavorites from "@/components/dealer/DealerFavorites";
import DealerQuickOrder from "@/components/dealer/DealerQuickOrder";
import DealerInvoices from "@/components/dealer/DealerInvoices";
import DealerAccountSettings from "@/components/dealer/DealerAccountSettings";
import DealerStatement from "@/components/dealer/DealerStatement";
import DealerPayment from "@/components/dealer/DealerPayment";
import DealerStockAlerts from "@/components/dealer/DealerStockAlerts";
import DealerOnboarding from "@/components/dealer/DealerOnboarding";

const DealerDashboard = () => {
  const { user, dealerAccount, isDealer, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<DealerTab>((searchParams.get("tab") as DealerTab) || "overview");
  const [priceListQuoteData, setPriceListQuoteData] = useState<PriceListQuoteData | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingData, setLoadingData] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) { navigate("/auth"); return; }
    if (!authLoading && user && !isDealer) { navigate("/"); return; }
    if (user && isDealer) fetchData();
  }, [user, authLoading, isDealer]);

  // Respond to tab query param changes (from notification clicks)
  useEffect(() => {
    const tab = searchParams.get("tab") as DealerTab;
    if (tab && tab !== activeTab) {
      setActiveTab(tab);
      // Clean up the URL
      searchParams.delete("tab");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams]);

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

    // Show onboarding for new dealers (no orders yet, never dismissed)
    const dismissed = localStorage.getItem("dealer_onboarding_done");
    if (!dismissed && (!ordersRes.data || ordersRes.data.length === 0)) {
      setShowOnboarding(true);
    }
  };

  if (authLoading || loadingData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  const dealerName = profile?.full_name || user?.user_metadata?.full_name || "التاجر";
  const totalSpent = orders.reduce((sum: number, o: any) => sum + Number(o.total_amount), 0);
  const invoicesCount = orders.filter((o: any) => o.invoice_url).length;
  const pendingOrders = orders.filter((o: any) => o.status === "pending" || o.status === "confirmed" || o.status === "processing").length;

  const handleSignOut = () => { signOut(); navigate("/"); };

  const pageTitles: Record<DealerTab, string> = {
    overview: "لوحة التحكم",
    quotes: "بحث القطع وعروض الأسعار",
    quick_order: "طلب سريع — رفع Excel",
    orders: "الطلبية",
    payment: "الدفع الإلكتروني",
    invoices: "الفواتير",
    statement: "كشف الحساب",
    price_lists: "كشوفات الأسعار",
    favorites: "المفضلة",
    stock_alerts: "تنبيهات المخزون",
    notifications: "الإشعارات",
    offers: "العروض الخاصة",
    catalogs: "الكتالوجات",
    settings: "إعدادات الحساب",
  };

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
            pendingOrders={pendingOrders}
            userId={user!.id}
            onNavigate={(tab) => setActiveTab(tab as DealerTab)}
          />
        );
      case "quotes": return <DealerQuoteBuilder onNavigateToPriceLists={(data) => { setPriceListQuoteData(data || null); setActiveTab("price_lists"); }} />;
      case "quick_order": return <DealerQuickOrder />;
      case "orders": return <DealerOrdersList userId={user!.id} onNavigateToPayment={() => setActiveTab("payment")} />;
      case "invoices": return <DealerInvoices userId={user!.id} />;
      case "payment": return <DealerPayment />;
      case "price_lists": return <DealerPriceLists onNavigateToQuotes={() => setActiveTab("quotes")} editingQuoteData={priceListQuoteData} onClearEditingQuote={() => setPriceListQuoteData(null)} />;
      case "favorites": return <DealerFavorites />;
      case "notifications": return <DealerNotificationsList userId={user!.id} onNavigate={(tab) => setActiveTab(tab as DealerTab)} />;
      case "offers": return <DealerOffers />;
      case "statement": return <DealerStatement userId={user!.id} />;
      case "stock_alerts": return <DealerStockAlerts />;
      case "settings": return <DealerAccountSettings />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col" dir="rtl">
      {showOnboarding && (
        <DealerOnboarding
          dealerName={dealerName}
          onComplete={() => {
            setShowOnboarding(false);
            localStorage.setItem("dealer_onboarding_done", "1");
          }}
        />
      )}
      {/* Top Bar */}
      <header className="bg-secondary border-b border-secondary/80 sticky top-0 z-40">
        <div className="flex items-center justify-between h-14 px-4 lg:px-6">
          <a href="/" className="flex items-center gap-3 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-black text-sm">M</span>
            </div>
            <div className="hidden sm:block leading-none">
              <p className="text-sm font-bold text-secondary-foreground tracking-wide">المصرية جروب</p>
              <p className="text-[10px] text-secondary-foreground/40 font-medium">بوابة التوزيع B2B</p>
            </div>
          </a>

          {/* Current Page Title - Desktop */}
          <div className="hidden lg:block">
            <p className="text-sm font-semibold text-secondary-foreground/70">{pageTitles[activeTab]}</p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {unreadCount > 0 && (
              <button
                onClick={() => setActiveTab("notifications")}
                className="relative text-secondary-foreground/60 hover:text-secondary-foreground transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[8px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {unreadCount}
                </span>
              </button>
            )}
            <span className="text-[11px] text-secondary-foreground/40 hidden md:inline truncate max-w-[180px]">
              {dealerName}
            </span>
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-secondary-foreground/40 hover:text-secondary-foreground h-8 px-2 lg:hidden">
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
        <main className="flex-1 overflow-y-auto pb-20 lg:pb-6">
          <div className="p-4 md:p-6 lg:p-8 max-w-7xl">
            {renderContent()}
          </div>
        </main>
      </div>

      <DealerMobileNav activeTab={activeTab} onTabChange={setActiveTab} unreadCount={unreadCount} />
    </div>
  );
};

export default DealerDashboard;
