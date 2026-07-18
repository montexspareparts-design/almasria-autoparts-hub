import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Phone, MessageCircle, Sparkles } from "lucide-react";

const SKIP_KEY = "phone_prompt_skipped_v1";

/**
 * يظهر مرة واحدة للمستخدمين القدامى المسجّلين بإيميل بدون رقم تليفون
 * يطلب منهم إضافة رقم الموبايل + موافقة على واتساب (اختياري)
 */
export const AddPhonePrompt = () => {
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [whatsappOptIn, setWhatsappOptIn] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    let mounted = true;

    const checkProfile = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user || !mounted) return;

        // مش هنزعج اللي اختاروا "بعدين" قبل كده
        if (localStorage.getItem(SKIP_KEY) === session.user.id) return;

        // تخطي لو المستخدم سجل دخول برقم تليفون أصلاً
        const email = session.user.email || "";
        if (email.endsWith("@phone.almasria.local")) return;

        // تأخير بسيط لتجنب الإزعاج اللحظي
        setTimeout(async () => {
          if (!mounted) return;
          const { data: profile } = await supabase
            .from("profiles")
            .select("phone")
            .eq("user_id", session.user.id)
            .maybeSingle();

          if (!mounted) return;
          if (!profile?.phone || profile.phone.trim() === "") {
            setUserId(session.user.id);
            setOpen(true);
          }
        }, 4000);
      } catch (e) {
        // silent
      }
    };

    checkProfile();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") checkProfile();
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const handleSave = async () => {
    const trimmed = phone.trim();
    if (!/^01[0-9]{9}$/.test(trimmed)) {
      toast({
        title: "رقم موبايل غير صحيح",
        description: "أدخل رقم مصري يبدأ بـ 01 ومكون من 11 رقم",
        variant: "destructive",
      });
      return;
    }
    if (!userId) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .upsert(
          { user_id: userId, phone: trimmed, whatsapp_opt_in: whatsappOptIn },
          { onConflict: "user_id" }
        );

      if (error) {
        const msg = /duplicate|unique/i.test(error.message || "")
          ? "رقم الهاتف مسجل بالفعل بحساب آخر."
          : "تعذر حفظ رقم الهاتف الآن. يرجى المحاولة مرة أخرى.";
        toast({ title: msg, variant: "destructive" });
        setSaving(false);
        return;
      }

      toast({ title: "تم حفظ رقم الموبايل ✅", description: "هنقدر نتواصل معاك بشكل أسرع دلوقتي" });
      localStorage.setItem(SKIP_KEY, userId);
      setSaving(false);
      setOpen(false);
    } catch (err) {
      console.error("[AddPhonePrompt] save failed:", err);
      toast({
        title: "تعذر حفظ رقم الهاتف الآن. يرجى المحاولة مرة أخرى.",
        variant: "destructive",
      });
      setSaving(false);
    }
  };

  const handleSkip = () => {
    if (userId) localStorage.setItem(SKIP_KEY, userId);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleSkip(); }}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-right">
            <Sparkles className="w-5 h-5 text-primary" />
            أضف رقم موبايلك
          </DialogTitle>
          <DialogDescription className="text-right text-[13px] leading-relaxed">
            علشان نقدر نتواصل معاك مباشرة ونرسل لك عروض الأسعار وتأكيدات الطلبات بسرعة. ده هياخد ثانية واحدة بس.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pt-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground/80 text-right block">
              رقم الموبايل <span className="text-primary">*</span>
            </Label>
            <div className="relative">
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="01xxxxxxxxx"
                dir="ltr"
                inputMode="tel"
                maxLength={11}
                style={{ fontSize: "16px" }}
                className="h-11 pl-10 text-base"
                autoFocus
              />
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
            </div>
          </div>

          <label className="flex items-start gap-2 cursor-pointer pt-1">
            <Checkbox
              checked={whatsappOptIn}
              onCheckedChange={(c) => setWhatsappOptIn(!!c)}
              className="w-4 h-4 mt-0.5"
            />
            <span className="text-[12px] leading-relaxed text-foreground/75 flex items-center gap-1.5 flex-wrap">
              <MessageCircle className="w-3.5 h-3.5 text-[#25D366] shrink-0" />
              أوافق على التواصل معي عبر <strong className="text-foreground">واتساب</strong>
            </span>
          </label>

          <div className="flex gap-2 pt-3">
            <Button onClick={handleSave} disabled={saving} className="flex-1">
              {saving ? "جاري الحفظ..." : "حفظ الرقم"}
            </Button>
            <Button onClick={handleSkip} variant="ghost" className="text-muted-foreground">
              بعدين
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddPhonePrompt;
