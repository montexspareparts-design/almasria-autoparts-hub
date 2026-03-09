import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePersonalization } from "@/hooks/usePersonalization";

const ConsentBanner = () => {
  const { consent, grantConsent, denyConsent } = usePersonalization();

  // Only show if consent hasn't been decided yet
  if (consent !== null) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="fixed bottom-0 left-0 right-0 z-[60] p-4 md:p-6"
      >
        <div className="max-w-2xl mx-auto bg-card border border-border rounded-2xl shadow-2xl p-5 md:p-6 backdrop-blur-xl" dir="rtl">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-foreground text-sm mb-1">تجربة مخصصة ليك 🎯</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                نحب نفهم اهتماماتك عشان نعرض عليك المنتجات اللي تناسب عربيتك.
                بنستخدم بيانات تصفحك (الأقسام والماركات اللي بتزورها) لتحسين تجربتك — مفيش بيانات شخصية بتتشارك.
              </p>
            </div>
            <button onClick={denyConsent} className="p-1 rounded-lg hover:bg-muted transition-colors shrink-0">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
          <div className="flex items-center gap-3 justify-end">
            <Button variant="ghost" size="sm" onClick={denyConsent} className="text-xs">
              لا شكرًا
            </Button>
            <Button size="sm" onClick={grantConsent} className="text-xs gap-1.5 shadow-lg shadow-primary/20">
              <ShieldCheck className="w-3.5 h-3.5" />
              موافق، خصّصلي التجربة
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ConsentBanner;
