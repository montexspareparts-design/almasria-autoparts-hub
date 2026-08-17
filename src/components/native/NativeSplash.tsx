import { motion } from "framer-motion";
import logo from "@/assets/almasria-logo-dark.png";
import { easeOutIOS } from "@/lib/motion";
import { getBuildTime } from "@/lib/runtimeDiagnostics";

const GOLD = "hsl(44 53% 54%)";

/**
 * Cinematic native launch animation — Precision Dark.
 * One ambient gold light source, a slow machined ring, and the mark itself
 * rising out of the dark with a specular sweep. No plates, no wordmark,
 * no competing layers. Hands off with a gentle push-in.
 */
const NativeSplash = ({ leaving }: { leaving: boolean }) => (
  <motion.div
    dir="rtl"
    initial={{ opacity: 1 }}
    animate={{ opacity: leaving ? 0 : 1, scale: leaving ? 1.06 : 1 }}
    transition={{ duration: 0.55, ease: easeOutIOS }}
    className={`fixed inset-0 z-[200] flex items-center justify-center overflow-hidden ${
      leaving ? "pointer-events-none" : ""
    }`}
    style={{
      background:
        "radial-gradient(120% 90% at 50% 12%, #12294b 0%, #0b1e3a 42%, #08172c 70%, #050c17 100%)",
    }}
  >
    {/* single ambient gold aura behind the mark */}
    <motion.div
      aria-hidden
      initial={{ opacity: 0, scale: 0.7 }}
      animate={{ opacity: leaving ? 0 : 0.34, scale: 1 }}
      transition={{ duration: 1.6, ease: easeOutIOS }}
      className="absolute w-[78vw] h-[78vw] max-w-[420px] max-h-[420px] rounded-full blur-[90px]"
      style={{ background: "hsl(44 53% 54% / 0.32)" }}
    />

    {/* one slow machined ring */}
    <motion.span
      aria-hidden
      initial={{ opacity: 0, scale: 0.72 }}
      animate={{ opacity: leaving ? 0 : 0.22, scale: 1 }}
      transition={{ duration: 1.9, ease: easeOutIOS }}
      className="absolute w-[70vw] h-[70vw] max-w-[330px] max-h-[330px] rounded-full border"
      style={{ borderColor: "hsl(44 53% 54% / 0.4)" }}
    />

    {/* vignette for depth */}
    <div
      aria-hidden
      className="absolute inset-0 pointer-events-none"
      style={{
        background:
          "radial-gradient(100% 70% at 50% 50%, transparent 42%, rgba(0,0,0,0.6) 100%)",
      }}
    />

    {/* the mark */}
    <div className="relative flex flex-col items-center">
      <motion.div
        initial={{ opacity: 0, scale: 1.22, filter: "blur(12px)" }}
        animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
        transition={{ duration: 1.2, ease: easeOutIOS }}
        className="relative"
      >
        <img
          src={logo}
          alt="المصرية جروب"
          className="w-[58vw] max-w-[260px] object-contain drop-shadow-[0_18px_50px_rgba(0,0,0,0.6)]"
        />
        <motion.div
          aria-hidden
          initial={{ x: "-140%" }}
          animate={{ x: "140%" }}
          transition={{ delay: 0.7, duration: 1.4, ease: "easeInOut" }}
          className="absolute inset-y-0 w-1/2 pointer-events-none"
          style={{
            background:
              "linear-gradient(105deg, transparent, rgba(255,255,255,0.22), transparent)",
            mixBlendMode: "screen",
          }}
        />
      </motion.div>

      {/* gold hairline drawing outward */}
      <motion.div
        aria-hidden
        initial={{ scaleX: 0, opacity: 0 }}
        animate={{ scaleX: 1, opacity: 1 }}
        transition={{ delay: 0.55, duration: 0.9, ease: easeOutIOS }}
        className="mt-8 h-px w-40"
        style={{ background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)` }}
      />
    </div>

    {/* bottom progress + build stamp */}
    <div
      className="absolute bottom-0 left-0 right-0 flex flex-col items-center gap-2"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 32px)" }}
    >
      <div className="h-[2px] w-24 rounded-full overflow-hidden bg-white/10">
        <motion.div
          initial={{ x: "-100%" }}
          animate={{ x: "100%" }}
          transition={{ duration: 1.3, ease: "easeInOut", repeat: Infinity }}
          className="h-full w-2/3 rounded-full"
          style={{ background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)` }}
        />
      </div>
      <span className="text-[9px] font-mono tracking-widest text-white/25" dir="ltr">
        build {getBuildTime()}
      </span>
    </div>
  </motion.div>
);

export default NativeSplash;
