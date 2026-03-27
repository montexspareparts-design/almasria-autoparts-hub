import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Car, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import CarModelSelector from "./CarModelSelector";

const POPUP_DISMISSED_KEY = "almasria_car_popup_dismissed";

const CarProfilePopup = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [carModel, setCarModel] = useState("");
  const [carYear, setCarYear] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    const dismissed = localStorage.getItem(POPUP_DISMISSED_KEY);
    if (dismissed) return;

    const checkProfile = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("car_model, car_year")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data && !data.car_model) {
        // Delay popup to not interrupt initial page load
        setTimeout(() => setOpen(true), 3000);
      }
    };
    checkProfile();
  }, [user]);

  const handleSave = async () => {
    if (!carModel || !user) return;
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

  const handleDismiss = () => {
    localStorage.setItem(POPUP_DISMISSED_KEY, "true");
    setOpen(false);
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) handleDismiss(); }}>
      <DialogContent className="sm:max-w-md" dir="rtl">
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
            قولنا عربيتك إيه وهنقترحلك قطع الغيار اللي تناسبها مباشرة
            <Sparkles className="w-3.5 h-3.5 text-primary inline mr-1" />
          </p>

          <CarModelSelector
            carModel={carModel}
            carYear={carYear}
            onModelChange={setCarModel}
            onYearChange={setCarYear}
            compact
          />

          <div className="flex gap-2 pt-2">
            <Button onClick={handleSave} disabled={!carModel || loading} className="flex-1 gap-2">
              {loading ? "جاري الحفظ..." : "حفظ"}
            </Button>
            <Button variant="ghost" onClick={handleDismiss} className="text-muted-foreground">
              لاحقاً
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CarProfilePopup;
