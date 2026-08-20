import { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  CreditCard, ShieldCheck, Loader2, AlertCircle, Package, XCircle, ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AuthorizedDistributorBadges from "@/components/AuthorizedDistributorBadges";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { buildPaymobReturnUrl } from "@/lib/payment-return";
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

      {/* Luxury header band */}
      <div className="relative pt-20 md:pt-24 pb-10 md:pb-14 overflow-hidden bg-hero-gradient">
        <div className="absolute inset-0 bg-red-glow opacity-40 pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gold/60 to-transparent" />
        <div className="relative container mx-auto px-4 max-w-2xl text-center">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-primary/15 border border-primary/30 backdrop-blur-md flex items-center justify-center mx-auto mb-4 shadow-red-glow">
              <CreditCard className="w-7 h-7 md:w-8 md:h-8 text-primary" />
            </div>
            <h1 className="text-2xl md:text-4xl font-black tracking-tight text-white">إتمام الدفع</h1>
            <p className="text-xs md:text-sm text-white/60 mt-2">معاملة مؤمّنة بالكامل عبر بوابة جيديا</p>
            <div className="mt-5 flex justify-center">
              <AuthorizedDistributorBadges variant="compact" />
            </div>
          </motion.div>
        </div>
      </div>

      <div className="flex-1 pb-10 md:pb-16 -mt-6 md:-mt-8">
        <div className="container mx-auto px-3 sm:px-4 max-w-2xl">
          {(orderInfo?.orderNumber || displayAmount) && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="relative bg-card border border-border rounded-2xl p-4 sm:p-6 mb-4 md:mb-6 shadow-xl overflow-hidden"
            >
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
                  <Package className="w-4.5 h-4.5 text-muted-foreground" />
                </div>
                <h2 className="font-bold text-sm sm:text-base text-foreground">تفاصيل الطلب</h2>
              </div>
              <div className="space-y-3">
                {orderInfo?.orderNumber && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground text-xs sm:text-sm">رقم الطلب</span>
                    <span className="font-bold font-mono text-foreground text-xs sm:text-sm bg-muted px-2.5 py-1 rounded-lg" dir="ltr">
                      {orderInfo.orderNumber}
                    </span>
                  </div>
                )}
                {displayAmount && (
                  <div className="flex justify-between items-end pt-3 border-t border-dashed border-border">
                    <span className="text-muted-foreground text-xs sm:text-sm">المبلغ المطلوب</span>
                    <span className="text-2xl sm:text-3xl font-black text-primary leading-none">
                      {displayAmount}
                      <span className="text-xs font-bold text-muted-foreground mr-1.5">ج.م</span>
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
              className="bg-destructive/5 border border-destructive/20 rounded-2xl p-4 sm:p-5 mb-4 md:mb-6"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                  <XCircle className="w-5 h-5 text-destructive" />
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
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="relative bg-card border border-border rounded-2xl p-4 sm:p-6 shadow-xl overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.04] to-transparent pointer-events-none" />
              <div className="relative">
                <div className="flex items-center gap-3 sm:gap-4 mb-5">
                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm sm:text-base text-foreground">الدفع بالفيزا أو المحفظة</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Visa / Mastercard / Meeza / محافظ إلكترونية</p>
                  </div>
                </div>
                <GeideaCheckout orderId={orderId} currency="EGP" returnUrl={buildPaymobReturnUrl()} />
              </div>
            </motion.div>
          )}

          <div className="mt-5 grid grid-cols-3 gap-2 text-center">
            {[
              { icon: ShieldCheck, label: "تشفير كامل" },
              { icon: CreditCard, label: "كل وسائل الدفع" },
              { icon: Package, label: "تأكيد فوري" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="bg-muted/50 border border-border rounded-xl py-3 px-2">
                <Icon className="w-4 h-4 mx-auto text-primary mb-1.5" />
                <span className="text-[10px] sm:text-xs text-muted-foreground font-medium">{label}</span>
              </div>
            ))}
          </div>

          <div className="text-center mt-5 pb-2">
            <Button variant="ghost" size="sm" asChild className="gap-2 text-muted-foreground text-xs sm:text-sm">
              <Link to="/">
                <ArrowRight className="w-4 h-4" />
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
