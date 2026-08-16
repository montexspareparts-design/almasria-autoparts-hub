import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Building2, User, LogIn, UserPlus, ArrowRight, ChevronRight, ShieldCheck, Truck, Boxes } from "lucide-react";
import logo from "@/assets/almasria-logo-dark.png";
import { easeOutIOS, springSoft } from "@/lib/motion";
import { haptic } from "@/lib/haptics";
import { setAppSegment } from "@/lib/appSegment";

export const ONBOARD_KEY = "almasria_app_onboarded";
export const SEGMENT_KEY = "almasria_app_segment";

const GOLD = "hsl(44 53% 54%)";

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
    points: ["أسعار جملة خاصة", "كشف حساب", "طلب سريع بالأكواد"],
  },
  {
    id: "retail",
    title: "عميل قطاعي",
    desc: "أفراد وأصحاب سيارات",
    icon: User,
    points: ["قطع أصلية", "شحن لكل المحافظات", "دعم فني مباشر"],
  },
];

const TRUST = [
  { icon: Boxes, label: "+12K صنف" },
  { icon: ShieldCheck, label: "قطع أصلية" },
  { icon: Truck, label: "شحن لكل مصر" },
];

const NativeOnboarding = ({ onDone }: { onDone: () => void }) => {
  const navigate = useNavigate();
  const [segment, setSegment] = useState<Segment | null>(null);

  const complete = (to?: string) => {
    try {
      localStorage.setItem(ONBOARD_KEY, "1");
      setAppSegment(segment === "wholesale" ? "dealer" : segment === "retail" ? "retail" : "guest");
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
  const step = segment ? 2 : 1;

  return (
    <motion.div
      dir="rtl"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.45, ease: easeOutIOS }}
      className="fixed inset-0 z-[150] overflow-y-auto"
      style={{
        background:
          "radial-gradient(130% 90% at 50% -10%, #16305a 0%, #0d2140 38%, #0A1A2F 68%, #050c17 100%)",
      }}
    >
      {/* ambient blooms */}
      <div
        aria-hidden
        className="pointer-events-none fixed -top-[20vh] left-1/2 -translate-x-1/2 w-[110vw] h-[70vw] rounded-full blur-[120px]"
        style={{ background: "hsl(44 53% 54% / 0.14)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed bottom-[-25vh] left-[-20vw] w-[80vw] h-[80vw] rounded-full blur-[120px]"
        style={{ background: "hsl(212 60% 45% / 0.22)" }}
      />

      <div
        className="relative min-h-full flex flex-col px-5 sm:px-6"
        style={{
          paddingTop: "calc(env(safe-area-inset-top) + 34px)",
          paddingBottom: "calc(env(safe-area-inset-bottom) + 26px)",
        }}
      >
        {/* header: logo + step rail */}
        <div className="flex flex-col items-center gap-5">
          <motion.img
            src={logo}
            alt="ALMASRIA GROUP"
            initial={{ opacity: 0, y: -10, scale: 0.94, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
            transition={{ duration: 0.8, ease: easeOutIOS }}
            className="w-[148px] object-contain drop-shadow-[0_12px_36px_rgba(0,0,0,0.5)]"
          />
          <div className="flex items-center gap-2">
            {[1, 2].map((s) => (
              <motion.span
                key={s}
                layout
                transition={springSoft}
                className="h-[3px] rounded-full"
                style={{
                  width: s === step ? 30 : 12,
                  background: s <= step ? GOLD : "rgba(255,255,255,0.16)",
                }}
              />
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          {!segment ? (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, x: 26 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -26 }}
              transition={{ duration: 0.38, ease: easeOutIOS }}
              className="flex-1 flex flex-col justify-center py-8"
            >
              <motion.span
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05, duration: 0.5, ease: easeOutIOS }}
                className="mx-auto text-[10px] font-semibold tracking-[0.28em] text-white/40"
              >
                منذ 1999
              </motion.span>

              <motion.h1
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.6, ease: easeOutIOS }}
                className="mt-3 text-[30px] leading-[1.3] font-black text-white text-center"
              >
                أهلاً بك في
                <span className="block text-transparent bg-clip-text" style={{ backgroundImage: `linear-gradient(100deg, ${GOLD}, #f3e3b3, ${GOLD})` }}>
                  المصرية جروب
                </span>
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.18, duration: 0.6, ease: easeOutIOS }}
                className="mt-3 text-[13px] leading-[1.8] text-white/50 text-center max-w-[300px] mx-auto"
              >
                اختر نوع حسابك لنعرض لك التجربة والأسعار المناسبة لك
              </motion.p>

              <div className="mt-8 space-y-4">
                {SEGMENTS.map((s, i) => {
                  const Icon = s.icon;
                  return (
                    <motion.button
                      key={s.id}
                      type="button"
                      initial={{ opacity: 0, y: 22 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.24 + i * 0.1, duration: 0.55, ease: easeOutIOS }}
                      whileTap={{ scale: 0.975 }}
                      onClick={() => pick(s.id)}
                      className="group relative w-full text-right rounded-[28px] p-[1px] overflow-hidden"
                      style={{
                        background:
                          "linear-gradient(150deg, rgba(255,255,255,0.22), rgba(255,255,255,0.04) 40%, rgba(255,255,255,0.14))",
                      }}
                    >
                      <span className="block rounded-[27px] p-5 bg-white/[0.045] backdrop-blur-2xl active:bg-white/[0.09] transition-colors">
                        <span className="flex items-center gap-4">
                          <span
                            className="w-12 h-12 rounded-2xl grid place-items-center shrink-0 border border-white/10"
                            style={{ background: "linear-gradient(160deg, hsl(44 53% 54% / 0.22), transparent)" }}
                          >
                            <Icon className="w-6 h-6 text-gold" strokeWidth={1.8} />
                          </span>
                          <span className="flex-1 min-w-0 block">
                            <span className="block text-[18px] font-bold text-white">{s.title}</span>
                            <span className="block text-[12px] text-white/45 mt-0.5">{s.desc}</span>
                          </span>
                          <ChevronRight className="w-5 h-5 text-white/25 rotate-180 shrink-0" />
                        </span>
                        <span className="mt-4 flex flex-wrap gap-2">
                          {s.points.map((p) => (
                            <span
                              key={p}
                              className="text-[11px] text-white/60 px-2.5 py-1 rounded-full bg-white/[0.06] border border-white/[0.08]"
                            >
                              {p}
                            </span>
                          ))}
                        </span>
                      </span>
                    </motion.button>
                  );
                })}
              </div>

              {/* Third door — never a wall: browse first, choose later */}
              <motion.button
                type="button"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.44, duration: 0.5, ease: easeOutIOS }}
                whileTap={{ scale: 0.975 }}
                onClick={() => {
                  void haptic("light");
                  complete();
                }}
                className="mt-5 w-full h-12 rounded-2xl border border-white/12 bg-white/[0.05] text-white/75 text-[14px] font-bold flex items-center justify-center gap-2 active:bg-white/[0.1]"
              >
                تصفح كزائر
                <ArrowRight className="w-4 h-4 rotate-180" />
              </motion.button>
              <p className="mt-2.5 text-[11px] text-white/30 text-center">
                تقدر تحدد نوع حسابك بعدين من صفحة حسابي
              </p>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.6 }}
                className="mt-7 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 px-2"
              >
                {TRUST.map((t) => {
                  const Icon = t.icon;
                  return (
                    <span key={t.label} className="flex items-center gap-1.5 text-[11px] text-white/40 whitespace-nowrap">
                      <Icon className="w-3.5 h-3.5 text-gold/70 shrink-0" strokeWidth={1.8} />
                      {t.label}
                    </span>
                  );
                })}
              </motion.div>
            </motion.div>
          ) : (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, x: 26 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -26 }}
              transition={{ duration: 0.38, ease: easeOutIOS }}
              className="flex-1 flex flex-col justify-center py-8"
            >
              <motion.span
                layout
                transition={springSoft}
                className="mx-auto text-[11px] font-semibold px-3.5 py-1.5 rounded-full bg-gold/15 text-gold border border-gold/25"
              >
                {isWholesale ? "عميل جملة" : "عميل قطاعي"}
              </motion.span>

              <h2 className="mt-5 text-[27px] leading-[1.4] font-black text-white text-center">
                {isWholesale ? "سجّل دخولك لحساب الجملة" : "سجّل دخولك وشوف الأسعار"}
              </h2>
              <p className="mt-3 text-[13px] leading-[1.8] text-white/50 text-center max-w-[300px] mx-auto">
                {isWholesale
                  ? "الأسعار والطلبات متاحة لحسابات التجار المعتمدة فقط"
                  : "أنشئ حسابك في أقل من دقيقة لعرض الأسعار وإتمام الطلب"}
              </p>

              <div className="mt-9 space-y-3">
                <motion.button
                  type="button"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08, duration: 0.5, ease: easeOutIOS }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    void haptic("light");
                    complete(isWholesale ? "/dealer-login" : "/auth");
                  }}
                  className="relative w-full h-14 rounded-2xl text-[#0A1A2F] font-bold text-[15px] flex items-center justify-center gap-2 overflow-hidden shadow-[0_16px_40px_-14px_hsl(44_53%_54%/0.75)]"
                  style={{ background: `linear-gradient(100deg, ${GOLD}, #f0dfb0 50%, ${GOLD})` }}
                >
                  <LogIn className="w-[18px] h-[18px]" />
                  تسجيل الدخول
                </motion.button>

                <motion.button
                  type="button"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15, duration: 0.5, ease: easeOutIOS }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    void haptic("light");
                    complete(isWholesale ? "/dealer-register" : "/client-register");
                  }}
                  className="w-full h-14 rounded-2xl border border-white/15 bg-white/[0.06] text-white font-bold text-[15px] flex items-center justify-center gap-2 backdrop-blur-2xl active:bg-white/[0.1]"
                >
                  <UserPlus className="w-[18px] h-[18px]" />
                  {isWholesale ? "طلب فتح حساب تاجر" : "إنشاء حساب جديد"}
                </motion.button>

                <motion.button
                  type="button"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.24, duration: 0.5 }}
                  onClick={() => {
                    void haptic("light");
                    complete();
                  }}
                  className="w-full h-12 rounded-2xl text-white/55 text-[14px] font-semibold flex items-center justify-center gap-1.5 active:text-white/85"
                >
                  المتابعة كزائر
                  <ArrowRight className="w-4 h-4 rotate-180" />
                </motion.button>
              </div>

              <button
                type="button"
                onClick={() => {
                  void haptic("light");
                  setSegment(null);
                }}
                className="mt-7 mx-auto text-[12px] text-white/35 active:text-white/60"
              >
                تغيير نوع الحساب
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <p className="mt-6 text-[10px] text-white/25 text-center leading-relaxed px-2">
          بالمتابعة أنت توافق على الشروط وسياسة الخصوصية الخاصة بالمصرية جروب
        </p>
      </div>
    </motion.div>
  );
};

export default NativeOnboarding;
