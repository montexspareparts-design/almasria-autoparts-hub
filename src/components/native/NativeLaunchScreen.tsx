import { motion } from "framer-motion";
import { easeOutIOS } from "@/lib/motion";
import logoDark from "@/assets/almasria-logo-dark.png";

/**
 * App launch animation (native shell only).
 * Mirrors the static native splash colour so the hand-off from the
 * iOS/Android launch image to the web layer is invisible, then plays a
 * short, restrained logo reveal: scale-in + gold light sweep.
 */
const NativeLaunchScreen = ({ exiting }: { exiting: boolean }) => (
  <motion.div
    aria-hidden
    initial={{ opacity: 1 }}
    animate={{ opacity: exiting ? 0 : 1, scale: exiting ? 1.06 : 1 }}
    transition={{ duration: 0.55, ease: easeOutIOS }}
    className="fixed inset-0 z-[100] grid place-items-center overflow-hidden"
    style={{ background: "#0A1A2F" }}
  >
    {/* ambient radial glow */}
    <motion.div
      initial={{ opacity: 0, scale: 0.7 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 1.1, ease: easeOutIOS }}
      className="absolute w-[520px] h-[520px] rounded-full"
      style={{
        background:
          "radial-gradient(circle, hsl(var(--gold) / 0.16) 0%, transparent 65%)",
      }}
    />

    <div className="relative flex flex-col items-center">
      <motion.img
        src={logoDark}
        alt=""
        initial={{ opacity: 0, scale: 1.35, filter: "blur(6px)" }}
        animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
        transition={{ duration: 0.85, ease: easeOutIOS }}
        className="w-52 h-auto object-contain"
      />

      {/* gold light sweep across the mark */}
      <motion.span
        initial={{ x: "-130%" }}
        animate={{ x: "130%" }}
        transition={{ duration: 1.15, delay: 0.35, ease: easeOutIOS }}
        className="pointer-events-none absolute inset-y-0 w-1/2"
        style={{
          background:
            "linear-gradient(100deg, transparent, hsl(var(--gold) / 0.30), transparent)",
          filter: "blur(10px)",
        }}
      />

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.55, ease: easeOutIOS }}
        className="eyebrow text-white/45 mt-7"
      >
        TOYOTA GENUINE PARTS · SINCE 1999
      </motion.p>

      {/* hairline progress */}
      <div className="mt-6 h-[2px] w-28 rounded-full bg-white/10 overflow-hidden">
        <motion.span
          initial={{ x: "-100%" }}
          animate={{ x: "0%" }}
          transition={{ duration: 1.5, ease: easeOutIOS }}
          className="block h-full w-full bg-gold/80"
        />
      </div>
    </div>
  </motion.div>
);

export default NativeLaunchScreen;
