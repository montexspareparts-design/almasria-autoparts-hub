import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Phone, MessageCircle, Sparkles } from "lucide-react";
import { recordDiagnostic } from "@/lib/runtimeDiagnostics";

const SKIP_KEY = "phone_prompt_skipped_v1";

interface AddPhonePromptProps {
  open: boolean;
  userId: string;
  onCompleted: () => Promise<void> | void;
  onSkipped?: () => Promise<void> | void;
}

/**
 * يظهر مرة واحدة للمستخدمين القدامى المسجّلين بإيميل بدون رقم تليفون
 * يطلب منهم إضافة رقم الموبايل + موافقة على واتساب (اختياري)
 */
export const AddPhonePrompt = ({ open, userId, onCompleted, onSkipped }: AddPhonePromptProps) => {
  const [phone, setPhone] = useState("");
  const [whatsappOptIn, setWhatsappOptIn] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    try {
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
      const { data: taken, error: checkError } = await supabase.rpc("phone_already_registered", { _phone: trimmed });
      if (checkError) {
        console.warn("[PHONE] duplicate check failed", checkError.message);
      }

      if (taken === true) {
        const { data: mine } = await supabase
          .from("profiles")
          .select("phone")
          .eq("user_id", userId)
          .maybeSingle();
        if (mine?.phone !== trimmed) {
          toast({ title: "رقم الهاتف مسجل بالفعل بحساب آخر.", variant: "destructive" });
          setSaving(false);
          return;
        }
      }

      const { error } = await supabase
        .from("profiles")
        .upsert(
          { user_id: userId, phone: trimmed },
          { onConflict: "user_id" }
        );

      if (error) {
        console.error("[PAUTH] ADD_PHONE_UPSERT_FAIL:", error);
        const msg = /duplicate|unique/i.test(error.message || "")
          ? "رقم الهاتف مسجل بالفعل بحساب آخر."
          : "تعذر حفظ رقم الهاتف الآن. يرجى المحاولة مرة أخرى.";
        toast({ title: msg, variant: "destructive" });
        setSaving(false);
        return;
      }

      const { error: consentError } = await supabase
        .from("profiles")
        .update({ whatsapp_opt_in: whatsappOptIn } as never)
        .eq("user_id", userId);
      if (consentError) {
        console.warn("[PHONE] WhatsApp consent save failed", consentError.message);
      }

      toast({ title: "تم حفظ رقم الموبايل ✅", description: "هنقدر نتواصل معاك بشكل أسرع دلوقتي" });
      await onCompleted();
      setSaving(false);
    } catch (err) {
      recordDiagnostic("phone", err, "AddPhonePrompt.save");
      try {
        toast({
          title: "تعذر حفظ رقم الهاتف الآن. يرجى المحاولة مرة أخرى.",
          variant: "destructive",
        });
      } catch { /* ignore */ }
      setSaving(false);
    }
  };


  const handleSkip = async () => {
    if (userId) localStorage.setItem(SKIP_KEY, userId);
    await onSkipped?.();
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
