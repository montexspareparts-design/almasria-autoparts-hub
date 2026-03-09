import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import PageTransition from "@/components/PageTransition";
import Index from "./pages/Index";

const Auth = lazy(() => import("./pages/Auth"));
const DealerApply = lazy(() => import("./pages/DealerApply"));
const DealerRegister = lazy(() => import("./pages/DealerRegister"));
const ClientRegister = lazy(() => import("./pages/ClientRegister"));
const DealerDashboard = lazy(() => import("./pages/DealerDashboard"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const DealerLogin = lazy(() => import("./pages/DealerLogin"));
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

const queryClient = new QueryClient();

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <CartProvider>
              <Suspense fallback={<PageLoader />}>
                <PageTransition>
                  <Routes>
                    <Route path="/" element={<Index />} />
                    {/* Redirect old/duplicate home paths */}
                    <Route path="/home" element={<Navigate to="/" replace />} />
                    <Route path="/home-2" element={<Navigate to="/" replace />} />
                    <Route path="/main-home" element={<Navigate to="/" replace />} />
                    <Route path="/about" element={<AboutPage />} />
                    <Route path="/clients/:segment" element={<ClientSegmentPage />} />
                    {/* Main pages */}
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
                    {/* Auth & dealer */}
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/dealer-apply" element={<DealerApply />} />
                    <Route path="/dealer-register" element={<DealerRegister />} />
                    <Route path="/dealer" element={<DealerDashboard />} />
                    <Route path="/client-register" element={<ClientRegister />} />
                    <Route path="/admin" element={<AdminDashboard />} />
                    <Route path="/dealer-login" element={<DealerLogin />} />
                    <Route path="/cart" element={<CartPage />} />
                    <Route path="/checkout" element={<CheckoutPage />} />
                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route path="/catalogs" element={<CatalogsPage />} />
                    <Route path="/install" element={<InstallApp />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </PageTransition>
              </Suspense>
            </CartProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
