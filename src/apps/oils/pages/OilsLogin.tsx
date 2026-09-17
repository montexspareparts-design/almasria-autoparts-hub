import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Droplets, Eye, EyeOff, Loader2, Lock, Mail, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { mapLoginError } from "@/lib/loginErrors";
import { haptic } from "@/lib/haptics";

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

  return (
    <main className="oils-login" dir="rtl">
      <div className="oils-login-brand">
        <div className="oils-login-mark">
          <Droplets />
        </div>
        <span>ALMASRIA WHOLESALE</span>
        <h1>كل احتياجات<br />شغلك في مكان واحد</h1>
        <p>أسعار جملة مخصصة، مخزون واضح، وطلب أسرع.</p>
      </div>

      <form onSubmit={handleLogin} className="oils-login-sheet">
        <h2>دخول حساب الجملة</h2>
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

        <div>
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
        </div>

        {error && (
          <p className="oils-form-error">{error}</p>
        )}

        <button type="submit" className="oils-btn-primary" disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
          دخول حساب الجملة
        </button>
        <div className="oils-join-row">
          <span>لسه مش تاجر معانا؟</span>
          <button type="button" onClick={() => navigate("/dealer-apply")}>قدّم طلب انضمام</button>
        </div>
      </form>

      <p className="oils-login-trust"><ShieldCheck /> بياناتك وأسعارك التجارية محمية</p>
    </main>
  );
};

export default OilsLogin;
