import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Lock } from "lucide-react";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Listen for PASSWORD_RECOVERY event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecovery(true);
      }
    });

    // Also check URL hash for type=recovery
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setIsRecovery(true);
    }

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({
        title: "كلمة المرور غير متطابقة",
        description: "تأكد من تطابق كلمة المرور وتأكيدها",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "كلمة المرور قصيرة",
        description: "يجب أن تكون كلمة المرور 6 أحرف على الأقل",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      toast({
        title: "خطأ في تحديث كلمة المرور",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "تم تغيير كلمة المرور بنجاح" });
      navigate("/");
    }
    setLoading(false);
  };

  if (!isRecovery) {
    return (
      <div className="min-h-screen bg-secondary flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="bg-card border border-border rounded-lg p-8">
            <Lock className="w-12 h-12 text-primary mx-auto mb-4" />
            <h1 className="text-xl font-bold text-card-foreground mb-2">
              رابط غير صالح
            </h1>
            <p className="text-muted-foreground mb-6">
              يرجى استخدام الرابط المرسل إلى بريدك الإلكتروني لإعادة تعيين كلمة المرور
            </p>
            <Button onClick={() => navigate("/auth")} className="w-full">
              العودة لتسجيل الدخول
            </Button>
          </div>
        </div>
      </div>
    );
  }

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
            إعادة تعيين كلمة المرور
          </h1>
          <p className="text-secondary-foreground/60 mt-2">
            أدخل كلمة المرور الجديدة
          </p>
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-card-foreground">
                كلمة المرور الجديدة <span className="text-primary">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="أدخل كلمة المرور الجديدة"
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

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-card-foreground">
                تأكيد كلمة المرور <span className="text-primary">*</span>
              </Label>
              <Input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="أعد إدخال كلمة المرور"
                required
                minLength={6}
                dir="ltr"
                className="bg-background"
              />
            </div>

            <Button type="submit" className="w-full red-glow" disabled={loading}>
              {loading ? "جاري التحديث..." : "تحديث كلمة المرور"}
            </Button>
          </form>
        </div>

        <div className="text-center mt-4">
          <a href="/auth" className="text-sm text-muted-foreground hover:text-primary">
            العودة لتسجيل الدخول
          </a>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
