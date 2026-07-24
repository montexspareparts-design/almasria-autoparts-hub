import { Component, lazy, Suspense, useEffect, useState, type ReactNode } from "react";
const AIChatBot = lazy(() => import("@/components/AIChatBot"));
import { forwardRef } from "react";
const InstallBannerLazy = lazy(() =>
  isNativePlatform()
    ? Promise.resolve({ default: forwardRef<HTMLDivElement>(() => null) })
    : import("@/components/InstallBanner"),
);
const WhatsAppFloat = lazy(() => import("@/components/WhatsAppFloat"));
const VisitorLeadCapture = lazy(() => import("@/components/VisitorLeadCapture"));
const SmartLeadTriggers = lazy(() => import("@/components/SmartLeadTriggers"));
// Global staff alerts — mounted once at the app root so the popup fires on
// ANY page (including /admin/staff-home), not only inside /admin.
const AdminNewOrderAlertGlobal = lazy(() => import("@/components/admin/AdminNewOrderAlert"));
const AdminNewSignupAlertGlobal = lazy(() => import("@/components/admin/AdminNewSignupAlert"));
const ImpersonationBanner = lazy(() => import("@/components/admin/ImpersonationBanner"));
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { PermissionRequestProvider } from "@/hooks/usePermissionRequest";
import SEOHead from "@/components/SEOHead";
import AnimatedRoutes from "@/components/AnimatedRoutes";
import { isNativePlatform } from "@/lib/native";
const Index = lazy(() => import("./pages/Index"));

const Auth = lazy(() => import("./pages/Auth"));
const DealerApply = lazy(() => import("./pages/DealerApply"));
const DealerRegister = lazy(() => import("./pages/DealerRegister"));
const ClientRegister = lazy(() => import("./pages/ClientRegister"));
const DealerDashboard = lazy(() => import("./pages/DealerDashboard"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const BadgeContrastQA = lazy(() => import("./pages/admin/BadgeContrastQA"));
const DealerLogin = lazy(() => import("./pages/DealerLogin"));
const DealerProductPage = lazy(() => import("./pages/DealerProductPage"));
const ProductsPage = lazy(() => import("./pages/ProductsPage"));
const CartPage = lazy(() => import("./pages/CartPage"));
const CheckoutPage = lazy(() => import("./pages/CheckoutPage"));

const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const ContactPage = lazy(() => import("./pages/ContactPage"));
const WhatSetsUsApartPage = lazy(() => import("./pages/WhatSetsUsApartPage"));
const MTXPage = lazy(() => import("./pages/MTXPage"));
const ToyotaPartsEgypt = lazy(() => import("./pages/ToyotaPartsEgypt"));
const AboutPage = lazy(() => import("./pages/AboutPage"));
const ClientSegmentPage = lazy(() => import("./pages/ClientSegmentPage"));
const GenuinePartsPage = lazy(() => import("./pages/GenuinePartsPage"));
const PartsByModelPage = lazy(() => import("./pages/PartsByModelPage"));
const PartsByTypePage = lazy(() => import("./pages/PartsByTypePage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const CatalogsPage = lazy(() => import("./pages/CatalogsPage"));
const InstallApp = lazy(() => import("./pages/InstallApp"));
const PaymentCallback = lazy(() => import("./pages/PaymentCallback"));
const PaymentPage = lazy(() => import("./pages/PaymentPage"));
const PoliciesPage = lazy(() => import("./pages/PoliciesPage"));
const MyProfilePage = lazy(() => import("./pages/MyProfilePage"));
const TrackOrderPage = lazy(() => import("./pages/TrackOrderPage"));
const GenuineVsCounterfeitGuide = lazy(() => import("./pages/GenuineVsCounterfeitGuide"));
const GenuineVsMtxVsDenso = lazy(() => import("./pages/guides/GenuineVsMtxVsDenso"));
const WhenToChangeOilFilter = lazy(() => import("./pages/guides/WhenToChangeOilFilter"));
const WhenToChangeBrakePads = lazy(() => import("./pages/guides/WhenToChangeBrakePads"));
const ToyotaCorollaMaintenance = lazy(() => import("./pages/guides/ToyotaCorollaMaintenance"));
const ToyotaHiluxMaintenance = lazy(() => import("./pages/guides/ToyotaHiluxMaintenance"));
const DevDealerPreview = lazy(() => import("./pages/DevDealerPreview"));
const VisitorSessionSummary = lazy(() => import("./pages/VisitorSessionSummary"));
const AdminStaffActivityPage = lazy(() => import("./pages/AdminStaffActivityPage"));
// StaffHome merged into AdminDashboard (?section=daily-dashboard) — see redirect below.
const StaffDailyReportPage = lazy(() => import("./pages/StaffDailyReportPage"));
const StaffRestockedPage = lazy(() => import("./pages/StaffRestockedPage"));
const ReporterSectionsEditor = lazy(() => import("./pages/admin/ReporterSectionsEditor"));
const StaffDailyBriefPage = lazy(() => import("./pages/StaffDailyBriefPage"));
const StaffTasksPage = lazy(() => import("./pages/StaffTasksPage"));
const NewVisitorsWorkflowPage = lazy(() => import("./pages/NewVisitorsWorkflowPage"));
const VisitorLeadsPage = lazy(() => import("./pages/VisitorLeadsPage"));
const ActiveVisitorsPage = lazy(() => import("./pages/ActiveVisitorsPage"));
const AdminWhatsAppLogsPage = lazy(() => import("./pages/AdminWhatsAppLogsPage"));
import PageVisitTracker from "./components/PageVisitTracker";
import ReporterOnlyGuard from "./components/ReporterOnlyGuard";
const DealerRtlAuditor = import.meta.env.DEV
  ? lazy(() => import("./components/dealer/DealerRtlAuditor"))
  : null;
const queryClient = new QueryClient();

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

class SilentWidgetBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.warn("[widget-boundary] deferred widget failed", error);
  }

  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

const DeferredComponent = ({ delay, children }: { delay: number; children: ReactNode }) => {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const id = typeof requestIdleCallback !== 'undefined'
      ? requestIdleCallback(() => setShow(true), { timeout: delay })
      : setTimeout(() => setShow(true), delay - 1000) as unknown as number;
    return () => {
      if (typeof cancelIdleCallback !== 'undefined') cancelIdleCallback(id);
      else clearTimeout(id);
    };
  }, [delay]);
  if (!show) return null;
  return (
    <SilentWidgetBoundary>
      <Suspense fallback={null}>{children}</Suspense>
    </SilentWidgetBoundary>
  );
};

const DeferredWhenAuthStable = ({ delay, children }: { delay: number; children: ReactNode }) => {
  const { loading, postAuthState } = useAuth();
  if (isNativePlatform()) return null;
  if (loading || postAuthState === "AUTHENTICATED_LOADING" || postAuthState === "INITIALIZING") return null;
  return <DeferredComponent delay={delay}>{children}</DeferredComponent>;
};

const AuthCallbackRoute = () => {
  const { loading, postAuthState } = useAuth();
  if (!loading && postAuthState === "UNAUTHENTICATED") return <Navigate to="/auth" replace />;
  return <PageLoader />;
};

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <LanguageProvider>
          <AuthProvider>
            <CartProvider>
              <PermissionRequestProvider>
              <SEOHead />
              {!isNativePlatform() && <PageVisitTracker />}
              <ReporterOnlyGuard />
              {!isNativePlatform() && <DeferredWhenAuthStable delay={2000}><InstallBannerLazy /></DeferredWhenAuthStable>}
              <DeferredWhenAuthStable delay={4000}><AIChatBot /></DeferredWhenAuthStable>
              <DeferredWhenAuthStable delay={2500}><WhatsAppFloat /></DeferredWhenAuthStable>
              <DeferredWhenAuthStable delay={1500}><VisitorLeadCapture /></DeferredWhenAuthStable>
              <DeferredWhenAuthStable delay={3000}><SmartLeadTriggers /></DeferredWhenAuthStable>
              {/* Staff popups — self-gate by role, no-op for non-staff */}
              <DeferredWhenAuthStable delay={1500}><AdminNewOrderAlertGlobal /></DeferredWhenAuthStable>
              <DeferredWhenAuthStable delay={1500}><AdminNewSignupAlertGlobal /></DeferredWhenAuthStable>
              {DealerRtlAuditor && (
                <Suspense fallback={null}>
                  <DealerRtlAuditor />
                </Suspense>
              )}
               <Suspense fallback={null}>
                 <ImpersonationBanner />
               </Suspense>
               <Suspense fallback={<PageLoader />}>
                  <AnimatedRoutes>
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/home" element={<Navigate to="/" replace />} />
                    <Route path="/home-2" element={<Navigate to="/" replace />} />
                    <Route path="/main-home" element={<Navigate to="/" replace />} />
                    <Route path="/about" element={<AboutPage />} />
                    <Route path="/clients/:segment" element={<ClientSegmentPage />} />
                    <Route path="/products/genuine-toyota-parts" element={<GenuinePartsPage />} />
                    <Route path="/mtx" element={<MTXPage />} />
                    <Route path="/products/:brand" element={<ProductsPage />} />
                    <Route path="/products" element={<ProductsPage />} />
                    <Route path="/contact" element={<ContactPage />} />
                    <Route path="/what-sets-us-apart" element={<WhatSetsUsApartPage />} />
                    <Route path="/toyota-genuine-parts-egypt" element={<ToyotaPartsEgypt />} />
                    <Route path="/parts-by-model/:model" element={<PartsByModelPage />} />
                    <Route path="/parts-by-model" element={<PartsByModelPage />} />
                    <Route path="/parts-by-type/:type" element={<PartsByTypePage />} />
                    <Route path="/parts-by-type" element={<PartsByTypePage />} />
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/auth-callback" element={<AuthCallbackRoute />} />
                    <Route path="/dealer-apply" element={<DealerApply />} />
                    <Route path="/dealer-register" element={<DealerRegister />} />
                    <Route path="/dealer" element={<DealerDashboard />} />
                    <Route path="/dealer/product/:productId" element={<DealerProductPage />} />
                    <Route path="/client-register" element={<ClientRegister />} />
                    <Route path="/admin" element={<AdminDashboard />} />
                    <Route path="/dealer-login" element={<DealerLogin />} />
                    <Route path="/cart" element={<CartPage />} />
                    <Route path="/checkout" element={<CheckoutPage />} />
                    
                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route path="/catalogs" element={<CatalogsPage />} />
                    <Route path="/install" element={isNativePlatform() ? <Navigate to="/" replace /> : <InstallApp />} />
                    <Route path="/payment-callback" element={<PaymentCallback />} />
                    <Route path="/payment" element={<PaymentPage />} />
                    <Route path="/policies" element={<PoliciesPage />} />
                    <Route path="/my-profile" element={<MyProfilePage />} />
                    <Route path="/track-order" element={<TrackOrderPage />} />
                    <Route path="/guides/identifying-genuine-toyota-parts" element={<GenuineVsCounterfeitGuide />} />
                    <Route path="/guides/genuine-vs-mtx-vs-denso" element={<GenuineVsMtxVsDenso />} />
                    <Route path="/guides/when-to-change-oil-filter" element={<WhenToChangeOilFilter />} />
                    <Route path="/guides/when-to-change-brake-pads" element={<WhenToChangeBrakePads />} />
                    <Route path="/guides/toyota-corolla-maintenance" element={<ToyotaCorollaMaintenance />} />
                    <Route path="/guides/toyota-hilux-maintenance" element={<ToyotaHiluxMaintenance />} />
                    <Route path="/dev/dealer-preview" element={<DevDealerPreview />} />
                    <Route path="/admin/visitor/:userId" element={<VisitorSessionSummary />} />
                    <Route path="/admin/staff-home" element={<Navigate to="/admin?section=my-daily-tasks" replace />} />
                    <Route path="/admin/daily-report" element={<StaffDailyReportPage />} />
                    <Route path="/staff/daily-report" element={<StaffDailyReportPage />} />
                    <Route path="/admin/restocked" element={<StaffRestockedPage />} />
                    <Route path="/staff/restocked" element={<StaffRestockedPage />} />
                    <Route path="/admin/reporter-sections-editor" element={<ReporterSectionsEditor />} />
                    <Route path="/admin/daily-brief" element={<StaffDailyBriefPage />} />
                    <Route path="/staff/daily-brief" element={<StaffDailyBriefPage />} />
                    <Route path="/admin/tasks" element={<StaffTasksPage />} />
                    <Route path="/staff/tasks" element={<StaffTasksPage />} />
                    <Route path="/admin/new-visitors" element={<NewVisitorsWorkflowPage />} />
                    <Route path="/admin/visitor-leads" element={<VisitorLeadsPage />} />
                    <Route path="/admin/active-visitors" element={<ActiveVisitorsPage />} />
                    <Route path="/admin/whatsapp-logs" element={<AdminWhatsAppLogsPage />} />
                    <Route path="/admin/badge-qa" element={<BadgeContrastQA />} />
                    <Route path="/admin/staff-activity" element={<AdminStaffActivityPage />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                  </AnimatedRoutes>
               </Suspense>
              </PermissionRequestProvider>
            </CartProvider>
          </AuthProvider>
          </LanguageProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
