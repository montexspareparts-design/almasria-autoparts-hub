import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2, XCircle, Loader2, ArrowRight, ShoppingBag, RotateCcw } from "lucide-react";
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
  const [txnIdDisplay, setTxnIdDisplay] = useState<string | null>(null);

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

      if (isPending) {
        setStatus("pending");
        return;
      }

      if (!isSuccess) {
        setStatus("failed");
        // Log failed transaction
        if (merchantOrderId) {
          await logTransaction("failed");
        }
        return;
      }

      // Payment succeeded — update order status
      try {
        if (merchantOrderId && user) {
          // Find order by order_number
          const { data: order } = await supabase
            .from("orders")
            .select("id, status, order_number")
            .eq("order_number", merchantOrderId)
            .eq("user_id", user.id)
            .single();

          if (order) {
            setOrderNumber(order.order_number);

            // Update order status to processing (payment confirmed)
            if (["pending", "confirmed", "awaiting_payment"].includes(order.status)) {
              await supabase
                .from("orders")
                .update({
                  status: "processing",
                  payment_method: "card_online",
                })
                .eq("id", order.id);
            }

            // Log successful transaction
            await logTransaction("success", order.id);
          }
        }

        setStatus("success");
      } catch (err) {
        console.error("Error processing payment callback:", err);
        setStatus("success"); // Still show success to user since Paymob confirmed it
      }
    };

    const logTransaction = async (txStatus: string, orderId?: string) => {
      try {
        await supabase.from("payment_transactions").insert({
          order_id: orderId || null,
          order_number: merchantOrderId,
          paymob_transaction_id: txnId,
          status: txStatus,
          amount_cents: amountCents ? parseInt(amountCents) : null,
          payment_method: "card_online",
          card_brand: searchParams.get("source_data.sub_type") || null,
          card_last_four: searchParams.get("source_data.pan") || null,
        });
      } catch (e) {
        console.error("Failed to log transaction:", e);
      }
    };

    processCallback();
  }, [success, pending, txnResponseCode, merchantOrderId, txnId, user]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-12 flex items-center justify-center min-h-[70vh]">
        <div className="max-w-md w-full mx-auto px-4 text-center">
          {status === "loading" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              <Loader2 className="w-16 h-16 animate-spin text-primary mx-auto" />
              <h1 className="text-xl font-bold text-foreground">جاري التحقق من الدفع...</h1>
              <p className="text-sm text-muted-foreground">يرجى الانتظار لحظات</p>
            </motion.div>
          )}

          {status === "success" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-5"
            >
              <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10 text-green-600" />
              </div>
              <h1 className="text-2xl font-black text-foreground">تم الدفع بنجاح! 🎉</h1>
              <p className="text-muted-foreground">
                تم استلام الدفع وطلبك الآن قيد التجهيز.
              </p>
              {orderNumber && (
                <div className="bg-card border border-border rounded-xl p-4">
                  <p className="text-sm text-muted-foreground">رقم الطلب</p>
                  <p className="font-bold text-lg font-mono text-foreground" dir="ltr">
                    {orderNumber}
                  </p>
                </div>
              )}
              {txnIdDisplay && (
                <p className="text-xs text-muted-foreground">
                  رقم العملية: <span dir="ltr">{txnIdDisplay}</span>
                </p>
              )}
              <div className="flex flex-col gap-2 pt-2">
                <Button onClick={() => navigate("/my-orders")} className="gap-2">
                  <ShoppingBag className="w-4 h-4" />
                  عرض طلباتي
                </Button>
                <Button variant="outline" onClick={() => navigate("/")} className="gap-2">
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
              className="space-y-5"
            >
              <div className="w-20 h-20 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center mx-auto">
                <Loader2 className="w-10 h-10 text-yellow-600 animate-spin" />
              </div>
              <h1 className="text-2xl font-black text-foreground">الدفع قيد المعالجة</h1>
              <p className="text-muted-foreground">
                تم إرسال عملية الدفع وهي قيد المراجعة. سيتم تحديث حالة طلبك تلقائياً.
              </p>
              <Button onClick={() => navigate("/my-orders")} className="gap-2">
                <ShoppingBag className="w-4 h-4" />
                عرض طلباتي
              </Button>
            </motion.div>
          )}

          {status === "failed" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-5"
            >
              <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto">
                <XCircle className="w-10 h-10 text-red-600" />
              </div>
              <h1 className="text-2xl font-black text-foreground">لم تتم عملية الدفع</h1>
              <p className="text-muted-foreground">
                حدثت مشكلة أثناء عملية الدفع. يمكنك المحاولة مرة أخرى.
              </p>
              {orderNumber && (
                <p className="text-sm text-muted-foreground">
                  رقم الطلب: <span className="font-bold text-foreground">{orderNumber}</span>
                </p>
              )}
              <div className="flex flex-col gap-2 pt-2">
                <Button onClick={() => navigate("/my-orders")} className="gap-2">
                  <RotateCcw className="w-4 h-4" />
                  المحاولة من طلباتي
                </Button>
                <Button variant="outline" onClick={() => navigate("/")} className="gap-2">
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
