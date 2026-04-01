import { useState, useRef } from "react";
import {
  CreditCard, Loader2, ShieldCheck, AlertCircle, ArrowLeft,
  Smartphone, Store, Copy, CheckCircle2, Package, Lock, ChevronDown,
  Banknote, Upload, ExternalLink, ImageIcon
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

type PaymentMethod = "card" | "wallet" | "kiosk" | "instapay";

const INSTAPAY_LINK = "https://ipn.eg/S/drmado/instapay/0AGxRP";
const INSTAPAY_ADDRESS = "drmado@instapay";

const PAYMENT_METHODS: {
  id: PaymentMethod;
  label: string;
  labelEn: string;
  icon: typeof CreditCard;
  color: string;
}[] = [
  { id: "card", label: "بطاقة بنكية", labelEn: "Visa / Mastercard / Meeza", icon: CreditCard, color: "text-blue-600" },
  { id: "wallet", label: "محفظة إلكترونية", labelEn: "Vodafone Cash / Orange / Etisalat", icon: Smartphone, color: "text-orange-600" },
  { id: "instapay", label: "InstaPay", labelEn: "تحويل فوري من أي بنك", icon: Banknote, color: "text-violet-600" },
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

  // InstaPay states
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [receiptSubmitted, setReceiptSubmitted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedMethodData = PAYMENT_METHODS.find((m) => m.id === selectedMethod)!;

  const handlePay = async (orderId: string) => {
    // InstaPay flow — go directly to step 2
    if (selectedMethod === "instapay") {
      setStep("pay");
      return;
    }

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

  const handleCopyInstaPay = () => {
    navigator.clipboard.writeText(INSTAPAY_ADDRESS);
    setCopied(true);
    toast({ title: "تم نسخ عنوان InstaPay" });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReceiptSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "حجم الملف كبير جداً (الحد الأقصى 5 ميجا)", variant: "destructive" });
      return;
    }
    setReceiptFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setReceiptPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmitReceipt = async () => {
    if (!receiptFile || !targetOrderId || !user) return;
    setUploadingReceipt(true);
    try {
      const ext = receiptFile.name.split(".").pop() || "jpg";
      const filePath = `instapay-receipts/${targetOrderId}/${Date.now()}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from("dealer-documents")
        .upload(filePath, receiptFile, { upsert: true });

      if (uploadErr) throw uploadErr;

      // Update order payment method and add note
      const { error: updateErr } = await supabase
        .from("orders")
        .update({
          payment_method: "instapay",
          notes: `إيصال InstaPay: ${filePath}`,
        })
        .eq("id", targetOrderId)
        .eq("user_id", user.id);

      if (updateErr) throw updateErr;

      setReceiptSubmitted(true);
      toast({ title: "✅ تم رفع الإيصال بنجاح", description: "سيتم مراجعته وتأكيد الطلب قريباً" });
    } catch (e: any) {
      toast({ title: "خطأ في رفع الإيصال", description: e.message, variant: "destructive" });
    } finally {
      setUploadingReceipt(false);
    }
  };

  const handleBack = () => {
    setStep("choose");
    setIframeUrl(null);
    setWalletRedirectUrl(null);
    setKioskBillRef(null);
    setReceiptFile(null);
    setReceiptPreview(null);
    setReceiptSubmitted(false);
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

        {/* ─── InstaPay Step 2 ─── */}
        {selectedMethod === "instapay" && !receiptSubmitted && (
          <div className="space-y-4">
            {/* Amount + InstaPay info */}
            <div className="bg-card border border-border rounded-2xl p-6 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-violet-500/10 flex items-center justify-center mx-auto">
                <Banknote className="w-7 h-7 text-violet-600" />
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-1">حوّل المبلغ التالي عبر InstaPay</p>
                {targetOrderAmount != null && targetOrderAmount > 0 && (
                  <div dir="ltr" className="text-center">
                    <span className="text-3xl font-black text-primary">{targetOrderAmount.toLocaleString("ar-EG")}</span>
                    <span className="text-sm text-muted-foreground mr-1.5">ج.م</span>
                  </div>
                )}
              </div>

              {/* InstaPay Address */}
              <div className="bg-muted/30 rounded-xl px-4 py-3 border border-border/60">
                <p className="text-[11px] text-muted-foreground mb-1.5">إلى حساب</p>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-base font-black font-mono text-foreground" dir="ltr">{INSTAPAY_ADDRESS}</span>
                  <button onClick={handleCopyInstaPay} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                    {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
                  </button>
                </div>
              </div>

              {/* Open InstaPay button */}
              <Button asChild className="w-full gap-2 h-12 rounded-xl bg-violet-600 hover:bg-violet-700 text-white">
                <a href={INSTAPAY_LINK} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4" />
                  فتح InstaPay وتحويل المبلغ
                </a>
              </Button>

              <p className="text-[11px] text-muted-foreground">
                سيتم فتح تطبيق InstaPay مباشرة. حوّل المبلغ ثم ارجع هنا لرفع الإيصال
              </p>
            </div>

            {/* Receipt Upload */}
            <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Upload className="w-4 h-4 text-primary" />
                <p className="text-sm font-bold text-foreground">رفع إيصال التحويل</p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleReceiptSelect}
                className="hidden"
              />

              {receiptPreview ? (
                <div className="space-y-3">
                  <div className="relative rounded-xl overflow-hidden border border-border">
                    <img src={receiptPreview} alt="إيصال التحويل" className="w-full max-h-52 object-contain bg-muted/20" />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 rounded-xl"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      تغيير الصورة
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 rounded-xl gap-1.5"
                      onClick={handleSubmitReceipt}
                      disabled={uploadingReceipt}
                    >
                      {uploadingReceipt ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          جاري الرفع...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          تأكيد ورفع الإيصال
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/40 hover:bg-primary/[0.02] transition-all group"
                >
                  <ImageIcon className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2 group-hover:text-primary/50 transition-colors" />
                  <p className="text-sm font-bold text-muted-foreground group-hover:text-foreground transition-colors">
                    اضغط لرفع صورة الإيصال
                  </p>
                  <p className="text-[10px] text-muted-foreground/60 mt-1">PNG, JPG — حد أقصى 5 ميجا</p>
                </button>
              )}
            </div>
          </div>
        )}

        {/* InstaPay Success */}
        {selectedMethod === "instapay" && receiptSubmitted && (
          <div className="bg-card border border-border rounded-2xl p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>
            <h3 className="text-lg font-black text-foreground">تم رفع الإيصال بنجاح!</h3>
            <p className="text-sm text-muted-foreground">
              سيتم مراجعة الإيصال وتأكيد طلبك في أقرب وقت.
              <br />ستصلك إشعار فور تأكيد الدفع.
            </p>
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

      {/* CTA */}
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
              {selectedMethod === "instapay" ? "متابعة للتحويل" : "ادفع الآن"}
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
