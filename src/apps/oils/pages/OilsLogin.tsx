import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, CheckCircle2, Eye, EyeOff, Loader2, Lock, Mail, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { mapLoginError } from "@/lib/loginErrors";
import { haptic } from "@/lib/haptics";
import OilsBrandMark from "../components/OilsBrandMark";

/**
 * دخول تطبيق جملة الزيوت — إيميل + باسورد (نفس حساب التاجر الموجود).
 * طلب انضمام جديد → /dealer-apply (نفس flow المعتمد).
 */
const OilsLogin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forgotMode, setForgotMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setLoading(true);
    setError(null);
    try {
      const { error: err } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (err) {
        const mapped = mapLoginError(err);
        setError(mapped.description ? `${mapped.title} ${mapped.description}` : mapped.title);
        return;
      }
      void haptic("medium");
      navigate("/oils", { replace: true });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError(null);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (resetError) {
      setError("تعذر إرسال رابط تغيير كلمة المرور الآن. حاول مرة أخرى.");
    } else {
      setResetSent(true);
    }
    setLoading(false);
  };

  return (
    <main className="oils-login" dir="rtl">
      <div className="oils-login-brand">
        <OilsBrandMark className="oils-login-mark" showName />
        <span>ALMASRIA WHOLESALE</span>
        <h1>قوة المحرك تبدأ<br /><em>من اختيار موثوق</em></h1>
        <p>أسعار جملة مخصصة، مخزون واضح، وطلب أسرع.</p>
      </div>

      <form onSubmit={forgotMode ? handlePasswordReset : handleLogin} className="oils-login-sheet">
        <h2>{forgotMode ? "استعادة كلمة المرور" : "دخول المصرية زيوت جملة"}</h2>
        {forgotMode && resetSent ? (
          <div className="oils-reset-success">
            <CheckCircle2 />
            <strong>راجع بريدك الإلكتروني</strong>
            <p>أرسلنا لك رابطًا آمنًا لتعيين كلمة مرور جديدة.</p>
            <button type="button" onClick={() => { setForgotMode(false); setResetSent(false); setError(null); }}>
              <ArrowRight /> العودة لتسجيل الدخول
            </button>
          </div>
        ) : (
          <>
        <div>
          <label className="oils-label" htmlFor="oils-email">البريد الإلكتروني</label>
          <div className="relative">
            <Mail className="oils-field-icon" />
            <input
              id="oils-email"
              type="email"
              dir="ltr"
              autoComplete="email"
              className="oils-input !pr-10 text-left"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
        </div>

        {!forgotMode && <div>
          <label className="oils-label" htmlFor="oils-password">كلمة المرور</label>
          <div className="relative">
            <Lock className="oils-field-icon" />
            <input
              id="oils-password"
              type={showPassword ? "text" : "password"}
              dir="ltr"
              autoComplete="current-password"
              className="oils-input !pr-10 !pl-10 text-left"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
              className="oils-password-toggle"
              onClick={() => setShowPassword((s) => !s)}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>}

        {error && (
          <p className="oils-form-error">{error}</p>
        )}

        <button type="submit" className="oils-btn-primary" disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : forgotMode ? <Mail className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
          {forgotMode ? "إرسال رابط التغيير" : "دخول المصرية زيوت جملة"}
        </button>
        {!forgotMode && (
          <button type="button" className="oils-forgot-password" onClick={() => { setForgotMode(true); setError(null); }}>
            نسيت كلمة المرور؟
          </button>
        )}
        <div className="oils-join-row">
          {forgotMode ? (
            <button type="button" onClick={() => { setForgotMode(false); setError(null); }}>العودة لتسجيل الدخول</button>
          ) : (
            <><span>لسه مش تاجر معانا؟</span><button type="button" onClick={() => navigate("/oils/join")}>قدّم طلب انضمام</button></>
          )}
        </div>
          </>
        )}
      </form>

      <p className="oils-login-trust"><ShieldCheck /> بياناتك وأسعارك التجارية محمية</p>
    </main>
  );
};

export default OilsLogin;
