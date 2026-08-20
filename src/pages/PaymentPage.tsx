import { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  CreditCard, ShieldCheck, Loader2, Package, XCircle, ArrowRight, Lock, BadgeCheck, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AuthorizedDistributorBadges from "@/components/AuthorizedDistributorBadges";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { buildPaymobReturnUrl } from "@/lib/payment-return";
import GeideaCheckout from "@/components/GeideaCheckout";

const STEPS = ["السلة", "بيانات الشحن", "الدفع", "التأكيد"];

const PaymentPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const orderId = searchParams.get("order_id");
  const amount = searchParams.get("amount");

  const [error, setError] = useState<string | null>(null);
  const [orderInfo, setOrderInfo] = useState<{ orderNumber: string; amountCents: number } | null>(null);

  useEffect(() => {
    if (authLoading) return;
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

      {/* ===== Luxury header ===== */}
      <header className="relative pt-24 md:pt-28 pb-24 md:pb-32 overflow-hidden bg-hero-gradient">
        <div className="absolute inset-0 bg-red-glow opacity-40 pointer-events-none" />
        <div
          className="absolute inset-0 opacity-[0.06] pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(hsl(var(--gold)/0.6) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--gold)/0.6) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            maskImage: "radial-gradient(circle at 50% 0%, black, transparent 70%)",
            WebkitMaskImage: "radial-gradient(circle at 50% 0%, black, transparent 70%)",
          }}
        />
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gold/70 to-transparent" />

        <div className="relative container mx-auto px-4 max-w-3xl text-center">
          <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-white/5 backdrop-blur-md px-3.5 py-1.5 mb-5">
              <Lock className="w-3.5 h-3.5 text-gold" />
              <span className="text-[11px] font-bold tracking-wide text-white/80">اتصال مشفّر • PCI DSS</span>
            </div>

            <div className="relative w-16 h-16 md:w-20 md:h-20 mx-auto mb-5">
              <div className="absolute inset-0 rounded-3xl bg-primary/20 blur-xl" />
              <div className="relative w-full h-full rounded-3xl bg-white/[0.06] border border-gold/30 backdrop-blur-xl flex items-center justify-center shadow-red-glow">
                <CreditCard className="w-8 h-8 md:w-9 md:h-9 text-gold" />
              </div>
            </div>

            <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white">إتمام الدفع</h1>
            <div className="mx-auto mt-4 h-px w-24 bg-gradient-to-r from-transparent via-gold to-transparent" />
            <p className="text-xs md:text-sm text-white/55 mt-4">
              معاملة مؤمّنة بالكامل عبر بوابة <span className="text-gold/90 font-bold">جيديا</span>
            </p>

            {/* Stepper */}
            <ol className="mt-8 flex items-center justify-center gap-2 sm:gap-3">
              {STEPS.map((label, i) => {
                const active = i === 2;
                const done = i < 2;
                return (
                  <li key={label} className="flex items-center gap-2 sm:gap-3">
                    <div className="flex flex-col items-center gap-1.5">
                      <span
                        className={`w-7 h-7 rounded-full grid place-items-center text-[11px] font-black border transition-colors ${
                          active
                            ? "bg-gold text-background border-gold shadow-[0_0_18px_hsl(var(--gold)/0.55)]"
                            : done
                              ? "bg-white/10 text-gold border-gold/40"
                              : "bg-white/5 text-white/35 border-white/10"
                        }`}
                      >
                        {done ? "✓" : i + 1}
                      </span>
                      <span className={`text-[10px] font-bold ${active ? "text-gold" : "text-white/40"}`}>{label}</span>
                    </div>
                    {i < STEPS.length - 1 && <span className="w-5 sm:w-10 h-px bg-white/15 mb-4" />}
                  </li>
                );
              })}
            </ol>

            <div className="mt-7 flex justify-center">
              <AuthorizedDistributorBadges variant="compact" />
            </div>
          </motion.div>
        </div>
      </header>

      {/* ===== Body ===== */}
      <main className="flex-1 pb-12 md:pb-20 -mt-16 md:-mt-20">
        <div className="container mx-auto px-3 sm:px-4 max-w-2xl">
          {/* Order ticket */}
          {(orderInfo?.orderNumber || displayAmount) && (
            <motion.section
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.45 }}
              className="relative bg-card border border-border/80 rounded-[22px] shadow-2xl overflow-hidden"
            >
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/70 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-br from-gold/[0.05] via-transparent to-primary/[0.05] pointer-events-none" />

              <div className="relative p-5 sm:p-7">
                <div className="flex items-center gap-2.5 mb-5">
                  <div className="w-9 h-9 rounded-xl bg-gold/10 border border-gold/25 grid place-items-center">
                    <Package className="w-4 h-4 text-gold" />
                  </div>
                  <div>
                    <h2 className="font-black text-sm sm:text-base text-foreground leading-tight">تفاصيل الطلب</h2>
                    <p className="text-[10px] text-muted-foreground">مراجعة أخيرة قبل الدفع</p>
                  </div>
                </div>

                {orderInfo?.orderNumber && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground text-xs sm:text-sm">رقم الطلب</span>
                    <span className="font-bold font-mono text-foreground text-xs sm:text-sm bg-muted px-3 py-1.5 rounded-lg border border-border" dir="ltr">
                      {orderInfo.orderNumber}
                    </span>
                  </div>
                )}

                {/* Perforated divider */}
                <div className="relative my-5 flex items-center">
                  <span className="absolute -right-9 w-6 h-6 rounded-full bg-background border border-border" />
                  <span className="absolute -left-9 w-6 h-6 rounded-full bg-background border border-border" />
                  <div className="flex-1 border-t border-dashed border-border" />
                </div>

                {displayAmount && (
                  <div className="flex justify-between items-end">
                    <div>
                      <span className="text-muted-foreground text-xs sm:text-sm block">المبلغ المطلوب</span>
                      <span className="text-[10px] text-muted-foreground/70">شامل الشحن</span>
                    </div>
                    <span className="text-3xl sm:text-4xl font-black text-primary leading-none tracking-tight">
                      {displayAmount}
                      <span className="text-xs font-bold text-muted-foreground mr-1.5">ج.م</span>
                    </span>
                  </div>
                )}
              </div>
            </motion.section>
          )}

          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-destructive/5 border border-destructive/25 rounded-2xl p-4 sm:p-5 mt-4"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-destructive/10 grid place-items-center shrink-0">
                  <XCircle className="w-5 h-5 text-destructive" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm sm:text-base text-foreground">تعذر إتمام الدفع</p>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">{error}</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Payment panel */}
          {!error && orderId && (
            <motion.section
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.45 }}
              className="relative mt-4 md:mt-5 bg-card border border-border/80 rounded-[22px] p-5 sm:p-7 shadow-2xl overflow-hidden"
            >
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.05] to-transparent pointer-events-none" />

              <div className="relative">
                <div className="flex items-center gap-3 sm:gap-4 mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/25 grid place-items-center shrink-0">
                    <ShieldCheck className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-sm sm:text-base text-foreground">الدفع بالفيزا أو المحفظة</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">
                      Visa · Mastercard · Meeza · محافظ إلكترونية
                    </p>
                  </div>
                  <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold/10 px-2.5 py-1 text-[10px] font-bold text-gold">
                    <BadgeCheck className="w-3 h-3" /> موثّق
                  </span>
                </div>

                <GeideaCheckout orderId={orderId} currency="EGP" returnUrl={buildPaymobReturnUrl()} />

                <p className="mt-4 text-center text-[10px] text-muted-foreground leading-relaxed">
                  بياناتك البنكية لا تُخزَّن لدينا نهائيًا — تُعالَج مباشرة داخل بوابة الدفع.
                </p>
              </div>
            </motion.section>
          )}

          {/* Trust strip */}
          <div className="mt-5 grid grid-cols-3 gap-2.5 text-center">
            {[
              { icon: Lock, label: "تشفير كامل", sub: "SSL 256-bit" },
              { icon: CreditCard, label: "كل وسائل الدفع", sub: "فيزا ومحافظ" },
              { icon: Zap, label: "تأكيد فوري", sub: "خلال ثوانٍ" },
            ].map(({ icon: Icon, label, sub }) => (
              <div
                key={label}
                className="relative bg-card/70 border border-border rounded-2xl py-4 px-2 overflow-hidden"
              >
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent" />
                <Icon className="w-4 h-4 mx-auto text-gold mb-2" />
                <span className="block text-[11px] font-bold text-foreground">{label}</span>
                <span className="block text-[9px] text-muted-foreground mt-0.5">{sub}</span>
              </div>
            ))}
          </div>

          <div className="text-center mt-6 pb-2">
            <Button variant="ghost" size="sm" asChild className="gap-2 text-muted-foreground text-xs sm:text-sm">
              <Link to="/">
                <ArrowRight className="w-4 h-4" />
                العودة للرئيسية
              </Link>
            </Button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PaymentPage;
