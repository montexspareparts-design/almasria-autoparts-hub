import { useState } from "react";
import {
  CreditCard, Loader2, ShieldCheck, AlertCircle, ArrowLeft,
  Smartphone, Store, Copy, CheckCircle2, Package, Lock, ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import visaLogo from "@/assets/visa-logo.png";
import mastercardLogo from "@/assets/mastercard-logo.png";
import meezaLogo from "@/assets/meeza-logo.png";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  Drawer,
  DrawerContent,
  DrawerTrigger,
} from "@/components/ui/drawer";

type PaymentMethod = "card" | "wallet" | "kiosk";

const PAYMENT_METHODS: {
  id: PaymentMethod;
  label: string;
  labelEn: string;
  icon: typeof CreditCard;
  color: string;
}[] = [
  { id: "card", label: "بطاقة بنكية", labelEn: "Visa / Mastercard / Meeza", icon: CreditCard, color: "text-blue-600" },
  { id: "wallet", label: "محفظة إلكترونية", labelEn: "Vodafone Cash / Orange / Etisalat", icon: Smartphone, color: "text-orange-600" },
  { id: "kiosk", label: "فروع أمان / مصاري", labelEn: "Aman / Masary", icon: Store, color: "text-emerald-600" },
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
  const [drawerOpen, setDrawerOpen] = useState(false);

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

  // ─── No order selected ───
  if (!targetOrderId) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
        <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mb-5">
          <Package className="w-9 h-9 text-muted-foreground/40" />
        </div>
        <h3 className="text-lg font-bold text-foreground mb-1.5">لا يوجد طلب محدد</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          اذهب لتبويب <span className="font-bold text-foreground">"طلباتي"</span> واختر طلب لبدء الدفع
        </p>
      </div>
    );
  }

  // ─── Step 2: Payment in progress (full view) ───
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
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto">
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
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto">
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

  // ─── Step 1: Payment Sheet Style ───
  return (
    <div className="max-w-lg mx-auto space-y-5">
      {/* Order Summary — compact hero card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-primary/80 p-6 text-primary-foreground"
      >
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.12),transparent_60%)]" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 opacity-80" />
              <span className="text-xs font-bold opacity-80">دفع آمن</span>
            </div>
            <ShieldCheck className="w-5 h-5 opacity-60" />
          </div>

          {targetOrderNumber && (
            <p className="text-xs opacity-70 mb-1">طلب رقم <span className="font-mono" dir="ltr">{targetOrderNumber}</span></p>
          )}

          {targetOrderAmount != null && targetOrderAmount > 0 && (
            <div dir="ltr" className="text-left">
              <span className="text-4xl font-black tracking-tight">{targetOrderAmount.toLocaleString("ar-EG")}</span>
              <span className="text-sm opacity-70 mr-1.5">ج.م</span>
            </div>
          )}
        </div>
      </motion.div>

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
              <button onClick={() => setError(null)} className="text-xs text-muted-foreground underline mt-1">إغلاق</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Payment Method Selector — Drawer */}
      <div className="space-y-3">
        <p className="text-xs font-bold text-muted-foreground px-1">طريقة الدفع</p>

        <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
          <DrawerTrigger asChild>
            <button className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-border bg-card hover:border-primary/30 transition-all">
              <div className="w-11 h-11 rounded-xl bg-muted flex items-center justify-center shrink-0">
                <selectedMethodData.icon className={`w-5 h-5 ${selectedMethodData.color}`} />
              </div>
              <div className="flex-1 text-right min-w-0">
                <p className="font-bold text-sm text-foreground">{selectedMethodData.label}</p>
                {selectedMethodData.id === "card" ? (
                  <div className="flex items-center gap-1.5 mt-1">
                    <img src={visaLogo} alt="Visa" className="h-4 w-auto object-contain" loading="lazy" />
                    <img src={mastercardLogo} alt="Mastercard" className="h-4 w-auto object-contain" loading="lazy" />
                    <img src={meezaLogo} alt="Meeza" className="h-4 w-auto object-contain" loading="lazy" />
                  </div>
                ) : (
                  <p className="text-[11px] text-muted-foreground mt-0.5">{selectedMethodData.labelEn}</p>
                )}
              </div>
              <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
            </button>
          </DrawerTrigger>

          <DrawerContent className="max-h-[85vh]">
            <div className="p-5 pb-8 space-y-2">
              {/* Drawer handle */}
              <div className="w-10 h-1 rounded-full bg-muted mx-auto mb-4" />
              <h3 className="text-base font-black text-foreground text-center mb-4">اختر طريقة الدفع</h3>

              {PAYMENT_METHODS.map((method) => {
                const Icon = method.icon;
                const isSelected = selectedMethod === method.id;
                return (
                  <motion.button
                    key={method.id}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => {
                      setSelectedMethod(method.id);
                      setDrawerOpen(false);
                    }}
                    className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-border/50 bg-card hover:border-border"
                    }`}
                  >
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                      isSelected ? "bg-primary/10" : "bg-muted"
                    }`}>
                      <Icon className={`w-5 h-5 ${method.color}`} />
                    </div>
                    <div className="flex-1 text-right min-w-0">
                      <p className="font-bold text-sm text-foreground">{method.label}</p>
                      {method.id === "card" ? (
                        <div className="flex items-center gap-1.5 mt-1">
                          <img src={visaLogo} alt="Visa" className="h-4 w-auto object-contain" loading="lazy" />
                          <img src={mastercardLogo} alt="Mastercard" className="h-4 w-auto object-contain" loading="lazy" />
                          <img src={meezaLogo} alt="Meeza" className="h-4 w-auto object-contain" loading="lazy" />
                        </div>
                      ) : (
                        <p className="text-[11px] text-muted-foreground mt-0.5">{method.labelEn}</p>
                      )}
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                      isSelected ? "border-primary bg-primary" : "border-muted-foreground/25"
                    }`}>
                      {isSelected && <div className="w-2 h-2 rounded-full bg-primary-foreground" />}
                    </div>
                  </motion.button>
                );
              })}

              <SecurityBadge />
            </div>
          </DrawerContent>
        </Drawer>
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
              <label className="block text-xs font-bold text-foreground">رقم المحفظة</label>
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

      {/* CTA — Fixed-feel pay button */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <Button
          className="w-full h-14 gap-2.5 text-base font-black rounded-2xl shadow-lg shadow-primary/20 transition-all duration-300 hover:shadow-xl hover:shadow-primary/25 active:scale-[0.98]"
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
              <Lock className="w-4.5 h-4.5" />
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
