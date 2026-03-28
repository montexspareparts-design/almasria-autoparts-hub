import { useState } from "react";
import { Phone, Loader2, UserCheck } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CompleteProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
}

const CompleteProfileDialog = ({ open, onOpenChange, userId }: CompleteProfileDialogProps) => {
  const { toast } = useToast();
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = phone.trim();
    if (!trimmed || trimmed.length < 10) {
      toast({ title: "يرجى إدخال رقم هاتف صحيح", variant: "destructive" });
      return;
    }
    setLoading(true);

    const { error } = await supabase
      .from("profiles")
      .update({ phone: trimmed })
      .eq("user_id", userId);

    if (error) {
      toast({ title: "حدث خطأ", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "تم حفظ رقم الهاتف بنجاح ✅" });
      onOpenChange(false);
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm p-0 overflow-hidden rounded-2xl border-border/60" dir="rtl">
        <div className="bg-secondary px-6 pt-6 pb-5 text-center">
          <div className="w-14 h-14 rounded-2xl bg-primary/15 border border-primary/20 flex items-center justify-center mx-auto mb-3">
            <UserCheck className="w-7 h-7 text-primary" />
          </div>
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-secondary-foreground">
              أكمل بياناتك
            </DialogTitle>
          </DialogHeader>
          <p className="text-secondary-foreground/60 text-sm mt-1">
            أدخل رقم هاتفك للتواصل معك بخصوص الطلبات
          </p>
        </div>

        <form onSubmit={handleSubmit} className="px-6 pb-6 pt-4 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold">رقم الهاتف</Label>
            <div className="relative">
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="01xxxxxxxxx"
                required
                dir="ltr"
                className="bg-background pl-9 h-11 rounded-xl text-sm"
                type="tel"
              />
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
            </div>
          </div>

          <Button type="submit" className="w-full h-11 rounded-xl font-bold" disabled={loading}>
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> جاري الحفظ...</> : "حفظ رقم الهاتف"}
          </Button>

          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="w-full text-xs text-muted-foreground hover:underline"
          >
            لاحقاً
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CompleteProfileDialog;
