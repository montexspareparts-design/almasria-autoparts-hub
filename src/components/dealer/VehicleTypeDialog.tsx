import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Loader2, Car, Bus, Check, Sparkles, PartyPopper, UserCog, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";

const vehicleOptions = [
  {
    id: "sedan",
    label: "ملاكي",
    description: "كورولا، كامري، ياريس، بيلتا، لاند كروزر، فورتشنر، راف فور ...",
    icon: Car,
    gradient: "from-red-500 to-rose-600",
    bgGlow: "bg-red-500/10",
    ring: "ring-red-500/30",
  },
  {
    id: "microbus",
    label: "نقل وميكروباص",
    description: "هاي اس، كوستر، هاي لوكس ...",
    icon: Bus,
    gradient: "from-blue-500 to-indigo-600",
    bgGlow: "bg-blue-500/10",
    ring: "ring-blue-500/30",
  },
];

interface VehicleTypeDialogProps {
  open: boolean;
  dealerAccountId: string;
  dealerName?: string;
  onComplete: (types: string[]) => void;
}

type Step = "welcome" | "vehicle" | "profile_suggestion";

const VehicleTypeDialog = ({ open, dealerAccountId, dealerName, onComplete }: VehicleTypeDialogProps) => {
  const [step, setStep] = useState<Step>("welcome");
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

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
      setStep("profile_suggestion");
    }
    setSaving(false);
  };

  const handleFinish = () => {
    onComplete(selected);
  };

  const handleGoToSettings = () => {
    onComplete(selected);
    navigate("/dealer?tab=settings");
  };

  const displayName = dealerName || "تاجرنا";

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-md [&>button]:hidden max-h-[90vh] flex flex-col overflow-hidden border-none shadow-2xl"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        dir="rtl"
      >
        {/* Decorative background blobs */}
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

        <AnimatePresence mode="wait">
          {/* ===== STEP 1: Welcome ===== */}
          {step === "welcome" && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center text-center py-4"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
                className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary to-red-600 flex items-center justify-center mb-5 shadow-xl shadow-primary/25"
              >
                <PartyPopper className="w-10 h-10 text-white" />
              </motion.div>

              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="text-2xl font-black text-foreground mb-2"
              >
                أهلاً بيك يا {displayName}! 🎉
              </motion.h2>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.35 }}
                className="text-muted-foreground text-sm leading-relaxed mb-2 max-w-[300px]"
              >
                نورتنا في المصرية لقطع غيار تويوتا.
                <br />
                حسابك جاهز وتقدر تطلب قطع الغيار وتتابع طلباتك بسهولة.
              </motion.p>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.45 }}
                className="text-muted-foreground text-xs mb-6"
              >
                خلينا نعرف شغلك عشان نساعدك أحسن 👇
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="w-full"
              >
                <Button
                  onClick={() => setStep("vehicle")}
                  className="w-full h-12 text-sm font-bold rounded-xl shadow-lg shadow-primary/20"
                >
                  <Sparkles className="w-4 h-4 ml-2" />
                  يلا نبدأ
                </Button>
              </motion.div>
            </motion.div>
          )}

          {/* ===== STEP 2: Vehicle Type Selection ===== */}
          {step === "vehicle" && (
            <motion.div
              key="vehicle"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.3 }}
            >
              <DialogHeader className="text-center pb-2 relative">
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
                  className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-red-600 flex items-center justify-center mb-3 shadow-lg shadow-primary/25"
                >
                  <Car className="w-8 h-8 text-white" />
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <DialogTitle className="text-xl font-black">بتشتغل في عربيات إيه؟</DialogTitle>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <DialogDescription className="text-sm text-muted-foreground flex items-center justify-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                    اختر نوع أو أكثر عشان نعرض لك الأصناف المناسبة
                  </DialogDescription>
                </motion.div>
              </DialogHeader>

              <div className="space-y-3 py-2 overflow-y-auto flex-1">
                {vehicleOptions.map((opt, index) => {
                  const isSelected = selected.includes(opt.id);
                  return (
                    <motion.button
                      key={opt.id}
                      initial={{ opacity: 0, x: 30 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + index * 0.12, type: "spring", stiffness: 300, damping: 25 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => toggle(opt.id)}
                      className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all duration-300 text-right relative overflow-hidden ${
                        isSelected
                          ? `border-primary/60 ${opt.bgGlow} shadow-md shadow-primary/10 ring-2 ${opt.ring}`
                          : "border-border/40 bg-card hover:border-primary/20 hover:bg-muted/20"
                      }`}
                    >
                      <AnimatePresence>
                        {isSelected && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.5 }}
                            className="absolute inset-0 bg-gradient-to-l from-primary/5 to-transparent pointer-events-none"
                          />
                        )}
                      </AnimatePresence>

                      <motion.div
                        animate={isSelected ? { scale: [1, 1.1, 1] } : { scale: 1 }}
                        transition={{ duration: 0.3 }}
                        className={`w-13 h-13 rounded-2xl flex items-center justify-center shrink-0 transition-all duration-300 ${
                          isSelected
                            ? `bg-gradient-to-br ${opt.gradient} text-white shadow-lg`
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        <opt.icon className="w-6 h-6" />
                      </motion.div>
                      <div className="flex-1 min-w-0 relative z-10">
                        <p className="font-bold text-foreground text-[15px]">{opt.label}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{opt.description}</p>
                      </div>
                      <AnimatePresence mode="wait">
                        {isSelected && (
                          <motion.div
                            initial={{ scale: 0, rotate: -90 }}
                            animate={{ scale: 1, rotate: 0 }}
                            exit={{ scale: 0, rotate: 90 }}
                            transition={{ type: "spring", stiffness: 400, damping: 15 }}
                            className={`w-7 h-7 rounded-full bg-gradient-to-br ${opt.gradient} flex items-center justify-center shrink-0 shadow-md`}
                          >
                            <Check className="w-4 h-4 text-white" strokeWidth={3} />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.button>
                  );
                })}
              </div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="shrink-0"
              >
                <Button
                  onClick={handleSave}
                  disabled={selected.length === 0 || saving}
                  className="w-full h-12 text-sm font-bold mt-4 rounded-xl shadow-lg shadow-primary/20 transition-all duration-300 disabled:shadow-none"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4 ml-2" />
                  )}
                  تأكيد
                </Button>
              </motion.div>
            </motion.div>
          )}

          {/* ===== STEP 3: Profile Completion Suggestion ===== */}
          {step === "profile_suggestion" && (
            <motion.div
              key="profile_suggestion"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center text-center py-4"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
                className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/25"
              >
                <Check className="w-8 h-8 text-white" />
              </motion.div>

              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-xl font-black text-foreground mb-2"
              >
                تمام كده! ✅
              </motion.h2>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-muted-foreground text-sm leading-relaxed mb-6 max-w-[300px]"
              >
                عايز تضيف بيانات تانية أو تعدل بياناتك الحالية؟
                <br />
                تقدر تعمل ده من إعدادات الحساب في أي وقت.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="w-full space-y-3"
              >
                <Button
                  onClick={handleGoToSettings}
                  variant="outline"
                  className="w-full h-12 text-sm font-bold rounded-xl border-2 border-primary/30 hover:bg-primary/5"
                >
                  <UserCog className="w-4 h-4 ml-2" />
                  تعديل بياناتي
                </Button>

                <Button
                  onClick={handleFinish}
                  className="w-full h-12 text-sm font-bold rounded-xl shadow-lg shadow-primary/20"
                >
                  <ArrowLeft className="w-4 h-4 ml-2" />
                  ابدأ التصفح
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};

export default VehicleTypeDialog;
