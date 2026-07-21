import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Phone, ShieldCheck, ArrowRight, Loader2, Mail, Eye, EyeOff, Clock, CheckCircle2, XCircle, AlertCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";

import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";
import { isPhoneLike, phoneToInternalEmail } from "@/lib/phoneAuth";
import { buildLoginEmailCandidates, signInWithPossibleEmails } from "@/lib/loginCredentials";
import { mapLoginError } from "@/lib/loginErrors";
import { startGoogleOAuth } from "@/lib/googleOAuth";
import AppleSignInButton from "@/components/AppleSignInButton";

type AuthMethod = "phone" | "email" | "auto";
const REMEMBER_KEY = "almasria_remember_me";
const SESSION_FLAG = "almasria_session_active";

// Only check if user opted into "remember me" — no credentials stored
const isRemembered = () => localStorage.getItem(REMEMBER_KEY) === "true";
const setRemembered = (val: boolean) => {
  if (val) {
    localStorage.setItem(REMEMBER_KEY, "true");
  } else {
    localStorage.removeItem(REMEMBER_KEY);
  }
};
// Session flag: set on login, cleared on browser close (via sessionStorage)
const markSessionActive = () => sessionStorage.setItem(SESSION_FLAG, "true");
const isSessionActive = () => sessionStorage.getItem(SESSION_FLAG) === "true";

const statusConfig = {
  pending: { label: "قيد المراجعة", icon: Clock, color: "text-amber-700", bg: "bg-amber-50 border-amber-200" },
  approved: { label: "تم الموافقة ✅", icon: CheckCircle2, color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
  rejected: { label: "مرفوض", icon: XCircle, color: "text-red-600", bg: "bg-red-50 border-red-200" },
  suspended: { label: "موقوف", icon: AlertCircle, color: "text-orange-600", bg: "bg-orange-50 border-orange-200" },
};

const DealerLogin = () => {
  const navigate = useNavigate();
  const { user, isAdmin, isModerator, dealerAccount, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [identifier, setIdentifier] = useState(""); // single field for phone or email
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [applicationStatus, setApplicationStatus] = useState<any>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [rememberMe, setRememberMe] = useState(isRemembered());
  const autoLoginAttempted = useRef(false);

  // On mount: if "remember me" was NOT checked and there's no active session flag,
  // sign out to prevent stale sessions from persisting across browser restarts
  useEffect(() => {
    if (!autoLoginAttempted.current) {
      autoLoginAttempted.current = true;
      if (!isRemembered() && !isSessionActive()) {
        // User didn't want to be remembered and browser was restarted — clear session
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session) {
            supabase.auth.signOut();
          }
        });
      } else if (isSessionActive() || isRemembered()) {
        // Mark session as active for this browser tab
        markSessionActive();
      }
    }
  }, []);

  useEffect(() => {
    if (!authLoading && user && !isAdmin && !isModerator && !dealerAccount) {
      checkDealerApplication(user.id);
    }
  }, [authLoading, user, isAdmin, isModerator, dealerAccount]);

  const checkDealerApplication = async (userId: string) => {
    setCheckingStatus(true);
    try {
      const { data: app } = await supabase.from("dealer_applications").select("id, status, business_name, created_at, review_notes").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle();
      setApplicationStatus(app);
    } catch (err) { console.error(err); } finally { setCheckingStatus(false); }
  };

  const phoneToEmail = phoneToInternalEmail;
  const isPhone = isPhoneLike;
  const getAuthEmail = () => isPhone(identifier) ? phoneToEmail(identifier) : identifier.trim();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    try {
      const authEmail = getAuthEmail();
      const loginEmailCandidates = buildLoginEmailCandidates(identifier, isPhone(identifier));
      const { data, error } = await signInWithPossibleEmails(
        loginEmailCandidates.length ? loginEmailCandidates : [authEmail],
        password,
      );
      if (error) {
        const mapped = mapLoginError(error);
        toast({ title: mapped.title, description: mapped.description, variant: "destructive" });
      } else if (data.user) {
        setRemembered(rememberMe);
        markSessionActive();
        toast({ title: "تم تسجيل الدخول بنجاح ✅" });
      }
    } catch (e) {
      console.error("[DealerLogin] submit crashed:", e);
      const mapped = mapLoginError(e);
      toast({ title: mapped.title, description: mapped.description, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };


  const handleLogout = async () => { setRemembered(false); await supabase.auth.signOut(); setApplicationStatus(null); };

  const handleGoogleLogin = async () => {
    try {
      await startGoogleOAuth(`${window.location.origin}/dealer-login`);
    } catch (error) {
      toast({ title: "خطأ", description: String(error), variant: "destructive" });
    }
  };

  // ─── Block staff from seeing dealer portal ───
  if (user && (isAdmin || isModerator)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">جارٍ تحويلك للوحة الموظفين...</p>
        </div>
      </div>
    );
  }

  // ─── Application Status View ───
  if (user && (applicationStatus || checkingStatus)) {
    const status = applicationStatus?.status as keyof typeof statusConfig;
    const config = status ? statusConfig[status] : null;
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 pb-20">
          <div className="container mx-auto px-4 max-w-md">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border/50 rounded-xl p-6 md:p-8 shadow-sm">
              {checkingStatus ? (
                <div className="text-center py-8"><Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" /><p className="text-muted-foreground text-sm">جاري التحقق...</p></div>
              ) : applicationStatus ? (
                <>
                  <div className="text-center mb-6">
                    <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4"><ShieldCheck className="w-7 h-7 text-primary" /></div>
                    <h1 className="text-lg font-black text-foreground mb-1">حالة طلب الاعتماد</h1>
                    <p className="text-xs text-muted-foreground">{applicationStatus.business_name}</p>
                  </div>
                  {config && (
                    <div className={`border rounded-xl p-4 mb-6 ${config.bg}`}>
                      <div className="flex items-center gap-3">
                        <config.icon className={`w-5 h-5 ${config.color} shrink-0`} />
                        <div>
                          <p className={`font-bold text-sm ${config.color}`}>{config.label}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">تاريخ التقديم: {new Date(applicationStatus.created_at).toLocaleDateString("ar-EG")}</p>
                        </div>
                      </div>
                      {applicationStatus.review_notes && <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-current/10"><strong>ملاحظات:</strong> {applicationStatus.review_notes}</p>}
                    </div>
                  )}
                  {status === "pending" && <div className="bg-muted/50 rounded-lg p-3 text-center text-xs text-muted-foreground mb-4">طلبك قيد المراجعة. سيتم التواصل معك قريباً.</div>}
                  {status === "rejected" && <div className="text-center mb-4"><Button asChild variant="outline" size="sm" className="gap-1.5 text-xs"><Link to="/dealer-apply"><ArrowRight className="w-3.5 h-3.5" />تقديم طلب جديد</Link></Button></div>}
                  {status === "approved" && <div className="text-center mb-4"><Button className="gap-1.5 text-xs" onClick={() => navigate("/dealer")}><ArrowRight className="w-3.5 h-3.5" />دخول لوحة التحكم</Button></div>}
                  <button onClick={handleLogout} className="text-xs text-muted-foreground hover:text-primary w-full text-center block mt-3">تسجيل الخروج</button>
                </>
              ) : (
                <>
                  <div className="text-center mb-6">
                    <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4"><ShieldCheck className="w-7 h-7 text-primary" /></div>
                    <h1 className="text-lg font-black text-foreground mb-2">لا يوجد طلب اعتماد</h1>
                    <p className="text-xs text-muted-foreground">لم يتم تقديم طلب اعتماد تاجر بعد.</p>
                  </div>
                  <Button asChild className="w-full gap-1.5" size="lg"><Link to="/dealer-apply"><ArrowRight className="w-4 h-4" />تقديم طلب فتح حساب تاجر</Link></Button>
                  <button onClick={handleLogout} className="text-xs text-muted-foreground hover:text-primary w-full text-center block mt-3">تسجيل الخروج</button>
                </>
              )}
            </motion.div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // ─── Login Form ───
  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center px-4 py-8" dir="rtl">
      <div className="w-full max-w-[420px]">

        {/* Header */}
        <div className="text-center mb-6">
          <Link to="/" className="inline-block mb-4">
            <span className="text-xl font-black text-foreground">المصرية <span className="text-primary">جروب</span></span>
          </Link>
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-[11px] font-bold px-3 py-1.5 rounded-full mb-4">
            <ShieldCheck className="w-3.5 h-3.5" />
            بوابة التجار المعتمدين
          </div>
          <h1 className="text-xl font-black text-foreground">
            {forgotMode ? "استعادة كلمة المرور" : "دخول التجار"}
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            {forgotMode ? "استعد الوصول لحسابك" : "سجّل دخولك للوصول لأسعار الجملة وإدارة طلباتك"}
          </p>
        </div>

        {/* Card */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border/50 rounded-xl p-5 shadow-sm">

          {forgotMode ? (
            <ForgotPasswordForm onBack={() => setForgotMode(false)} />
          ) : (
            <>
              {/* Google */}
              <Button type="button" variant="outline" className="w-full gap-2.5 h-11 text-sm font-medium mb-4" onClick={handleGoogleLogin}>
                <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                الدخول بحساب جوجل
              </Button>

              {/* Apple Sign In (native iOS only) */}
              <AppleSignInButton className="mb-4" />



              <div className="relative mb-4">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border/50" /></div>
                <div className="relative flex justify-center text-[10px]"><span className="bg-card px-2 text-muted-foreground">أو</span></div>
              </div>

              {/* Auth Method — single smart input */}
              <form onSubmit={handleLogin} className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-foreground">رقم الهاتف أو البريد الإلكتروني <span className="text-primary">*</span></Label>
                  <div className="relative">
                    <Input
                      type="text"
                      value={identifier}
                      onChange={e => setIdentifier(e.target.value)}
                      placeholder="01xxxxxxxxx أو example@email.com"
                      required
                      dir="ltr"
                      className="bg-background h-10 text-sm pl-9"
                    />
                    {isPhone(identifier) ? (
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/40" />
                    ) : (
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/40" />
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-foreground">كلمة المرور <span className="text-primary">*</span></Label>
                  <div className="relative">
                    <Input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="أدخل كلمة المرور" required minLength={6} dir="ltr" className="bg-background h-10 text-sm pl-9" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-muted-foreground">
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Checkbox id="remember-me" checked={rememberMe} onCheckedChange={c => setRememberMe(!!c)} className="w-3.5 h-3.5" />
                    <Label htmlFor="remember-me" className="text-[11px] text-muted-foreground cursor-pointer">تذكرني</Label>
                  </div>
                  <button type="button" onClick={() => setForgotMode(true)} className="text-[11px] text-primary hover:underline">نسيت كلمة المرور؟</button>
                </div>

                <Button type="submit" className="w-full h-10 font-bold text-sm" disabled={loading}>
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> جاري الدخول...</> : "تسجيل الدخول"}
                </Button>
              </form>
            </>
          )}
        </motion.div>

        {/* Footer */}
        {!forgotMode && (
          <div className="mt-4 space-y-3">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1 gap-1.5 text-[11px] font-bold h-9" asChild>
                <Link to="/dealer-register">حساب جديد</Link>
              </Button>
              <Button variant="outline" size="sm" className="flex-1 gap-1.5 text-[11px] font-bold h-9 border-primary/30 text-primary hover:bg-primary/5" asChild>
                <Link to="/dealer-apply"><ArrowRight className="w-3 h-3" />طلب اعتماد تاجر</Link>
              </Button>
            </div>
            <div className="bg-card border border-border/50 rounded-xl p-3.5 text-center shadow-sm">
              <p className="text-[11px] text-muted-foreground mb-2">هل أنت عميل قطاعي؟</p>
              <Button variant="ghost" size="sm" className="gap-1.5 text-[11px] font-bold h-7 text-blue-600 hover:bg-blue-50" asChild>
                <Link to="/auth"><ArrowLeft className="w-3 h-3" />دخول حساب العملاء</Link>
              </Button>
            </div>
            <div className="text-center">
              <Link to="/" className="text-[11px] text-muted-foreground hover:text-primary transition-colors">← العودة للرئيسية</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DealerLogin;