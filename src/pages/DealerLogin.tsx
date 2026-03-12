import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Phone, ShieldCheck, ArrowRight, Loader2, Mail, Eye, EyeOff, Clock, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";

type AuthMethod = "phone" | "email";

const statusConfig = {
  pending: { label: "قيد المراجعة", icon: Clock, color: "text-yellow-600", bg: "bg-yellow-500/10 border-yellow-500/30" },
  approved: { label: "تم الموافقة ✅", icon: CheckCircle2, color: "text-green-600", bg: "bg-green-500/10 border-green-500/30" },
  rejected: { label: "مرفوض", icon: XCircle, color: "text-destructive", bg: "bg-destructive/10 border-destructive/30" },
  suspended: { label: "موقوف", icon: AlertCircle, color: "text-orange-600", bg: "bg-orange-500/10 border-orange-500/30" },
};

const DealerLogin = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [authMethod, setAuthMethod] = useState<AuthMethod>("phone");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [applicationStatus, setApplicationStatus] = useState<any>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);

  // If user is logged in, check their dealer application status
  useEffect(() => {
    if (user) {
      checkDealerStatus(user.id);
    }
  }, [user]);

  const checkDealerStatus = async (userId: string) => {
    setCheckingStatus(true);
    try {
      // Check dealer account first
      const { data: dealerAccount } = await supabase
        .from("dealer_accounts")
        .select("id, is_active, tier")
        .eq("user_id", userId)
        .eq("is_active", true)
        .maybeSingle();

      if (dealerAccount) {
        navigate("/dealer");
        return;
      }

      // Check application status
      const { data: application } = await supabase
        .from("dealer_applications")
        .select("id, status, business_name, created_at, review_notes")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      setApplicationStatus(application);
    } catch (err) {
      console.error("Error checking status:", err);
    } finally {
      setCheckingStatus(false);
    }
  };

  const phoneToEmail = (p: string) => {
    const digits = p.replace(/\D/g, "");
    return `${digits}@phone.almasria.app`;
  };

  const getAuthEmail = () => {
    if (authMethod === "email") return email.trim();
    return phoneToEmail(phone);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const authEmail = getAuthEmail();
    const { data, error } = await supabase.auth.signInWithPassword({ email: authEmail, password });

    if (error) {
      toast({
        title: "خطأ في تسجيل الدخول",
        description: authMethod === "phone"
          ? "رقم الهاتف أو كلمة المرور غير صحيحة"
          : "البريد الإلكتروني أو كلمة المرور غير صحيحة",
        variant: "destructive",
      });
    } else if (data.user) {
      toast({ title: "تم تسجيل الدخول بنجاح ✅" });
      checkDealerStatus(data.user.id);
    }

    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setApplicationStatus(null);
  };

  // If logged in and has application status, show status page
  if (user && (applicationStatus || checkingStatus)) {
    const status = applicationStatus?.status as keyof typeof statusConfig;
    const config = status ? statusConfig[status] : null;

    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 pb-20">
          <div className="container mx-auto px-4 max-w-md">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card border border-border rounded-xl p-6 md:p-8"
            >
              {checkingStatus ? (
                <div className="text-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
                  <p className="text-muted-foreground">جاري التحقق من حالة الطلب...</p>
                </div>
              ) : applicationStatus ? (
                <>
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <ShieldCheck className="w-8 h-8 text-primary" />
                    </div>
                    <h1 className="text-xl font-bold text-card-foreground mb-1">حالة طلب الاعتماد</h1>
                    <p className="text-sm text-muted-foreground">{applicationStatus.business_name}</p>
                  </div>

                  {config && (
                    <div className={`border rounded-lg p-4 mb-6 ${config.bg}`}>
                      <div className="flex items-center gap-3">
                        <config.icon className={`w-6 h-6 ${config.color} shrink-0`} />
                        <div>
                          <p className={`font-bold ${config.color}`}>{config.label}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            تاريخ التقديم: {new Date(applicationStatus.created_at).toLocaleDateString("ar-EG")}
                          </p>
                        </div>
                      </div>
                      {applicationStatus.review_notes && (
                        <p className="text-sm text-muted-foreground mt-3 pt-3 border-t border-current/10">
                          <strong>ملاحظات:</strong> {applicationStatus.review_notes}
                        </p>
                      )}
                    </div>
                  )}

                  {status === "pending" && (
                    <div className="bg-muted rounded-lg p-4 text-center text-sm text-muted-foreground mb-6">
                      <p>طلبك قيد المراجعة حالياً. سيتم التواصل معك قريباً.</p>
                      <p className="mt-1">يمكنك متابعة حالة الطلب من هنا.</p>
                    </div>
                  )}

                  {status === "rejected" && (
                    <div className="text-center mb-6">
                      <p className="text-sm text-muted-foreground mb-3">يمكنك تقديم طلب جديد</p>
                      <Button asChild variant="outline" className="gap-2">
                        <Link to="/dealer-apply">
                          <ArrowRight className="w-4 h-4" />
                          تقديم طلب جديد
                        </Link>
                      </Button>
                    </div>
                  )}

                  {status === "approved" && (
                    <div className="text-center mb-6">
                      <p className="text-sm text-muted-foreground mb-3">تم اعتماد حسابك! يمكنك الآن الوصول لأسعار الجملة.</p>
                      <Button className="gap-2 red-glow" onClick={() => navigate("/dealer")}>
                        <ArrowRight className="w-4 h-4" />
                        دخول لوحة التحكم
                      </Button>
                    </div>
                  )}

                  <button
                    onClick={handleLogout}
                    className="text-sm text-muted-foreground hover:text-primary w-full text-center block mt-4"
                  >
                    تسجيل الخروج
                  </button>
                </>
              ) : (
                <>
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <ShieldCheck className="w-8 h-8 text-primary" />
                    </div>
                    <h1 className="text-xl font-bold text-card-foreground mb-2">لا يوجد طلب اعتماد</h1>
                    <p className="text-sm text-muted-foreground">لم يتم تقديم طلب اعتماد تاجر بعد.</p>
                  </div>
                  <Button asChild className="w-full gap-2 red-glow" size="lg">
                    <Link to="/dealer-apply">
                      <ArrowRight className="w-4 h-4" />
                      تقديم طلب فتح حساب تاجر
                    </Link>
                  </Button>
                  <button
                    onClick={handleLogout}
                    className="text-sm text-muted-foreground hover:text-primary w-full text-center block mt-4"
                  >
                    تسجيل الخروج
                  </button>
                </>
              )}
            </motion.div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const handleGoogleLogin = async () => {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}/dealer-login`,
    });
    if (result.error) {
      toast({ title: "خطأ", description: String(result.error), variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-20">
        <div className="container mx-auto px-4 max-w-md">
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-primary hover:underline mb-8">
            <ArrowRight className="w-4 h-4" />
            العودة للرئيسية
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-border rounded-xl p-6 md:p-8"
          >
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShieldCheck className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-2xl font-black text-card-foreground mb-2">
                {forgotMode ? "نسيت كلمة المرور" : "دخول التجار المعتمدين"}
              </h1>
              <p className="text-muted-foreground text-sm">
                {forgotMode ? "استعد الوصول لحسابك" : "سجّل دخولك بالإيميل أو رقم الهاتف"}
              </p>
            </div>

            {forgotMode ? (
              <ForgotPasswordForm onBack={() => setForgotMode(false)} />
            ) : (
              <>
                {/* Google Login */}
                <Button
                  type="button"
                  variant="outline"
                  className="w-full gap-3 mb-4 h-12 text-sm font-medium"
                  onClick={handleGoogleLogin}
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  تسجيل الدخول بحساب جوجل
                </Button>

                <div className="relative my-5">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-card px-3 text-muted-foreground">أو</span>
                  </div>
                </div>

                {/* Auth Method Toggle */}
                <div className="flex gap-2 mb-5">
                  <Button
                    type="button"
                    variant={authMethod === "phone" ? "default" : "outline"}
                    className="flex-1 gap-2 text-sm"
                    onClick={() => setAuthMethod("phone")}
                  >
                    <Phone className="w-4 h-4" /> رقم الهاتف
                  </Button>
                  <Button
                    type="button"
                    variant={authMethod === "email" ? "default" : "outline"}
                    className="flex-1 gap-2 text-sm"
                    onClick={() => setAuthMethod("email")}
                  >
                    <Mail className="w-4 h-4" /> البريد الإلكتروني
                  </Button>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                  {authMethod === "phone" ? (
                    <div className="space-y-2">
                      <Label htmlFor="dealer-phone" className="text-card-foreground">
                        رقم الهاتف <span className="text-primary">*</span>
                      </Label>
                      <div className="relative">
                        <Input
                          id="dealer-phone"
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="01xxxxxxxxx"
                          required
                          dir="ltr"
                          className="bg-background pl-10"
                        />
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label htmlFor="dealer-email" className="text-card-foreground">
                        البريد الإلكتروني <span className="text-primary">*</span>
                      </Label>
                      <div className="relative">
                        <Input
                          id="dealer-email"
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
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="dealer-password" className="text-card-foreground">
                      كلمة المرور <span className="text-primary">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="dealer-password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="أدخل كلمة المرور"
                        required
                        minLength={6}
                        dir="ltr"
                        className="bg-background pl-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <Button type="submit" className="w-full red-glow" size="lg" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        جاري تسجيل الدخول...
                      </>
                    ) : (
                      "تسجيل الدخول"
                    )}
                  </Button>

                  <button
                    type="button"
                    onClick={() => setForgotMode(true)}
                    className="text-sm text-muted-foreground hover:text-primary w-full text-center block"
                  >
                    نسيت كلمة المرور؟
                  </button>
                </form>
              </>
            )}

            {!forgotMode && (
              <div className="mt-6 pt-6 border-t border-border text-center space-y-3">
                <p className="text-sm text-primary font-semibold">
                  <Link to="/dealer-register" className="hover:underline">
                    ليس لديك حساب؟ أنشئ حساب جديد
                  </Link>
                </p>
                <Button variant="outline" className="gap-2" asChild>
                  <Link to="/dealer-apply">
                    <ArrowRight className="w-4 h-4" />
                    طلب فتح حساب تاجر معتمد
                  </Link>
                </Button>
              </div>
            )}
          </motion.div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default DealerLogin;
