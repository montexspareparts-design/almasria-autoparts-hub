import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Phone, Mail, User, MapPin, ArrowLeft, ArrowRight, Home, Car, MessageCircle, Sparkles } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from "framer-motion";
import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";
import logo from "@/assets/logo.webp";
import { isPhoneLike, phoneToInternalEmail } from "@/lib/phoneAuth";
import { buildLoginEmailCandidates, signInWithPossibleEmails } from "@/lib/loginCredentials";
import { consumeOAuthReturnTo, startGoogleOAuth } from "@/lib/googleOAuth";

const isPhone = isPhoneLike;
type AuthMode = "login" | "register";
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 60_000;
const REMEMBER_KEY = "almasria_remember_client";
const SESSION_FLAG = "almasria_client_session_active";

// Session-based: no credentials stored, just a flag
const isRemembered = () => localStorage.getItem(REMEMBER_KEY) === "true";
const setRememberedFlag = (val: boolean) => {
  if (val) localStorage.setItem(REMEMBER_KEY, "true");
  else localStorage.removeItem(REMEMBER_KEY);
};
const markSessionActive = () => sessionStorage.setItem(SESSION_FLAG, "true");
const isSessionActive = () => sessionStorage.getItem(SESSION_FLAG) === "true";

type LoginMethod = "phone" | "email";

const Auth = () => {
  const [mode, setMode] = useState<AuthMode>("login");
  const [loginMethod, setLoginMethod] = useState<LoginMethod>("phone");
  const [credential, setCredential] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [address, setAddress] = useState("");
  const [carModel, setCarModel] = useState("");
  const [carYear, setCarYear] = useState("");
  const [optionalPhone, setOptionalPhone] = useState("");
  const [whatsappOptIn, setWhatsappOptIn] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [rememberMe, setRememberMe] = useState(isRemembered());
  const navigate = useNavigate();
  const { toast } = useToast();

  const isLogin = mode === "login";
  const phoneToEmail = phoneToInternalEmail;
  const credIsPhone = isPhone(credential);
  const getAuthEmail = () => {
    if (isLogin) {
      return loginMethod === "phone" ? phoneToEmail(credential) : credential.trim();
    }
    return credIsPhone ? phoneToEmail(credential) : credential.trim();
  };

  // If session already exists (or arrives after OAuth), leave auth page immediately
  useEffect(() => {
    let mounted = true;

    const handleAuthRedirect = async (userId: string) => {
      const oauthReturnTo = consumeOAuthReturnTo();

      // Check dealer + admin status
      const [{ data: dealer }, { data: roles }] = await Promise.all([
        supabase.from("dealer_accounts").select("id").eq("user_id", userId).eq("is_active", true).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", userId),
      ]);
      const hasAdmin = roles?.some((r) => r.role === "admin") ?? false;
      const hasModerator = roles?.some((r) => r.role === "moderator") ?? false;
      const hasReporter = roles?.some((r) => r.role === "reporter") ?? false;
      const hasDealer = !!dealer;
      const isReporterOnly = hasReporter && !hasAdmin && !hasModerator;

      if (!mounted) return;
      markSessionActive();

      // Reporter-only (Al-Faisal staff) → locked to daily report page, no site access
      if (isReporterOnly) {
        navigate("/admin/daily-report", { replace: true });
        return;
      }

      // Both roles → check saved preference or show dialog via AuthContext
      if (hasDealer && hasAdmin) {
        const savedRole = localStorage.getItem("almasria_last_role");
        if (savedRole === "admin") {
          navigate("/admin", { replace: true });
        } else if (savedRole === "dealer") {
          navigate("/dealer", { replace: true });
        } else {
          navigate("/", { replace: true });
        }
      } else if (hasAdmin) {
        navigate("/admin", { replace: true });
      } else if (hasModerator) {
        // Moderators (employees) go straight to admin panel — no B2C/B2B UI
        navigate("/admin", { replace: true });
      } else if (hasDealer) {
        navigate("/dealer", { replace: true });
      } else {
        navigate(oauthReturnTo === "/dealer-login" ? "/" : oauthReturnTo || "/", { replace: true });
      }
    };

    const syncSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted || !session?.user) return;
      handleAuthRedirect(session.user.id);
    };

    syncSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted || !session?.user) return;
      handleAuthRedirect(session.user.id);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [navigate]);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLogin && lockedUntil && Date.now() < lockedUntil) {
      toast({ title: "تم تجاوز عدد المحاولات", description: `انتظر ${Math.ceil((lockedUntil - Date.now()) / 1000)} ثانية`, variant: "destructive" });
      return;
    }
    setLoading(true);
    const authEmail = getAuthEmail();

    if (isLogin) {
      const loginEmailCandidates = buildLoginEmailCandidates(credential, loginMethod === "phone");
      const { error } = await signInWithPossibleEmails(
        loginEmailCandidates.length ? loginEmailCandidates : [authEmail],
        password,
      );
      if (error) {
        const attempts = loginAttempts + 1;
        setLoginAttempts(attempts);
        if (attempts >= MAX_LOGIN_ATTEMPTS) {
          setLockedUntil(Date.now() + LOCKOUT_DURATION);
          setLoginAttempts(0);
          toast({ title: "تم قفل تسجيل الدخول مؤقتاً", variant: "destructive" });
        } else {
          toast({ title: "بيانات الدخول غير صحيحة", description: "تأكد من رقم الهاتف/البريد وكلمة المرور. لو نسيت كلمة المرور اضغط على \"نسيت كلمة المرور\".", variant: "destructive" });
        }
      } else {
        setLoginAttempts(0); setLockedUntil(null);
        setRememberedFlag(rememberMe);
        markSessionActive();
        toast({ title: "تم تسجيل الدخول بنجاح ✅" });
        // Redirect is handled by the useEffect auth listener
      }
    } else {
      // Phone is now REQUIRED when registering with email (to enable contact/WhatsApp follow-up)
      const trimmedOptionalPhone = optionalPhone.trim();
      if (!credIsPhone) {
        if (!trimmedOptionalPhone) {
          toast({ title: "رقم الموبايل مطلوب", description: "أدخل رقم موبايلك علشان نقدر نتواصل معاك ونرسل عروض الأسعار", variant: "destructive" });
          setLoading(false);
          return;
        }
        if (!/^01[0-9]{9}$/.test(trimmedOptionalPhone)) {
          toast({ title: "رقم موبايل غير صحيح", description: "أدخل رقم مصري يبدأ بـ 01 ومكون من 11 رقم", variant: "destructive" });
          setLoading(false);
          return;
        }
      }

      const finalPhone = credIsPhone ? credential : trimmedOptionalPhone;

      // ✋ Strict duplicate phone check before signup
      if (finalPhone) {
        const { data: phoneTaken, error: checkErr } = await supabase.rpc("phone_already_registered", { _phone: finalPhone });
        if (checkErr) {
          console.error("phone check error:", checkErr);
        }
        if (phoneTaken === true) {
          toast({
            title: "رقم الموبايل مسجل من قبل",
            description: "الرقم ده مستخدم في حساب تاني. سجّل دخول أو اضغط \"نسيت كلمة المرور\" لاسترجاع حسابك.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
      }

      const { error } = await supabase.auth.signUp({
        email: authEmail, password,
        options: {
          data: {
            full_name: fullName,
            phone: finalPhone || "",
            address,
            email: !credIsPhone ? credential : "",
            car_model: carModel || null,
            car_year: carYear ? parseInt(carYear) : null,
            whatsapp_opt_in: !!finalPhone && whatsappOptIn,
          },
        },
      });
      if (error) {
        toast({ title: error.message.includes("already registered") ? "الحساب مسجل بالفعل" : "خطأ", description: error.message.includes("already registered") ? "سجّل دخول بدلاً من ذلك" : error.message, variant: "destructive" });
      } else {
        // 🎉 Fire welcome WhatsApp (non-blocking)
        if (finalPhone) {
          supabase.functions.invoke("notify-retail-welcome", {
            body: { phone: finalPhone, name: fullName },
          }).catch((e) => console.error("welcome wa failed:", e));
        }
        toast({ title: "تم إنشاء الحساب ✅", description: "بعتنالك رسالة ترحيب على واتساب. سجّل دخول دلوقتي." });
        setMode("login");
      }
    }
    setLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      await startGoogleOAuth(`${window.location.origin}${window.location.pathname}`);
      return;
    } catch (error) {
      toast({ title: "خطأ في تسجيل الدخول بجوجل", description: String(error), variant: "destructive" });
    }
    setGoogleLoading(false);
  };

  return (
    <div
      className="auth-page w-full max-w-[100vw] relative flex items-start sm:items-center justify-center px-3 py-5 sm:px-4 sm:py-8 md:py-12 overflow-x-hidden"
      style={{ overflowX: "clip", minHeight: "100svh" }}
      dir="rtl"
    >
      {/* Background — clamped to viewport so blurs/patterns can't leak */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--foreground))] via-[hsl(220,20%,12%)] to-[hsl(var(--foreground))]" />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }} />
        {/* Subtle red glow — capped at viewport width */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[min(600px,100vw)] h-[300px] bg-primary/8 rounded-full blur-[120px] pointer-events-none" />
      </div>

      {/* Back to home - top right */}
      <Link 
        to="/" 
        className="absolute top-3 right-3 sm:top-5 sm:right-5 z-10 flex items-center gap-1.5 text-xs text-white/40 hover:text-white/80 transition-colors group"
      >
        <Home className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">الرئيسية</span>
      </Link>

      <motion.div 
        className="w-full max-w-[420px] sm:max-w-[440px] relative z-10"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
      >
        {/* Logo & Header — fixed min-height to prevent shift when keyboard opens */}
        <div className="text-center mb-5 sm:mb-7 md:mb-8 shrink-0" style={{ minHeight: "120px" }}>
          <Link to="/" className="inline-block mb-3 sm:mb-5">
            <img src={logo} alt="المصرية جروب" width={160} height={48} className="h-10 sm:h-12 w-auto mx-auto" />
          </Link>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight">
            {forgotMode ? "استعادة كلمة المرور" : isLogin ? "تسجيل الدخول" : "إنشاء حساب جديد"}
          </h1>
          <p className="text-[13px] sm:text-sm text-white/40 mt-1.5 sm:mt-2 px-2">
            {forgotMode ? "استعد الوصول لحسابك" : isLogin ? "ادخل بياناتك للوصول لحسابك" : "أنشئ حسابك لتتمكن من الطلب والمتابعة"}
          </p>
        </div>

        {/* Main Card */}
        <motion.div 
          className="bg-card/95 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-4 sm:p-6 shadow-2xl shadow-black/40"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.3, ease: "easeOut" }}
        >
          {!forgotMode && (
            <>
              {/* Google Sign In */}
              <Button 
                variant="outline" 
                className="w-full gap-2.5 h-11 sm:h-12 text-[13px] sm:text-sm font-semibold border-border/60 hover:bg-muted/50 transition-all" 
                onClick={handleGoogleSignIn} 
                disabled={googleLoading}
              >
                {googleLoading ? "جاري التحميل..." : (
                  <>
                    <svg className="w-[18px] h-[18px] shrink-0" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                    <span className="truncate">تسجيل الدخول بحساب جوجل</span>
                  </>
                )}
              </Button>

              {/* Divider */}
              <div className="relative my-4 sm:my-5">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border/40" /></div>
                <div className="relative flex justify-center text-[11px]"><span className="bg-card px-3 text-muted-foreground/60">أو</span></div>
              </div>

              {/* Phone / Email Toggle */}
              {isLogin && (
                <div className="flex gap-2 mb-4 sm:mb-5">
                  <Button
                    type="button"
                    variant={loginMethod === "phone" ? "default" : "outline"}
                    className="flex-1 gap-1.5 sm:gap-2 h-10 sm:h-11 rounded-xl font-bold text-xs sm:text-sm px-2"
                    onClick={() => { setLoginMethod("phone"); setCredential(""); }}
                  >
                    <Phone className="w-4 h-4 shrink-0" /> <span className="truncate">رقم الهاتف</span>
                  </Button>
                  <Button
                    type="button"
                    variant={loginMethod === "email" ? "default" : "outline"}
                    className="flex-1 gap-1.5 sm:gap-2 h-10 sm:h-11 rounded-xl font-bold text-xs sm:text-sm px-2"
                    onClick={() => { setLoginMethod("email"); setCredential(""); }}
                  >
                    <Mail className="w-4 h-4 shrink-0" /> <span className="truncate">البريد الإلكتروني</span>
                  </Button>
                </div>
              )}
            </>
          )}

          {forgotMode ? (
            <ForgotPasswordForm onBack={() => setForgotMode(false)} initialMethod={loginMethod} />
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3.5 sm:space-y-4">
              {!isLogin && (
                <div className="space-y-1.5 sm:space-y-2">
                  <Label className="text-[11px] sm:text-xs font-semibold text-foreground/80">الاسم الكامل <span className="text-primary">*</span></Label>
                  <div className="relative">
                    <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="الاسم الكامل" required autoComplete="name" style={{ fontSize: '16px' }} className="bg-muted/40 border-border/40 h-11 sm:h-11 pr-10 text-base focus:border-primary/50 focus:ring-primary/20 transition-all touch-manipulation" />
                    <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/30" />
                  </div>
                </div>
              )}

              <div className="space-y-1.5 sm:space-y-2">
                <Label className="text-[11px] sm:text-xs font-semibold text-foreground/80 text-right block">
                  {isLogin ? (loginMethod === "phone" ? "رقم الهاتف" : "البريد الإلكتروني") : "رقم الهاتف أو البريد الإلكتروني"} <span className="text-primary">*</span>
                </Label>
                <div className="relative">
                  <Input 
                    value={credential} 
                    onChange={e => setCredential(e.target.value)} 
                    placeholder={isLogin ? (loginMethod === "phone" ? "01xxxxxxxxx" : "example@email.com") : "01xxxxxxxxx أو example@email.com"}
                    required 
                    dir="ltr" 
                    inputMode={isLogin && loginMethod === "phone" ? "tel" : "text"}
                    autoComplete={isLogin && loginMethod === "phone" ? "tel" : "email"}
                    style={{ fontSize: '16px' }}
                    className="bg-muted/40 border-border/40 h-11 pl-10 text-base focus:border-primary/50 focus:ring-primary/20 transition-all touch-manipulation" 
                  />
                  {(isLogin ? loginMethod === "phone" : credIsPhone) ? (
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/30" />
                  ) : (
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/30" />
                  )}
                </div>
              </div>

              <div className="space-y-1.5 sm:space-y-2">
                <Label className="text-[11px] sm:text-xs font-semibold text-foreground/80 text-right block">كلمة المرور <span className="text-primary">*</span></Label>
                <div className="relative">
                  <Input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="أدخل كلمة المرور" required minLength={6} dir="ltr" autoComplete={isLogin ? "current-password" : "new-password"} style={{ fontSize: '16px' }} className="bg-muted/40 border-border/40 h-11 pl-10 text-base focus:border-primary/50 focus:ring-primary/20 transition-all touch-manipulation" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/30 hover:text-muted-foreground transition-colors p-1 -m-1">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {!isLogin && (
                <div className="space-y-1.5 sm:space-y-2">
                  <Label className="text-[11px] sm:text-xs font-semibold text-foreground/80">العنوان <span className="text-muted-foreground/50 text-[10px]">(اختياري)</span></Label>
                  <div className="relative">
                    <Input value={address} onChange={e => setAddress(e.target.value)} placeholder="المحافظة — العنوان التفصيلي" autoComplete="street-address" style={{ fontSize: '16px' }} className="bg-muted/40 border-border/40 h-11 pr-10 text-base focus:border-primary/50 focus:ring-primary/20 transition-all touch-manipulation" />
                    <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/30" />
                  </div>
                </div>
              )}

              {/* Required phone + WhatsApp opt-in (only when registering with email) */}
              {!isLogin && !credIsPhone && (
                <div className="space-y-2 rounded-xl border border-primary/30 bg-primary/[0.06] p-3 sm:p-3.5">
                  <div className="flex items-start gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                    <p className="text-[11px] sm:text-[12px] leading-relaxed text-foreground/70">
                      <strong className="text-foreground">رقم الموبايل ضروري</strong> — علشان نقدر نتواصل معاك مباشرة ونرسل لك عروض الأسعار وتأكيدات الطلبات.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[11px] sm:text-xs font-semibold text-foreground/80 text-right block">
                      رقم الموبايل <span className="text-primary">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        value={optionalPhone}
                        onChange={e => setOptionalPhone(e.target.value)}
                        placeholder="01xxxxxxxxx"
                        dir="ltr"
                        inputMode="tel"
                        autoComplete="tel"
                        maxLength={11}
                        required
                        style={{ fontSize: '16px' }}
                        className="bg-card/60 border-border/40 h-11 pl-10 text-base focus:border-primary/50 focus:ring-primary/20 transition-all touch-manipulation"
                      />
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
                    </div>
                  </div>

                  <label className="flex items-start gap-2 cursor-pointer pt-1">
                    <Checkbox
                      checked={whatsappOptIn}
                      onCheckedChange={c => setWhatsappOptIn(!!c)}
                      className="w-4 h-4 mt-0.5"
                    />
                    <span className="text-[11px] sm:text-[12px] leading-relaxed text-foreground/75 flex items-center gap-1.5 flex-wrap">
                      <MessageCircle className="w-3.5 h-3.5 text-[#25D366] shrink-0" />
                      أوافق على التواصل معي عبر <strong className="text-foreground">واتساب</strong> لمتابعة عروض الأسعار والطلبات
                    </span>
                  </label>
                </div>
              )}


              {!isLogin && (
                <div className="space-y-1.5 sm:space-y-2">
                  <Label className="text-[11px] sm:text-xs font-semibold text-foreground/80 flex items-center gap-1.5 flex-wrap">
                    <Car className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span>عربيتك إيه؟</span>
                    <span className="text-muted-foreground/50 text-[10px]">(اختياري)</span>
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Select value={carModel} onValueChange={setCarModel}>
                      <SelectTrigger className="bg-muted/40 border-border/40 h-11">
                        <SelectValue placeholder="الموديل" />
                      </SelectTrigger>
                      <SelectContent>
                        {["هاي اس", "كوستر", "كورولا", "هاي لوكس", "فورتشنر", "لاند كروزر", "برادو", "كامري", "ياريس", "راش", "افانزا", "راف فور"].map(m => (
                          <SelectItem key={m} value={m}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={carYear} onValueChange={setCarYear}>
                      <SelectTrigger className="bg-muted/40 border-border/40 h-11">
                        <SelectValue placeholder="السنة" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 30 }, (_, i) => new Date().getFullYear() - i).map(y => (
                          <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              <Button type="submit" className="w-full h-11 sm:h-12 font-bold text-sm rounded-xl shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all duration-300" disabled={loading}>
                {loading ? "جاري التحميل..." : isLogin ? "تسجيل الدخول" : "إنشاء الحساب"}
              </Button>

              {isLogin && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Checkbox id="remember-client" checked={rememberMe} onCheckedChange={c => setRememberMe(!!c)} className="w-3.5 h-3.5" />
                    <Label htmlFor="remember-client" className="text-[11px] text-muted-foreground cursor-pointer">تذكرني</Label>
                  </div>
                  <button type="button" onClick={() => setForgotMode(true)} className="text-[11px] text-primary hover:underline">
                    نسيت كلمة المرور؟
                  </button>
                </div>
              )}
            </form>
          )}
        </motion.div>

        {/* Footer */}
        {!forgotMode && (
          <div className="mt-6 space-y-4 shrink-0">
            {/* Toggle login/register */}
            <div className="text-center">
              {isLogin ? (
                <p className="text-sm text-white/40">
                  ليس لديك حساب؟{" "}
                  <button onClick={() => setMode("register")} className="text-primary font-bold hover:text-primary/80 transition-colors">أنشئ حساب جديد</button>
                </p>
              ) : (
                <p className="text-sm text-white/40">
                  لديك حساب بالفعل؟{" "}
                  <button onClick={() => setMode("login")} className="text-primary font-bold hover:text-primary/80 transition-colors">تسجيل الدخول</button>
                </p>
              )}
            </div>

            {/* Dealer portal */}
            <div className="text-center">
              <Link 
                to="/dealer-login" 
                className="inline-flex items-center gap-2 text-xs font-semibold text-white/30 hover:text-white/60 border border-white/[0.08] hover:border-white/20 rounded-full px-5 py-2.5 transition-all duration-200 backdrop-blur-sm"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                طلب فتح حساب تاجر معتمد
              </Link>
            </div>

            {/* Home link */}
            <div className="text-center">
              <Link to="/" className="text-[11px] text-white/25 hover:text-white/50 transition-colors">
                ← العودة للرئيسية
              </Link>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default Auth;
