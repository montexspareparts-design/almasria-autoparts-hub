import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Loader2, Car, Bus, Check } from "lucide-react";

const vehicleOptions = [
  {
    id: "sedan",
    label: "ملاكي",
    description: "كورولا، كامري، ياريس، بيلتا، لاند كروزر، فورتشنر، راف فور ...",
    icon: Car,
  },
  {
    id: "microbus",
    label: "نقل وميكروباص",
    description: "هاي اس، كوستر، هاي لوكس ...",
    icon: Bus,
  },
];

interface VehicleTypeDialogProps {
  open: boolean;
  dealerAccountId: string;
  onComplete: (types: string[]) => void;
}

const VehicleTypeDialog = ({ open, dealerAccountId, onComplete }: VehicleTypeDialogProps) => {
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const toggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    if (selected.length === 0) {
      toast({ title: "اختر نوع واحد على الأقل", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("dealer_accounts")
      .update({ vehicle_types: selected } as any)
      .eq("id", dealerAccountId);

    if (error) {
      toast({ title: "حدث خطأ", description: "فشل حفظ الاختيار", variant: "destructive" });
    } else {
      toast({
        title: "✅ تم الحفظ بنجاح",
        description: "سنعرض لك الأصناف المناسبة لتجارتك",
        className: "bg-green-50 border-green-200 dark:bg-green-950/50 dark:border-green-800 text-green-900 dark:text-green-100",
      });
      onComplete(selected);
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-md [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        dir="rtl"
      >
        <DialogHeader className="text-center pb-2">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
            <Car className="w-7 h-7 text-primary" />
          </div>
          <DialogTitle className="text-lg">بتشتغل في عربيات إيه؟</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            اختر نوع أو أكثر عشان نعرض لك الأصناف المناسبة
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {vehicleOptions.map((opt) => {
            const isSelected = selected.includes(opt.id);
            return (
              <button
                key={opt.id}
                onClick={() => toggle(opt.id)}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-200 text-right ${
                  isSelected
                    ? "border-primary bg-primary/5 shadow-sm shadow-primary/10"
                    : "border-border/50 bg-card hover:border-primary/30 hover:bg-muted/30"
                }`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                  isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}>
                  <opt.icon className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-foreground text-sm">{opt.label}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{opt.description}</p>
                </div>
                {isSelected && (
                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shrink-0">
                    <Check className="w-3.5 h-3.5 text-primary-foreground" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <Button
          onClick={handleSave}
          disabled={selected.length === 0 || saving}
          className="w-full mt-2 h-11 text-sm font-bold"
        >
          {saving ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <Check className="w-4 h-4 ml-2" />}
          تأكيد الاختيار
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default VehicleTypeDialog;
