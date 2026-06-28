import { useEffect, useState, lazy, Suspense } from "react";
import { requestPushPermission } from "@/lib/pushNotifications";
import { useDealerCart } from "@/hooks/useDealerCart";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut, Loader2, ShoppingCart, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import dealerLogo from "@/assets/logo.webp";
import DealerSidebar, { type DealerTab } from "@/components/dealer/DealerSidebar";
import DealerMobileNav from "@/components/dealer/DealerMobileNav";

// Lazy load all tab components for faster initial load
const DealerOrdersList = lazy(() => import("@/components/dealer/DealerOrdersList"));
const DealerNotificationsList = lazy(() => import("@/components/dealer/DealerNotificationsList"));
const DealerOffers = lazy(() => import("@/components/dealer/DealerOffers"));
const DealerProductSearch = lazy(() => import("@/components/dealer/DealerProductSearch"));
const DealerQuoteBuilder = lazy(() => import("@/components/dealer/DealerQuoteBuilder"));
const DealerPriceLists = lazy(() => import("@/components/dealer/DealerPriceLists"));
const DealerFavorites = lazy(() => import("@/components/dealer/DealerFavorites"));
const DealerQuickOrder = lazy(() => import("@/components/dealer/DealerQuickOrder"));
const DealerInvoices = lazy(() => import("@/components/dealer/DealerInvoices"));
const DealerAccountSettings = lazy(() => import("@/components/dealer/DealerAccountSettings"));
const DealerStatement = lazy(() => import("@/components/dealer/DealerStatement"));
const DealerPayment = lazy(() => import("@/components/dealer/DealerPayment"));
const DealerStockAlerts = lazy(() => import("@/components/dealer/DealerStockAlerts"));
const DealerShoppingLists = lazy(() => import("@/components/dealer/DealerShoppingLists"));
const DealerProductCompare = lazy(() => import("@/components/dealer/DealerProductCompare"));
const DealerPricedToday = lazy(() => import("@/components/dealer/DealerPricedToday"));
const DealerCart = lazy(() => import("@/components/dealer/DealerCart"));
const VehicleTypeDialog = lazy(() => import("@/components/dealer/VehicleTypeDialog"));
const DealerVehicleRecommendations = lazy(() => import("@/components/dealer/DealerVehicleRecommendations"));
const DealerAIRecommendations = lazy(() => import("@/components/dealer/DealerAIRecommendations"));
const DealerBottomCarousel = lazy(() => import("@/components/dealer/DealerBottomCarousel"));
const DealerBusinessBanner = lazy(() => import("@/components/dealer/DealerBusinessBanner"));
const DealerPersonalStats = lazy(() => import("@/components/dealer/DealerPersonalStats"));
const DealerKeyboardShortcuts = lazy(() => import("@/components/dealer/DealerKeyboardShortcuts"));

const DealerDashboard = () => {
  const { user, dealerAccount, isDealer, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<DealerTab>((searchParams.get("tab") as DealerTab) || "quotes");
  const [priceListQuoteData, setPriceListQuoteData] = useState<any | null>(null);
  const [paymentTarget, setPaymentTarget] = useState<{ id: string; orderNumber: string; amount: number } | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingData, setLoadingData] = useState(true);
  const [vehicleTypes, setVehicleTypes] = useState<string[]>(dealerAccount?.vehicle_types || []);
  const [showVehicleDialog, setShowVehicleDialog] = useState(false);
  const dealerCart = useDealerCart();
  const cartItemCount = dealerCart.itemCount;

  const { isModerator, isAdmin } = useAuth();

  useEffect(() => {
    if (!authLoading && !user) { navigate("/auth"); return; }
    if (!authLoading && user && !isDealer) {
      if (isAdmin || isModerator) { navigate("/admin"); return; }
      navigate("/"); return;
    }
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

    // Show vehicle type dialog if dealer hasn't chosen yet
    const vt = dealerAccount?.vehicle_types || [];
    setVehicleTypes(vt);
    if (vt.length === 0) setShowVehicleDialog(true);

    // Request push notification permission silently
    requestPushPermission().catch(() => {});
  };

  if (authLoading || loadingData || !user || !isDealer) {
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
    quotes: "بحث القطع وعروض الأسعار",
    priced_today: "ما تم تسعيره",
    cart: "طلباتي",
    price_lists: "كشوفات المصرية",
    orders: "الطلبية",
    payment: "الدفع الإلكتروني",
    invoices: "الفواتير",
    statement: "كشف الحساب",
    shopping_lists: "قوائم الشراء",
    compare: "مقارنة المنتجات",
    stock_alerts: "تنبيهات المخزون",
    favorites: "المفضلة",
    quick_order: "طلب سريع — رفع Excel",
    notifications: "الإشعارات",
    offers: "العروض الخاصة",
    catalogs: "الكتالوجات",
    settings: "إعدادات الحساب",
    bulk_upload: "رفع طلب من Excel",
    loyalty: "برنامج الولاء والمكافآت",
  };

  const renderContent = () => {
    switch (activeTab) {
      case "quotes": return (
        <div className="space-y-6">
          {/* Personal Stats Dashboard (#10) */}
          <Suspense fallback={null}><DealerPersonalStats /></Suspense>

          {/* Business-type tailored welcome (workshop / corporate) */}
          {(dealerAccount?.business_type === "workshop" || dealerAccount?.business_type === "corporate") && (
            <Suspense fallback={null}>
              <DealerBusinessBanner
                businessType={dealerAccount.business_type}
                dealerName={dealerName}
                onNavigateToProduct={(productId) => navigate(`/dealer-product/${productId}`)}
              />
            </Suspense>
          )}
          {/* Compact Quick Actions Bar */}
          <div className="flex items-center justify-end gap-2">
            <Button
              onClick={() => setActiveTab("cart")}
              variant="outline"
              size="sm"
              className="gap-1.5 h-9 text-xs rounded-lg"
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              طلباتي {cartItemCount > 0 && <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4">{cartItemCount}</Badge>}
            </Button>
            <Button
              onClick={() => setActiveTab("quick_order")}
              size="sm"
              className="gap-1.5 h-9 text-xs rounded-lg bg-primary hover:bg-primary/90"
            >
              <Zap className="w-3.5 h-3.5" />
              طلب سريع
            </Button>
          </div>
          <DealerProductSearch onNavigateToCart={() => setActiveTab("cart")} sharedCart={dealerCart} />
          <DealerVehicleRecommendations compact />
          <Suspense fallback={null}><DealerAIRecommendations /></Suspense>
          <Suspense fallback={null}><DealerBottomCarousel onNavigateToPriceLists={() => setActiveTab("price_lists")} /></Suspense>
        </div>
      );
      case "priced_today": return <DealerPricedToday onConvertToOrder={() => setActiveTab("cart")} sharedCart={dealerCart} />;
      case "cart": return <DealerCart onNavigateToOrders={() => setActiveTab("orders")} onNavigateToPayment={(info) => { if (info) setPaymentTarget(info); setActiveTab("payment"); }} sharedCart={dealerCart} />;
      case "quick_order": return <DealerQuickOrder />;
      case "orders": return <DealerOrdersList userId={user!.id} onNavigateToPayment={(info) => { if (info) setPaymentTarget(info); setActiveTab("payment"); }} />;
      case "invoices": return <DealerInvoices userId={user!.id} />;
      case "payment": return <DealerPayment targetOrderId={paymentTarget?.id} targetOrderNumber={paymentTarget?.orderNumber} targetOrderAmount={paymentTarget?.amount} onNavigateToOrders={() => setActiveTab("orders")} onNavigateToCart={() => setActiveTab("quotes")} />;
      case "price_lists": return <DealerPriceLists onNavigateToQuotes={() => setActiveTab("quotes")} editingQuoteData={priceListQuoteData} onClearEditingQuote={() => setPriceListQuoteData(null)} />;
      case "favorites": return <DealerFavorites />;
      case "notifications": return <DealerNotificationsList userId={user!.id} onNavigate={(tab) => setActiveTab(tab as DealerTab)} />;
      case "offers": return <DealerOffers />;
      case "statement": return <DealerStatement userId={user!.id} />;
      case "stock_alerts": return <DealerStockAlerts />;
      case "shopping_lists": return <DealerShoppingLists />;
      case "compare": return <DealerProductCompare />;
      case "settings": return <DealerAccountSettings />;
      default: return null;
    }
  };

  return (
    <div data-dealer-scope className="min-h-screen bg-muted/40 flex flex-col" dir="rtl">
      {/* Top Bar */}
      <header className="bg-card border-b border-border/50 sticky top-0 z-40 shadow-sm">
        <div className="flex items-center justify-between h-14 px-4 lg:px-6">
          <a href="/" className="flex items-center gap-2.5 shrink-0">
            <img src={dealerLogo} alt="المصرية جروب" className="h-8 w-auto object-contain" />
            <div className="hidden sm:block leading-none">
              <p className="text-sm font-bold text-foreground tracking-wide">المصرية جروب</p>
              <p className="text-[10px] text-muted-foreground font-medium">بوابة التوزيع B2B</p>
            </div>
          </a>

          {/* Current Page Title - Desktop */}
          <div className="hidden lg:flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-primary" />
            <p className="text-sm font-semibold text-foreground">{pageTitles[activeTab]}</p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {unreadCount > 0 && (
              <button
                onClick={() => setActiveTab("notifications")}
                className="relative text-muted-foreground hover:text-primary transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[8px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {unreadCount}
                </span>
              </button>
            )}
            <span className="text-[11px] text-muted-foreground hidden md:inline truncate max-w-[180px]">
              {dealerName}
            </span>
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-muted-foreground hover:text-primary h-8 px-2 lg:hidden">
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
          cartItemCount={cartItemCount}
        />
        <main className="flex-1 overflow-y-auto overflow-x-hidden pb-32 lg:pb-6">
          <div className="p-3 sm:p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full">
            <Suspense fallback={<div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>}>
              {renderContent()}
            </Suspense>
          </div>
        </main>
      </div>

      <DealerMobileNav activeTab={activeTab} onTabChange={setActiveTab} unreadCount={unreadCount} cartItemCount={cartItemCount} />

      {/* Keyboard shortcuts (#5) - Press ? to view, G + letter to navigate */}
      <Suspense fallback={null}>
        <DealerKeyboardShortcuts onTabChange={setActiveTab} />
      </Suspense>

      {dealerAccount && (
        <Suspense fallback={null}>
          <VehicleTypeDialog
            open={showVehicleDialog}
            dealerAccountId={dealerAccount.id}
            dealerName={dealerName}
            onComplete={(types) => {
              setVehicleTypes(types);
              setShowVehicleDialog(false);
            }}
          />
        </Suspense>
      )}
    </div>
  );
};

export default DealerDashboard;
