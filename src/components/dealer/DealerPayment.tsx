import { useState } from "react";
import {
  CreditCard, Loader2, ShieldCheck, AlertCircle, ArrowRight,
  Smartphone, Store, Copy, CheckCircle2, RotateCcw, Package
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

type PaymentMethod = "card" | "wallet" | "kiosk";

const PAYMENT_METHODS = [
  {
    id: "card" as PaymentMethod,
    label: "بطاقة بنكية",
    labelEn: "Visa / Mastercard / Meeza",
    icon: CreditCard,
    description: "ادفع ببطاقتك البنكية مباشرة",
  },
  {
    id: "wallet" as PaymentMethod,
    label: "محفظة إلكترونية",
    labelEn: "Vodafone Cash / Orange / Etisalat",
    icon: Smartphone,
    description: "ادفع من محفظتك الإلكترونية",
  },
  {
    id: "kiosk" as PaymentMethod,
    label: "فروع أمان / مصاري",
    labelEn: "Aman / Masary Kiosk",
    icon: Store,
    description: "ادفع من أقرب فرع أمان أو مصاري",
  },
];

interface DealerPaymentProps {
  targetOrderId?: string;
  targetOrderNumber?: string;
  targetOrderAmount?: number;
}

const DealerPayment = ({ targetOrderId, targetOrderNumber, targetOrderAmount }: DealerPaymentProps) => {
  const { user } = useAuth();
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>("card");
  const [walletPhone, setWalletPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"choose" | "pay">("choose");

  // Payment result states
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  const [walletRedirectUrl, setWalletRedirectUrl] = useState<string | null>(null);
  const [kioskBillRef, setKioskBillRef] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handlePay = async (orderId: string) => {
    if (selectedMethod === "wallet" && !walletPhone) {
      toast({ title: "أدخل رقم المحفظة", variant: "destructive" });
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { ensureActiveSession } = await import("@/lib/paymob");
      await ensureActiveSession();

      const { data, error: fnError } = await supabase.functions.invoke("create-payment", {
        body: {
          order_id: orderId,
          payment_method: selectedMethod,
          wallet_phone: selectedMethod === "wallet" ? walletPhone : undefined,
          return_url: `${window.location.origin}/payment-callback`,
        },
      });

      if (fnError || !data?.payment_key) {
        console.error("Payment error:", fnError, data);
        setError(data?.error || "تعذر إنشاء جلسة الدفع. يرجى المحاولة مرة أخرى.");
        return;
      }

      if (selectedMethod === "card" && data.iframe_url) {
        setIframeUrl(data.iframe_url);
        setStep("pay");
      } else if (selectedMethod === "wallet" && data.wallet_redirect_url) {
        setWalletRedirectUrl(data.wallet_redirect_url);
        setStep("pay");
        window.location.href = data.wallet_redirect_url;
      } else if (selectedMethod === "wallet" && !data.wallet_redirect_url) {
        setStep("pay");
      } else if (selectedMethod === "kiosk" && data.kiosk_bill_reference) {
        setKioskBillRef(data.kiosk_bill_reference);
        setStep("pay");
      } else {
        setError("تعذر بدء عملية الدفع بهذه الطريقة. جرب طريقة أخرى.");
      }
    } catch (e: any) {
      console.error("Payment error:", e);
      setError(e.message || "حدث خطأ غير متوقع");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyBillRef = () => {
    if (kioskBillRef) {
      navigator.clipboard.writeText(kioskBillRef);
      setCopied(true);
      toast({ title: "تم نسخ رقم الفاتورة" });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleBack = () => {
    setStep("choose");
    setIframeUrl(null);
    setWalletRedirectUrl(null);
    setKioskBillRef(null);
    setError(null);
  };

  // ─── Step 2: Payment in progress ───
  if (step === "pay") {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-black text-foreground">إتمام الدفع</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={handleBack} className="text-xs text-muted-foreground">
            ← رجوع
          </Button>
        </div>

        {targetOrderNumber && (
          <div className="flex items-center justify-between bg-muted/50 rounded-lg px-4 py-2.5 text-sm">
            <span className="text-muted-foreground">طلب رقم</span>
            <span className="font-bold font-mono text-foreground" dir="ltr">{targetOrderNumber}</span>
          </div>
        )}

        {/* Card iframe */}
        {selectedMethod === "card" && iframeUrl && (
          <div className="rounded-xl border border-border overflow-hidden bg-card">
            <iframe
              src={iframeUrl}
              className="w-full border-0"
              style={{ minHeight: "480px", height: "65vh", maxHeight: "650px" }}
              title="Paymob Payment"
              allow="payment"
            />
          </div>
        )}

        {/* Wallet waiting */}
        {selectedMethod === "wallet" && (
          <div className="bg-card border border-border rounded-xl p-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center mx-auto">
              <Smartphone className="w-7 h-7 text-orange-600" />
            </div>
            <h3 className="text-lg font-black text-foreground">
              {walletRedirectUrl ? "جاري فتح تطبيق المحفظة..." : "في انتظار تأكيد الدفع"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {walletRedirectUrl
                ? "لو مفتحش تلقائياً، اضغط الزر:"
                : "افتح تطبيق المحفظة على موبايلك ووافق على عملية الدفع"}
            </p>
            {walletRedirectUrl && (
              <Button asChild className="gap-2 h-11">
                <a href={walletRedirectUrl} target="_blank" rel="noopener noreferrer">
                  <Smartphone className="w-4 h-4" />
                  فتح المحفظة
                </a>
              </Button>
            )}
          </div>
        )}

        {/* Kiosk bill reference */}
        {selectedMethod === "kiosk" && kioskBillRef && (
          <div className="bg-card border border-border rounded-xl p-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto">
              <Store className="w-7 h-7 text-emerald-600" />
            </div>
            <h3 className="text-lg font-black text-foreground">رقم فاتورة الدفع</h3>
            <p className="text-sm text-muted-foreground">
              اذهب لأقرب فرع أمان أو مصاري وادفع برقم الفاتورة ده:
            </p>
            <div className="flex items-center justify-center gap-3 bg-muted/50 rounded-xl px-6 py-4 border border-border">
              <span className="text-2xl font-black font-mono text-primary tracking-wider" dir="ltr">
                {kioskBillRef}
              </span>
              <Button variant="ghost" size="icon" onClick={handleCopyBillRef} className="shrink-0">
                {copied ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <Copy className="w-5 h-5" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              الفاتورة صالحة لمدة 24 ساعة
            </p>
          </div>
        )}

        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="w-3.5 h-3.5 text-green-600" />
          <span>معاملة آمنة ومشفرة</span>
        </div>
      </motion.div>
    );
  }

  // ─── Step 1: Choose payment method ───
  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-xl font-black text-foreground">الدفع الإلكتروني</h2>
        <p className="text-sm text-muted-foreground mt-1">
          اختر طريقة الدفع المناسبة لك
        </p>
      </div>

      {/* Order Summary */}
      {(targetOrderNumber || targetOrderAmount) && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-xl p-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <Package className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-bold text-sm text-foreground">تفاصيل الطلب</h3>
          </div>
          <div className="space-y-2 text-sm">
            {targetOrderNumber && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">رقم الطلب</span>
                <span className="font-bold font-mono text-foreground" dir="ltr">{targetOrderNumber}</span>
              </div>
            )}
            {targetOrderAmount && (
              <div className="flex justify-between items-center pt-2 border-t border-border">
                <span className="text-muted-foreground">المبلغ المطلوب</span>
                <span className="text-lg font-black text-primary">{targetOrderAmount.toLocaleString("ar-EG")} ج.م</span>
              </div>
            )}
          </div>
        </motion.div>
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
            <div className="flex-1">
              <p className="text-destructive font-medium">{error}</p>
              <button onClick={() => setError(null)} className="text-xs text-muted-foreground underline mt-1">
                إغلاق
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Payment Methods */}
      <div className="space-y-2.5">
        {PAYMENT_METHODS.map((method) => {
          const Icon = method.icon;
          const isSelected = selectedMethod === method.id;
          return (
            <button
              key={method.id}
              onClick={() => setSelectedMethod(method.id)}
              className={`w-full text-right p-3.5 rounded-xl border-2 transition-all duration-200 active:scale-[0.98] ${
                isSelected
                  ? "border-primary bg-primary/5 shadow-md"
                  : "border-border bg-card hover:border-primary/40 hover:bg-primary/[0.02]"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                  isSelected ? "bg-primary/10" : "bg-muted"
                }`}>
                  <Icon className={`w-5 h-5 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-foreground">{method.label}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{method.labelEn}</p>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  isSelected ? "border-primary" : "border-muted-foreground/30"
                }`}>
                  {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Wallet phone input */}
      <AnimatePresence>
        {selectedMethod === "wallet" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <label className="block text-xs font-bold text-foreground mb-1.5">
              رقم المحفظة (Vodafone Cash / Orange / Etisalat)
            </label>
            <Input
              type="tel"
              placeholder="01xxxxxxxxx"
              value={walletPhone}
              onChange={(e) => setWalletPhone(e.target.value)}
              dir="ltr"
              className="text-base font-mono h-12"
              maxLength={11}
              inputMode="tel"
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              أدخل رقم المحفظة المسجل عليها حسابك
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CTA */}
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
              متابعة الدفع
              <ArrowRight className="w-4 h-4 rotate-180" />
            </>
          )}
        </Button>
      ) : (
        <div className="text-center py-3">
          <p className="text-sm text-muted-foreground">اختر طلب من قائمة الطلبات لبدء الدفع</p>
          <ArrowRight className="w-4 h-4 text-muted-foreground mx-auto mt-2 rotate-180" />
        </div>
      )}

      {/* Security Badge */}
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="w-4 h-4 text-green-600" />
        <span>مدعوم من Paymob — بوابة دفع معتمدة ومرخصة</span>
      </div>
    </div>
  );
};

export default DealerPayment;
