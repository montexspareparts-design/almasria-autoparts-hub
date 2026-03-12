import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface DealerOnboardingProps {
  dealerName: string;
  onComplete: () => void;
}

const steps = [
  {
    emoji: "👋",
    title: "أهلاً بيك في المصرية جروب",
    desc: "دي لوحة التحكم الخاصة بيك — هنشرحلك أهم 3 حاجات تقدر تعملها.",
  },
  {
    emoji: "🔍",
    title: "اطلب قطع غيار",
    desc: "ابحث عن أي قطعة غيار بالاسم أو رقم القطعة، وأضفها لعرض السعر أو اطلبها مباشرة.",
    tab: "quotes",
  },
  {
    emoji: "📋",
    title: "كشوفات الأسعار",
    desc: "شوف أحدث كشوفات الأسعار الخاصة بدرجتك، وحمّلها أو ابعتها لزبونك.",
    tab: "price_lists",
  },
  {
    emoji: "📦",
    title: "تابع طلباتك",
    desc: "كل طلباتك وحالتها في مكان واحد — من لحظة الطلب للتسليم.",
    tab: "orders",
  },
];

const DealerOnboarding = ({ dealerName, onComplete }: DealerOnboardingProps) => {
  const [step, setStep] = useState(0);
  const isLast = step === steps.length - 1;
  const firstName = dealerName?.split(" ")[0] || "تاجر";
  const current = steps[step];

  const handleNext = () => {
    if (isLast) {
      onComplete();
    } else {
      setStep((s) => s + 1);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleSkip}
      />

      {/* Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.3 }}
          className="relative w-full max-w-sm bg-card rounded-3xl shadow-2xl border border-border overflow-hidden"
        >
          {/* Top gradient accent */}
          <div className="h-2 bg-gradient-to-l from-primary via-primary/80 to-primary/40" />

          <div className="p-6 pt-8 text-center space-y-4">
            {/* Emoji */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.1 }}
              className="text-6xl"
            >
              {current.emoji}
            </motion.div>

            {/* Title */}
            <h2 className="text-xl font-black text-foreground leading-tight">
              {step === 0 ? `${current.title}، ${firstName}!` : current.title}
            </h2>

            {/* Description */}
            <p className="text-sm text-muted-foreground leading-relaxed px-2">
              {current.desc}
            </p>

            {/* Step dots */}
            <div className="flex items-center justify-center gap-2 pt-2">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "h-2 rounded-full transition-all duration-300",
                    i === step ? "w-8 bg-primary" : "w-2 bg-muted-foreground/20"
                  )}
                />
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="px-6 pb-6 flex items-center gap-3">
            <button
              onClick={handleNext}
              className="flex-1 bg-primary text-primary-foreground font-bold py-3.5 rounded-2xl text-sm hover:bg-primary/90 transition-colors active:scale-[0.98]"
            >
              {isLast ? "يلّا نبدأ! 🚀" : "التالي ←"}
            </button>
            {!isLast && (
              <button
                onClick={handleSkip}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors py-3 px-3"
              >
                تخطي
              </button>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default DealerOnboarding;
