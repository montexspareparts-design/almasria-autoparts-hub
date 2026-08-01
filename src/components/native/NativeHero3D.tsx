import { motion } from "framer-motion";

/**
 * Pure-CSS/SVG 3D hero scene for the native app.
 * Replaces the flat ambient photo with a depth-lit, rotating gear assembly
 * (perspective + layered parallax rings + gold aurora) — no images, no WebGL.
 */

const GOLD = "hsl(44 53% 54%)";

const Gear = ({ teeth = 12 }: { teeth?: number }) => (
  <svg viewBox="0 0 200 200" className="w-full h-full">
    <defs>
      <linearGradient id="gearMetal" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="rgba(255,255,255,0.30)" />
        <stop offset="45%" stopColor="rgba(255,255,255,0.08)" />
        <stop offset="100%" stopColor="rgba(255,255,255,0.02)" />
      </linearGradient>
      <linearGradient id="gearGold" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="hsl(44 53% 64% / 0.55)" />
        <stop offset="100%" stopColor="hsl(44 53% 44% / 0.12)" />
      </linearGradient>
    </defs>
    <g fill="url(#gearMetal)" stroke="url(#gearGold)" strokeWidth="1.2">
      {Array.from({ length: teeth }, (_, i) => {
        const a = (i * 360) / teeth;
        return (
          <rect
            key={i}
            x="92"
            y="4"
            width="16"
            height="30"
            rx="4"
            transform={`rotate(${a} 100 100)`}
          />
        );
      })}
      <circle cx="100" cy="100" r="72" />
      <circle cx="100" cy="100" r="46" fill="rgba(0,0,0,0.25)" />
      <circle cx="100" cy="100" r="22" fill="url(#gearGold)" />
      {[0, 60, 120, 180, 240, 300].map((a) => {
        const r = (a * Math.PI) / 180;
        return (
          <circle
            key={a}
            cx={100 + 60 * Math.cos(r)}
            cy={100 + 60 * Math.sin(r)}
            r="6"
            fill="rgba(0,0,0,0.28)"
          />
        );
      })}
    </g>
  </svg>
);

const NativeHero3D = () => (
  <div aria-hidden className="absolute inset-0 overflow-hidden">
    {/* depth backdrop */}
    <div
      className="absolute inset-0"
      style={{
        background:
          "radial-gradient(120% 90% at 78% 8%, #16305a 0%, #0d2140 40%, #0A1A2F 70%, #050c17 100%)",
      }}
    />
    {/* gold aurora */}
    <motion.div
      initial={{ opacity: 0.18, scale: 0.9 }}
      animate={{ opacity: [0.18, 0.34, 0.18], scale: [0.9, 1.06, 0.9] }}
      transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      className="absolute -top-[18%] right-[-12%] w-[70vw] h-[70vw] rounded-full blur-[90px]"
      style={{ background: "hsl(44 53% 54% / 0.28)" }}
    />
    <div
      className="absolute -bottom-[22%] left-[-16%] w-[66vw] h-[66vw] rounded-full blur-[100px]"
      style={{ background: "hsl(212 60% 45% / 0.30)" }}
    />

    {/* 3D stage */}
    <div className="absolute inset-0" style={{ perspective: "900px" }}>
      {/* back gear — slow, deep */}
      <motion.div
        animate={{ rotate: -360 }}
        transition={{ duration: 68, repeat: Infinity, ease: "linear" }}
        className="absolute w-[46vw] h-[46vw] max-w-[230px] max-h-[230px] right-[-8%] top-[6%] opacity-[0.35]"
        style={{ transform: "rotateX(58deg) rotateZ(12deg)", filter: "blur(0.4px)" }}
      >
        <Gear teeth={14} />
      </motion.div>

      {/* hero gear — tilted, gold-lit */}
      <motion.div
        initial={{ opacity: 0, scale: 0.86 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.1, ease: [0.32, 0.72, 0, 1] }}
        className="absolute w-[64vw] h-[64vw] max-w-[330px] max-h-[330px] right-[-14%] top-[16%]"
        style={{ transformStyle: "preserve-3d" }}
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 42, repeat: Infinity, ease: "linear" }}
          className="w-full h-full"
          style={{
            transform: "rotateX(52deg) rotateZ(-8deg)",
            filter: `drop-shadow(0 26px 44px rgba(0,0,0,0.55)) drop-shadow(0 0 26px ${GOLD.replace(")", " / 0.18)")})`,
          }}
        >
          <Gear teeth={16} />
        </motion.div>
      </motion.div>

      {/* orbiting bearing ring */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
        className="absolute w-[52vw] h-[52vw] max-w-[270px] max-h-[270px] left-[-16%] bottom-[4%] opacity-40"
        style={{ transform: "rotateX(64deg)" }}
      >
        <svg viewBox="0 0 200 200" className="w-full h-full">
          <circle cx="100" cy="100" r="84" fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="2" />
          <circle cx="100" cy="100" r="58" fill="none" stroke="hsl(44 53% 54% / 0.35)" strokeWidth="1.5" />
          {Array.from({ length: 10 }, (_, i) => {
            const r = ((i * 36) * Math.PI) / 180;
            return (
              <circle
                key={i}
                cx={100 + 71 * Math.cos(r)}
                cy={100 + 71 * Math.sin(r)}
                r="7"
                fill="rgba(255,255,255,0.12)"
                stroke="hsl(44 53% 54% / 0.30)"
              />
            );
          })}
        </svg>
      </motion.div>
    </div>

    {/* specular sweep */}
    <motion.div
      initial={{ x: "-120%" }}
      animate={{ x: "130%" }}
      transition={{ duration: 4.2, repeat: Infinity, repeatDelay: 4, ease: "easeInOut" }}
      className="absolute inset-y-0 w-1/3 pointer-events-none"
      style={{
        background: "linear-gradient(105deg, transparent, rgba(255,255,255,0.07), transparent)",
        mixBlendMode: "screen",
      }}
    />

    {/* grid floor + vignette to blend into the page */}
    <div
      className="absolute inset-x-0 bottom-0 h-2/3 opacity-[0.13]"
      style={{
        backgroundImage:
          "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
        backgroundSize: "44px 44px",
        maskImage: "linear-gradient(to bottom, transparent, black 60%, transparent)",
        WebkitMaskImage: "linear-gradient(to bottom, transparent, black 60%, transparent)",
        transform: "perspective(400px) rotateX(62deg)",
        transformOrigin: "bottom",
      }}
    />
    <div className="absolute inset-0 bg-gradient-to-b from-carbon/40 via-carbon/55 to-carbon" />
  </div>
);

export default NativeHero3D;
