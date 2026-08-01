import { motion } from "framer-motion";

/**
 * Pure-CSS/SVG 3D hero scene for the native app — built from the actual parts
 * we sell: a ventilated brake disc, an oil filter canister and a spark plug.
 * No images, no WebGL.
 */

const GOLD = "hsl(44 53% 54%)";

/* ---------- Ventilated brake disc (hero object) ---------- */
const BrakeDisc = () => (
  <svg viewBox="0 0 200 200" className="w-full h-full">
    <defs>
      <radialGradient id="discFace" cx="35%" cy="28%" r="80%">
        <stop offset="0%" stopColor="rgba(255,255,255,0.34)" />
        <stop offset="45%" stopColor="rgba(255,255,255,0.11)" />
        <stop offset="100%" stopColor="rgba(255,255,255,0.03)" />
      </radialGradient>
      <linearGradient id="discEdge" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="hsl(44 53% 66% / 0.65)" />
        <stop offset="100%" stopColor="hsl(44 53% 44% / 0.12)" />
      </linearGradient>
    </defs>

    {/* outer friction ring */}
    <circle cx="100" cy="100" r="92" fill="url(#discFace)" stroke="url(#discEdge)" strokeWidth="1.4" />
    <circle cx="100" cy="100" r="83" fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="1" />

    {/* drilled cooling holes */}
    {Array.from({ length: 20 }, (_, i) => {
      const r = ((i * 18) * Math.PI) / 180;
      return (
        <circle
          key={`h${i}`}
          cx={100 + 74 * Math.cos(r)}
          cy={100 + 74 * Math.sin(r)}
          r="4.6"
          fill="rgba(0,0,0,0.42)"
          stroke="hsl(44 53% 54% / 0.28)"
          strokeWidth="0.8"
        />
      );
    })}

    {/* machined grooves */}
    {Array.from({ length: 6 }, (_, i) => {
      const a = (i * 60) + 8;
      return (
        <rect
          key={`g${i}`}
          x="99"
          y="22"
          width="2"
          height="42"
          rx="1"
          fill="rgba(0,0,0,0.30)"
          transform={`rotate(${a} 100 100)`}
        />
      );
    })}

    {/* hat / bell */}
    <circle cx="100" cy="100" r="46" fill="rgba(0,0,0,0.30)" stroke="rgba(255,255,255,0.12)" />
    <circle cx="100" cy="100" r="38" fill="url(#discFace)" stroke="url(#discEdge)" strokeWidth="1" />

    {/* wheel bolt holes */}
    {Array.from({ length: 5 }, (_, i) => {
      const r = ((i * 72 - 90) * Math.PI) / 180;
      return (
        <circle
          key={`b${i}`}
          cx={100 + 26 * Math.cos(r)}
          cy={100 + 26 * Math.sin(r)}
          r="6"
          fill="rgba(0,0,0,0.45)"
          stroke="hsl(44 53% 54% / 0.35)"
        />
      );
    })}
    <circle cx="100" cy="100" r="12" fill="rgba(0,0,0,0.5)" stroke="url(#discEdge)" />
  </svg>
);

/* ---------- Oil filter canister ---------- */
const OilFilter = () => (
  <svg viewBox="0 0 120 170" className="w-full h-full">
    <defs>
      <linearGradient id="canBody" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="rgba(255,255,255,0.05)" />
        <stop offset="30%" stopColor="rgba(255,255,255,0.26)" />
        <stop offset="60%" stopColor="rgba(255,255,255,0.09)" />
        <stop offset="100%" stopColor="rgba(255,255,255,0.02)" />
      </linearGradient>
    </defs>
    <path d="M14 34 L14 140 Q60 156 106 140 L106 34 Z" fill="url(#canBody)" stroke="hsl(44 53% 54% / 0.35)" />
    <ellipse cx="60" cy="34" rx="46" ry="14" fill="rgba(255,255,255,0.14)" stroke="hsl(44 53% 60% / 0.45)" />
    <ellipse cx="60" cy="30" rx="34" ry="10" fill="rgba(0,0,0,0.35)" stroke="rgba(255,255,255,0.12)" />
    {/* grip ribs */}
    {[62, 74, 86, 98, 110].map((y) => (
      <path key={y} d={`M15 ${y} Q60 ${y + 11} 105 ${y}`} fill="none" stroke="rgba(0,0,0,0.22)" strokeWidth="2" />
    ))}
    <path d="M15 52 Q60 63 105 52" fill="none" stroke="hsl(44 53% 60% / 0.45)" strokeWidth="2" />
  </svg>
);

/* ---------- Spark plug ---------- */
const SparkPlug = () => (
  <svg viewBox="0 0 60 200" className="w-full h-full">
    <defs>
      <linearGradient id="plugCer" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="rgba(255,255,255,0.10)" />
        <stop offset="40%" stopColor="rgba(255,255,255,0.30)" />
        <stop offset="100%" stopColor="rgba(255,255,255,0.05)" />
      </linearGradient>
    </defs>
    {/* terminal */}
    <rect x="24" y="8" width="12" height="20" rx="4" fill="rgba(255,255,255,0.18)" stroke="hsl(44 53% 60% / 0.4)" />
    {/* ceramic insulator */}
    <path d="M20 28 L40 28 L36 96 L24 96 Z" fill="url(#plugCer)" stroke="hsl(44 53% 54% / 0.3)" />
    {[42, 54, 66].map((y) => (
      <path key={y} d={`M21 ${y} L39 ${y}`} stroke="rgba(0,0,0,0.25)" strokeWidth="3" />
    ))}
    {/* hex nut */}
    <rect x="16" y="96" width="28" height="22" fill="rgba(255,255,255,0.16)" stroke="hsl(44 53% 60% / 0.4)" />
    {/* threaded shell */}
    <rect x="21" y="118" width="18" height="46" fill="rgba(255,255,255,0.10)" stroke="rgba(255,255,255,0.14)" />
    {Array.from({ length: 8 }, (_, i) => (
      <path key={i} d={`M21 ${122 + i * 5.5} L39 ${124 + i * 5.5}`} stroke="rgba(0,0,0,0.28)" strokeWidth="1.6" />
    ))}
    {/* electrode */}
    <rect x="28" y="164" width="4" height="18" fill="hsl(44 53% 60% / 0.6)" />
    <path d="M20 176 L20 186 L32 186" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="3" />
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
      {/* hero brake disc — tilted, spinning */}
      <motion.div
        initial={{ opacity: 0, scale: 0.86 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.1, ease: [0.32, 0.72, 0, 1] }}
        className="absolute w-[66vw] h-[66vw] max-w-[340px] max-h-[340px] right-[-13%] top-[13%]"
        style={{ transformStyle: "preserve-3d" }}
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 26, repeat: Infinity, ease: "linear" }}
          className="w-full h-full"
          style={{
            transform: "rotateX(58deg) rotateZ(-10deg)",
            filter: `drop-shadow(0 26px 44px rgba(0,0,0,0.55)) drop-shadow(0 0 26px ${GOLD.replace(")", " / 0.18)")})`,
          }}
        >
          <BrakeDisc />
        </motion.div>
      </motion.div>

      {/* oil filter — floating, slight sway */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 0.85, y: [0, -8, 0] }}
        transition={{ opacity: { duration: 0.9 }, y: { duration: 7, repeat: Infinity, ease: "easeInOut" } }}
        className="absolute w-[26vw] h-[38vw] max-w-[130px] max-h-[190px] left-[6%] top-[10%]"
        style={{
          transform: "rotateX(12deg) rotateY(-18deg) rotateZ(-8deg)",
          filter: "drop-shadow(0 20px 34px rgba(0,0,0,0.5))",
        }}
      >
        <OilFilter />
      </motion.div>

      {/* spark plug — deep, subtle drift */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.45, y: [0, 10, 0] }}
        transition={{ opacity: { duration: 1.2 }, y: { duration: 9, repeat: Infinity, ease: "easeInOut" } }}
        className="absolute w-[13vw] h-[42vw] max-w-[64px] max-h-[210px] left-[38%] bottom-[-6%]"
        style={{
          transform: "rotateZ(24deg) rotateY(14deg)",
          filter: "drop-shadow(0 16px 26px rgba(0,0,0,0.5))",
        }}
      >
        <SparkPlug />
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
