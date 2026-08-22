import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Car, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import CarModelSelector from "./CarModelSelector";

const CarProfilePopup = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [carModel, setCarModel] = useState("");
  const [carYear, setCarYear] = useState("");
  const [loading, setLoading] = useState(false);
  const [isDealer, setIsDealer] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) return;

    // Already shown once — never show again
    const SHOWN_KEY = "car-profile-popup-shown";
    if (localStorage.getItem(SHOWN_KEY)) {
      setIsDealer(false); // prevent null guard from blocking render
      return;
    }

    const checkProfile = async () => {
      const { data: dealerData } = await supabase
        .from("dealer_accounts")
        .select("id")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();

      if (dealerData) {
        setIsDealer(true);
        return;
      }
      setIsDealer(false);

      const { data } = await supabase
        .from("profiles")
        .select("car_model, car_year")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data && !data.car_model) {
        setTimeout(() => setOpen(true), 3000);
        localStorage.setItem(SHOWN_KEY, "1");
      }
    };
    checkProfile();
  }, [user]);

  const handleSave = async () => {
    if (!carModel || !carYear || !user) return;
    setLoading(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        car_model: carModel,
        car_year: carYear ? parseInt(carYear) : null,
      })
      .eq("user_id", user.id);

    if (error) {
      toast.error("حدث خطأ أثناء حفظ البيانات");
    } else {
      toast.success("تم حفظ بيانات عربيتك بنجاح! هنقترحلك قطع غيار مناسبة 🚗");
      setOpen(false);
    }
    setLoading(false);
  };

  if (!user || isDealer === null || isDealer) return null;

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="overflow-hidden border-gold/25 bg-[hsl(var(--carbon))] p-0 text-white shadow-[var(--shadow-spotlight)] sm:max-w-md [&>button]:hidden"
        dir="rtl"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <div className="pointer-events-none absolute inset-0 opacity-70" style={{ background: "var(--gradient-spotlight)" }} />
        <div className="pointer-events-none absolute -top-24 left-0 h-48 w-48 rounded-full bg-primary/20 blur-3xl" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/70 to-transparent" />

        <div className="relative p-6">
          <DialogHeader>
            <div className="mb-4 flex items-center gap-3">
              <div className="relative h-12 w-12 shrink-0">
                <div className="absolute inset-0 rounded-2xl bg-primary/25 blur-lg" />
                <div className="relative flex h-full w-full items-center justify-center rounded-2xl border border-gold/30 bg-white/[0.06] backdrop-blur-xl">
                  <Car className="h-5 w-5 text-gold" />
                </div>
              </div>
              <div className="text-right">
                <DialogTitle className="text-right text-lg font-black tracking-tight text-white">
                  عربيتك إيه؟
                </DialogTitle>
                <span className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-gold/25 bg-white/5 px-2.5 py-0.5 text-[10px] font-bold text-gold/90">
                  <Sparkles className="h-3 w-3" />
                  قطع غيار مطابقة لموديلك بالظبط
                </span>
              </div>
            </div>
          </DialogHeader>

          <div className="mx-auto my-5 h-px w-full bg-gradient-to-r from-transparent via-gold/30 to-transparent" />

          <div className="space-y-5">
            <p className="text-[13px] leading-relaxed text-white/55">
              حدد نوع عربيتك وسنة الصنع عشان نقدر نعرض لك قطع الغيار المناسبة.
            </p>

            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4 [&_button]:border-white/12 [&_button]:bg-white/[0.05] [&_button]:text-white [&_label]:text-white/60">
              <CarModelSelector
                carModel={carModel}
                carYear={carYear}
                onModelChange={setCarModel}
                onYearChange={setCarYear}
                required
                compact
              />
            </div>

            <Button
              onClick={handleSave}
              disabled={!carModel || !carYear || loading}
              className="h-12 w-full gap-2 rounded-xl text-sm font-bold shadow-red-glow"
            >
              {loading ? "جاري الحفظ..." : "تأكيد وحفظ"}
            </Button>

            <p className="text-center text-[10px] text-white/30">
              تقدر تغيّر بيانات عربيتك في أي وقت من صفحة حسابك
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};


export default CarProfilePopup;
