import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Download, Smartphone, CheckCircle, Share, MoreVertical, PlusSquare, AlertTriangle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const InstallApp = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isIOSSafari, setIsIOSSafari] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    const ios = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    setIsIOS(ios);
    
    // Detect if running in Safari on iOS (not Chrome/Firefox/etc)
    if (ios) {
      const isSafari = /Safari/i.test(ua) && !/CriOS|FxiOS|OPiOS|EdgiOS/i.test(ua);
      setIsIOSSafari(isSafari);
    }

    if (window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone === true) {
      setIsInstalled(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => {
      setIsInstalled(true);
      setTimeout(() => {
        window.location.href = "/";
      }, 2000);
    });

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setIsInstalled(true);
    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto max-w-2xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            {/* Icon */}
            <div className="w-24 h-24 bg-primary/15 rounded-3xl flex items-center justify-center mx-auto mb-8">
              <Smartphone className="w-12 h-12 text-primary" />
            </div>

            <h1 className="text-3xl md:text-4xl font-black text-foreground mb-4">
              حمّل تطبيق <span className="text-primary">المصرية جروب</span>
            </h1>
            <p className="text-muted-foreground text-lg mb-10 leading-relaxed">
              احصل على تجربة أسرع وأسهل — تصفح المنتجات واطلب قطع الغيار مباشرة من هاتفك
            </p>

            {isInstalled ? (
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                className="flex items-center justify-center gap-3 text-emerald-500 bg-emerald-500/10 rounded-2xl p-6"
              >
                <CheckCircle className="w-8 h-8" />
                <span className="text-xl font-bold">التطبيق مثبت بالفعل! ✅</span>
              </motion.div>
            ) : deferredPrompt ? (
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Button
                  size="lg"
                  onClick={handleInstall}
                  className="gap-3 font-black text-lg px-10 py-7 shadow-xl shadow-primary/25"
                >
                  <Download className="w-6 h-6" />
                  تثبيت التطبيق
                </Button>
              </motion.div>
            ) : (
              <div className="space-y-6">
                {isIOS ? (
                  <>
                    {/* Safari warning for iOS */}
                    {!isIOSSafari && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5 text-right flex items-start gap-3"
                      >
                        <AlertTriangle className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                          <h4 className="font-bold text-foreground mb-1">يجب فتح الموقع من Safari</h4>
                          <p className="text-muted-foreground text-sm leading-relaxed mb-3">
                            التثبيت على iPhone/iPad يعمل فقط من متصفح <strong>Safari</strong>. انسخ الرابط وافتحه في Safari.
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-2"
                            onClick={() => {
                              navigator.clipboard.writeText(window.location.origin);
                              import("sonner").then(({ toast }) => {
                                toast.success("تم نسخ الرابط! افتحه في Safari");
                              });
                            }}
                          >
                            <ExternalLink className="w-4 h-4" />
                            نسخ رابط الموقع
                          </Button>
                        </div>
                      </motion.div>
                    )}

                    <div className="bg-secondary rounded-2xl p-8 text-right space-y-6">
                      <h3 className="text-xl font-bold text-secondary-foreground mb-4">
                        لتثبيت التطبيق على iPhone/iPad:
                      </h3>
                      <p className="text-secondary-foreground/60 text-sm">
                        ⚠️ يجب أن تستخدم متصفح <strong className="text-primary">Safari</strong> فقط
                      </p>
                      <div className="space-y-4">
                        {[
                          { step: "1", text: "اضغط على زر المشاركة ⬆️ أسفل الشاشة", icon: Share },
                          { step: "2", text: 'مرر لأسفل واختر "إضافة إلى الشاشة الرئيسية"', icon: PlusSquare },
                          { step: "3", text: 'اضغط "إضافة" في أعلى الشاشة', icon: CheckCircle },
                        ].map((s) => (
                          <div key={s.step} className="flex items-center gap-4 bg-secondary-foreground/5 rounded-xl p-4">
                            <div className="w-10 h-10 bg-primary/15 rounded-full flex items-center justify-center shrink-0">
                              <span className="text-primary font-black text-lg">{s.step}</span>
                            </div>
                            <div className="flex items-center gap-3 flex-1">
                              <s.icon className="w-5 h-5 text-primary shrink-0" />
                              <span className="text-secondary-foreground font-medium">{s.text}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="bg-secondary rounded-2xl p-8 text-right space-y-6">
                    <h3 className="text-xl font-bold text-secondary-foreground mb-4">
                      لتثبيت التطبيق على Android:
                    </h3>
                    <div className="space-y-4">
                      {[
                        { step: "1", text: "اضغط على قائمة المتصفح (⋮)", icon: MoreVertical },
                        { step: "2", text: 'اختر "تثبيت التطبيق" أو "إضافة إلى الشاشة الرئيسية"', icon: Download },
                        { step: "3", text: 'اضغط "تثبيت"', icon: CheckCircle },
                      ].map((s) => (
                        <div key={s.step} className="flex items-center gap-4 bg-secondary-foreground/5 rounded-xl p-4">
                          <div className="w-10 h-10 bg-primary/15 rounded-full flex items-center justify-center shrink-0">
                            <s.icon className="w-5 h-5 text-primary" />
                          </div>
                          <span className="text-secondary-foreground font-medium text-lg">{s.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Features */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-14">
              {[
                { title: "بدون تحميل", desc: "يعمل من المتصفح مباشرة" },
                { title: "يعمل أوفلاين", desc: "تصفح بدون إنترنت" },
                { title: "سريع وخفيف", desc: "لا يأخذ مساحة كبيرة" },
              ].map((f, i) => (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  className="bg-secondary/50 rounded-xl p-5 text-center"
                >
                  <h4 className="font-bold text-foreground mb-1">{f.title}</h4>
                  <p className="text-muted-foreground text-sm">{f.desc}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>
      <Footer />
    </div>
  );
};

export default InstallApp;
