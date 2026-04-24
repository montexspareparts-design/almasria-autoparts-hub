import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, Mail, Eye, EyeOff, Loader2, ShieldCheck, UserPlus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useToast } from "@/hooks/use-toast";
import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";
import { phoneToInternalEmail } from "@/lib/phoneAuth";
import { buildLoginEmailCandidates, signInWithPossibleEmails } from "@/lib/loginCredentials";

type AuthMethod = "phone" | "email";

const REMEMBER_KEY = "almasria_remember_me";

// Session-based: no credentials stored, just a flag
const setRememberedFlag = (val: boolean) => {
  if (val) localStorage.setItem(REMEMBER_KEY, "true");
  else localStorage.removeItem(REMEMBER_KEY);
};

interface DealerAuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: "login" | "register";
}

const DealerAuthDialog = ({ open, onOpenChange, defaultTab = "login" }: DealerAuthDialogProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tab, setTab] = useState<"login" | "register">(defaultTab);
  const [authMethod, setAuthMethod] = useState<AuthMethod>("phone");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);

  // Register fields
  const [regPhone, setRegPhone] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regName, setRegName] = useState("");
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regAuthMethod, setRegAuthMethod] = useState<AuthMethod>("email");

  const phoneToEmail = phoneToInternalEmail;

  const resetForm = useCallback(() => {
    setPhone(""); setEmail(""); setPassword("");
    setRegPhone(""); setRegEmail(""); setRegPassword(""); setRegName("");
    setShowPassword(false); setShowRegPassword(false);
    setForgotMode(false); setLoading(false);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const authEmail = authMethod === "email" ? email.trim() : phoneToEmail(phone);
    const loginEmailCandidates = buildLoginEmailCandidates(phone, authMethod === "phone");
    const { data, error } = await signInWithPossibleEmails(
      authMethod === "phone" && loginEmailCandidates.length ? loginEmailCandidates : [authEmail],
      password,
    );

    if (error) {
      toast({
        title: "خطأ في تسجيل الدخول",
        description: authMethod === "phone"
          ? "رقم الهاتف أو كلمة المرور غير صحيحة"
          : "البريد الإلكتروني أو كلمة المرور غير صحيحة",
        variant: "destructive",
      });
    } else if (data.user) {
      setRememberedFlag(rememberMe);
      toast({ title: "تم تسجيل الدخول بنجاح ✅" });
      resetForm();
      onOpenChange(false);
    }
    setLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const authEmail = regAuthMethod === "email" ? regEmail.trim() : phoneToEmail(regPhone);
    
    if (regPassword.length < 6) {
      toast({ title: "كلمة المرور يجب أن تكون 6 أحرف على الأقل", variant: "destructive" });
      setLoading(false);
      return;
    }

    const phoneForProfile = regAuthMethod === "phone" ? regPhone.trim() : "";
    const emailForProfile = regAuthMethod === "email" ? regEmail.trim() : "";
    const { data, error } = await supabase.auth.signUp({
      email: authEmail,
      password: regPassword,
      options: { data: { full_name: regName, phone: phoneForProfile, email: emailForProfile } },
    });

    if (error) {
      if (error.message.includes("already registered")) {
        toast({ title: "هذا الحساب مسجل بالفعل. يرجى تسجيل الدخول.", variant: "destructive" });
        setTab("login");
      } else {
        toast({ title: "حدث خطأ أثناء إنشاء الحساب", description: error.message, variant: "destructive" });
      }
    } else if (data.user) {
      toast({ title: "تم إنشاء الحساب بنجاح ✅", description: "سيتم توجيهك لإكمال بيانات التاجر" });
      resetForm();
      onOpenChange(false);
      navigate("/dealer-apply");
    }
    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast({ title: "خطأ", description: String(result.error), variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="max-w-md p-0 overflow-hidden rounded-2xl border-border/60" dir="rtl">
        {/* Header */}
        <div className="bg-secondary px-6 pt-6 pb-5 text-center">
          <div className="w-14 h-14 rounded-2xl bg-primary/15 border border-primary/20 flex items-center justify-center mx-auto mb-3">
            <ShieldCheck className="w-7 h-7 text-primary" />
          </div>
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-secondary-foreground">
              {forgotMode ? "نسيت كلمة المرور" : "بوابة التجار"}
            </DialogTitle>
          </DialogHeader>
          <p className="text-secondary-foreground/60 text-sm mt-1">
            {forgotMode ? "استعد الوصول لحسابك" : "سجّل دخولك أو أنشئ حساب جديد"}
          </p>
        </div>

        <div className="px-6 pb-6 pt-4">
          {forgotMode ? (
            <ForgotPasswordForm onBack={() => setForgotMode(false)} />
          ) : (
            <>
              {/* Google Login */}
              <Button
                type="button"
                variant="outline"
                className="w-full gap-3 mb-4 h-11 text-sm font-medium rounded-xl"
                onClick={handleGoogleLogin}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                الدخول بحساب جوجل
              </Button>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
                <div className="relative flex justify-center text-xs"><span className="bg-card px-3 text-muted-foreground">أو</span></div>
              </div>

              <Tabs value={tab} onValueChange={(v) => setTab(v as "login" | "register")} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-5 rounded-xl h-11">
                  <TabsTrigger value="login" className="rounded-lg font-bold text-sm gap-1.5">
                    <ShieldCheck className="w-4 h-4" /> تسجيل الدخول
                  </TabsTrigger>
                  <TabsTrigger value="register" className="rounded-lg font-bold text-sm gap-1.5">
                    <UserPlus className="w-4 h-4" /> حساب جديد
                  </TabsTrigger>
                </TabsList>

                {/* Login Tab */}
                <TabsContent value="login" className="mt-0">
                  <div className="flex gap-2 mb-4">
                    <Button type="button" variant={authMethod === "phone" ? "default" : "outline"} className="flex-1 gap-1.5 text-xs h-9 rounded-xl" onClick={() => setAuthMethod("phone")}>
                      <Phone className="w-3.5 h-3.5" /> الهاتف
                    </Button>
                    <Button type="button" variant={authMethod === "email" ? "default" : "outline"} className="flex-1 gap-1.5 text-xs h-9 rounded-xl" onClick={() => setAuthMethod("email")}>
                      <Mail className="w-3.5 h-3.5" /> الإيميل
                    </Button>
                  </div>

                  <form onSubmit={handleLogin} className="space-y-3.5">
                    {authMethod === "phone" ? (
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold">رقم الهاتف</Label>
                        <div className="relative">
                          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01xxxxxxxxx" required dir="ltr" className="bg-background pl-9 h-10 rounded-xl text-sm" />
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold">البريد الإلكتروني</Label>
                        <div className="relative">
                          <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="example@email.com" required dir="ltr" className="bg-background pl-9 h-10 rounded-xl text-sm" />
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                        </div>
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold">كلمة المرور</Label>
                      <div className="relative">
                        <Input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="أدخل كلمة المرور" required minLength={6} dir="ltr" className="bg-background pl-9 h-10 rounded-xl text-sm" />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50">
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Checkbox id="dialog-remember" checked={rememberMe} onCheckedChange={(c) => setRememberMe(!!c)} />
                        <Label htmlFor="dialog-remember" className="text-xs text-muted-foreground cursor-pointer">تذكرني</Label>
                      </div>
                      <button type="button" onClick={() => setForgotMode(true)} className="text-xs text-primary hover:underline font-medium">
                        نسيت كلمة المرور؟
                      </button>
                    </div>

                    <Button type="submit" className="w-full h-11 rounded-xl font-bold" disabled={loading}>
                      {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> جاري الدخول...</> : "تسجيل الدخول"}
                    </Button>
                  </form>
                </TabsContent>

                {/* Register Tab */}
                <TabsContent value="register" className="mt-0">
                  <div className="flex gap-2 mb-4">
                    <Button type="button" variant={regAuthMethod === "email" ? "default" : "outline"} className="flex-1 gap-1.5 text-xs h-9 rounded-xl" onClick={() => setRegAuthMethod("email")}>
                      <Mail className="w-3.5 h-3.5" /> الإيميل
                    </Button>
                    <Button type="button" variant={regAuthMethod === "phone" ? "default" : "outline"} className="flex-1 gap-1.5 text-xs h-9 rounded-xl" onClick={() => setRegAuthMethod("phone")}>
                      <Phone className="w-3.5 h-3.5" /> الهاتف
                    </Button>
                  </div>

                  <form onSubmit={handleRegister} className="space-y-3.5">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold">الاسم الكامل</Label>
                      <Input value={regName} onChange={(e) => setRegName(e.target.value)} placeholder="أدخل اسمك الكامل" required className="bg-background h-10 rounded-xl text-sm" />
                    </div>

                    {regAuthMethod === "email" ? (
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold">البريد الإلكتروني</Label>
                        <div className="relative">
                          <Input value={regEmail} onChange={(e) => setRegEmail(e.target.value)} placeholder="example@email.com" required dir="ltr" className="bg-background pl-9 h-10 rounded-xl text-sm" />
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold">رقم الهاتف</Label>
                        <div className="relative">
                          <Input value={regPhone} onChange={(e) => setRegPhone(e.target.value)} placeholder="01xxxxxxxxx" required dir="ltr" className="bg-background pl-9 h-10 rounded-xl text-sm" />
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                        </div>
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold">كلمة المرور</Label>
                      <div className="relative">
                        <Input type={showRegPassword ? "text" : "password"} value={regPassword} onChange={(e) => setRegPassword(e.target.value)} placeholder="6 أحرف على الأقل" required minLength={6} dir="ltr" className="bg-background pl-9 h-10 rounded-xl text-sm" />
                        <button type="button" onClick={() => setShowRegPassword(!showRegPassword)} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50">
                          {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <p className="text-[10px] text-muted-foreground">ستحتاج كلمة المرور لتسجيل الدخول لاحقاً</p>
                    </div>

                    <Button type="submit" className="w-full h-11 rounded-xl font-bold" disabled={loading}>
                      {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> جاري التسجيل...</> : <><UserPlus className="w-4 h-4" /> إنشاء حساب</>}
                    </Button>

                    <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
                      بعد إنشاء الحساب ستقوم بإكمال بيانات نشاطك التجاري
                    </p>
                  </form>
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DealerAuthDialog;
