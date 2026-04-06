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
        className="sm:max-w-md [&>button]:hidden"
        dir="rtl"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Car className="w-5 h-5 text-primary" />
            </div>
            عربيتك إيه؟
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground leading-relaxed">
            حدد نوع عربيتك وسنة الصنع عشان نقدر نعرض لك قطع الغيار المناسبة
            <Sparkles className="w-3.5 h-3.5 text-primary inline mr-1" />
          </p>

          <CarModelSelector
            carModel={carModel}
            carYear={carYear}
            onModelChange={setCarModel}
            onYearChange={setCarYear}
            required
            compact
          />

          <Button
            onClick={handleSave}
            disabled={!carModel || !carYear || loading}
            className="w-full gap-2"
          >
            {loading ? "جاري الحفظ..." : "تأكيد وحفظ"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CarProfilePopup;
