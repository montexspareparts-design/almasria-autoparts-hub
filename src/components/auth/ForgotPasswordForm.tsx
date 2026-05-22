import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useToast } from "@/hooks/use-toast";
import { Mail, Phone, Loader2, KeyRound, Eye, EyeOff, ArrowRight, MessageCircle } from "lucide-react";
import { normalizePhoneDigits } from "@/lib/phoneAuth";

type ResetMethod = "email" | "phone" | "whatsapp";
type PhoneStep = "phone" | "otp" | "new-password";
type EmailStep = "email" | "otp" | "new-password";

interface ForgotPasswordFormProps {
  onBack: () => void;
  initialMethod?: "phone" | "email";
}

const ForgotPasswordForm = ({ onBack, initialMethod }: ForgotPasswordFormProps) => {
  // Lock the flow when user arrived from a specific login method (no method picker)
  const lockedToPhone = initialMethod === "phone";
  const lockedToEmail = initialMethod === "email";
  const [method, setMethod] = useState<ResetMethod | null>(
    lockedToPhone ? "whatsapp" : lockedToEmail ? "email" : null
  );
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [phoneStep, setPhoneStep] = useState<PhoneStep>("phone");
  const [emailStep, setEmailStep] = useState<EmailStep>("email");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleEmailReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } else {
      toast({
        title: "تم إرسال رابط إعادة التعيين ✅",
        description: "تحقق من بريدك الإلكتروني لإعادة تعيين كلمة المرور",
      });
      onBack();
    }
    setLoading(false);
  };

  const formatPhone = (raw: string) => {
    let cleaned = normalizePhoneDigits(raw);
    // Handle international prefix 002 or 0020
    if (cleaned.startsWith("002")) {
      cleaned = cleaned.substring(2); // Remove leading "00", keep "20..."
    }
    if (cleaned.startsWith("20") && cleaned.length >= 11) return `+${cleaned}`;
    if (cleaned.startsWith("0")) return `+20${cleaned.substring(1)}`;
    return `+20${cleaned}`;
  };

  const handleSendOTP = async (channel: "sms" | "whatsapp" = method === "whatsapp" ? "whatsapp" : "sms") => {
    if (!phone || phone.length < 10) {
      toast({ title: "أدخل رقم هاتف صحيح", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const formattedPhone = formatPhone(phone);
      // Verify the phone is actually registered before sending OTP
      const { data: isRegistered, error: checkErr } = await supabase.rpc(
        "phone_already_registered",
        { _phone: formattedPhone }
      );
      if (checkErr) throw checkErr;
      if (!isRegistered) {
        toast({
          title: "الرقم غير مسجل",
          description: "مفيش حساب مسجل بالرقم ده. تأكد من الرقم أو أنشئ حساب جديد.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
      const { data, error } = await supabase.functions.invoke("send-otp", {
        body: { phone: formattedPhone, channel },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const channelName = channel === "whatsapp" ? "واتساب" : "SMS";
      toast({ title: `تم إرسال كود التحقق عبر ${channelName} ✅`, description: `تم إرسال كود على ${formattedPhone}` });
      setPhoneStep("otp");
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndReset = async () => {
    if (otp.length < 6) {
      toast({ title: "أدخل الكود المكون من 6 أرقام", variant: "destructive" });
      return;
    }
    setPhoneStep("new-password");
  };

  const handleSetNewPassword = async () => {
    if (newPassword.length < 6) {
      toast({ title: "كلمة المرور قصيرة", description: "يجب أن تكون 6 أحرف على الأقل", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "كلمة المرور غير متطابقة", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const formattedPhone = formatPhone(phone);
      const { data, error } = await supabase.functions.invoke("reset-password-by-phone", {
        body: { phone: formattedPhone, code: otp, new_password: newPassword },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "حدث خطأ");
      toast({ title: "تم تغيير كلمة المرور بنجاح ✅" });
      onBack();
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Method selection screen
  if (!method) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground text-center mb-4">
          اختر طريقة استرجاع كلمة المرور
        </p>
        <button
          onClick={() => setMethod("email")}
          className="w-full flex items-center gap-3 p-4 rounded-lg border border-border bg-background hover:bg-accent/50 transition-colors text-right"
        >
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Mail className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-card-foreground text-sm">عبر البريد الإلكتروني</p>
            <p className="text-xs text-muted-foreground">سنرسل رابط إعادة تعيين لبريدك</p>
          </div>
        </button>
        <button
          onClick={() => setMethod("phone")}
          className="w-full flex items-center gap-3 p-4 rounded-lg border border-border bg-background hover:bg-accent/50 transition-colors text-right"
        >
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Phone className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-card-foreground text-sm">عبر SMS</p>
            <p className="text-xs text-muted-foreground">سنرسل كود تحقق SMS على رقمك</p>
          </div>
        </button>
        <button
          onClick={() => setMethod("whatsapp")}
          className="w-full flex items-center gap-3 p-4 rounded-lg border border-border bg-background hover:bg-accent/50 transition-colors text-right"
        >
          <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
            <MessageCircle className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="font-semibold text-card-foreground text-sm">عبر واتساب</p>
            <p className="text-xs text-muted-foreground">سنرسل كود تحقق على واتساب</p>
          </div>
        </button>
        <button type="button" onClick={onBack} className="text-sm text-primary hover:underline w-full text-center mt-2">
          العودة لتسجيل الدخول
        </button>
      </div>
    );
  }

  // Email method
  if (method === "email") {
    return (
      <form onSubmit={handleEmailReset} className="space-y-4">
        {!lockedToEmail && (
          <button type="button" onClick={() => setMethod(null)} className="flex items-center gap-1 text-sm text-primary hover:underline">
            <ArrowRight className="w-3 h-3" />
            تغيير الطريقة
          </button>
        )}
        <p className="text-sm text-muted-foreground text-center">
          أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة تعيين كلمة المرور
        </p>
        <div className="space-y-2">
          <Label htmlFor="forgot-email" className="text-card-foreground">البريد الإلكتروني</Label>
          <div className="relative">
            <Input
              id="forgot-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
              required
              dir="ltr"
              className="bg-background pl-10"
            />
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          </div>
        </div>
        <Button type="submit" className="w-full red-glow" disabled={loading}>
          {loading ? <><Loader2 className="w-4 h-4 animate-spin ml-2" />جاري الإرسال...</> : "إرسال رابط إعادة التعيين"}
        </Button>
        <button type="button" onClick={onBack} className="text-sm text-primary hover:underline w-full text-center">
          العودة لتسجيل الدخول
        </button>
      </form>
    );
  }

  // Phone / WhatsApp method
  return (
    <div className="space-y-4">
      {!lockedToPhone && (
        <button type="button" onClick={() => { setMethod(null); setPhoneStep("phone"); setOtp(""); }} className="flex items-center gap-1 text-sm text-primary hover:underline">
          <ArrowRight className="w-3 h-3" />
          تغيير الطريقة
        </button>
      )}

      {phoneStep === "phone" && (
        <>
          <p className="text-sm text-muted-foreground text-center">
            أدخل رقم هاتفك المسجل وسنرسل لك كود تحقق {method === "whatsapp" ? "عبر واتساب" : "عبر SMS"}
          </p>
          <div className="space-y-2">
            <Label className="text-card-foreground">رقم الهاتف</Label>
            <div className="relative">
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="01xxxxxxxxx"
                dir="ltr"
                type="tel"
                className="bg-background pl-10"
              />
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            </div>
          </div>
          <Button className="w-full red-glow" onClick={() => handleSendOTP()} disabled={loading}>
            {loading ? <><Loader2 className="w-4 h-4 animate-spin ml-2" />جاري الإرسال...</> : `إرسال كود التحقق ${method === "whatsapp" ? "عبر واتساب" : ""}`}
          </Button>
        </>
      )}

      {phoneStep === "otp" && (
        <>
          <div className="text-center">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
              <KeyRound className="w-6 h-6 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground mb-1">تم إرسال كود التحقق إلى</p>
            <p className="font-bold text-card-foreground" dir="ltr">{formatPhone(phone)}</p>
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
          <Button className="w-full red-glow" onClick={handleVerifyAndReset} disabled={loading || otp.length < 6}>
            تأكيد الكود
          </Button>
          <button onClick={() => { setPhoneStep("phone"); setOtp(""); }} className="text-sm text-muted-foreground hover:text-foreground w-full text-center block">
            تغيير رقم الهاتف
          </button>
          <button onClick={() => handleSendOTP()} className="text-sm text-muted-foreground hover:text-foreground w-full text-center block" disabled={loading}>
            إعادة إرسال الكود
          </button>
        </>
      )}

      {phoneStep === "new-password" && (
        <>
          <p className="text-sm text-muted-foreground text-center">أدخل كلمة المرور الجديدة</p>
          <div className="space-y-2">
            <Label className="text-card-foreground">كلمة المرور الجديدة</Label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="6 أحرف على الأقل"
                dir="ltr"
                className="bg-background pl-10"
                minLength={6}
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-card-foreground">تأكيد كلمة المرور</Label>
            <Input
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="أعد إدخال كلمة المرور"
              dir="ltr"
              className="bg-background"
              minLength={6}
            />
          </div>
          <Button className="w-full red-glow" onClick={handleSetNewPassword} disabled={loading}>
            {loading ? <><Loader2 className="w-4 h-4 animate-spin ml-2" />جاري التحديث...</> : "تحديث كلمة المرور"}
          </Button>
        </>
      )}

      <button type="button" onClick={onBack} className="text-sm text-primary hover:underline w-full text-center">
        العودة لتسجيل الدخول
      </button>
    </div>
  );
};

export default ForgotPasswordForm;
