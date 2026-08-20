import { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  CreditCard, ShieldCheck, Loader2, AlertCircle, Package, XCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AuthorizedDistributorBadges from "@/components/AuthorizedDistributorBadges";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { buildPaymobReturnUrl } from "@/lib/paymob";
import GeideaCheckout from "@/components/GeideaCheckout";

const PaymentPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const orderId = searchParams.get("order_id");
  const amount = searchParams.get("amount");

  const [error, setError] = useState<string | null>(null);
  const [orderInfo, setOrderInfo] = useState<{ orderNumber: string; amountCents: number } | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      toast({ title: "يجب تسجيل الدخول أولاً", variant: "destructive" });
      navigate("/auth");
      return;
    }
    if (!orderId) {
      setError("لم يتم تحديد رقم الطلب");
      return;
    }

    const fetchOrder = async () => {
      const { data } = await supabase
        .from("orders")
        .select("order_number, total_amount")
        .eq("id", orderId)
        .eq("user_id", user.id)
        .single();

      if (data) {
        setOrderInfo({
          orderNumber: data.order_number,
          amountCents: Math.round(data.total_amount * 100),
        });
      }
    };
    fetchOrder();
  }, [orderId, user, authLoading, navigate]);

  const displayAmount = amount
    ? Number(amount).toLocaleString("ar-EG")
    : orderInfo?.amountCents
      ? (orderInfo.amountCents / 100).toLocaleString("ar-EG")
      : null;

  if (authLoading) {
    return (
      <div className="min-h-[100svh] bg-background flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-muted-foreground mt-3 text-sm">جاري التحميل...</p>
      </div>
    );
  }

  return (
    <div className="min-h-[100svh] bg-background flex flex-col">
      <Navbar />
      <div className="pt-20 md:pt-24 pb-8 md:pb-12 flex-1">
        <div className="container mx-auto px-3 sm:px-4 max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-4 md:mb-6"
          >
            <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3 md:mb-4">
              <CreditCard className="w-6 h-6 md:w-8 md:h-8 text-primary" />
            </div>
            <h1 className="text-xl md:text-3xl font-black text-foreground">إتمام الدفع</h1>
            <p className="text-xs md:text-sm text-muted-foreground mt-1 md:mt-2">اختر طريقة الدفع المناسبة لك</p>
            <div className="mt-4">
              <AuthorizedDistributorBadges variant="compact" />
            </div>
          </motion.div>

          {(orderInfo?.orderNumber || displayAmount) && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-card border border-border rounded-xl p-3.5 sm:p-5 mb-4 md:mb-6"
            >
              <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                <Package className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
                <h2 className="font-bold text-sm sm:text-base text-foreground">تفاصيل الطلب</h2>
              </div>
              <div className="space-y-2 text-sm">
                {orderInfo?.orderNumber && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground text-xs sm:text-sm">رقم الطلب</span>
                    <span className="font-bold font-mono text-foreground text-xs sm:text-sm" dir="ltr">
                      {orderInfo.orderNumber}
                    </span>
                  </div>
                )}
                {displayAmount && (
                  <div className="flex justify-between items-center pt-2 border-t border-border">
                    <span className="text-muted-foreground text-xs sm:text-sm">المبلغ المطلوب</span>
                    <span className="text-base sm:text-lg font-black text-primary">
                      {displayAmount} ج.م
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-destructive/5 border border-destructive/20 rounded-xl p-3.5 sm:p-5 mb-4 md:mb-6"
            >
              <div className="flex items-start gap-2.5 sm:gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                  <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-destructive" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm sm:text-base text-foreground">تعذر إتمام الدفع</p>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">{error}</p>
                </div>
              </div>
            </motion.div>
          )}

          {!error && orderId && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-card border border-border rounded-xl p-4 sm:p-6"
            >
              <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-5">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm sm:text-base text-foreground">الدفع بالفيزا أو المحفظة</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Visa / Mastercard / Meeza / محافظ إلكترونية عبر جيديا</p>
                </div>
              </div>
              <GeideaCheckout orderId={orderId} currency="EGP" returnUrl={buildPaymobReturnUrl()} />
            </motion.div>
          )}

          <div className="mt-4 sm:mt-6 flex items-center justify-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-muted-foreground">
            <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-600" />
            <span>معاملة آمنة ومشفرة عبر جيديا</span>
          </div>

          <div className="text-center mt-3 sm:mt-4 pb-4">
            <Button variant="ghost" size="sm" asChild className="gap-2 text-muted-foreground text-xs sm:text-sm">
              <Link to="/">
                <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                العودة للرئيسية
              </Link>
            </Button>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default PaymentPage;
