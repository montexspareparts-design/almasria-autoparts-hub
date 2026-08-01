import { motion } from "framer-motion";
import logo from "@/assets/almasria-logo-dark.png";
import { easeOutIOS } from "@/lib/motion";

/**
 * Cinematic native launch animation.
 * Mirrors the static iOS/Android splash (navy #0A1A2F) and then hands off
 * to the app with a logo zoom + gold shimmer — no white flash, no jump cut.
 */
const NativeSplash = ({ leaving }: { leaving: boolean }) => (
  <motion.div
    dir="rtl"
    initial={{ opacity: 1 }}
    animate={{ opacity: leaving ? 0 : 1, scale: leaving ? 1.06 : 1 }}
    transition={{ duration: 0.55, ease: easeOutIOS }}
    className="fixed inset-0 z-[200] flex flex-col items-center justify-center overflow-hidden"
    style={{ background: "radial-gradient(120% 90% at 50% 0%, #12294a 0%, #0A1A2F 55%, #060f1c 100%)" }}
  >
    {/* soft gold aura */}
    <motion.div
      aria-hidden
      initial={{ opacity: 0, scale: 0.7 }}
      animate={{ opacity: [0, 0.55, 0.3], scale: [0.7, 1.15, 1] }}
      transition={{ duration: 2, ease: easeOutIOS }}
      className="absolute w-[70vw] h-[70vw] rounded-full blur-[90px]"
      style={{ background: "hsl(44 53% 54% / 0.28)" }}
    />

    <motion.img
      src={logo}
      alt="ALMASRIA GROUP"
      initial={{ opacity: 0, scale: 1.35, filter: "blur(8px)" }}
      animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
      transition={{ duration: 1.1, ease: easeOutIOS }}
      className="relative w-[58vw] max-w-[260px] object-contain"
    />

    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.55, duration: 0.6, ease: easeOutIOS }}
      className="relative mt-6 flex flex-col items-center gap-3"
    >
      <span className="text-[10px] tracking-[0.42em] text-white/45 font-semibold">
        ALMASRIA GROUP
      </span>
      <div className="h-px w-28 overflow-hidden bg-white/10">
        <motion.div
          initial={{ x: "-100%" }}
          animate={{ x: "100%" }}
          transition={{ delay: 0.5, duration: 1.4, ease: "easeInOut", repeat: Infinity, repeatDelay: 0.3 }}
          className="h-full w-1/2"
          style={{ background: "linear-gradient(90deg, transparent, hsl(44 53% 54%), transparent)" }}
        />
      </div>
    </motion.div>

    <motion.span
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1, duration: 0.5 }}
      className="absolute bottom-10 text-[11px] text-white/30"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      قطع غيار تويوتا الأصلية · منذ 1999
    </motion.span>
  </motion.div>
);

export default NativeSplash;
