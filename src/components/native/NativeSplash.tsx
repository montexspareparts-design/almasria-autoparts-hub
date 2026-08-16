import { motion } from "framer-motion";
import logo from "@/assets/almasria-logo.png";
import { easeOutIOS } from "@/lib/motion";

const GOLD = "hsl(44 53% 54%)";

/**
 * Cinematic native launch animation.
 * Layered: depth gradient → aurora bloom → concentric rings → logo reveal
 * → gold hairline sweep → wordmark tracking-in. Hands off with a subtle
 * push-in so the app appears to rise out of the splash (no jump cut).
 */
const NativeSplash = ({ leaving }: { leaving: boolean }) => (
  <motion.div
    dir="rtl"
    initial={{ opacity: 1 }}
    animate={{ opacity: leaving ? 0 : 1, scale: leaving ? 1.08 : 1 }}
    transition={{ duration: 0.6, ease: easeOutIOS }}
    className="fixed inset-0 z-[200] flex flex-col items-center justify-center overflow-hidden"
    style={{
      background:
        "radial-gradient(130% 100% at 50% -10%, #16305a 0%, #0d2140 38%, #0A1A2F 66%, #050c17 100%)",
    }}
  >
    {/* aurora bloom */}
    <motion.div
      aria-hidden
      initial={{ opacity: 0, scale: 0.55 }}
      animate={{ opacity: [0, 0.5, 0.26], scale: [0.55, 1.2, 1.02] }}
      transition={{ duration: 2.4, ease: easeOutIOS }}
      className="absolute w-[80vw] h-[80vw] rounded-full blur-[110px]"
      style={{ background: `${GOLD.replace(")", " / 0.3)")}` }}
    />
    <motion.div
      aria-hidden
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 0.35, 0.18] }}
      transition={{ duration: 2.6, ease: easeOutIOS, delay: 0.2 }}
      className="absolute -top-[18vh] w-[95vw] h-[60vw] rounded-full blur-[120px]"
      style={{ background: "hsl(212 60% 45% / 0.35)" }}
    />

    {/* concentric halo rings */}
    {[0, 1, 2].map((i) => (
      <motion.span
        aria-hidden
        key={i}
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: [0, 0.22, 0], scale: [0.6, 1.5 + i * 0.25, 1.9 + i * 0.3] }}
        transition={{
          duration: 3.2,
          ease: "easeOut",
          delay: 0.35 + i * 0.55,
          repeat: Infinity,
          repeatDelay: 0.6,
        }}
        className="absolute w-[62vw] h-[62vw] max-w-[340px] max-h-[340px] rounded-full border"
        style={{ borderColor: "hsl(44 53% 54% / 0.35)" }}
      />
    ))}

    {/* fine grain / vignette for cinematic depth */}
    <div
      aria-hidden
      className="absolute inset-0 pointer-events-none"
      style={{ background: "radial-gradient(100% 70% at 50% 50%, transparent 45%, rgba(0,0,0,0.55) 100%)" }}
    />

    {/* logo */}
    <div className="relative flex flex-col items-center">
      <motion.div
        initial={{ opacity: 0, scale: 1.4, filter: "blur(14px)" }}
        animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
        transition={{ duration: 1.25, ease: easeOutIOS }}
        className="relative"
      >
        {/* light plate keeps the wordmark legible on the dark carbon backdrop */}
        <div className="rounded-[26px] bg-white/95 px-6 py-5 shadow-[0_24px_70px_-20px_rgba(0,0,0,0.75)] ring-1 ring-white/40">
          <img
            src={logo}
            alt="ALMASRIA GROUP"
            className="w-[52vw] max-w-[236px] object-contain"
          />
        </div>
        {/* specular sweep across the mark */}
        <motion.div
          aria-hidden
          initial={{ x: "-130%" }}
          animate={{ x: "130%" }}
          transition={{ delay: 0.85, duration: 1.5, ease: "easeInOut" }}
          className="absolute inset-y-0 w-1/2 pointer-events-none"
          style={{
            background: "linear-gradient(105deg, transparent, rgba(255,255,255,0.24), transparent)",
            mixBlendMode: "screen",
          }}
        />
      </motion.div>

      {/* gold hairline that draws outward */}
      <motion.div
        aria-hidden
        initial={{ scaleX: 0, opacity: 0 }}
        animate={{ scaleX: 1, opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.9, ease: easeOutIOS }}
        className="mt-7 h-px w-40"
        style={{ background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)` }}
      />

      {/* wordmark tracking-in */}
      <motion.span
        initial={{ opacity: 0, letterSpacing: "1.2em" }}
        animate={{ opacity: 1, letterSpacing: "0.42em" }}
        transition={{ delay: 0.75, duration: 1, ease: easeOutIOS }}
        className="mt-5 text-[10px] font-semibold text-white/55 pr-[0.42em]"
      >
        ALMASRIA GROUP
      </motion.span>
    </div>

    {/* bottom progress + tagline */}
    <div
      className="absolute bottom-0 left-0 right-0 flex flex-col items-center gap-4 pb-10"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 34px)" }}
    >
      <div className="h-[2px] w-24 rounded-full overflow-hidden bg-white/10">
        <motion.div
          initial={{ x: "-100%" }}
          animate={{ x: "100%" }}
          transition={{ duration: 1.35, ease: "easeInOut", repeat: Infinity }}
          className="h-full w-2/3 rounded-full"
          style={{ background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)` }}
        />
      </div>
      <motion.span
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.1, duration: 0.6, ease: easeOutIOS }}
        className="text-[11px] tracking-wide text-white/35"
      >
        قطع غيار تويوتا الأصلية · منذ 1999
      </motion.span>
    </div>
  </motion.div>
);

export default NativeSplash;
