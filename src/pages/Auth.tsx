import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Phone, Mail, User, MapPin, ArrowLeft } from "lucide-react";
import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";

type AuthMethod = "phone" | "email";
type AuthMode = "login" | "register";
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 60_000;

const Auth = () => {
  const [mode, setMode] = useState<AuthMode>("login");
  const [authMethod, setAuthMethod] = useState<AuthMethod>("phone");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [address, setAddress] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const isLogin = mode === "login";
  const phoneToEmail = (p: string) => `${p.replace(/\D/g, "")}@phone.almasria.app`;
  const getAuthEmail = () => authMethod === "email" ? email.trim() : phoneToEmail(phone);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLogin && lockedUntil && Date.now() < lockedUntil) {
      toast({ title: "تم تجاوز عدد المحاولات", description: `انتظر ${Math.ceil((lockedUntil - Date.now()) / 1000)} ثانية`, variant: "destructive" });
      return;
    }
    setLoading(true);
    const authEmail = getAuthEmail();

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email: authEmail, password });
      if (error) {
        const attempts = loginAttempts + 1;
        setLoginAttempts(attempts);
        if (attempts >= MAX_LOGIN_ATTEMPTS) {
          setLockedUntil(Date.now() + LOCKOUT_DURATION);
          setLoginAttempts(0);
          toast({ title: "تم قفل تسجيل الدخول مؤقتاً", variant: "destructive" });
        } else {
          toast({ title: "بيانات غير صحيحة", description: authMethod === "phone" ? "رقم الهاتف أو كلمة المرور خطأ" : "البريد أو كلمة المرور خطأ", variant: "destructive" });
        }
      } else {
        setLoginAttempts(0); setLockedUntil(null);
        toast({ title: "تم تسجيل الدخول بنجاح ✅" });
        navigate("/");
      }
    } else {
      const { error } = await supabase.auth.signUp({
        email: authEmail, password,
        options: { data: { full_name: fullName, phone: authMethod === "phone" ? phone : "", address, email: authMethod === "email" ? email : "" } },
      });
      if (error) {
        toast({ title: error.message.includes("already registered") ? "الحساب مسجل بالفعل" : "خطأ", description: error.message.includes("already registered") ? "سجّل دخول بدلاً من ذلك" : error.message, variant: "destructive" });
      } else {
        toast({ title: "تم إنشاء الحساب ✅", description: "يمكنك تسجيل الدخول الآن" });
        setMode("login");
      }
    }
    setLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    const { error } = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (error) toast({ title: "خطأ في تسجيل الدخول بجوجل", description: String(error), variant: "destructive" });
    setGoogleLoading(false);
  };

  return (
    <div className="min-h-screen bg-foreground flex flex-col items-center justify-center px-4 py-8" dir="rtl">
      <div className="w-full max-w-[420px]">

        {/* Header */}
        <div className="text-center mb-6">
          <Link to="/" className="inline-block mb-3">
            <span className="text-xl font-black text-primary-foreground">المصرية <span className="text-primary">جروب</span></span>
          </Link>
          <h1 className="text-xl font-black text-primary-foreground">
            {forgotMode ? "استعادة كلمة المرور" : isLogin ? "تسجيل الدخول" : "إنشاء حساب جديد"}
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            {forgotMode ? "استعد الوصول لحسابك" : isLogin ? "ادخل بياناتك للوصول لحسابك" : "أنشئ حسابك لتتمكن من الطلب والمتابعة"}
          </p>
        </div>

        {/* Card */}
        <div className="bg-card border border-border/50 rounded-xl p-5 shadow-sm">

          {!forgotMode && (
            <>
              {/* Google */}
              <Button variant="outline" className="w-full gap-2.5 h-11 text-sm font-medium mb-4" onClick={handleGoogleSignIn} disabled={googleLoading}>
                {googleLoading ? "جاري التحميل..." : (
                  <>
                    <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                    تسجيل الدخول بحساب جوجل
                  </>
                )}
              </Button>

              <div className="relative mb-4">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border/50" /></div>
                <div className="relative flex justify-center text-[10px]"><span className="bg-card px-2 text-muted-foreground">أو</span></div>
              </div>

              {/* Auth Method Toggle */}
              <div className="flex gap-2 mb-4">
                <Button type="button" size="sm" variant={authMethod === "phone" ? "default" : "outline"} className="flex-1 gap-1.5 text-xs h-9" onClick={() => setAuthMethod("phone")}>
                  <Phone className="w-3.5 h-3.5" /> رقم الهاتف
                </Button>
                <Button type="button" size="sm" variant={authMethod === "email" ? "default" : "outline"} className="flex-1 gap-1.5 text-xs h-9" onClick={() => setAuthMethod("email")}>
                  <Mail className="w-3.5 h-3.5" /> البريد الإلكتروني
                </Button>
              </div>
            </>
          )}

          {forgotMode ? (
            <ForgotPasswordForm onBack={() => setForgotMode(false)} />
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3.5">
              {!isLogin && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">الاسم الكامل <span className="text-primary">*</span></Label>
                  <div className="relative">
                    <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="الاسم الكامل" required className="bg-background h-10 text-sm pr-9" />
                    <User className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/40" />
                  </div>
                </div>
              )}

              {authMethod === "phone" ? (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground text-right block">رقم الهاتف <span className="text-primary">*</span></Label>
                  <div className="relative">
                    <Input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="01xxxxxxxxx" required dir="ltr" className="bg-background h-10 text-sm pl-9" />
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/40" />
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground text-right block">البريد الإلكتروني <span className="text-primary">*</span></Label>
                  <div className="relative">
                    <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="example@email.com" required dir="ltr" className="bg-background h-10 text-sm pl-9" />
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/40" />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground text-right block">كلمة المرور <span className="text-primary">*</span></Label>
                <div className="relative">
                  <Input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="أدخل كلمة المرور" required minLength={6} dir="ltr" className="bg-background h-10 text-sm pl-9" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-muted-foreground">
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {!isLogin && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">العنوان <span className="text-muted-foreground text-[10px]">(اختياري)</span></Label>
                  <div className="relative">
                    <Input value={address} onChange={e => setAddress(e.target.value)} placeholder="المحافظة — العنوان التفصيلي" className="bg-background h-10 text-sm pr-9" />
                    <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/40" />
                  </div>
                </div>
              )}

              <Button type="submit" className="w-full h-11 font-bold text-sm" disabled={loading}>
                {loading ? "جاري التحميل..." : isLogin ? "تسجيل الدخول" : "إنشاء الحساب"}
              </Button>

              {isLogin && (
                <div className="text-center">
                  <button type="button" onClick={() => setForgotMode(true)} className="text-xs text-muted-foreground hover:text-primary transition-colors">نسيت كلمة المرور؟</button>
                </div>
              )}
            </form>
          )}
        </div>

        {/* Footer Links */}
        {!forgotMode && (
          <div className="mt-5 space-y-3">
            {/* Toggle login/register */}
            <div className="text-center">
              {isLogin ? (
                <p className="text-sm text-muted-foreground">
                  ليس لديك حساب؟{" "}
                  <button onClick={() => setMode("register")} className="text-primary font-bold hover:underline">أنشئ حساب جديد</button>
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  لديك حساب بالفعل؟{" "}
                  <button onClick={() => setMode("login")} className="text-primary font-bold hover:underline">تسجيل الدخول</button>
                </p>
              )}
            </div>

            {/* Dealer portal link */}
            <div className="text-center">
              <Button variant="outline" size="sm" className="gap-2 text-xs font-bold h-9 border-border/50 text-muted-foreground hover:text-primary hover:border-primary/30 bg-card" asChild>
                <Link to="/dealer-login">
                  <ArrowLeft className="w-3.5 h-3.5" />
                  طلب فتح حساب تاجر معتمد
                </Link>
              </Button>
            </div>

            {/* Back to home */}
            <div className="text-center">
              <Link to="/" className="text-xs text-muted-foreground hover:text-primary transition-colors">← العودة للرئيسية</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Auth;
