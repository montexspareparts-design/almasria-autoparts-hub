import { useState } from "react";
import { CreditCard, Loader2, ShieldCheck, AlertCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

interface DealerPaymentProps {
  targetOrderId?: string;
  targetOrderNumber?: string;
  targetOrderAmount?: number;
}

const DealerPayment = ({ targetOrderId, targetOrderNumber, targetOrderAmount }: DealerPaymentProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);

  const handlePay = async (orderId: string) => {
    setLoading(true);
    setError(null);
    try {
      const { ensureActiveSession } = await import("@/lib/paymob");
      await ensureActiveSession();

      const { data, error: fnError } = await supabase.functions.invoke("create-payment", {
        body: {
          order_id: orderId,
          return_url: `${window.location.origin}/payment-callback`,
        },
      });

      if (fnError || !data?.iframe_url) {
        console.error("Payment error:", fnError, data);
        setError(data?.error || "تعذر إنشاء جلسة الدفع. يرجى المحاولة مرة أخرى.");
        return;
      }

      setIframeUrl(data.iframe_url);
    } catch (e: any) {
      console.error("Payment error:", e);
      setError(e.message || "حدث خطأ غير متوقع");
    } finally {
      setLoading(false);
    }
  };

  // ─── Iframe Payment View ───
  if (iframeUrl) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-black text-foreground">إتمام الدفع</h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIframeUrl(null)}
            className="text-xs text-muted-foreground"
          >
            ← رجوع
          </Button>
        </div>

        {targetOrderNumber && (
          <div className="flex items-center justify-between bg-muted/50 rounded-lg px-4 py-2.5 text-sm">
            <span className="text-muted-foreground">طلب رقم</span>
            <span className="font-bold font-mono text-foreground" dir="ltr">{targetOrderNumber}</span>
          </div>
        )}

        <div className="rounded-xl border border-border overflow-hidden bg-card">
          <iframe
            src={iframeUrl}
            className="w-full border-0"
            style={{ minHeight: "480px", height: "65vh", maxHeight: "650px" }}
            title="Paymob Payment"
            allow="payment"
          />
        </div>

        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="w-3.5 h-3.5 text-green-600" />
          <span>معاملة آمنة ومشفرة</span>
        </div>
      </motion.div>
    );
  }

  // ─── Main Payment View ───
  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-xl font-black text-foreground">الدفع الإلكتروني</h2>
        <p className="text-sm text-muted-foreground mt-1">
          ادفع بأمان ببطاقتك البنكية — تأكيد فوري
        </p>
      </div>

      {/* Payment Card */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-border bg-card overflow-hidden"
      >
        {/* Card Header */}
        <div className="bg-gradient-to-l from-primary/5 to-primary/10 p-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <CreditCard className="w-7 h-7 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-bold text-foreground">ادفع بالبطاقة البنكية</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Visa • Mastercard • Meeza
              </p>
            </div>
          </div>
        </div>

        {/* Card Body */}
        <div className="p-5 space-y-4">
          {/* Features */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
              <span>تأكيد فوري</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
              <span>معاملة مشفرة</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
              <span>بدون رسوم إضافية</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
              <span>دعم فني 24/7</span>
            </div>
          </div>

          {/* Amount */}
          {targetOrderAmount && (
            <div className="flex items-center justify-between bg-muted/50 rounded-xl px-4 py-3 border border-border/50">
              <span className="text-sm text-muted-foreground">المبلغ المطلوب</span>
              <span className="text-lg font-black text-primary">
                {targetOrderAmount.toLocaleString("ar-EG")} ج.م
              </span>
            </div>
          )}

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-start gap-2 p-3 rounded-xl bg-destructive/5 border border-destructive/15 text-sm"
              >
                <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                <div>
                  <p className="text-destructive font-medium">{error}</p>
                  <button
                    onClick={() => setError(null)}
                    className="text-xs text-muted-foreground underline mt-1"
                  >
                    إغلاق
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* CTA Button */}
          {targetOrderId ? (
            <Button
              className="w-full h-12 gap-2 text-base font-bold rounded-xl"
              disabled={loading}
              onClick={() => handlePay(targetOrderId)}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  جاري تجهيز بوابة الدفع...
                </>
              ) : (
                <>
                  <CreditCard className="w-5 h-5" />
                  ادفع الآن
                  {targetOrderNumber && (
                    <span className="text-xs opacity-80 mr-1">— طلب #{targetOrderNumber}</span>
                  )}
                </>
              )}
            </Button>
          ) : (
            <div className="text-center py-3">
              <p className="text-sm text-muted-foreground">
                اختر طلب من قائمة الطلبات لبدء الدفع
              </p>
              <ArrowRight className="w-4 h-4 text-muted-foreground mx-auto mt-2 rotate-180" />
            </div>
          )}
        </div>
      </motion.div>

      {/* Security Badge */}
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="w-4 h-4 text-green-600" />
        <span>مدعوم من Paymob — بوابة دفع معتمدة ومرخصة</span>
      </div>
    </div>
  );
};

export default DealerPayment;
