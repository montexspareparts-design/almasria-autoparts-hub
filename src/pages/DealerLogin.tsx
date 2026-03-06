import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Phone, ShieldCheck, ArrowRight, Loader2, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const DealerLogin = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  const formatPhone = (raw: string) => {
    const cleaned = raw.replace(/\D/g, "");
    if (cleaned.startsWith("0")) return `+2${cleaned}`;
    if (cleaned.startsWith("2")) return `+${cleaned}`;
    if (cleaned.startsWith("+")) return cleaned;
    return `+2${cleaned}`;
  };

  const handleSendOTP = async () => {
    if (!phone || phone.length < 10) {
      toast({ title: "أدخل رقم هاتف صحيح", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const formattedPhone = formatPhone(phone);

      const { error } = await supabase.auth.signInWithOtp({
        phone: formattedPhone,
      });

      if (error) throw error;

      toast({ title: "تم إرسال كود التحقق ✅", description: `تم إرسال كود على ${formattedPhone}` });
      setStep("otp");
    } catch (err: any) {
      console.error(err);
      toast({ title: "حدث خطأ", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otp.length < 6) {
      toast({ title: "أدخل الكود المكون من 6 أرقام", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const formattedPhone = formatPhone(phone);

      const { data, error } = await supabase.auth.verifyOtp({
        phone: formattedPhone,
        token: otp,
        type: "sms",
      });

      if (error) throw error;

      if (data.session) {
        // Check if dealer account exists
        const { data: dealer } = await supabase
          .from("dealer_accounts")
          .select("id, is_active")
          .eq("user_id", data.session.user.id)
          .eq("is_active", true)
          .maybeSingle();

        if (dealer) {
          toast({ title: "مرحباً بك! ✅", description: "تم تسجيل الدخول بنجاح" });
          navigate("/products/toyota-genuine");
        } else {
          toast({
            title: "الحساب غير مفعّل",
            description: "رقم الهاتف هذا غير مسجل كتاجر معتمد. تواصل مع الإدارة.",
            variant: "destructive",
          });
          await supabase.auth.signOut();
        }
      }
    } catch (err: any) {
      console.error(err);
      toast({ title: "كود غير صحيح", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-20">
        <div className="container mx-auto px-4 max-w-md">
          <Link to="/#products" className="inline-flex items-center gap-1 text-sm text-primary hover:underline mb-8">
            <ArrowRight className="w-4 h-4" />
            العودة
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-border rounded-xl p-8"
          >
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShieldCheck className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-2xl font-black text-card-foreground mb-2">دخول التجار</h1>
              <p className="text-muted-foreground text-sm">
                أدخل رقم هاتفك المسجل لتلقي كود التحقق
              </p>
            </div>

            {step === "phone" ? (
              <div className="space-y-5">
                <div>
                  <Label className="mb-2 block">رقم الهاتف</Label>
                  <div className="relative">
                    <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="01xxxxxxxxx"
                      className="pr-10"
                      dir="ltr"
                      type="tel"
                    />
                  </div>
                </div>

                <Button className="w-full" size="lg" onClick={handleSendOTP} disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      جاري الإرسال...
                    </>
                  ) : (
                    "إرسال كود التحقق"
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="text-center">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                    <KeyRound className="w-6 h-6 text-primary" />
                  </div>
                  <p className="text-sm text-muted-foreground mb-1">
                    تم إرسال كود التحقق إلى
                  </p>
                  <p className="font-bold text-card-foreground dir-ltr">{formatPhone(phone)}</p>
                </div>

                <div className="flex justify-center" dir="ltr">
                  <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>

                <Button className="w-full" size="lg" onClick={handleVerifyOTP} disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      جاري التحقق...
                    </>
                  ) : (
                    "تأكيد الكود"
                  )}
                </Button>

                <button
                  onClick={() => { setStep("phone"); setOtp(""); }}
                  className="text-sm text-primary hover:underline w-full text-center block"
                >
                  تغيير رقم الهاتف
                </button>

                <button
                  onClick={handleSendOTP}
                  className="text-sm text-muted-foreground hover:text-foreground w-full text-center block"
                  disabled={loading}
                >
                  إعادة إرسال الكود
                </button>
              </div>
            )}

            <div className="mt-8 pt-6 border-t border-border text-center">
              <p className="text-sm text-muted-foreground mb-3">ليس لديك حساب تاجر؟</p>
              <Button variant="outline" size="sm" asChild>
                <Link to="/dealer-apply">تقديم طلب اعتماد تاجر</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default DealerLogin;
