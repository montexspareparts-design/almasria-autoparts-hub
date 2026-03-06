import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import DealerApply from "./pages/DealerApply";
import DealerRegister from "./pages/DealerRegister";
import ClientRegister from "./pages/ClientRegister";
import DealerDashboard from "./pages/DealerDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import ProductsPage from "./pages/ProductsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dealer-apply" element={<DealerApply />} />
            <Route path="/dealer-register" element={<DealerRegister />} />
            <Route path="/dealer" element={<DealerDashboard />} />
            <Route path="/client-register" element={<ClientRegister />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/products/:brand" element={<ProductsPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
