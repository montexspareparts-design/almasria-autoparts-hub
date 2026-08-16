import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Eye, EyeOff, Loader2, Mail, Phone, User, ArrowRight, MessageCircle, ChevronLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";
import AppleSignInButton from "@/components/AppleSignInButton";
import logoDark from "@/assets/almasria-logo-dark.png";
import { isPhoneLike, phoneToInternalEmail } from "@/lib/phoneAuth";
import { buildLoginEmailCandidates, signInWithPossibleEmails } from "@/lib/loginCredentials";
import { mapLoginError } from "@/lib/loginErrors";
import { startGoogleOAuth } from "@/lib/googleOAuth";
import { setAppSegment, type AppSegment } from "@/lib/appSegment";

export type AuthSegment = Exclude<AppSegment, "guest">;

const WA_NUMBER = "201034806288";

/**
 * ONE native auth screen — dealer + retail, login + signup.
 * Pure presentation/consolidation: every auth call below is the exact same
 * helper the previous web screens used (no session or token logic changed).
 */
const NativeAuthScreen = ({
  segment: initialSegment = "retail",
  mode: initialMode = "login",
}: {
  segment?: AuthSegment;
  mode?: "login" | "register";
}) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [segment, setSegment] = useState<AuthSegment>(initialSegment);
  const [mode, setMode] = useState<"login" | "register">(initialMode);
  const [forgot, setForgot] = useState(false);

  const [credential, setCredential] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [optionalPhone, setOptionalPhone] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const isDealer = segment === "dealer";
  const isLogin = mode === "login" || isDealer; // dealer accounts are opened by the sales team
  const credIsPhone = isPhoneLike(credential);

  const handleGoogle = async () => {
    setGoogleLoading(true);
    try {
      await startGoogleOAuth(`${window.location.origin}${window.location.pathname}`);
      return;
    } catch (e) {
      toast({ title: "خطأ في تسجيل الدخول بجوجل", description: String(e), variant: "destructive" });
    }
    setGoogleLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const authEmail = credIsPhone ? phoneToInternalEmail(credential) : credential.trim();

      if (isLogin) {
        const candidates = buildLoginEmailCandidates(credential, credIsPhone);
        const { error } = await signInWithPossibleEmails(candidates.length ? candidates : [authEmail], password);
        if (error) {
          const mapped = mapLoginError(error);
          toast({ title: mapped.title, description: mapped.description, variant: "destructive" });
        } else {
          setAppSegment(segment);
          toast({ title: "تم تسجيل الدخول بنجاح ✅" });
        }
        return;
      }

      // ── Retail signup (same calls as the previous /auth screen) ──
      const trimmedPhone = optionalPhone.trim();
      if (!credIsPhone) {
        if (!trimmedPhone) {
          toast({ title: "رقم الموبايل مطلوب", description: "أدخل رقم موبايلك علشان نقدر نتواصل معاك", variant: "destructive" });
          return;
        }
        if (!/^01[0-9]{9}$/.test(trimmedPhone)) {
          toast({ title: "رقم موبايل غير صحيح", description: "أدخل رقم مصري يبدأ بـ 01 ومكون من 11 رقم", variant: "destructive" });
          return;
        }
      }
      const finalPhone = credIsPhone ? credential : trimmedPhone;

      if (finalPhone) {
        try {
          const { data: phoneTaken } = await supabase.rpc("phone_already_registered", { _phone: finalPhone });
          if (phoneTaken === true) {
            toast({
              title: "رقم الموبايل مسجل من قبل",
              description: 'الرقم ده مستخدم في حساب تاني. سجّل دخول أو اضغط "نسيت كلمة المرور".',
              variant: "destructive",
            });
            return;
          }
        } catch (err) {
          console.error("phone check threw:", err);
        }
      }

      const { error } = await supabase.auth.signUp({
        email: authEmail,
        password,
        options: {
          data: {
            full_name: fullName,
            phone: finalPhone || "",
            email: !credIsPhone ? credential : "",
          },
        },
      });
      if (error) {
        const already = error.message.includes("already registered");
        toast({
          title: already ? "الحساب مسجل بالفعل" : "خطأ",
          description: already ? "سجّل دخول بدلاً من ذلك" : error.message,
          variant: "destructive",
        });
      } else {
        if (finalPhone) {
          supabase.functions
            .invoke("notify-retail-welcome", { body: { phone: finalPhone, name: fullName } })
            .catch((err) => console.error("welcome wa failed:", err));
        }
        setAppSegment("retail");
        toast({ title: "تم إنشاء الحساب ✅", description: "سجّل دخول دلوقتي." });
        setMode("login");
      }
    } catch (err) {
      console.error("[NativeAuth] submit crashed:", err);
      const mapped = mapLoginError(err);
      toast({ title: mapped.title, description: mapped.description, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "bg-white/[0.05] border-white/10 text-white placeholder:text-white/25 h-11 pl-10 text-base rounded-xl focus:border-primary/60 focus:ring-primary/20";

  return (
    <div
      dir="rtl"
      className="min-h-[100svh] w-full bg-carbon text-white flex flex-col"
      style={{
        paddingTop: "calc(env(safe-area-inset-top) + 14px)",
        paddingBottom: "calc(env(safe-area-inset-bottom) + 18px)",
        background:
          "radial-gradient(120% 80% at 50% -10%, #16305a 0%, #0d2140 30%, #0A1A2F 55%, #06101d 100%)",
      }}
    >
      <div className="px-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate("/")}
          className="w-9 h-9 rounded-full bg-white/[0.08] grid place-items-center"
          aria-label="الرئيسية"
        >
          <ChevronLeft className="w-[18px] h-[18px] rotate-180 text-white/70" />
        </button>
        <button
          type="button"
          onClick={() => navigate("/")}
          className="text-[12px] text-white/45 font-semibold"
        >
          تصفح كزائر ←
        </button>
      </div>

      <div className="flex-1 flex flex-col justify-center px-4 py-6 w-full max-w-[440px] mx-auto">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
          <img src={logoDark} alt="المصرية جروب" className="h-11 w-auto mx-auto mb-5 object-contain" />

          {/* Account type toggle — one screen, both segments */}
          <div className="grid grid-cols-2 gap-1.5 p-1.5 rounded-2xl bg-white/[0.05] border border-white/10 mb-5">
            {(["retail", "dealer"] as AuthSegment[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setSegment(s);
                  setForgot(false);
                }}
                className={`h-10 rounded-xl text-[13px] font-bold transition-colors ${
                  segment === s ? "bg-primary text-white shadow-lg shadow-primary/25" : "text-white/55"
                }`}
              >
                {s === "retail" ? "عميل قطاعي" : "عميل جملة"}
              </button>
            ))}
          </div>

          <h1 className="text-[22px] font-black text-center tracking-tight">
            {forgot ? "استعادة كلمة المرور" : isLogin ? "تسجيل الدخول" : "إنشاء حساب جديد"}
          </h1>
          <p className="text-[12.5px] text-white/45 text-center mt-1.5 mb-5">
            {isDealer ? "بوابة التجار المعتمدين — أسعار الجملة والطلبات" : "اطلب، تابع طلباتك، واستلم عروضنا"}
          </p>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl p-4 shadow-2xl shadow-black/40">
            {forgot ? (
              <div className="native-auth-forgot">
                <ForgotPasswordForm onBack={() => setForgot(false)} />
              </div>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGoogle}
                  disabled={googleLoading}
                  className="w-full gap-2.5 h-11 rounded-xl text-[13px] font-semibold bg-white/[0.06] border-white/12 text-white hover:bg-white/[0.12] hover:text-white"
                >
                  {googleLoading ? (
                    "جاري التحميل..."
                  ) : (
                    <>
                      <svg className="w-[18px] h-[18px] shrink-0" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                      <span className="truncate">المتابعة بحساب جوجل</span>
                    </>
                  )}
                </Button>

                <AppleSignInButton className="mt-3" />

                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-white/10" /></div>
                  <div className="relative flex justify-center text-[11px]"><span className="px-3 text-white/35 bg-[#0d1c30]">أو</span></div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-3.5">
                  {!isLogin && (
                    <div className="space-y-1.5">
                      <Label className="text-[11.5px] font-semibold text-white/70">الاسم الكامل <span className="text-primary">*</span></Label>
                      <div className="relative">
                        <Input
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="الاسم الكامل"
                          required
                          autoComplete="name"
                          style={{ fontSize: "16px" }}
                          className={`${inputClass} pl-3 pr-10`}
                        />
                        <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
                      </div>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label className="text-[11.5px] font-semibold text-white/70 block text-right">
                      رقم الهاتف أو البريد الإلكتروني <span className="text-primary">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        value={credential}
                        onChange={(e) => setCredential(e.target.value)}
                        placeholder="رقم الهاتف أو البريد الإلكتروني"
                        required
                        dir="ltr"
                        inputMode="text"
                        autoComplete="username"
                        style={{ fontSize: "16px" }}
                        className={`${inputClass} text-right placeholder:text-right`}
                      />
                      {credIsPhone ? (
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
                      ) : (
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
                      )}
                    </div>
                  </div>

                  {!isLogin && !credIsPhone && (
                    <div className="space-y-1.5">
                      <Label className="text-[11.5px] font-semibold text-white/70 block text-right">رقم الموبايل <span className="text-primary">*</span></Label>
                      <Input
                        value={optionalPhone}
                        onChange={(e) => setOptionalPhone(e.target.value)}
                        placeholder="01xxxxxxxxx"
                        dir="ltr"
                        inputMode="tel"
                        style={{ fontSize: "16px" }}
                        className={`${inputClass} pl-3`}
                      />
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label className="text-[11.5px] font-semibold text-white/70 block text-right">كلمة المرور <span className="text-primary">*</span></Label>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="أدخل كلمة المرور"
                        required
                        minLength={6}
                        dir="ltr"
                        autoComplete={isLogin ? "current-password" : "new-password"}
                        style={{ fontSize: "16px" }}
                        className={inputClass}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-white/35 p-1 -m-1"
                        aria-label="إظهار كلمة المرور"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button type="button" onClick={() => setForgot(true)} className="text-[11.5px] text-primary font-semibold">
                      نسيت كلمة المرور؟
                    </button>
                  </div>

                  <Button type="submit" disabled={loading} className="w-full h-12 rounded-xl font-bold text-[14px]">
                    {loading ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> جاري التنفيذ...</>
                    ) : isLogin ? (
                      "تسجيل الدخول"
                    ) : (
                      "إنشاء الحساب"
                    )}
                  </Button>
                </form>
              </>
            )}
          </div>

          {!forgot && (
            <div className="mt-4 text-center">
              {isDealer ? (
                <a
                  href={`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent("مرحباً، عايز أفتح حساب جملة على تطبيق المصرية جروب")}`}
                  className="inline-flex items-center gap-2 text-[12.5px] font-semibold text-white/70"
                >
                  <MessageCircle className="w-4 h-4 text-emerald-400" />
                  عايز تفتح حساب جملة؟ كلّمنا على واتساب
                </a>
              ) : (
                <button
                  type="button"
                  onClick={() => setMode(mode === "login" ? "register" : "login")}
                  className="text-[12.5px] text-white/60 font-semibold"
                >
                  {mode === "login" ? (
                    <>ماعندكش حساب؟ <span className="text-primary">أنشئ حساب جديد</span></>
                  ) : (
                    <>عندك حساب بالفعل؟ <span className="text-primary">سجّل دخول</span></>
                  )}
                </button>
              )}
              <div className="mt-3">
                <Link to="/" className="inline-flex items-center gap-1.5 text-[11.5px] text-white/35">
                  <ArrowRight className="w-3.5 h-3.5" />
                  العودة للرئيسية
                </Link>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default NativeAuthScreen;
