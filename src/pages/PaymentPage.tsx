import { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  CreditCard, ShieldCheck, Loader2, ArrowRight, AlertCircle, Package,
  Wallet, Smartphone, Store, Copy, CheckCircle2, XCircle, RotateCcw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AuthorizedDistributorBadges from "@/components/AuthorizedDistributorBadges";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { buildPaymobReturnUrl, ensureActiveSession } from "@/lib/paymob";
import { isNativePlatform, openExternal } from "@/lib/native";

type PaymentMethod = "card" | "wallet" | "kiosk";

interface PaymentMethodOption {
  id: PaymentMethod;
  label: string;
  labelEn: string;
  icon: React.ElementType;
  description: string;
  color: string;
}

const PAYMENT_METHODS: PaymentMethodOption[] = [
  {
    id: "card",
    label: "بطاقة بنكية",
    labelEn: "Visa / Mastercard / Meeza",
    icon: CreditCard,
    description: "ادفع ببطاقتك البنكية مباشرة",
    color: "text-blue-600",
  },
  {
    id: "wallet",
    label: "محفظة إلكترونية",
    labelEn: "Vodafone Cash / Orange / Etisalat",
    icon: Smartphone,
    description: "ادفع من محفظتك الإلكترونية",
    color: "text-red-600",
  },
  {
    id: "kiosk",
    label: "فروع أمان / مصاري",
    labelEn: "Aman / Masary Kiosk",
    icon: Store,
    description: "ادفع من أقرب فرع أمان أو مصاري",
    color: "text-green-600",
  },
];

const ERROR_MESSAGES: Record<string, string> = {
  "DECLINED": "تم رفض البطاقة. جرب بطاقة أخرى أو طريقة دفع مختلفة.",
  "INSUFFICIENT_FUNDS": "رصيد البطاقة غير كافي. جرب طريقة دفع أخرى.",
  "EXPIRED_CARD": "البطاقة منتهية الصلاحية. استخدم بطاقة أخرى.",
  "AUTHENTICATION_FAILED": "فشل التحقق من البطاقة. تأكد من بياناتك وحاول مرة أخرى.",
};

const PaymentPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const orderId = searchParams.get("order_id");
  const amount = searchParams.get("amount");

  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>("card");
  const [walletPhone, setWalletPhone] = useState("");
  const [step, setStep] = useState<"choose" | "pay">("choose");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderInfo, setOrderInfo] = useState<{ orderNumber: string; amountCents: number } | null>(null);

  // Wallet payment state
  const [walletRedirectUrl, setWalletRedirectUrl] = useState<string | null>(null);

  // Kiosk payment state
  const [kioskBillRef, setKioskBillRef] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Fetch order info on mount
  useEffect(() => {
    if (authLoading) return; // Wait for auth to finish loading
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

  const initiatePayment = async () => {
    if (!orderId) return;

    if (selectedMethod === "wallet" && !walletPhone) {
      toast({ title: "أدخل رقم المحفظة", variant: "destructive" });
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await ensureActiveSession();

      const { data, error: fnError } = await supabase.functions.invoke("create-payment", {
        body: {
          order_id: orderId,
          payment_method: selectedMethod,
          wallet_phone: selectedMethod === "wallet" ? walletPhone : undefined,
          return_url: buildPaymobReturnUrl(),
        },
      });

      if (fnError || !data?.payment_key) {
        console.error("Payment init error:", fnError, data);
        setError(data?.error || "تعذر إنشاء جلسة الدفع. يرجى المحاولة مرة أخرى.");
        setLoading(false);
        return;
      }

      if (orderInfo) {
        setOrderInfo({
          ...orderInfo,
          orderNumber: data.order_number || orderInfo.orderNumber,
        });
      }

      if (selectedMethod === "card" && data.iframe_url) {
        window.location.href = data.iframe_url;
        return;
      } else if (selectedMethod === "wallet" && data.wallet_redirect_url) {
        setWalletRedirectUrl(data.wallet_redirect_url);
        setStep("pay");
        // Redirect to wallet app
        window.location.href = data.wallet_redirect_url;
      } else if (selectedMethod === "wallet" && !data.wallet_redirect_url) {
        setStep("pay");
        // Wallet initiated, waiting for user to approve on phone
      } else if (selectedMethod === "kiosk" && data.kiosk_bill_reference) {
        setKioskBillRef(data.kiosk_bill_reference);
        setStep("pay");
      } else {
        setError("تعذر بدء عملية الدفع بهذه الطريقة. جرب طريقة أخرى.");
      }

      setLoading(false);
    } catch (e: unknown) {
      console.error("Payment init error:", e);
      const message = e instanceof Error ? e.message : "حدث خطأ غير متوقع";
      if (message === "SESSION_EXPIRED") {
        setError("انتهت جلسة تسجيل الدخول. يرجى تسجيل الدخول مرة أخرى.");
        setTimeout(() => navigate("/auth"), 2000);
      } else {
        setError(message);
      }
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
    setWalletRedirectUrl(null);
    setKioskBillRef(null);
    setError(null);
  };

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
          {/* Header */}
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

          {/* Order Summary */}
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

          {/* Error Display */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-destructive/5 border border-destructive/20 rounded-xl p-3.5 sm:p-5 mb-4 md:mb-6"
              >
                <div className="flex items-start gap-2.5 sm:gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                    <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-destructive" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm sm:text-base text-foreground">تعذر إتمام الدفع</p>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1">{error}</p>
                    <div className="mt-2.5 sm:mt-3 flex flex-wrap gap-2">
                      <Button size="sm" onClick={() => { setError(null); if (step === "pay") handleBack(); }} className="gap-1.5 text-xs sm:text-sm h-8 sm:h-9">
                        <RotateCcw className="w-3 h-3" />
                        جرب مرة أخرى
                      </Button>
                      {step === "pay" && (
                        <Button size="sm" variant="outline" onClick={handleBack} className="text-xs sm:text-sm h-8 sm:h-9">
                          جرب طريقة دفع أخرى
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {/* Step 1: Choose payment method */}
            {step === "choose" && (
              <motion.div
                key="choose"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <div className="space-y-2.5 sm:space-y-3 mb-4 md:mb-6">
                  {PAYMENT_METHODS.map((method) => {
                    const Icon = method.icon;
                    const isSelected = selectedMethod === method.id;
                    return (
                      <button
                        key={method.id}
                        onClick={() => setSelectedMethod(method.id)}
                        className={`w-full text-right p-3 sm:p-4 rounded-xl border-2 transition-all duration-200 active:scale-[0.98] ${
                          isSelected
                            ? "border-primary bg-primary/5 shadow-md"
                            : "border-border bg-card hover:border-primary/40 hover:bg-primary/[0.02]"
                        }`}
                      >
                        <div className="flex items-center gap-3 sm:gap-4">
                          <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0 ${
                            isSelected ? "bg-primary/10" : "bg-muted"
                          }`}>
                            <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${isSelected ? "text-primary" : method.color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm sm:text-base text-foreground">{method.label}</p>
                            <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{method.labelEn}</p>
                            <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 hidden sm:block">{method.description}</p>
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
                {selectedMethod === "wallet" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="mb-4 md:mb-6"
                  >
                    <label className="block text-xs sm:text-sm font-bold text-foreground mb-1.5 sm:mb-2">
                      رقم المحفظة (Vodafone Cash / Orange / Etisalat)
                    </label>
                    <Input
                      type="tel"
                      placeholder="01xxxxxxxxx"
                      value={walletPhone}
                      onChange={(e) => setWalletPhone(e.target.value)}
                      dir="ltr"
                      className="text-base sm:text-lg font-mono h-12"
                      maxLength={11}
                      inputMode="tel"
                    />
                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                      أدخل رقم المحفظة المسجل عليها حسابك
                    </p>
                  </motion.div>
                )}

                <Button
                  onClick={initiatePayment}
                  disabled={loading || !orderId}
                  className="w-full h-11 sm:h-12 text-sm sm:text-base font-bold gap-2"
                  size="lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                      جاري التجهيز...
                    </>
                  ) : (
                    <>
                      متابعة الدفع
                      <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 rotate-180" />
                    </>
                  )}
                </Button>
              </motion.div>
            )}

            {/* Step 2: Payment in progress */}
            {step === "pay" && (
              <motion.div
                key="pay"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                {/* Wallet - waiting for approval */}
                {selectedMethod === "wallet" && (
                  <div className="bg-card border border-border rounded-xl p-5 sm:p-8 text-center space-y-3 sm:space-y-4">
                    {walletRedirectUrl ? (
                      <>
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center mx-auto">
                          <Smartphone className="w-7 h-7 sm:w-8 sm:h-8 text-orange-600" />
                        </div>
                        <h2 className="text-lg sm:text-xl font-black text-foreground">جاري فتح تطبيق المحفظة...</h2>
                        <p className="text-sm text-muted-foreground">
                          لو مفتحش تلقائياً، اضغط الزر:
                        </p>
                        <Button asChild className="gap-2 h-11">
                          <a href={walletRedirectUrl} target="_blank" rel="noopener noreferrer">
                            <Smartphone className="w-4 h-4" />
                            فتح المحفظة
                          </a>
                        </Button>
                      </>
                    ) : (
                      <>
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center mx-auto">
                          <Loader2 className="w-7 h-7 sm:w-8 sm:h-8 text-orange-600 animate-spin" />
                        </div>
                        <h2 className="text-lg sm:text-xl font-black text-foreground">في انتظار الموافقة</h2>
                        <p className="text-sm text-muted-foreground">
                          هتوصلك رسالة على رقم <span dir="ltr" className="font-mono font-bold">{walletPhone}</span> — وافق على الدفع من تطبيق المحفظة
                        </p>
                      </>
                    )}
                    <p className="text-[10px] sm:text-xs text-muted-foreground">
                      بعد الدفع هيتم تحديث حالة طلبك تلقائياً
                    </p>
                    <Button variant="outline" onClick={() => navigate("/")} className="gap-2 h-10 sm:h-11">
                      العودة للرئيسية
                    </Button>
                  </div>
                )}

                {/* Kiosk - bill reference */}
                {selectedMethod === "kiosk" && kioskBillRef && (
                  <div className="bg-card border border-border rounded-xl p-5 sm:p-8 text-center space-y-4 sm:space-y-5">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
                      <Store className="w-7 h-7 sm:w-8 sm:h-8 text-green-600" />
                    </div>
                    <h2 className="text-lg sm:text-xl font-black text-foreground">رقم فاتورة الدفع</h2>
                    <p className="text-muted-foreground text-xs sm:text-sm">
                      توجه لأقرب فرع أمان أو مصاري واطلب دفع فاتورة "اكسبت / Accept" بالرقم التالي:
                    </p>
                    <div className="bg-muted rounded-xl p-4 sm:p-5 relative">
                      <p className="text-2xl sm:text-3xl font-black font-mono text-foreground tracking-widest" dir="ltr">
                        {kioskBillRef}
                      </p>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleCopyBillRef}
                        className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2 gap-1 text-xs h-7 sm:h-8"
                      >
                        {copied ? (
                          <><CheckCircle2 className="w-3 h-3 text-green-600" /> تم النسخ</>
                        ) : (
                          <><Copy className="w-3 h-3" /> نسخ</>
                        )}
                      </Button>
                    </div>
                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-2.5 sm:p-3 text-xs sm:text-sm text-amber-800 dark:text-amber-300">
                      ⚠️ يجب الدفع خلال 48 ساعة — بعدها يتم إلغاء الفاتورة تلقائياً
                    </div>
                    <Button variant="outline" onClick={() => navigate("/")} className="gap-2 h-10 sm:h-11">
                      العودة للرئيسية
                    </Button>
                  </div>
                )}

                {/* Back button */}
                <div className="text-center mt-3 sm:mt-4">
                  <Button variant="ghost" size="sm" onClick={handleBack} className="gap-2 text-muted-foreground text-xs sm:text-sm">
                    <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    تغيير طريقة الدفع
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Security Badge */}
          <div className="mt-4 sm:mt-6 flex items-center justify-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-muted-foreground">
            <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-600" />
            <span>معاملة آمنة ومشفرة عبر Paymob</span>
          </div>

          {/* Back Link */}
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
