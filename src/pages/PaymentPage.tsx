import { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { CreditCard, ShieldCheck, Loader2, ArrowRight, AlertCircle, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const PaymentPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const orderId = searchParams.get("order_id");
  const amount = searchParams.get("amount");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentData, setPaymentData] = useState<{
    paymentKey: string;
    iframeUrl: string;
    orderNumber: string;
    amountCents: number;
  } | null>(null);

  useEffect(() => {
    if (!user) {
      toast({ title: "يجب تسجيل الدخول أولاً", variant: "destructive" });
      navigate("/auth");
      return;
    }

    if (!orderId) {
      setError("لم يتم تحديد رقم الطلب");
      setLoading(false);
      return;
    }

    const initPayment = async () => {
      try {
        setLoading(true);
        setError(null);

        // Call the new create-payment edge function
        const { data, error: fnError } = await supabase.functions.invoke(
          "create-payment",
          {
            body: {
              order_id: orderId,
              return_url: `${window.location.origin}/payment-callback`,
            },
          }
        );

        if (fnError || !data?.payment_key) {
          console.error("Payment init error:", fnError, data);
          setError(data?.error || "تعذر إنشاء جلسة الدفع. يرجى المحاولة مرة أخرى.");
          setLoading(false);
          return;
        }

        setPaymentData({
          paymentKey: data.payment_key,
          iframeUrl: data.iframe_url,
          orderNumber: data.order_number || "",
          amountCents: data.amount_cents || 0,
        });
        setLoading(false);
      } catch (e: any) {
        console.error("Payment init error:", e);
        setError(e.message || "حدث خطأ غير متوقع");
        setLoading(false);
      }
    };

    initPayment();
  }, [orderId, user, navigate]);

  const displayAmount = amount
    ? Number(amount).toLocaleString("ar-EG")
    : paymentData?.amountCents
      ? (paymentData.amountCents / 100).toLocaleString("ar-EG")
      : null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-12">
        <div className="container mx-auto px-4 max-w-2xl">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-6"
          >
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <CreditCard className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-foreground">إتمام الدفع</h1>
            <p className="text-sm text-muted-foreground mt-2">ادفع بأمان عبر بطاقتك البنكية — Visa / Mastercard / Meeza</p>
          </motion.div>

          {/* Order Summary */}
          {(paymentData?.orderNumber || displayAmount) && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-card border border-border rounded-xl p-5 mb-6"
            >
              <div className="flex items-center gap-3 mb-3">
                <Package className="w-5 h-5 text-muted-foreground" />
                <h2 className="font-bold text-foreground">تفاصيل الطلب</h2>
              </div>
              <div className="space-y-2 text-sm">
                {paymentData?.orderNumber && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">رقم الطلب</span>
                    <span className="font-bold font-mono text-foreground" dir="ltr">
                      {paymentData.orderNumber}
                    </span>
                  </div>
                )}
                {displayAmount && (
                  <div className="flex justify-between pt-2 border-t border-border">
                    <span className="text-muted-foreground">المبلغ المطلوب</span>
                    <span className="text-lg font-black text-primary">
                      {displayAmount} ج.م
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Payment iframe Area */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-card border border-border rounded-xl overflow-hidden"
          >
            {loading && (
              <div className="flex flex-col items-center justify-center gap-3 py-16">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">جاري تجهيز بوابة الدفع...</p>
              </div>
            )}

            {error && (
              <div className="text-center py-10 px-6 space-y-4">
                <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
                  <AlertCircle className="w-7 h-7 text-destructive" />
                </div>
                <div>
                  <p className="font-bold text-foreground">تعذر بدء عملية الدفع</p>
                  <p className="text-sm text-muted-foreground mt-1">{error}</p>
                </div>
                <div className="flex flex-col gap-2">
                  <Button onClick={() => window.location.reload()} className="gap-2">
                    إعادة المحاولة
                  </Button>
                  <Button variant="outline" asChild>
                    <Link to="/my-orders">العودة لطلباتي</Link>
                  </Button>
                </div>
              </div>
            )}

            {/* Paymob iframe */}
            {paymentData && !loading && !error && (
              <iframe
                src={paymentData.iframeUrl}
                className="w-full border-0"
                style={{ minHeight: "500px", height: "70vh", maxHeight: "700px" }}
                title="Paymob Payment"
                allow="payment"
              />
            )}
          </motion.div>

          {/* Security Badge */}
          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="w-4 h-4 text-green-600" />
            <span>معاملة آمنة ومشفرة عبر Paymob</span>
          </div>

          {/* Back Link */}
          <div className="text-center mt-6">
            <Button variant="ghost" size="sm" asChild className="gap-2 text-muted-foreground">
              <Link to="/my-orders">
                <ArrowRight className="w-4 h-4" />
                العودة لطلباتي
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
