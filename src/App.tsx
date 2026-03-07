import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import Index from "./pages/Index";

// Lazy load all non-index routes
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
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <CartProvider>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/dealer-apply" element={<DealerApply />} />
                <Route path="/dealer-register" element={<DealerRegister />} />
                <Route path="/dealer" element={<DealerDashboard />} />
                <Route path="/client-register" element={<ClientRegister />} />
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/dealer-login" element={<DealerLogin />} />
                <Route path="/products/:brand" element={<ProductsPage />} />
                <Route path="/cart" element={<CartPage />} />
                <Route path="/checkout" element={<CheckoutPage />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </CartProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
