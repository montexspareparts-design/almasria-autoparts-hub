import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2, XCircle, Loader2, ArrowRight, ShoppingBag, RotateCcw, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const PaymentCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [status, setStatus] = useState<"loading" | "success" | "failed" | "pending">("loading");
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [txnIdDisplay, setTxnIdDisplay] = useState<string | null>(null);
  const [amountDisplay, setAmountDisplay] = useState<string | null>(null);

  const success = searchParams.get("success");
  const pending = searchParams.get("pending");
  const txnResponseCode = searchParams.get("txn_response_code");
  const merchantOrderId = searchParams.get("merchant_order_id") || searchParams.get("order");
  const txnId = searchParams.get("id");
  const amountCents = searchParams.get("amount_cents");

  useEffect(() => {
    const processCallback = async () => {
      const isSuccess = success === "true" && txnResponseCode === "APPROVED";
      const isPending = pending === "true";

      setTxnIdDisplay(txnId);
      setOrderNumber(merchantOrderId);

      if (amountCents) {
        const egp = (parseInt(amountCents) / 100).toLocaleString("ar-EG");
        setAmountDisplay(egp);
      }

      // Look up the internal order ID for retry navigation
      if (merchantOrderId && user) {
        try {
          const { data: order } = await supabase
            .from("orders")
            .select("id, order_number")
            .eq("order_number", merchantOrderId)
            .eq("user_id", user.id)
            .single();

          if (order) {
            setOrderId(order.id);
            setOrderNumber(order.order_number);
          }
        } catch {
          // Non-critical — continue showing result
        }
      }

      if (isPending) {
        setStatus("pending");
      } else if (isSuccess) {
        setStatus("success");
      } else {
        setStatus("failed");
      }

      // NOTE: Order status updates and transaction logging are handled
      // exclusively by the Paymob webhook (source of truth).
      // This page only displays the result to the user.
    };

    processCallback();
  }, [success, pending, txnResponseCode, merchantOrderId, txnId, user, amountCents]);

  const handleRetryPayment = () => {
    if (orderId) {
      navigate(`/payment?order_id=${orderId}`);
    } else {
      navigate("/");
    }
  };

  return (
    <div className="min-h-[100svh] bg-background flex flex-col">
      <Navbar />
      <div className="pt-20 md:pt-24 pb-8 md:pb-12 flex items-center justify-center flex-1">
        <div className="max-w-md w-full mx-auto px-3 sm:px-4 text-center">
          {status === "loading" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-3 sm:space-y-4"
            >
              <Loader2 className="w-12 h-12 sm:w-16 sm:h-16 animate-spin text-primary mx-auto" />
              <h1 className="text-lg sm:text-xl font-bold text-foreground">جاري التحقق من الدفع...</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">يرجى الانتظار لحظات</p>
            </motion.div>
          )}

          {status === "success" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-4 sm:space-y-5"
            >
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8 sm:w-10 sm:h-10 text-green-600" />
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-foreground">تم الدفع بنجاح! 🎉</h1>
              <p className="text-sm text-muted-foreground">
                تم استلام الدفع وطلبك الآن قيد التجهيز.
              </p>
              {orderNumber && (
                <div className="bg-card border border-border rounded-xl p-3 sm:p-4">
                  <p className="text-xs sm:text-sm text-muted-foreground">رقم الطلب</p>
                  <p className="font-bold text-base sm:text-lg font-mono text-foreground" dir="ltr">
                    {orderNumber}
                  </p>
                </div>
              )}
              {amountDisplay && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-3 sm:p-4">
                  <p className="text-xs sm:text-sm text-muted-foreground">المبلغ المدفوع</p>
                  <p className="font-black text-lg sm:text-xl text-green-700 dark:text-green-400">
                    {amountDisplay} ج.م
                  </p>
                </div>
              )}
              {txnIdDisplay && (
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  رقم العملية: <span dir="ltr">{txnIdDisplay}</span>
                </p>
              )}
              <div className="flex flex-col gap-2 pt-1 sm:pt-2">
                <Button onClick={() => navigate("/")} className="gap-2 h-10 sm:h-11 text-sm">
                  <ShoppingBag className="w-4 h-4" />
                  العودة للرئيسية
                </Button>
                <Button variant="outline" onClick={() => navigate("/")} className="gap-2 h-10 sm:h-11 text-sm">
                  <ArrowRight className="w-4 h-4" />
                  العودة للرئيسية
                </Button>
              </div>
            </motion.div>
          )}

          {status === "pending" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-4 sm:space-y-5"
            >
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center mx-auto">
                <Loader2 className="w-8 h-8 sm:w-10 sm:h-10 text-yellow-600 animate-spin" />
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-foreground">الدفع قيد المعالجة</h1>
              <p className="text-sm text-muted-foreground">
                تم إرسال عملية الدفع وهي قيد المراجعة. سيتم تحديث حالة طلبك تلقائياً.
              </p>
              {orderNumber && (
                <p className="text-xs sm:text-sm text-muted-foreground">
                  رقم الطلب: <span className="font-bold text-foreground" dir="ltr">{orderNumber}</span>
                </p>
              )}
              <Button onClick={() => navigate("/")} className="gap-2 h-10 sm:h-11 text-sm">
                <ShoppingBag className="w-4 h-4" />
                العودة للرئيسية
              </Button>
            </motion.div>
          )}

          {status === "failed" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-4 sm:space-y-5"
            >
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto">
                <XCircle className="w-8 h-8 sm:w-10 sm:h-10 text-red-600" />
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-foreground">لم تتم عملية الدفع</h1>
              <p className="text-sm text-muted-foreground">
                {txnResponseCode === "DECLINED"
                  ? "تم رفض البطاقة من البنك. جرب بطاقة أخرى أو طريقة دفع مختلفة (محفظة إلكترونية / أمان)."
                  : txnResponseCode === "INSUFFICIENT_FUNDS"
                    ? "رصيد البطاقة غير كافي لإتمام العملية. جرب طريقة دفع أخرى."
                    : txnResponseCode === "EXPIRED_CARD"
                      ? "البطاقة منتهية الصلاحية. استخدم بطاقة أخرى."
                      : "حدثت مشكلة أثناء عملية الدفع. طلبك لا يزال محفوظ ويمكنك إعادة الدفع بأي طريقة."}
              </p>
              <div className="bg-muted/50 rounded-lg p-2.5 sm:p-3 text-[11px] sm:text-xs text-muted-foreground">
                💡 يمكنك تجربة طريقة دفع أخرى: بطاقة بنكية، محفظة إلكترونية (Vodafone Cash)، أو فروع أمان/مصاري
              </div>
              {orderNumber && (
                <div className="bg-card border border-border rounded-xl p-3 sm:p-4">
                  <p className="text-xs sm:text-sm text-muted-foreground">رقم الطلب</p>
                  <p className="font-bold text-base sm:text-lg font-mono text-foreground" dir="ltr">
                    {orderNumber}
                  </p>
                </div>
              )}
              {amountDisplay && (
                <p className="text-xs sm:text-sm text-muted-foreground">
                  المبلغ: <span className="font-bold text-foreground">{amountDisplay} ج.م</span>
                </p>
              )}
              <div className="flex flex-col gap-2 pt-1 sm:pt-2">
                <Button onClick={handleRetryPayment} className="gap-2 h-10 sm:h-11 text-sm bg-primary hover:bg-primary/90">
                  <CreditCard className="w-4 h-4" />
                  ادفع مرة أخرى
                </Button>
                <Button variant="outline" onClick={() => navigate("/")} className="gap-2 h-10 sm:h-11 text-sm">
                  <ShoppingBag className="w-4 h-4" />
                  العودة للرئيسية
                </Button>
                <Button variant="ghost" onClick={() => navigate("/")} className="gap-2 text-muted-foreground text-xs sm:text-sm">
                  <ArrowRight className="w-4 h-4" />
                  العودة للرئيسية
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default PaymentCallback;