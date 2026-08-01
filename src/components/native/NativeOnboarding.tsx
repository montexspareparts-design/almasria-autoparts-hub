import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Store, User, ChevronLeft, LogIn, UserPlus, Eye, ArrowRight, Check } from "lucide-react";
import { easeOutIOS } from "@/lib/motion";
import { haptic } from "@/lib/haptics";
import logoDark from "@/assets/almasria-logo-dark.png";
import heroAmbient from "@/assets/native/hero-ambient.jpg";

export type Segment = "wholesale" | "retail";

/**
 * First-run gate for the native app.
 * The user picks who they are (wholesale dealer vs retail customer), then
 * chooses how to enter: sign in, create an account, or browse as a guest.
 * Presentation only — every action routes into the existing auth screens.
 */
const NativeOnboarding = ({
  onPick,
  onGuest,
}: {
  onPick: (segment: Segment) => void;
  onGuest: (segment: Segment) => void;
}) => {
  const navigate = useNavigate();
  const [segment, setSegment] = useState<Segment | null>(null);
  const [step, setStep] = useState<0 | 1>(0);

  const go = (to: string) => {
    if (!segment) return;
    void haptic("medium");
    onPick(segment);
    navigate(to);
  };

  const SEGMENTS = [
    {
      id: "wholesale" as const,
      icon: Store,
      title: "تاجر جملة",
      sub: "أسعار جملة، حساب آجل، وطلبات بالكميات",
      points: ["أسعار خاصة للتجّار", "كشف حساب وفواتير", "طلب سريع بكود الصنف"],
    },
    {
      id: "retail" as const,
      icon: User,
      title: "عميل قطاعي",
      sub: "قطع غيار أصلية لعربيتك بضمان الوكالة",
      points: ["أسعار القطاعي", "توصيل لباب البيت", "دعم فني لاختيار القطعة"],
    },
  ];

  return (
    <motion.div
      dir="rtl"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: easeOutIOS }}
      className="fixed inset-0 z-[95] bg-carbon text-white overflow-y-auto ar-body"
    >
      {/* backdrop */}
      <div className="absolute inset-0">
        <img src={heroAmbient} alt="" aria-hidden className="w-full h-full object-cover opacity-25" />
        <div className="absolute inset-0 bg-gradient-to-b from-carbon/70 via-carbon/90 to-carbon" />
      </div>

      <div
        className="relative min-h-full flex flex-col px-6 pb-8"
        style={{
          paddingTop: "calc(env(safe-area-inset-top) + 34px)",
          paddingBottom: "calc(env(safe-area-inset-bottom) + 28px)",
        }}
      >
        <img src={logoDark} alt="المصرية جروب" className="h-10 w-auto object-contain self-start" />

        <AnimatePresence mode="wait">
          {step === 0 ? (
            <motion.div
              key="who"
              initial={{ opacity: 0, x: -24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 24 }}
              transition={{ duration: 0.35, ease: easeOutIOS }}
              className="flex-1 flex flex-col"
            >
              <div className="mt-10">
                <p className="eyebrow text-gold">WELCOME</p>
                <h1 className="ar-display font-black text-[30px] leading-[1.35] mt-3">
                  أهلاً بيك في
                  <br />
                  المصرية جروب
                </h1>
                <p className="ar-body text-[14.5px] text-white/55 mt-3">
                  اختار نوع حسابك الأول علشان نظبّط لك الأسعار والتجربة.
                </p>
              </div>

              <div className="mt-8 space-y-3.5">
                {SEGMENTS.map((s) => {
                  const active = segment === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        void haptic("light");
                        setSegment(s.id);
                      }}
                      aria-pressed={active}
                      className={`w-full text-right rounded-[24px] p-5 border transition-colors ios-press ${
                        active
                          ? "bg-white/[0.09] border-gold/60"
                          : "ios-card border-white/[0.07]"
                      }`}
                    >
                      <div className="flex items-start gap-3.5">
                        <span
                          className={`w-11 h-11 rounded-2xl grid place-items-center shrink-0 ${
                            active ? "bg-gold/15" : "bg-white/[0.07]"
                          }`}
                        >
                          <s.icon className={`w-5 h-5 ${active ? "text-gold" : "text-white/70"}`} />
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="flex items-center gap-2">
                            <span className="ar-display font-bold text-[17px]">{s.title}</span>
                            {active && (
                              <motion.span
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="w-5 h-5 rounded-full bg-gold grid place-items-center"
                              >
                                <Check className="w-3 h-3 text-carbon" strokeWidth={3} />
                              </motion.span>
                            )}
                          </span>
                          <span className="block ar-body text-[12.5px] text-white/50 mt-1.5">{s.sub}</span>
                          <span className="flex flex-wrap gap-1.5 mt-3">
                            {s.points.map((p) => (
                              <span
                                key={p}
                                className="px-2.5 py-1 rounded-full bg-white/[0.06] ar-body text-[10.5px] text-white/60"
                              >
                                {p}
                              </span>
                            ))}
                          </span>
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-auto pt-8">
                <button
                  type="button"
                  disabled={!segment}
                  onClick={() => {
                    void haptic("medium");
                    setStep(1);
                  }}
                  className="w-full h-[54px] rounded-full bg-white text-carbon ar-display font-bold text-[16px] grid place-items-center ios-press disabled:opacity-30 disabled:pointer-events-none"
                >
                  <span className="flex items-center gap-1.5">
                    متابعة
                    <ChevronLeft className="w-[18px] h-[18px]" />
                  </span>
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="how"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.35, ease: easeOutIOS }}
              className="flex-1 flex flex-col"
            >
              <button
                type="button"
                onClick={() => {
                  void haptic("light");
                  setStep(0);
                }}
                className="self-start mt-8 inline-flex items-center gap-1 ar-body text-[13px] text-white/55 ios-press"
              >
                <ArrowRight className="w-4 h-4" />
                رجوع
              </button>

              <div className="mt-6">
                <p className="eyebrow text-gold">
                  {segment === "wholesale" ? "WHOLESALE ACCOUNT" : "RETAIL ACCOUNT"}
                </p>
                <h1 className="ar-display font-black text-[28px] leading-[1.35] mt-3">
                  {segment === "wholesale" ? "بوابة التجّار" : "حساب العملاء"}
                </h1>
                <p className="ar-body text-[14.5px] text-white/55 mt-3">
                  سجّل دخولك علشان تشوف الأسعار وتتابع طلباتك، أو كمّل كزائر وتصفّح الكتالوج.
                </p>
              </div>

              <div className="mt-8 space-y-3">
                <button
                  type="button"
                  onClick={() => go(segment === "wholesale" ? "/dealer-login" : "/auth")}
                  className="w-full h-[54px] rounded-full bg-white text-carbon ar-display font-bold text-[15.5px] flex items-center justify-center gap-2 ios-press"
                >
                  <LogIn className="w-[18px] h-[18px]" />
                  تسجيل الدخول
                </button>

                <button
                  type="button"
                  onClick={() => go(segment === "wholesale" ? "/dealer-apply" : "/auth?mode=signup")}
                  className="w-full h-[54px] rounded-full ios-card ar-display font-bold text-[15.5px] flex items-center justify-center gap-2 ios-press"
                >
                  <UserPlus className="w-[18px] h-[18px] text-white/70" />
                  {segment === "wholesale" ? "طلب فتح حساب جملة" : "إنشاء حساب جديد"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    void haptic("light");
                    if (segment) onGuest(segment);
                  }}
                  className="w-full h-[52px] rounded-full ar-body font-semibold text-[14px] text-white/55 flex items-center justify-center gap-2 ios-press"
                >
                  <Eye className="w-[17px] h-[17px]" />
                  متابعة كزائر
                </button>
              </div>

              <p className="mt-auto pt-8 ar-body text-[11px] text-white/35 text-center leading-relaxed">
                باستخدامك التطبيق فأنت موافق على شروط الاستخدام وسياسة الخصوصية الخاصة بالمصرية جروب.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default NativeOnboarding;
