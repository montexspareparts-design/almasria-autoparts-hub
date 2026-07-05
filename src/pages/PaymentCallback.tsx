import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, XCircle, Loader2, ArrowRight, ShoppingBag, CreditCard, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AuthorizedDistributorBadges from "@/components/AuthorizedDistributorBadges";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { normalizePaymobOrderReference, PAYMOB_NATIVE_FLAG } from "@/lib/paymob";
import { APP_URL_SCHEME, openExternal } from "@/lib/native";

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
  const merchantOrderId = normalizePaymobOrderReference(
    searchParams.get("merchant_order_id") || searchParams.get("order")
  );
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
          // Non-critical
        }
      }

      if (isPending) setStatus("pending");
      else if (isSuccess) setStatus("success");
      else setStatus("failed");
    };

    processCallback();
  }, [success, pending, txnResponseCode, merchantOrderId, txnId, user, amountCents]);

  const handleRetryPayment = () => {
    if (orderId) navigate(`/payment?order_id=${orderId}`);
    else navigate("/");
  };

  return (
    <div className="min-h-[100svh] bg-background flex flex-col">
      <Navbar />
      <div className="pt-20 md:pt-28 pb-8 md:pb-12 flex items-center justify-center flex-1">
        <div className="max-w-lg w-full mx-auto px-4 text-center">

          {/* Loading */}
          {status === "loading" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <Loader2 className="w-14 h-14 animate-spin text-primary mx-auto" />
              <h1 className="text-xl font-bold text-foreground">جاري التحقق من الدفع...</h1>
              <p className="text-sm text-muted-foreground">يرجى الانتظار لحظات</p>
            </motion.div>
          )}

          {/* ✅ Success — Premium Design */}
          {status === "success" && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="space-y-6"
            >
              {/* Animated checkmark */}
              <div className="relative mx-auto w-28 h-28 sm:w-32 sm:h-32">
                {/* Outer glow ring */}
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1, duration: 0.5 }}
                  className="absolute inset-0 rounded-full bg-gradient-to-br from-emerald-400/20 to-emerald-600/10"
                />
                {/* Pulsing ring */}
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0, 0.4] }}
                  transition={{ delay: 0.6, duration: 2, repeat: Infinity }}
                  className="absolute inset-0 rounded-full border-2 border-emerald-400/30"
                />
                {/* Main circle */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 15 }}
                  className="absolute inset-2 sm:inset-3 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-xl shadow-emerald-500/30 flex items-center justify-center"
                >
                  <motion.div
                    initial={{ scale: 0, rotate: -45 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.5, type: "spring", stiffness: 300, damping: 15 }}
                  >
                    <Check className="w-12 h-12 sm:w-14 sm:h-14 text-white" strokeWidth={3} />
                  </motion.div>
                </motion.div>
              </div>

              {/* Confetti dots */}
              <div className="relative h-0">
                {[...Array(6)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 0, x: 0 }}
                    animate={{
                      opacity: [0, 1, 0],
                      y: [0, -40 - Math.random() * 30],
                      x: [(i % 2 === 0 ? -1 : 1) * (20 + Math.random() * 40)],
                    }}
                    transition={{ delay: 0.6 + i * 0.1, duration: 1.2 }}
                    className="absolute left-1/2 -top-8 w-2 h-2 rounded-full"
                    style={{
                      background: ["hsl(var(--primary))", "#10b981", "#f59e0b", "#3b82f6", "#8b5cf6", "#ec4899"][i],
                    }}
                  />
                ))}
              </div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="space-y-2"
              >
                <h1 className="text-2xl sm:text-3xl font-black text-foreground">
                  تم تأكيد طلبك بنجاح!
                </h1>
                <p className="text-sm sm:text-base text-muted-foreground max-w-sm mx-auto">
                  تم استلام الدفع وطلبك الآن قيد التجهيز. سنقوم بإعلامك بكل تحديث.
                </p>
              </motion.div>

              {/* Order details card */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 }}
                className="bg-card border border-border rounded-2xl overflow-hidden shadow-lg shadow-black/5"
              >
                {orderNumber && (
                  <div className="px-5 py-4 border-b border-border">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">رقم الطلب</span>
                      <span className="font-bold text-sm font-mono text-foreground tracking-wide" dir="ltr">
                        {orderNumber}
                      </span>
                    </div>
                  </div>
                )}
                {amountDisplay && (
                  <div className="px-5 py-4 bg-emerald-50/50 dark:bg-emerald-950/20">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">المبلغ المدفوع</span>
                      <span className="font-black text-lg text-emerald-600 dark:text-emerald-400">
                        {amountDisplay} ج.م
                      </span>
                    </div>
                  </div>
                )}
                {txnIdDisplay && (
                  <div className="px-5 py-3 border-t border-border">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground">رقم العملية</span>
                      <span className="text-[10px] text-muted-foreground font-mono" dir="ltr">{txnIdDisplay}</span>
                    </div>
                  </div>
                )}
              </motion.div>

              {/* Timeline hint */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.1 }}
                className="flex items-center justify-center gap-3 text-xs text-muted-foreground"
              >
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>تم الدفع</span>
                </div>
                <div className="w-6 h-px bg-border" />
                <div className="flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-primary" />
                  <span className="font-semibold text-foreground">جاري التجهيز</span>
                </div>
                <div className="w-6 h-px bg-border" />
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-muted-foreground/20" />
                  <span>التسليم</span>
                </div>
              </motion.div>

              {/* Actions */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.2 }}
                className="flex flex-col gap-2.5 pt-2"
              >
                <Button
                  onClick={() => navigate("/dealer")}
                  size="lg"
                  className="gap-2 h-12 text-sm font-bold rounded-xl shadow-md shadow-primary/20"
                >
                  <ShoppingBag className="w-4.5 h-4.5" />
                  متابعة طلباتي
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => navigate("/")}
                  className="gap-2 text-muted-foreground text-sm"
                >
                  <ArrowRight className="w-4 h-4" />
                  العودة للرئيسية
                </Button>
              </motion.div>

              {/* Authorized Distributor Trust Badges */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.4 }}
                className="pt-2"
              >
                <AuthorizedDistributorBadges variant="strip" />
              </motion.div>
            </motion.div>
          )}

          {/* ⏳ Pending */}
          {status === "pending" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-5"
            >
              <div className="w-20 h-20 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto">
                <Loader2 className="w-10 h-10 text-amber-600 animate-spin" />
              </div>
              <h1 className="text-2xl font-black text-foreground">الدفع قيد المعالجة</h1>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                تم إرسال عملية الدفع وهي قيد المراجعة. سيتم تحديث حالة طلبك تلقائياً.
              </p>
              {orderNumber && (
                <div className="bg-card border border-border rounded-xl px-5 py-3">
                  <span className="text-xs text-muted-foreground">رقم الطلب: </span>
                  <span className="font-bold text-sm font-mono text-foreground" dir="ltr">{orderNumber}</span>
                </div>
              )}
              <Button onClick={() => navigate("/")} className="gap-2 h-11">
                <ShoppingBag className="w-4 h-4" />
                العودة للرئيسية
              </Button>
            </motion.div>
          )}

          {/* ❌ Failed */}
          {status === "failed" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-5"
            >
              <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto">
                <XCircle className="w-10 h-10 text-red-600" />
              </div>
              <h1 className="text-2xl font-black text-foreground">لم تتم عملية الدفع</h1>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                {txnResponseCode === "DECLINED"
                  ? "تم رفض البطاقة من البنك. جرب بطاقة أخرى أو طريقة دفع مختلفة."
                  : txnResponseCode === "INSUFFICIENT_FUNDS"
                    ? "رصيد البطاقة غير كافي. جرب طريقة دفع أخرى."
                    : txnResponseCode === "EXPIRED_CARD"
                      ? "البطاقة منتهية الصلاحية. استخدم بطاقة أخرى."
                      : "حدثت مشكلة أثناء الدفع. طلبك محفوظ ويمكنك إعادة الدفع."}
              </p>
              <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground">
                💡 يمكنك تجربة: بطاقة بنكية، محفظة إلكترونية (Vodafone Cash)، أو فروع أمان/مصاري
              </div>
              {orderNumber && (
                <div className="bg-card border border-border rounded-xl px-5 py-3">
                  <span className="text-xs text-muted-foreground">رقم الطلب: </span>
                  <span className="font-bold text-sm font-mono text-foreground" dir="ltr">{orderNumber}</span>
                </div>
              )}
              {amountDisplay && (
                <p className="text-sm text-muted-foreground">
                  المبلغ: <span className="font-bold text-foreground">{amountDisplay} ج.م</span>
                </p>
              )}
              <div className="flex flex-col gap-2.5 pt-2">
                <Button onClick={handleRetryPayment} size="lg" className="gap-2 h-12 font-bold rounded-xl">
                  <CreditCard className="w-4 h-4" />
                  ادفع مرة أخرى
                </Button>
                <Button variant="outline" onClick={() => navigate("/")} className="gap-2 h-11">
                  <ShoppingBag className="w-4 h-4" />
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
