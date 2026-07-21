import { useState, useEffect, forwardRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, X, Share, PlusSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { requestPushPermission } from "@/lib/pushNotifications";
import { isNativePlatform } from "@/lib/native";
import logo from "@/assets/logo.webp";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "pwa-banner-dismissed";
const SHOWN_ONCE_KEY = "pwa-banner-shown-once";

const InstallBanner = forwardRef<HTMLDivElement>((_, ref) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSSteps, setShowIOSSteps] = useState(false);

  useEffect(() => {
    if (isNativePlatform()) return;

    // Already installed (check both standard and iOS standalone)
    if (window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone === true) {
      setIsStandalone(true);
      return;
    }

    const ua = navigator.userAgent;
    const isMobile = /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    if (!isMobile) return;

    const ios = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    setIsIOS(ios);

    // Already shown once — never show again
    if (localStorage.getItem(SHOWN_ONCE_KEY)) return;

    // Already dismissed recently (24h cooldown) — kept as fallback
    const dismissed = localStorage.getItem(DISMISS_KEY);
    if (dismissed) {
      const dismissedAt = parseInt(dismissed, 10);
      if (Date.now() - dismissedAt < 24 * 60 * 60 * 1000) return;
    }

    // Show after a short delay for better UX
    const timer = setTimeout(() => {
      setShow(true);
      localStorage.setItem(SHOWN_ONCE_KEY, "1");
    }, ios ? 2000 : 0);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    const installHandler = () => {
      setShow(false);
      toast.success("تم تثبيت التطبيق بنجاح! 🎉", {
        description: "يمكنك الآن فتح التطبيق من الشاشة الرئيسية",
        duration: 5000,
      });
      setTimeout(async () => {
        const granted = await requestPushPermission();
        if (granted) {
          toast.success("تم تفعيل الإشعارات! 🔔", {
            description: "هتوصلك إشعارات بالعروض والتحديثات",
            duration: 4000,
          });
        }
      }, 3000);
    };
    window.addEventListener("appinstalled", installHandler);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installHandler);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") setShow(false);
      setDeferredPrompt(null);
    } else if (isIOS) {
      if (showIOSSteps) {
        // Already showing steps, dismiss banner
        handleDismiss();
      } else {
        setShowIOSSteps(true);
      }
    } else {
      window.location.href = "/install";
    }
  };

  const handleDismiss = () => {
    setShow(false);
    setShowIOSSteps(false);
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
  };

  if (isStandalone) return null;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 120, opacity: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 25 }}
          className="fixed bottom-4 left-4 right-4 z-[60] md:left-auto md:right-6 md:bottom-6 md:max-w-sm"
        >
          <div className="bg-secondary border border-primary/20 rounded-2xl p-4 shadow-2xl shadow-black/30 backdrop-blur-xl">
            {/* Close button */}
            <button
              onClick={handleDismiss}
              className="absolute top-3 left-3 text-secondary-foreground/40 hover:text-secondary-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center shrink-0 shadow-md">
                <img src={logo} alt="المصرية جروب" className="w-12 h-10 object-contain" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-secondary-foreground text-sm mb-0.5">
                  حمّل تطبيق المصرية جروب
                </h4>
                <p className="text-secondary-foreground/50 text-xs leading-relaxed">
                  تصفح أسرع وتجربة أفضل من الهاتف
                </p>
              </div>
            </div>

            {/* iOS Steps */}
            <AnimatePresence>
              {showIOSSteps && isIOS && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="mt-3 space-y-2">
                    {[
                      { icon: Share, text: "اضغط زر المشاركة ⬆️ أسفل الشاشة" },
                      { icon: PlusSquare, text: "اختر \"إضافة إلى الشاشة الرئيسية\"" },
                    ].map((step, i) => (
                      <div key={i} className="flex items-center gap-3 bg-secondary-foreground/5 rounded-lg px-3 py-2">
                        <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                          <step.icon className="w-3.5 h-3.5 text-primary" />
                        </div>
                        <span className="text-secondary-foreground text-xs font-medium">{step.text}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Install button */}
            <motion.div className="mt-3" whileTap={{ scale: 0.97 }}>
              <Button
                onClick={handleInstall}
                size="sm"
                className="w-full gap-2 font-bold shadow-lg shadow-primary/20"
              >
                <Download className="w-4 h-4" />
                {showIOSSteps ? "فهمت — هثبت التطبيق" : "تثبيت التطبيق مجاناً"}
              </Button>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

InstallBanner.displayName = "InstallBanner";

export default InstallBanner;
