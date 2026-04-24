import { lazy, Suspense, useEffect, useState } from "react";
const AIChatBot = lazy(() => import("@/components/AIChatBot"));
const InstallBannerLazy = lazy(() => import("@/components/InstallBanner"));
const WhatsAppFloat = lazy(() => import("@/components/WhatsAppFloat"));
const AddPhonePrompt = lazy(() => import("@/components/AddPhonePrompt"));
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import SEOHead from "@/components/SEOHead";
const Index = lazy(() => import("./pages/Index"));

const Auth = lazy(() => import("./pages/Auth"));
const DealerApply = lazy(() => import("./pages/DealerApply"));
const DealerRegister = lazy(() => import("./pages/DealerRegister"));
const ClientRegister = lazy(() => import("./pages/ClientRegister"));
const DealerDashboard = lazy(() => import("./pages/DealerDashboard"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
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
const DevDealerPreview = lazy(() => import("./pages/DevDealerPreview"));
const VisitorSessionSummary = lazy(() => import("./pages/VisitorSessionSummary"));
import PageVisitTracker from "./components/PageVisitTracker";
const DealerRtlAuditor = import.meta.env.DEV
  ? lazy(() => import("./components/dealer/DealerRtlAuditor"))
  : null;
const queryClient = new QueryClient();

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

const DeferredComponent = ({ delay, children }: { delay: number; children: React.ReactNode }) => {
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
  return <Suspense fallback={null}>{children}</Suspense>;
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
              <SEOHead />
              <PageVisitTracker />
              <DeferredComponent delay={2000}><InstallBannerLazy /></DeferredComponent>
              <DeferredComponent delay={4000}><AIChatBot /></DeferredComponent>
              <DeferredComponent delay={2500}><WhatsAppFloat /></DeferredComponent>
              {DealerRtlAuditor && (
                <Suspense fallback={null}>
                  <DealerRtlAuditor />
                </Suspense>
              )}
               <Suspense fallback={<PageLoader />}>
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
                    <Route path="/install" element={<InstallApp />} />
                    <Route path="/payment-callback" element={<PaymentCallback />} />
                    <Route path="/payment" element={<PaymentPage />} />
                    <Route path="/policies" element={<PoliciesPage />} />
                    <Route path="/my-profile" element={<MyProfilePage />} />
                    <Route path="/track-order" element={<TrackOrderPage />} />
                    <Route path="/dev/dealer-preview" element={<DevDealerPreview />} />
                    <Route path="/admin/visitor/:userId" element={<VisitorSessionSummary />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
               </Suspense>
            </CartProvider>
          </AuthProvider>
          </LanguageProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
