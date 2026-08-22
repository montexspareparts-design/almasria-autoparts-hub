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
      const { error } = await supabase.rpc("save_my_profile_phone", {
        _phone: trimmed,
        _whatsapp_opt_in: whatsappOptIn,
      });

      if (error) {
        console.error("[PAUTH] ADD_PHONE_SAVE_FAIL:", error);
        const msg = /duplicate|unique|already/i.test(error.message || "")
          ? "رقم الهاتف مسجل بالفعل بحساب آخر."
          : "تعذر حفظ رقم الهاتف الآن. يرجى المحاولة مرة أخرى.";
        toast({ title: msg, variant: "destructive" });
        setSaving(false);
        return;
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
      <DialogContent
        className="max-w-md overflow-hidden border-gold/25 bg-[hsl(var(--carbon))] p-0 text-white shadow-[var(--shadow-spotlight)]"
        dir="rtl"
      >
        {/* Ambient luxury glow */}
        <div className="pointer-events-none absolute inset-0 opacity-70" style={{ background: "var(--gradient-spotlight)" }} />
        <div className="pointer-events-none absolute -top-24 right-0 h-48 w-48 rounded-full bg-primary/20 blur-3xl" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/70 to-transparent" />

        <div className="relative p-6">
          <DialogHeader>
            <div className="mb-4 flex items-center gap-3">
              <div className="relative h-12 w-12 shrink-0">
                <div className="absolute inset-0 rounded-2xl bg-primary/25 blur-lg" />
                <div className="relative flex h-full w-full items-center justify-center rounded-2xl border border-gold/30 bg-white/[0.06] backdrop-blur-xl">
                  <Phone className="h-5 w-5 text-gold" />
                </div>
              </div>
              <div className="text-right">
                <DialogTitle className="text-right text-lg font-black tracking-tight text-white">
                  أضف رقم موبايلك
                </DialogTitle>
                <span className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-gold/25 bg-white/5 px-2.5 py-0.5 text-[10px] font-bold text-gold/90">
                  <Sparkles className="h-3 w-3" />
                  خدمة أسرع وأولوية في العروض
                </span>
              </div>
            </div>
            <DialogDescription className="text-right text-[13px] leading-relaxed text-white/55">
              علشان نقدر نتواصل معاك مباشرة ونرسل لك عروض الأسعار وتأكيدات الطلبات بسرعة. ده هياخد ثانية واحدة بس.
            </DialogDescription>
          </DialogHeader>

          <div className="mx-auto my-5 h-px w-full bg-gradient-to-r from-transparent via-gold/30 to-transparent" />

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="block text-right text-[11px] font-bold tracking-wide text-white/60">
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
                  className="h-12 rounded-xl border-white/10 bg-white/[0.04] pl-10 text-base text-white placeholder:text-white/25 focus-visible:border-gold/50 focus-visible:ring-gold/20"
                  autoFocus
                />
                <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gold/60" />
              </div>
            </div>

            <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-white/8 bg-white/[0.03] p-3">
              <Checkbox
                checked={whatsappOptIn}
                onCheckedChange={(c) => setWhatsappOptIn(!!c)}
                className="mt-0.5 h-4 w-4 border-white/25 data-[state=checked]:border-[#25D366] data-[state=checked]:bg-[#25D366]"
              />
              <span className="flex flex-wrap items-center gap-1.5 text-[12px] leading-relaxed text-white/70">
                <MessageCircle className="h-3.5 w-3.5 shrink-0 text-[#25D366]" />
                أوافق على التواصل معي عبر <strong className="text-white">واتساب</strong>
              </span>
            </label>

            <div className="flex gap-2 pt-1">
              <Button
                onClick={handleSave}
                disabled={saving}
                className="h-12 flex-1 rounded-xl text-sm font-bold shadow-red-glow"
              >
                {saving ? "جاري الحفظ..." : "حفظ الرقم"}
              </Button>
              <Button
                onClick={handleSkip}
                variant="ghost"
                className="h-12 rounded-xl text-white/45 hover:bg-white/5 hover:text-white/70"
              >
                بعدين
              </Button>
            </div>

            <p className="pt-1 text-center text-[10px] text-white/30">
              بياناتك محفوظة بسرية تامة ولا تُشارك مع أي طرف ثالث
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};


export default AddPhonePrompt;
