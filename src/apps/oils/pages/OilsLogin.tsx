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
    <div className="min-h-[100dvh] flex flex-col justify-center px-5 py-10" dir="rtl">
      {/* الشعار */}
      <div className="flex flex-col items-center mb-8">
        <div
          className="w-[72px] h-[72px] rounded-[22px] grid place-items-center mb-4"
          style={{
            background: "linear-gradient(135deg, hsl(var(--oils-accent)), hsl(var(--oils-accent-2)))",
            boxShadow: "0 18px 40px -12px hsl(var(--oils-accent) / 0.5)",
          }}
        >
          <Droplets className="w-9 h-9" style={{ color: "hsl(210 62% 9%)" }} />
        </div>
        <h1 className="text-[20px] font-extrabold">المصرية لجملة الزيوت</h1>
        <p className="text-[12px] mt-1.5" style={{ color: "hsl(var(--oils-muted))" }}>
          تطبيق الجملة لمحلات ومراكز تغيير الزيوت والموزعين
        </p>
      </div>

      <form onSubmit={handleLogin} className="oils-card p-5 space-y-4">
        <div>
          <label className="oils-label" htmlFor="oils-email">البريد الإلكتروني</label>
          <div className="relative">
            <Mail className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "hsl(var(--oils-muted))" }} />
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
            <Lock className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "hsl(var(--oils-muted))" }} />
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
              className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: "hsl(var(--oils-muted))" }}
              onClick={() => setShowPassword((s) => !s)}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {error && (
          <p className="text-[12px] font-bold text-center" style={{ color: "hsl(var(--oils-danger))" }}>{error}</p>
        )}

        <button type="submit" className="oils-btn-primary" disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
          دخول حساب الجملة
        </button>
      </form>

      <div className="mt-5 text-center space-y-3">
        <p className="text-[12px]" style={{ color: "hsl(var(--oils-muted))" }}>
          لسه مش تاجر معانا؟
        </p>
        <button type="button" className="oils-btn-ghost w-full" onClick={() => navigate("/dealer-apply")}>
          قدّم طلب انضمام كتاجر جملة
        </button>
        <p className="text-[10.5px] leading-relaxed" style={{ color: "hsl(var(--oils-muted))" }}>
          يتم مراجعة الطلب خلال 48 ساعة وتفعيل أسعار الجملة الخاصة بك.
        </p>
      </div>
    </div>
  );
};

export default OilsLogin;
