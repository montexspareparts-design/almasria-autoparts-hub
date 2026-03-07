import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff } from "lucide-react";

type AuthMethod = "phone" | "email";

type ForgotStep = "input" | "otp" | "new-password";

interface ForgotPasswordFormProps {
  authMethod: AuthMethod;
  phone: string;
  setPhone: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  onBack: () => void;
}

const ForgotPasswordForm = ({ authMethod, phone, setPhone, email, setEmail, onBack }: ForgotPasswordFormProps) => {
  const [step, setStep] = useState<ForgotStep>("input");
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Email flow: send reset link
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
        title: "تم إرسال رابط إعادة التعيين",
        description: "تحقق من بريدك الإلكتروني لإعادة تعيين كلمة المرور",
      });
      onBack();
    }
    setLoading(false);
  };

  // Phone flow: send OTP
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-otp", {
        body: { phone: phone.trim() },
      });
      if (error) throw error;
      if (data?.error) {
        toast({ title: "خطأ", description: data.error, variant: "destructive" });
      } else {
        toast({ title: "تم إرسال كود التحقق", description: "تحقق من رسائل هاتفك" });
        setStep("otp");
      }
    } catch (err: any) {
      toast({ title: "خطأ في إرسال الكود", description: err.message, variant: "destructive" });
    }
    setLoading(false);
  };

  // Phone flow: verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode.trim()) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-otp", {
        body: { phone: phone.trim(), code: otpCode.trim() },
      });
      if (error) throw error;
      if (data?.valid) {
        toast({ title: "تم التحقق بنجاح" });
        setStep("new-password");
      } else {
        toast({ title: "كود غير صحيح", description: data?.error || "حاول مرة أخرى", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    }
    setLoading(false);
  };

  // Phone flow: set new password
  const handleSetNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast({ title: "كلمة المرور غير متطابقة", variant: "destructive" });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: "كلمة المرور يجب أن تكون 6 أحرف على الأقل", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("reset-password-by-phone", {
        body: { phone: phone.trim(), code: otpCode.trim(), new_password: newPassword },
      });
      if (error) throw error;
      if (data?.success) {
        toast({ title: "تم تغيير كلمة المرور بنجاح", description: "يمكنك الآن تسجيل الدخول" });
        onBack();
      } else {
        toast({ title: "خطأ", description: data?.error || "فشل تحديث كلمة المرور", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    }
    setLoading(false);
  };

  // Email method: simple form
  if (authMethod === "email") {
    return (
      <form onSubmit={handleEmailReset} className="space-y-4">
        <p className="text-sm text-muted-foreground text-center mb-2">
          أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة تعيين كلمة المرور
        </p>
        <div className="space-y-2">
          <Label htmlFor="forgot-email" className="text-card-foreground">البريد الإلكتروني</Label>
          <Input id="forgot-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="example@email.com" required dir="ltr" className="bg-background" />
        </div>
        <Button type="submit" className="w-full red-glow" disabled={loading}>
          {loading ? "جاري الإرسال..." : "إرسال رابط إعادة التعيين"}
        </Button>
        <button type="button" onClick={onBack} className="text-sm text-primary hover:underline w-full text-center">
          العودة لتسجيل الدخول
        </button>
      </form>
    );
  }

  // Phone method: multi-step
  if (step === "input") {
    return (
      <form onSubmit={handleSendOtp} className="space-y-4">
        <p className="text-sm text-muted-foreground text-center mb-2">
          أدخل رقم هاتفك وسنرسل لك كود تحقق عبر SMS
        </p>
        <div className="space-y-2">
          <Label htmlFor="forgot-phone" className="text-card-foreground">رقم الهاتف</Label>
          <Input id="forgot-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01xxxxxxxxx" required dir="ltr" className="bg-background" />
        </div>
        <Button type="submit" className="w-full red-glow" disabled={loading}>
          {loading ? "جاري الإرسال..." : "إرسال كود التحقق"}
        </Button>
        <button type="button" onClick={onBack} className="text-sm text-primary hover:underline w-full text-center">
          العودة لتسجيل الدخول
        </button>
      </form>
    );
  }

  if (step === "otp") {
    return (
      <form onSubmit={handleVerifyOtp} className="space-y-4">
        <p className="text-sm text-muted-foreground text-center mb-2">
          أدخل كود التحقق المرسل إلى <span className="font-bold text-foreground" dir="ltr">{phone}</span>
        </p>
        <div className="space-y-2">
          <Label htmlFor="otp-code" className="text-card-foreground">كود التحقق</Label>
          <Input
            id="otp-code"
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={otpCode}
            onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
            placeholder="000000"
            required
            dir="ltr"
            className="bg-background text-center text-2xl tracking-[0.5em] font-mono"
          />
        </div>
        <Button type="submit" className="w-full red-glow" disabled={loading || otpCode.length !== 6}>
          {loading ? "جاري التحقق..." : "تحقق من الكود"}
        </Button>
        <button type="button" onClick={() => setStep("input")} className="text-sm text-primary hover:underline w-full text-center">
          إعادة إرسال الكود
        </button>
      </form>
    );
  }

  // step === "new-password"
  return (
    <form onSubmit={handleSetNewPassword} className="space-y-4">
      <p className="text-sm text-muted-foreground text-center mb-2">
        أدخل كلمة المرور الجديدة
      </p>
      <div className="space-y-2">
        <Label htmlFor="new-password" className="text-card-foreground">كلمة المرور الجديدة</Label>
        <div className="relative">
          <Input
            id="new-password"
            type={showPassword ? "text" : "password"}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="أدخل كلمة المرور الجديدة"
            required
            minLength={6}
            dir="ltr"
            className="bg-background pl-10"
          />
          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm-password" className="text-card-foreground">تأكيد كلمة المرور</Label>
        <Input
          id="confirm-password"
          type={showPassword ? "text" : "password"}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="أعد إدخال كلمة المرور"
          required
          minLength={6}
          dir="ltr"
          className="bg-background"
        />
      </div>
      <Button type="submit" className="w-full red-glow" disabled={loading}>
        {loading ? "جاري التحديث..." : "تغيير كلمة المرور"}
      </Button>
    </form>
  );
};

export default ForgotPasswordForm;
