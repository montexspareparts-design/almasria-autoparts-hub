import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Mail } from "lucide-react";

interface ForgotPasswordFormProps {
  onBack: () => void;
}

const ForgotPasswordForm = ({ onBack }: ForgotPasswordFormProps) => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleEmailReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } else {
      toast({
        title: "تم إرسال رابط إعادة التعيين",
        description: "تحقق من بريدك الإلكتروني لإعادة تعيين كلمة المرور",
      });
      onBack();
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleEmailReset} className="space-y-4">
      <p className="text-sm text-muted-foreground text-center mb-2">
        أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة تعيين كلمة المرور
      </p>
      <div className="space-y-2">
        <Label htmlFor="forgot-email" className="text-card-foreground">البريد الإلكتروني</Label>
        <div className="relative">
          <Input
            id="forgot-email"
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
      <Button type="submit" className="w-full red-glow" disabled={loading}>
        {loading ? "جاري الإرسال..." : "إرسال رابط إعادة التعيين"}
      </Button>
      <button type="button" onClick={onBack} className="text-sm text-primary hover:underline w-full text-center">
        العودة لتسجيل الدخول
      </button>
    </form>
  );
};

export default ForgotPasswordForm;
