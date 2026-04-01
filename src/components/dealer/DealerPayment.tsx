import { useState } from "react";
import {
  CreditCard, Loader2, ShieldCheck, AlertCircle, ArrowLeft,
  Smartphone, Store, Copy, CheckCircle2, Package, Lock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import visaLogo from "@/assets/visa-logo.png";
import mastercardLogo from "@/assets/mastercard-logo.png";
import meezaLogo from "@/assets/meeza-logo.png";
import vodafoneCashLogo from "@/assets/vodafone-cash-logo.png";
import orangeMoneyLogo from "@/assets/orange-money-logo.png";
import etisalatCashLogo from "@/assets/etisalat-cash-logo.png";
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
    iconBg: "bg-blue-500/10",
    iconColor: "text-blue-600",
    selectedBorder: "border-blue-500/50",
    selectedBg: "bg-blue-50 dark:bg-blue-950/20",
  },
  {
    id: "wallet" as PaymentMethod,
    label: "محفظة إلكترونية",
    labelEn: "Vodafone Cash / Orange / Etisalat",
    icon: Smartphone,
    iconBg: "bg-orange-500/10",
    iconColor: "text-orange-600",
    selectedBorder: "border-orange-500/50",
    selectedBg: "bg-orange-50 dark:bg-orange-950/20",
  },
  {
    id: "kiosk" as PaymentMethod,
    label: "فروع أمان / مصاري",
    labelEn: "Aman / Masary Kiosk",
    icon: Store,
    iconBg: "bg-emerald-500/10",
    iconColor: "text-emerald-600",
    selectedBorder: "border-emerald-500/50",
    selectedBg: "bg-emerald-50 dark:bg-emerald-950/20",
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

  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  const [walletRedirectUrl, setWalletRedirectUrl] = useState<string | null>(null);
  const [kioskBillRef, setKioskBillRef] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const selectedMethodData = PAYMENT_METHODS.find((m) => m.id === selectedMethod)!;

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
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 max-w-lg mx-auto">
        <button onClick={handleBack} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" />
          رجوع لطرق الدفع
        </button>

        {targetOrderNumber && (
          <div className="flex items-center justify-between bg-muted/40 rounded-xl px-4 py-3 text-sm">
            <span className="text-muted-foreground">طلب رقم</span>
            <span className="font-bold font-mono text-foreground" dir="ltr">{targetOrderNumber}</span>
          </div>
        )}

        {selectedMethod === "card" && iframeUrl && (
          <div className="rounded-2xl border border-border overflow-hidden bg-card shadow-sm">
            <iframe
              src={iframeUrl}
              className="w-full border-0"
              style={{ minHeight: "480px", height: "65vh", maxHeight: "650px" }}
              title="Paymob Payment"
              allow="payment"
            />
          </div>
        )}

        {selectedMethod === "wallet" && (
          <div className="bg-card border border-border rounded-2xl p-8 text-center space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-orange-500/10 flex items-center justify-center mx-auto">
              <Smartphone className="w-8 h-8 text-orange-600" />
            </div>
            <div>
              <h3 className="text-lg font-black text-foreground">
                {walletRedirectUrl ? "جاري فتح تطبيق المحفظة..." : "في انتظار تأكيد الدفع"}
              </h3>
              <p className="text-sm text-muted-foreground mt-2">
                {walletRedirectUrl
                  ? "لو مفتحش تلقائياً، اضغط الزر:"
                  : "افتح تطبيق المحفظة على موبايلك ووافق على عملية الدفع"}
              </p>
            </div>
            {walletRedirectUrl && (
              <Button asChild className="gap-2 h-12 rounded-xl">
                <a href={walletRedirectUrl} target="_blank" rel="noopener noreferrer">
                  <Smartphone className="w-4 h-4" />
                  فتح المحفظة
                </a>
              </Button>
            )}
          </div>
        )}

        {selectedMethod === "kiosk" && kioskBillRef && (
          <div className="bg-card border border-border rounded-2xl p-8 text-center space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto">
              <Store className="w-8 h-8 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-lg font-black text-foreground">رقم فاتورة الدفع</h3>
              <p className="text-sm text-muted-foreground mt-2">
                اذهب لأقرب فرع أمان أو مصاري وادفع برقم الفاتورة:
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 bg-muted/30 rounded-xl px-6 py-5 border border-border/60">
              <span className="text-3xl font-black font-mono text-primary tracking-widest" dir="ltr">
                {kioskBillRef}
              </span>
              <button onClick={handleCopyBillRef} className="p-2 rounded-lg hover:bg-muted transition-colors">
                {copied ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <Copy className="w-5 h-5 text-muted-foreground" />}
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground">الفاتورة صالحة لمدة 24 ساعة</p>
          </div>
        )}

        <SecurityBadge />
      </motion.div>
    );
  }

  // ─── Step 1: Choose payment method ───
  return (
    <div className="max-w-lg mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-1.5">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
          <Lock className="w-7 h-7 text-primary" />
        </div>
        <h2 className="text-xl font-black text-foreground">الدفع الإلكتروني</h2>
        <p className="text-sm text-muted-foreground">اختر طريقة الدفع وأكمل المعاملة بأمان</p>
      </div>

      {/* Order Summary Card */}
      {(targetOrderNumber || targetOrderAmount) && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-primary/5 to-primary/[0.02] border border-primary/10 rounded-2xl p-5"
        >
          <div className="flex items-center gap-2 mb-3">
            <Package className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold text-primary">تفاصيل الطلب</span>
          </div>
          <div className="space-y-2.5">
            {targetOrderNumber && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">رقم الطلب</span>
                <span className="font-bold font-mono text-foreground" dir="ltr">{targetOrderNumber}</span>
              </div>
            )}
            {targetOrderAmount != null && targetOrderAmount > 0 && (
              <div className="flex justify-between items-center pt-2.5 border-t border-primary/10">
                <span className="text-sm text-muted-foreground">المبلغ المطلوب</span>
                <div className="text-left" dir="ltr">
                  <span className="text-2xl font-black text-primary">{targetOrderAmount.toLocaleString("ar-EG")}</span>
                  <span className="text-xs text-muted-foreground mr-1">ج.م</span>
                </div>
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
            className="flex items-start gap-3 p-4 rounded-2xl bg-destructive/5 border border-destructive/15"
          >
            <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-destructive font-bold">{error}</p>
              <button onClick={() => setError(null)} className="text-xs text-muted-foreground underline mt-1.5">
                إغلاق
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Payment Methods */}
      <div className="space-y-3">
        <p className="text-xs font-bold text-muted-foreground px-1">طريقة الدفع</p>
        {PAYMENT_METHODS.map((method, index) => {
          const Icon = method.icon;
          const isSelected = selectedMethod === method.id;
          return (
            <motion.button
              key={method.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.06 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedMethod(method.id)}
              className={`w-full text-right p-4 rounded-2xl border-2 transition-all duration-300 ${
                isSelected
                  ? `${method.selectedBorder} ${method.selectedBg} shadow-sm`
                  : "border-border/50 bg-card hover:border-border hover:shadow-sm"
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 ${
                  isSelected ? method.iconBg : "bg-muted"
                }`}>
                  <Icon className={`w-5.5 h-5.5 transition-colors duration-300 ${
                    isSelected ? method.iconColor : "text-muted-foreground"
                  }`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-[15px] text-foreground">{method.label}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    {method.id === "card" ? (
                      <>
                        <img src={visaLogo} alt="Visa" className="h-5 w-auto object-contain rounded-sm" loading="lazy" />
                        <img src={mastercardLogo} alt="Mastercard" className="h-5 w-auto object-contain rounded-sm" loading="lazy" />
                        <img src={meezaLogo} alt="Meeza" className="h-5 w-auto object-contain rounded-sm" loading="lazy" />
                      </>
                    ) : method.id === "wallet" ? (
                      <>
                        <img src={vodafoneCashLogo} alt="Vodafone Cash" className="h-5 w-auto object-contain rounded-sm" loading="lazy" />
                        <img src={orangeMoneyLogo} alt="Orange Money" className="h-5 w-auto object-contain rounded-sm" loading="lazy" />
                        <img src={etisalatCashLogo} alt="Etisalat Cash" className="h-5 w-auto object-contain rounded-sm" loading="lazy" />
                      </>
                    ) : (
                      <p className="text-[11px] text-muted-foreground">{method.labelEn}</p>
                    )}
                  </div>
                </div>
                <div className={`w-5.5 h-5.5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-300 ${
                  isSelected ? "border-primary bg-primary" : "border-muted-foreground/25"
                }`}>
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-2 h-2 rounded-full bg-primary-foreground"
                    />
                  )}
                </div>
              </div>
            </motion.button>
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
            className="overflow-hidden"
          >
            <div className="bg-card border border-border/60 rounded-2xl p-4 space-y-2.5">
              <label className="block text-xs font-bold text-foreground">
                رقم المحفظة
              </label>
              <Input
                type="tel"
                placeholder="01xxxxxxxxx"
                value={walletPhone}
                onChange={(e) => setWalletPhone(e.target.value)}
                dir="ltr"
                className="text-base font-mono h-12 rounded-xl border-border/60"
                maxLength={11}
                inputMode="tel"
              />
              <p className="text-[10px] text-muted-foreground">
                أدخل رقم المحفظة المسجل عليها حسابك (Vodafone Cash / Orange / Etisalat)
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CTA */}
      {targetOrderId ? (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Button
            className="w-full h-14 gap-2.5 text-base font-black rounded-2xl shadow-lg shadow-primary/15 transition-all duration-300 hover:shadow-xl hover:shadow-primary/20"
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
                <selectedMethodData.icon className="w-5 h-5" />
                ادفع الآن
                {targetOrderAmount != null && targetOrderAmount > 0 && (
                  <span className="text-primary-foreground/70 text-sm font-normal mr-1">
                    ({targetOrderAmount.toLocaleString("ar-EG")} ج.م)
                  </span>
                )}
              </>
            )}
          </Button>
        </motion.div>
      ) : (
        <div className="bg-muted/30 border border-dashed border-border rounded-2xl p-6 text-center space-y-2">
          <Package className="w-8 h-8 text-muted-foreground/40 mx-auto" />
          <p className="text-sm font-bold text-muted-foreground">اختر طلب من قائمة الطلبات لبدء الدفع</p>
          <p className="text-[11px] text-muted-foreground/70">يمكنك الذهاب لتبويب "طلباتي" واختيار طلب</p>
        </div>
      )}

      <SecurityBadge />
    </div>
  );
};

const SecurityBadge = () => (
  <div className="flex items-center justify-center gap-2 py-2">
    <ShieldCheck className="w-4 h-4 text-emerald-600" />
    <span className="text-[11px] text-muted-foreground">مدعوم من Paymob — بوابة دفع معتمدة ومرخصة</span>
  </div>
);

export default DealerPayment;
