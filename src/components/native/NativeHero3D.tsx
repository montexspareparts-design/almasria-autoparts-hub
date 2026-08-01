import { motion } from "framer-motion";
import heroPart from "@/assets/hero-toyota-part.png";

/**
 * Native hero — "Engineering Scan" scene.
 * The real part sits inside a live diagnostics rig: a rotating HUD reticle,
 * a laser scan line that sweeps the product, orbiting spec nodes and
 * drifting particulate. Same subject as the web hero, different theatre.
 */

const RED = "hsl(var(--toyota-red)";
const GOLD = "hsl(var(--gold)";

/* Rotating technical reticle drawn as SVG */
const Reticle = () => (
  <svg viewBox="0 0 300 300" className="w-full h-full">
    <g fill="none" stroke={`${GOLD} / 0.28)`} strokeWidth="0.7">
      <circle cx="150" cy="150" r="146" strokeDasharray="2 10" />
      <circle cx="150" cy="150" r="120" />
    </g>
    {/* tick marks */}
    {Array.from({ length: 60 }, (_, i) => {
      const a = (i * 6 * Math.PI) / 180;
      const long = i % 5 === 0;
      const r1 = long ? 126 : 132;
      return (
        <line
          key={i}
          x1={150 + r1 * Math.cos(a)}
          y1={150 + r1 * Math.sin(a)}
          x2={150 + 138 * Math.cos(a)}
          y2={150 + 138 * Math.sin(a)}
          stroke={long ? `${GOLD} / 0.5)` : "rgba(255,255,255,0.16)"}
          strokeWidth={long ? 1.2 : 0.6}
        />
      );
    })}
    {/* red arc segments */}
    <circle
      cx="150"
      cy="150"
      r="104"
      fill="none"
      stroke={`${RED} / 0.5)`}
      strokeWidth="1.6"
      strokeDasharray="70 200"
      strokeLinecap="round"
    />
    <circle
      cx="150"
      cy="150"
      r="104"
      fill="none"
      stroke={`${RED} / 0.25)`}
      strokeWidth="1.6"
      strokeDasharray="34 120"
      strokeDashoffset="-180"
      strokeLinecap="round"
    />
  </svg>
);

/* Corner brackets — camera-focus framing */
const Bracket = ({ className, rotate }: { className: string; rotate: number }) => (
  <svg
    viewBox="0 0 40 40"
    className={className}
    style={{ transform: `rotate(${rotate}deg)` }}
  >
    <path
      d="M2 14 L2 2 L14 2"
      fill="none"
      stroke={`${GOLD} / 0.55)`}
      strokeWidth="2"
      strokeLinecap="square"
    />
  </svg>
);

const NativeHero3D = () => (
  <div aria-hidden className="absolute inset-0 overflow-hidden">
    {/* deep stage */}
    <div
      className="absolute inset-0"
      style={{
        background:
          "radial-gradient(110% 80% at 50% 2%, #1d1013 0%, #120b0e 34%, #0a0709 64%, #040404 100%)",
      }}
    />

    {/* volumetric top light cone */}
    <div
      className="absolute -top-[10%] left-1/2 -translate-x-1/2 w-[130vw] h-[70vh] opacity-[0.22]"
      style={{
        background:
          "conic-gradient(from 160deg at 50% 0%, transparent 0deg, rgba(255,255,255,0.20) 18deg, transparent 40deg)",
        filter: "blur(28px)",
      }}
    />

    {/* pulsing red core bloom */}
    <motion.div
      animate={{ opacity: [0.24, 0.44, 0.24], scale: [0.94, 1.06, 0.94] }}
      transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      className="absolute top-[10%] left-1/2 -translate-x-1/2 w-[80vw] h-[80vw] max-w-[380px] max-h-[380px] rounded-full blur-[64px]"
      style={{ background: `${RED} / 0.34)` }}
    />

    {/* HUD reticle — counter-rotating pair */}
    <div className="absolute inset-x-0 top-[6%] flex justify-center">
      <div className="relative w-[92vw] max-w-[400px] aspect-square">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 48, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0"
        >
          <Reticle />
        </motion.div>
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 90, repeat: Infinity, ease: "linear" }}
          className="absolute inset-[16%] rounded-full border border-dashed"
          style={{ borderColor: "rgba(255,255,255,0.10)" }}
        />

        {/* focus brackets */}
        <Bracket className="absolute top-0 left-0 w-6 h-6" rotate={0} />
        <Bracket className="absolute top-0 right-0 w-6 h-6" rotate={90} />
        <Bracket className="absolute bottom-0 right-0 w-6 h-6" rotate={180} />
        <Bracket className="absolute bottom-0 left-0 w-6 h-6" rotate={270} />
      </div>
    </div>

    {/* the part, with its own reflection */}
    <div className="absolute inset-x-0 top-[3%] flex flex-col items-center">
      <motion.img
        src={heroPart}
        alt=""
        initial={{ opacity: 0, scale: 0.9, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: [0, -9, 0] }}
        transition={{
          opacity: { duration: 0.9, ease: [0.32, 0.72, 0, 1] },
          scale: { duration: 0.9, ease: [0.32, 0.72, 0, 1] },
          y: { duration: 8, repeat: Infinity, ease: "easeInOut" },
        }}
        className="w-[86vw] max-w-[380px] object-contain"
        style={{
          filter:
            "drop-shadow(0 30px 48px rgba(0,0,0,0.8)) drop-shadow(0 0 26px hsl(var(--toyota-red) / 0.20))",
        }}
      />
      {/* mirrored floor reflection */}
      <img
        src={heroPart}
        alt=""
        className="w-[86vw] max-w-[380px] object-contain -mt-4 opacity-[0.16]"
        style={{
          transform: "scaleY(-0.42)",
          filter: "blur(3px)",
          maskImage: "linear-gradient(to top, transparent 6%, black 85%)",
          WebkitMaskImage: "linear-gradient(to top, transparent 6%, black 85%)",
        }}
      />
    </div>

    {/* laser scan line sweeping the product */}
    <motion.div
      initial={{ y: "6%", opacity: 0 }}
      animate={{ y: ["6%", "62%", "6%"], opacity: [0, 1, 0] }}
      transition={{ duration: 6, repeat: Infinity, repeatDelay: 2.5, ease: "easeInOut" }}
      className="absolute inset-x-[6%] h-[2px] pointer-events-none"
      style={{
        background: `linear-gradient(90deg, transparent, ${RED} / 0.9), ${GOLD} / 0.8), ${RED} / 0.9), transparent)`,
        boxShadow: `0 0 18px hsl(var(--toyota-red) / 0.7)`,
      }}
    />

    {/* drifting particulate */}
    {[
      { l: "12%", t: "22%", d: 0, s: 3 },
      { l: "82%", t: "16%", d: 1.4, s: 2 },
      { l: "26%", t: "58%", d: 2.2, s: 2 },
      { l: "70%", t: "62%", d: 0.8, s: 3 },
      { l: "48%", t: "12%", d: 3.1, s: 2 },
      { l: "90%", t: "44%", d: 1.9, s: 2 },
    ].map((p, i) => (
      <motion.span
        key={i}
        animate={{ y: [0, -18, 0], opacity: [0.15, 0.6, 0.15] }}
        transition={{ duration: 6 + p.d, repeat: Infinity, ease: "easeInOut", delay: p.d }}
        className="absolute rounded-full"
        style={{
          left: p.l,
          top: p.t,
          width: p.s,
          height: p.s,
          background: `${GOLD} / 0.85)`,
          boxShadow: `0 0 8px hsl(var(--gold) / 0.6)`,
        }}
      />
    ))}

    {/* orbiting spec nodes */}
    {[
      { label: "OEM", top: "14%", side: "left" as const, delay: 0.5 },
      { label: "GRADE A", top: "20%", side: "right" as const, delay: 0.65 },
      { label: "JAPAN · DENSO", top: "50%", side: "left" as const, delay: 0.8 },
      { label: "IRIDIUM", top: "56%", side: "right" as const, delay: 0.95 },
    ].map((n) => (
      <motion.div
        key={n.label}
        initial={{ opacity: 0, x: n.side === "left" ? -14 : 14 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: n.delay, duration: 0.6, ease: [0.32, 0.72, 0, 1] }}
        className="absolute flex items-center gap-2"
        style={{ top: n.top, [n.side]: "4%", flexDirection: n.side === "left" ? "row" : "row-reverse" }}
      >
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: `${RED} / 0.9)`, boxShadow: `0 0 10px hsl(var(--toyota-red) / 0.8)` }}
        />
        <span className="w-6 h-px" style={{ background: `${GOLD} / 0.4)` }} />
        <span
          dir="ltr"
          className="font-display font-black text-[9px] tracking-[0.22em] text-white/80"
        >
          {n.label}
        </span>
      </motion.div>
    ))}

    {/* part number readout */}
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.05, duration: 0.6 }}
      className="absolute left-1/2 -translate-x-1/2 top-[66%] px-3.5 py-1.5 rounded-full bg-carbon/80 backdrop-blur-md"
      style={{ border: `1px solid hsl(var(--toyota-red) / 0.45)` }}
    >
      <span dir="ltr" className="font-display font-black text-[10px] tracking-[0.18em] text-white/90">
        90915-YZZN2
        <span className="mx-2 text-white/25">|</span>
        <motion.span
          animate={{ opacity: [1, 0.35, 1] }}
          transition={{ duration: 1.8, repeat: Infinity }}
          className="text-toyota-red"
        >
          SCANNED
        </motion.span>
      </span>
    </motion.div>

    {/* receding grid floor */}
    <div
      className="absolute inset-x-0 bottom-0 h-2/3 opacity-[0.11]"
      style={{
        backgroundImage:
          "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
        backgroundSize: "40px 40px",
        maskImage: "linear-gradient(to bottom, transparent, black 55%, transparent)",
        WebkitMaskImage: "linear-gradient(to bottom, transparent, black 55%, transparent)",
        transform: "perspective(380px) rotateX(64deg)",
        transformOrigin: "bottom",
      }}
    />
    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-carbon/40 to-carbon" />
  </div>
);

export default NativeHero3D;
