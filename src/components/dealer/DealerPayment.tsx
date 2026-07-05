import { useState, useRef } from "react";
import {
  CreditCard, Loader2, ShieldCheck, AlertCircle, ArrowLeft,
  Smartphone, Store, Copy, CheckCircle2, Package, Lock,
  Banknote, Upload, ExternalLink, ImageIcon, Zap, Inbox
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import visaLogo from "@/assets/visa-logo.webp";
import mastercardLogo from "@/assets/mastercard-logo.webp";
import meezaLogo from "@/assets/meeza-logo.webp";
import instapayLogo from "@/assets/instapay-logo.webp";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { buildPaymobReturnUrl } from "@/lib/paymob";
import { isNativeIOS } from "@/lib/native";

type PaymentMethod = "card" | "wallet" | "kiosk" | "instapay";

const INSTAPAY_LINK = "https://ipn.eg/S/drmado/instapay/0AGxRP";
const INSTAPAY_ADDRESS = "drmado@instapay";

const ALL_PAYMENT_METHODS: {
  id: PaymentMethod;
  label: string;
  desc: string;
  icon: typeof CreditCard;
  gradient: string;
  iconBg: string;
}[] = [
  {
    id: "card",
    label: "بطاقة بنكية",
    desc: "Visa / Mastercard / Meeza",
    icon: CreditCard,
    gradient: "from-blue-600 to-blue-700",
    iconBg: "bg-blue-600",
  },
  {
    id: "wallet",
    label: "محفظة إلكترونية",
    desc: "Vodafone Cash / Orange / Etisalat",
    icon: Smartphone,
    gradient: "from-orange-500 to-orange-600",
    iconBg: "bg-orange-500",
  },
  {
    id: "instapay",
    label: "InstaPay",
    desc: "تحويل فوري من أي بنك",
    icon: Banknote,
    gradient: "from-violet-600 to-violet-700",
    iconBg: "bg-violet-600",
  },
  {
    id: "kiosk",
    label: "فروع أمان / مصاري",
    desc: "Aman / Masary",
    icon: Store,
    gradient: "from-emerald-600 to-emerald-700",
    iconBg: "bg-emerald-600",
  },
];

const PAYMENT_METHODS = isNativeIOS()
  ? ALL_PAYMENT_METHODS.filter((m) => m.id !== "kiosk")
  : ALL_PAYMENT_METHODS;

interface DealerPaymentProps {
  targetOrderId?: string;
  targetOrderNumber?: string;
  targetOrderAmount?: number;
  onNavigateToOrders?: () => void;
  onNavigateToCart?: () => void;
}

const DealerPayment = ({ targetOrderId, targetOrderNumber, targetOrderAmount, onNavigateToOrders, onNavigateToCart }: DealerPaymentProps) => {
  const { user } = useAuth();
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>("card");
  const [walletPhone, setWalletPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"choose" | "pay">("choose");

  const [walletRedirectUrl, setWalletRedirectUrl] = useState<string | null>(null);
  const [kioskBillRef, setKioskBillRef] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // InstaPay
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [receiptSubmitted, setReceiptSubmitted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedMethodData = PAYMENT_METHODS.find((m) => m.id === selectedMethod)!;

  const handlePay = async (orderId: string) => {
    if (selectedMethod === "instapay") { setStep("pay"); return; }
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
        body: { order_id: orderId, payment_method: selectedMethod, wallet_phone: selectedMethod === "wallet" ? walletPhone : undefined, return_url: buildPaymobReturnUrl() },
      });
      if (fnError || !data?.payment_key) { setError(data?.error || "تعذر إنشاء جلسة الدفع."); return; }
      if (selectedMethod === "card" && data.iframe_url) { window.location.href = data.iframe_url; return; }
      else if (selectedMethod === "wallet" && data.wallet_redirect_url) { setWalletRedirectUrl(data.wallet_redirect_url); setStep("pay"); window.location.href = data.wallet_redirect_url; }
      else if (selectedMethod === "wallet") { setStep("pay"); }
      else if (selectedMethod === "kiosk" && data.kiosk_bill_reference) { setKioskBillRef(data.kiosk_bill_reference); setStep("pay"); }
      else { setError("جرب طريقة دفع أخرى."); }
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "حدث خطأ"); }
    finally { setLoading(false); }
  };

  const handleCopy = (text: string, msg: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast({ title: msg });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReceiptSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast({ title: "الحد الأقصى 5 ميجا", variant: "destructive" }); return; }
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
      const { error: uploadErr } = await supabase.storage.from("dealer-documents").upload(filePath, receiptFile, { upsert: true });
      if (uploadErr) throw uploadErr;
      const { error: updateErr } = await supabase.from("orders").update({ payment_method: "instapay", notes: `instapay_receipt: ${filePath}` }).eq("id", targetOrderId).eq("user_id", user.id);
      if (updateErr) throw updateErr;
      setReceiptSubmitted(true);
      toast({ title: "✅ تم رفع الإيصال بنجاح" });
    } catch (e: unknown) { toast({ title: "خطأ في رفع الإيصال", description: e instanceof Error ? e.message : "حدث خطأ غير متوقع", variant: "destructive" }); }
    finally { setUploadingReceipt(false); }
  };

  const handleBack = () => {
    setStep("choose"); setWalletRedirectUrl(null); setKioskBillRef(null);
    setReceiptFile(null); setReceiptPreview(null); setReceiptSubmitted(false); setError(null);
  };

  // ─── Empty State ───
  if (!targetOrderId) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
        <div className="w-20 h-20 rounded-3xl bg-secondary/5 flex items-center justify-center mb-6 border border-border">
          <Package className="w-9 h-9 text-muted-foreground/30" />
        </div>
        <h3 className="text-lg font-bold text-foreground mb-1">لا توجد طلبات لتدفعها</h3>
        <p className="text-sm text-muted-foreground max-w-[280px] mb-5">
          أنشئ طلبية جديدة من <span className="font-bold text-foreground">"طلباتي"</span> أو اختر طلب قائم لبدء الدفع
        </p>
        <div className="flex flex-col gap-2 w-full max-w-[220px]">
          <Button onClick={() => (onNavigateToCart || onNavigateToOrders)?.()} className="gap-2 rounded-xl h-11">
            <Package className="w-4 h-4" />
            ابدأ طلبية جديدة
          </Button>
          <Button variant="outline" onClick={() => onNavigateToOrders?.()} className="gap-2 rounded-xl h-10 text-xs">
            <Inbox className="w-3.5 h-3.5" />
            عرض طلباتي
          </Button>
        </div>
      </div>
    );
  }

  // ─── Step 2: Payment in progress ───
  if (step === "pay") {
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5 max-w-lg mx-auto">
        <button onClick={handleBack} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors group">
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
          رجوع
        </button>

        {/* Mini order bar */}
        {(targetOrderNumber || targetOrderAmount) && (
          <div className="flex items-center justify-between rounded-xl bg-secondary text-secondary-foreground px-4 py-3">
            {targetOrderNumber && <span className="text-xs font-mono opacity-80" dir="ltr">{targetOrderNumber}</span>}
            {targetOrderAmount != null && targetOrderAmount > 0 && (
              <span className="text-sm font-black" dir="ltr">{targetOrderAmount.toLocaleString("ar-EG")} ج.م</span>
            )}
          </div>
        )}


        {/* Wallet */}
        {selectedMethod === "wallet" && (
          <PaymentResultCard icon={Smartphone} iconClass="text-orange-500" title={walletRedirectUrl ? "جاري فتح المحفظة..." : "في انتظار التأكيد"} desc={walletRedirectUrl ? "لو مفتحش تلقائياً:" : "افتح تطبيق المحفظة ووافق على الدفع"}>
            {walletRedirectUrl && (
              <Button asChild size="lg" className="gap-2 rounded-xl w-full">
                <a href={walletRedirectUrl} target="_blank" rel="noopener noreferrer"><Smartphone className="w-4 h-4" />فتح المحفظة</a>
              </Button>
            )}
          </PaymentResultCard>
        )}

        {/* Kiosk */}
        {selectedMethod === "kiosk" && kioskBillRef && (
          <PaymentResultCard icon={Store} iconClass="text-emerald-500" title="رقم فاتورة الدفع" desc="اذهب لأقرب فرع أمان أو مصاري:">
            <div className="flex items-center justify-center gap-3 bg-muted/40 rounded-xl px-5 py-4">
              <span className="text-2xl font-black font-mono text-foreground tracking-[0.15em]" dir="ltr">{kioskBillRef}</span>
              <button onClick={() => handleCopy(kioskBillRef, "تم نسخ رقم الفاتورة")} className="p-2 rounded-lg hover:bg-muted transition-colors">
                {copied ? <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600" /> : <Copy className="w-4.5 h-4.5 text-muted-foreground" />}
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground text-center">صالحة لمدة 24 ساعة</p>
          </PaymentResultCard>
        )}

        {/* InstaPay */}
        {selectedMethod === "instapay" && !receiptSubmitted && (
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              {/* Amount header */}
              <div className="bg-gradient-to-r from-violet-600 to-violet-700 p-5 text-white text-center">
                <p className="text-xs opacity-80 mb-1">المبلغ المطلوب تحويله</p>
                {targetOrderAmount != null && targetOrderAmount > 0 && (
                  <div dir="ltr"><span className="text-3xl font-black">{targetOrderAmount.toLocaleString("ar-EG")}</span><span className="text-sm opacity-70 me-1">ج.م</span></div>
                )}
              </div>
              {/* InstaPay address */}
              <div className="p-5 space-y-4">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-2">حوّل إلى</p>
                  <div className="flex items-center justify-center gap-2 bg-muted/40 rounded-xl px-4 py-3">
                    <span className="text-sm font-black font-mono text-foreground" dir="ltr">{INSTAPAY_ADDRESS}</span>
                    <button onClick={() => handleCopy(INSTAPAY_ADDRESS, "تم النسخ")} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                      {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
                    </button>
                  </div>
                </div>
                <Button asChild className="w-full gap-2 h-12 rounded-xl bg-violet-600 hover:bg-violet-700 text-white">
                  <a href={INSTAPAY_LINK} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4" />
                    فتح InstaPay
                  </a>
                </Button>
              </div>
            </div>

            {/* Receipt upload */}
            <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
              <p className="text-sm font-bold text-foreground flex items-center gap-2">
                <Upload className="w-4 h-4 text-primary" />
                رفع إيصال التحويل
              </p>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleReceiptSelect} className="hidden" />
              {receiptPreview ? (
                <div className="space-y-3">
                  <div className="rounded-xl overflow-hidden border border-border">
                    <img src={receiptPreview} alt="إيصال" className="w-full max-h-48 object-contain bg-muted/10" />
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1 rounded-xl" onClick={() => fileInputRef.current?.click()}>تغيير</Button>
                    <Button size="sm" className="flex-1 rounded-xl gap-1.5" onClick={handleSubmitReceipt} disabled={uploadingReceipt}>
                      {uploadingReceipt ? <><Loader2 className="w-4 h-4 animate-spin" />جاري الرفع...</> : <><CheckCircle2 className="w-4 h-4" />تأكيد</>}
                    </Button>
                  </div>
                </div>
              ) : (
                <button onClick={() => fileInputRef.current?.click()} className="w-full border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-primary/30 transition-all group">
                  <ImageIcon className="w-7 h-7 text-muted-foreground/30 mx-auto mb-2 group-hover:text-primary/40 transition-colors" />
                  <p className="text-sm font-bold text-muted-foreground">اضغط لرفع صورة الإيصال</p>
                  <p className="text-[10px] text-muted-foreground/50 mt-1">PNG, JPG — حد أقصى 5 ميجا</p>
                </button>
              )}
            </div>
          </div>
        )}

        {/* InstaPay success */}
        {selectedMethod === "instapay" && receiptSubmitted && (
          <PaymentResultCard icon={CheckCircle2} iconClass="text-emerald-500" title="تم رفع الإيصال بنجاح!" desc="سيتم مراجعته وتأكيد طلبك قريباً. ستصلك إشعار فور التأكيد." />
        )}

        <SecurityFooter />
      </motion.div>
    );
  }

  // ─── Step 1: Choose payment ───
  return (
    <div className="max-w-lg mx-auto space-y-6">
      {/* Amount Card — dark navy glass */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-secondary p-6 text-secondary-foreground"
      >
        {/* Subtle glow */}
        <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full bg-primary/10 blur-2xl" />

        <div className="relative z-10 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-secondary-foreground/60">
              <ShieldCheck className="w-4 h-4" />
              <span className="text-[11px] font-bold">دفع آمن ومشفّر</span>
            </div>
            <Zap className="w-4 h-4 text-primary" />
          </div>

          {targetOrderNumber && (
            <p className="text-xs text-secondary-foreground/50 font-mono" dir="ltr">{targetOrderNumber}</p>
          )}

          {targetOrderAmount != null && targetOrderAmount > 0 && (
            <div>
              <p className="text-[11px] text-secondary-foreground/40 mb-1">المطلوب</p>
              <div className="flex items-baseline gap-2" dir="ltr">
                <span className="text-4xl font-black tracking-tight">{targetOrderAmount.toLocaleString("ar-EG")}</span>
                <span className="text-base text-secondary-foreground/50">ج.م</span>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="flex items-start gap-3 p-4 rounded-xl bg-destructive/5 border border-destructive/10">
            <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-destructive font-bold">{error}</p>
              <button onClick={() => setError(null)} className="text-xs text-muted-foreground underline mt-1">إغلاق</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Payment Methods — Grid */}
      <div className="space-y-3">
        <p className="text-xs font-bold text-muted-foreground">اختر طريقة الدفع</p>
        <div className="grid grid-cols-2 gap-3">
          {PAYMENT_METHODS.map((method, i) => {
            const Icon = method.icon;
            const isSelected = selectedMethod === method.id;
            return (
              <motion.button
                key={method.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => setSelectedMethod(method.id)}
                className={`relative text-end p-4 rounded-2xl border-2 transition-all duration-200 ${
                  isSelected
                    ? "border-primary bg-primary/[0.04] shadow-sm"
                    : "border-border/60 bg-card hover:border-border"
                }`}
              >
                {/* Selection indicator */}
                {isSelected && (
                  <motion.div
                    layoutId="payment-check"
                    className="absolute top-3 left-3 w-5 h-5 rounded-full bg-primary flex items-center justify-center"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-primary-foreground" />
                  </motion.div>
                )}

                <div className={`w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center mb-3 ${method.id === "instapay" ? "" : method.iconBg}`}>
                  {method.id === "instapay" ? (
                    <img src={instapayLogo} alt="InstaPay" className="w-10 h-10 object-contain" />
                  ) : (
                    <Icon className="w-5 h-5 text-white" />
                  )}
                </div>
                <p className="font-bold text-sm text-foreground leading-tight">{method.label}</p>
                {method.id === "card" ? (
                  <div className="flex items-center gap-1 mt-1.5">
                    <img src={visaLogo} alt="Visa" className="h-4 w-auto object-contain" loading="lazy" />
                    <img src={mastercardLogo} alt="Mastercard" className="h-4 w-auto object-contain" loading="lazy" />
                    <img src={meezaLogo} alt="Meeza" className="h-4 w-auto object-contain" loading="lazy" />
                  </div>
                ) : (
                  <p className="text-[10px] text-muted-foreground mt-1 leading-tight">{method.desc}</p>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Wallet phone input */}
      <AnimatePresence>
        {selectedMethod === "wallet" && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="bg-card border border-border rounded-2xl p-4 space-y-2.5">
              <label className="block text-xs font-bold text-foreground">رقم المحفظة</label>
              <Input type="tel" placeholder="01xxxxxxxxx" value={walletPhone} onChange={(e) => setWalletPhone(e.target.value)} dir="ltr" className="text-base font-mono h-12 rounded-xl" maxLength={11} inputMode="tel" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CTA */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Button
          className="w-full h-14 gap-2.5 text-base font-black rounded-2xl shadow-lg shadow-primary/15 active:scale-[0.98] transition-all"
          disabled={loading}
          onClick={() => handlePay(targetOrderId)}
        >
          {loading ? (
            <><Loader2 className="w-5 h-5 animate-spin" />جاري التجهيز...</>
          ) : (
            <>
              <Lock className="w-4 h-4" />
              {selectedMethod === "instapay" ? "متابعة التحويل" : "ادفع الآن"}
              {targetOrderAmount != null && targetOrderAmount > 0 && (
                <span className="text-primary-foreground/60 text-sm font-normal me-1">
                  ({targetOrderAmount.toLocaleString("ar-EG")} ج.م)
                </span>
              )}
            </>
          )}
        </Button>
      </motion.div>

      <SecurityFooter />
    </div>
  );
};

// ─── Shared Components ───

const PaymentResultCard = ({ icon: Icon, iconClass, title, desc, children }: {
  icon: typeof CreditCard; iconClass: string; title: string; desc: string; children?: React.ReactNode;
}) => (
  <div className="bg-card border border-border rounded-2xl p-6 text-center space-y-4">
    <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto">
      <Icon className={`w-7 h-7 ${iconClass}`} />
    </div>
    <div>
      <h3 className="text-base font-black text-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1.5">{desc}</p>
    </div>
    {children}
  </div>
);

const SecurityFooter = () => (
  <div className="flex items-center justify-center gap-1.5 pt-2 pb-1">
    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600/70" />
    <span className="text-[10px] text-muted-foreground/60">Powered by Paymob — بوابة دفع معتمدة</span>
  </div>
);

export default DealerPayment;
