import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, ArrowRight, Phone, Mail } from "lucide-react";
import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";

type AuthMethod = "phone" | "email";

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 60_000; // 1 minute

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [authMethod, setAuthMethod] = useState<AuthMethod>("phone");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [address, setAddress] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => !!localStorage.getItem("remembered_auth"));
  const [forgotMode, setForgotMode] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const phoneToEmail = (p: string) => {
    const digits = p.replace(/\D/g, "");
    return `${digits}@phone.almasria.app`;
  };

  const getAuthEmail = () => {
    if (authMethod === "email") return email.trim();
    return phoneToEmail(phone);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Rate limiting check
    if (isLogin && lockedUntil && Date.now() < lockedUntil) {
      const secsLeft = Math.ceil((lockedUntil - Date.now()) / 1000);
      toast({
        title: "تم تجاوز عدد المحاولات المسموح",
        description: `يرجى الانتظار ${secsLeft} ثانية قبل المحاولة مرة أخرى`,
        variant: "destructive",
      });
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
          toast({
            title: "تم تجاوز عدد المحاولات",
            description: "تم قفل تسجيل الدخول مؤقتًا لمدة دقيقة",
            variant: "destructive",
          });
        } else {
          toast({
            title: "خطأ في تسجيل الدخول",
            description: authMethod === "phone"
              ? "رقم الهاتف أو كلمة المرور غير صحيحة"
              : "البريد الإلكتروني أو كلمة المرور غير صحيحة",
            variant: "destructive",
          });
        }
      } else {
        setLoginAttempts(0);
        setLockedUntil(null);
        toast({ title: "تم تسجيل الدخول بنجاح" });
        navigate("/");
      }
    } else {
      const { error } = await supabase.auth.signUp({
        email: authEmail,
        password,
        options: {
          data: {
            full_name: fullName,
            phone: authMethod === "phone" ? phone : "",
            company_name: companyName,
            address,
            email: authMethod === "email" ? email : "",
          },
        },
      });
      if (error) {
        if (error.message.includes("already registered")) {
          toast({
            title: authMethod === "phone" ? "رقم الهاتف مسجل بالفعل" : "البريد الإلكتروني مسجل بالفعل",
            description: "يرجى تسجيل الدخول بدلاً من ذلك",
            variant: "destructive",
          });
        } else {
          toast({ title: "خطأ في إنشاء الحساب", description: error.message, variant: "destructive" });
        }
      } else {
        toast({ title: "تم إنشاء الحساب بنجاح", description: "يمكنك الآن تسجيل الدخول" });
        setIsLogin(true);
      }
    }
    setLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    const { error } = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (error) {
      toast({ title: "خطأ في تسجيل الدخول بجوجل", description: String(error), variant: "destructive" });
    }
    setGoogleLoading(false);
  };

  return (
    <div className="min-h-screen bg-secondary flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <a href="/" className="inline-block mb-6">
            <span className="text-2xl font-bold text-secondary-foreground">
              المصرية <span className="text-gradient-red">جروب</span>
            </span>
          </a>
          <h1 className="text-2xl font-bold text-secondary-foreground">
            {forgotMode ? "نسيت كلمة المرور" : isLogin ? "تسجيل الدخول" : "إنشاء حساب جديد"}
          </h1>
          <p className="text-secondary-foreground/60 mt-2">
            {forgotMode
              ? "استعد الوصول لحسابك"
              : isLogin
              ? "ادخل بياناتك للوصول لحسابك"
              : "أنشئ حسابك للبدء"}
          </p>
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          {!forgotMode && (
            <>
              <Button variant="outline" className="w-full gap-3 mb-6 h-11" onClick={handleGoogleSignIn} disabled={googleLoading}>
                {googleLoading ? "جاري التحميل..." : (
                  <>
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    تسجيل الدخول بحساب جوجل
                  </>
                )}
              </Button>

              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">أو</span></div>
              </div>
            </>
          )}

          {/* Auth Method Toggle - hide in forgot mode */}
          {!forgotMode && (
            <div className="flex gap-2 mb-5">
              <Button type="button" variant={authMethod === "phone" ? "default" : "outline"} className="flex-1 gap-2 text-sm" onClick={() => setAuthMethod("phone")}>
                <Phone className="w-4 h-4" /> رقم الهاتف
              </Button>
              <Button type="button" variant={authMethod === "email" ? "default" : "outline"} className="flex-1 gap-2 text-sm" onClick={() => setAuthMethod("email")}>
                <Mail className="w-4 h-4" /> البريد الإلكتروني
              </Button>
            </div>
          )}

          {forgotMode ? (
            <ForgotPasswordForm
              onBack={() => setForgotMode(false)}
            />
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="text-card-foreground">الاسم <span className="text-primary">*</span></Label>
                  <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="الاسم الكامل" required className="bg-background" />
                </div>
              )}

              {authMethod === "phone" ? (
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-card-foreground">رقم الهاتف <span className="text-primary">*</span></Label>
                  <div className="relative">
                    <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01xxxxxxxxx" required dir="ltr" className="bg-background pl-10" />
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-card-foreground">البريد الإلكتروني <span className="text-primary">*</span></Label>
                  <div className="relative">
                    <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="example@email.com" required dir="ltr" className="bg-background pl-10" />
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="password" className="text-card-foreground">كلمة المرور <span className="text-primary">*</span></Label>
                <div className="relative">
                  <Input id="password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="أدخل كلمة المرور" required minLength={6} dir="ltr" className="bg-background pl-10" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {isLogin && (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="rememberMe"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 rounded border-input accent-primary cursor-pointer"
                  />
                  <Label htmlFor="rememberMe" className="text-card-foreground cursor-pointer text-sm">تذكرني</Label>
                </div>
              )}

              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="address" className="text-card-foreground">العنوان <span className="text-muted-foreground text-xs">(اختياري)</span></Label>
                  <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="العنوان التفصيلي" className="bg-background" />
                </div>
              )}

              <Button type="submit" className="w-full red-glow" disabled={loading}>
                {loading ? "جاري التحميل..." : isLogin ? "تسجيل الدخول" : "إنشاء حساب"}
              </Button>

              {isLogin && (
                <button type="button" onClick={() => setForgotMode(true)} className="text-sm text-muted-foreground hover:text-primary w-full text-center block">
                  نسيت كلمة المرور؟
                </button>
              )}
            </form>
          )}

          {!forgotMode && (
            <>
              <div className="mt-4 text-center">
                <button onClick={() => setIsLogin(!isLogin)} className="text-sm text-primary hover:underline">
                  {isLogin ? "ليس لديك حساب؟ أنشئ حساب جديد" : "لديك حساب بالفعل؟ سجل دخول"}
                </button>
              </div>
              <div className="mt-4 pt-4 border-t border-border text-center">
                <Button variant="outline" className="gap-2" onClick={() => navigate("/dealer-apply")}>
                  <ArrowRight className="w-4 h-4" /> طلب فتح حساب تاجر معتمد
                </Button>
              </div>
            </>
          )}
        </div>

        <div className="text-center mt-4">
          <a href="/" className="text-sm text-muted-foreground hover:text-primary">العودة للرئيسية</a>
        </div>
      </div>
    </div>
  );
};

export default Auth;
