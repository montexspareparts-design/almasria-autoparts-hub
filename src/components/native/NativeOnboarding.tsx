import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Building2, User, LogIn, UserPlus, ArrowRight, ChevronRight } from "lucide-react";
import logo from "@/assets/almasria-logo-dark.png";
import { easeOutIOS, springSoft } from "@/lib/motion";
import { haptic } from "@/lib/haptics";

export const ONBOARD_KEY = "almasria_app_onboarded";
export const SEGMENT_KEY = "almasria_app_segment";

type Segment = "wholesale" | "retail";

const SEGMENTS: {
  id: Segment;
  title: string;
  desc: string;
  icon: typeof Building2;
  points: string[];
}[] = [
  {
    id: "wholesale",
    title: "عميل جملة",
    desc: "تجار وموزعون ومراكز صيانة",
    icon: Building2,
    points: ["أسعار جملة خاصة", "حساب وكشف حساب", "طلب سريع بالأكواد"],
  },
  {
    id: "retail",
    title: "عميل قطاعي",
    desc: "أفراد وأصحاب سيارات",
    icon: User,
    points: ["قطع أصلية بضمان", "شحن لكل المحافظات", "دعم فني مباشر"],
  },
];

const NativeOnboarding = ({ onDone }: { onDone: () => void }) => {
  const navigate = useNavigate();
  const [segment, setSegment] = useState<Segment | null>(null);

  const complete = (to?: string) => {
    try {
      localStorage.setItem(ONBOARD_KEY, "1");
      if (segment) localStorage.setItem(SEGMENT_KEY, segment);
    } catch {
      /* ignore */
    }
    onDone();
    if (to) navigate(to);
  };

  const pick = (s: Segment) => {
    void haptic("medium");
    setSegment(s);
  };

  const isWholesale = segment === "wholesale";

  return (
    <motion.div
      dir="rtl"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: easeOutIOS }}
      className="fixed inset-0 z-[150] overflow-y-auto"
      style={{ background: "radial-gradient(120% 80% at 50% 0%, #12294a 0%, #0A1A2F 60%, #060f1c 100%)" }}
    >
      <div
        className="min-h-full flex flex-col px-6"
        style={{
          paddingTop: "calc(env(safe-area-inset-top) + 40px)",
          paddingBottom: "calc(env(safe-area-inset-bottom) + 28px)",
        }}
      >
        <motion.img
          src={logo}
          alt="ALMASRIA GROUP"
          initial={{ opacity: 0, y: -10, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, ease: easeOutIOS }}
          className="w-[150px] mx-auto object-contain"
        />

        <AnimatePresence mode="wait" initial={false}>
          {!segment ? (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.35, ease: easeOutIOS }}
              className="flex-1 flex flex-col justify-center py-8"
            >
              <h1 className="text-[28px] leading-[1.35] font-black text-white text-center">
                أهلاً بك في المصرية جروب
              </h1>
              <p className="mt-2 text-[13px] leading-[1.7] text-white/50 text-center">
                اختر نوع حسابك لنعرض لك التجربة والأسعار المناسبة لك
              </p>

              <div className="mt-8 space-y-4">
                {SEGMENTS.map((s, i) => {
                  const Icon = s.icon;
                  return (
                    <motion.button
                      key={s.id}
                      type="button"
                      initial={{ opacity: 0, y: 18 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.12 + i * 0.09, duration: 0.5, ease: easeOutIOS }}
                      whileTap={{ scale: 0.975 }}
                      onClick={() => pick(s.id)}
                      className="w-full text-right rounded-[26px] p-5 border border-white/10 bg-white/[0.05] backdrop-blur-xl active:bg-white/[0.09] transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <span className="w-12 h-12 rounded-2xl grid place-items-center bg-white/[0.07] border border-white/10 shrink-0">
                          <Icon className="w-6 h-6 text-gold" strokeWidth={1.8} />
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[17px] font-bold text-white">{s.title}</p>
                          <p className="text-[12px] text-white/45 mt-0.5">{s.desc}</p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-white/25 rotate-180 shrink-0" />
                      </div>
                      <ul className="mt-4 flex flex-wrap gap-2">
                        {s.points.map((p) => (
                          <li
                            key={p}
                            className="text-[11px] text-white/55 px-2.5 py-1 rounded-full bg-white/[0.06] border border-white/[0.07]"
                          >
                            {p}
                          </li>
                        ))}
                      </ul>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.35, ease: easeOutIOS }}
              className="flex-1 flex flex-col justify-center py-8"
            >
              <motion.span
                layout
                transition={springSoft}
                className="mx-auto text-[11px] font-semibold px-3 py-1.5 rounded-full bg-gold/15 text-gold border border-gold/25"
              >
                {isWholesale ? "عميل جملة" : "عميل قطاعي"}
              </motion.span>

              <h2 className="mt-5 text-[26px] leading-[1.4] font-black text-white text-center">
                {isWholesale ? "سجّل دخولك لحساب الجملة" : "سجّل دخولك وشوف الأسعار"}
              </h2>
              <p className="mt-2 text-[13px] leading-[1.7] text-white/50 text-center">
                {isWholesale
                  ? "الأسعار والطلبات متاحة لحسابات التجار المعتمدة فقط"
                  : "أنشئ حسابك في أقل من دقيقة لعرض الأسعار وإتمام الطلب"}
              </p>

              <div className="mt-8 space-y-3">
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    void haptic("light");
                    complete(isWholesale ? "/dealer-login" : "/auth");
                  }}
                  className="w-full h-14 rounded-2xl bg-gold text-[#0A1A2F] font-bold text-[15px] flex items-center justify-center gap-2 shadow-[0_10px_30px_-10px_hsl(44_53%_54%/0.6)]"
                >
                  <LogIn className="w-[18px] h-[18px]" />
                  تسجيل الدخول
                </motion.button>

                <motion.button
                  type="button"
                  whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    void haptic("light");
                    complete(isWholesale ? "/dealer-register" : "/client-register");
                  }}
                  className="w-full h-14 rounded-2xl border border-white/15 bg-white/[0.06] text-white font-bold text-[15px] flex items-center justify-center gap-2 backdrop-blur-xl"
                >
                  <UserPlus className="w-[18px] h-[18px]" />
                  {isWholesale ? "طلب فتح حساب تاجر" : "إنشاء حساب جديد"}
                </motion.button>

                <button
                  type="button"
                  onClick={() => {
                    void haptic("light");
                    complete();
                  }}
                  className="w-full h-12 rounded-2xl text-white/55 text-[14px] font-semibold flex items-center justify-center gap-1.5 active:text-white/80"
                >
                  المتابعة كزائر
                  <ArrowRight className="w-4 h-4 rotate-180" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  void haptic("light");
                  setSegment(null);
                }}
                className="mt-6 mx-auto text-[12px] text-white/35 active:text-white/60"
              >
                تغيير نوع الحساب
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <p className="text-[10px] text-white/25 text-center leading-relaxed">
          بالمتابعة أنت توافق على الشروط وسياسة الخصوصية الخاصة بالمصرية جروب
        </p>
      </div>
    </motion.div>
  );
};

export default NativeOnboarding;
