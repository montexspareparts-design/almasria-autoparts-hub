import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import heroPart from "@/assets/hero-toyota-part.png";

/**
 * Native hero scene — same real product visual used on the website
 * (Toyota genuine oil filter + iridium spark plug) with depth lighting,
 * concentric rings and floating spec chips.
 */
const NativeHero3D = () => (
  <div aria-hidden className="absolute inset-0 overflow-hidden">
    {/* depth backdrop */}
    <div
      className="absolute inset-0"
      style={{
        background:
          "radial-gradient(120% 90% at 60% 6%, #1a1013 0%, #120a0d 38%, #0a0708 68%, #050505 100%)",
      }}
    />

    {/* red bloom behind the product */}
    <motion.div
      initial={{ opacity: 0.2, scale: 0.92 }}
      animate={{ opacity: [0.22, 0.4, 0.22], scale: [0.92, 1.05, 0.92] }}
      transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      className="absolute top-[6%] left-1/2 -translate-x-1/2 w-[85vw] h-[85vw] max-w-[420px] max-h-[420px] rounded-full blur-[70px]"
      style={{ background: "hsl(var(--toyota-red) / 0.30)" }}
    />
    <div
      className="absolute -bottom-[18%] right-[-14%] w-[60vw] h-[60vw] rounded-full blur-[90px]"
      style={{ background: "hsl(var(--gold) / 0.12)" }}
    />

    {/* concentric rings */}
    <div className="absolute inset-0 flex items-start justify-center pt-[8%]">
      <div className="relative w-[86vw] max-w-[400px] aspect-square">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
          className="absolute inset-[6%] rounded-full border border-dashed"
          style={{ borderColor: "hsl(var(--gold) / 0.22)" }}
        />
        <div
          className="absolute inset-[20%] rounded-full border"
          style={{ borderColor: "hsl(var(--toyota-red) / 0.18)" }}
        />
      </div>
    </div>

    {/* the actual part */}
    <div className="absolute inset-x-0 top-[4%] flex justify-center">
      <motion.img
        src={heroPart}
        alt=""
        initial={{ opacity: 0, scale: 0.92, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: [0, -8, 0] }}
        transition={{
          opacity: { duration: 0.8, ease: [0.32, 0.72, 0, 1] },
          scale: { duration: 0.8, ease: [0.32, 0.72, 0, 1] },
          y: { duration: 7, repeat: Infinity, ease: "easeInOut" },
        }}
        className="w-[88vw] max-w-[400px] object-contain"
        style={{ filter: "drop-shadow(0 28px 46px rgba(0,0,0,0.75))" }}
      />
    </div>

    {/* spec chips */}
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.5 }}
      className="absolute top-[16%] left-[5%] px-3 py-1.5 rounded-full bg-carbon/85 backdrop-blur-md border border-toyota-red/50"
    >
      <span dir="ltr" className="font-display font-black text-[11px] text-white tracking-wider">
        PART # <span className="text-toyota-red">90915-YZZN2</span>
      </span>
    </motion.div>

    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.65, duration: 0.5 }}
      className="absolute top-[19%] right-[5%] text-right"
    >
      <div dir="ltr" className="font-display font-black text-[10px] tracking-[0.25em] text-white/90">
        <span className="text-toyota-red">✓</span> O E M
      </div>
      <div dir="ltr" className="font-display font-black text-[9px] tracking-[0.2em] text-white/65 mt-0.5">
        +QUALITY GRADE A
      </div>
    </motion.div>

    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.8, duration: 0.5 }}
      className="absolute top-[52%] left-[5%]"
    >
      <div dir="ltr" className="font-display font-black text-[10px] tracking-[0.25em] text-toyota-red">
        JAPAN <span className="text-white/80">◆</span> DENSO
      </div>
      <div dir="ltr" className="font-display font-black text-[9px] tracking-[0.2em] text-white/80 mt-0.5">
        FACTORY SEALED
      </div>
    </motion.div>

    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.95, duration: 0.5 }}
      className="absolute top-[56%] right-[5%] px-3 py-1.5 rounded-full bg-carbon/80 backdrop-blur-md"
      style={{ border: "1px solid hsl(var(--gold) / 0.5)" }}
    >
      <span className="font-display font-black text-[11px] text-gold tracking-wider flex items-center gap-1.5">
        <Sparkles className="w-3 h-3" /> IRIDIUM SPARK
      </span>
    </motion.div>

    {/* specular sweep */}
    <motion.div
      initial={{ x: "-120%" }}
      animate={{ x: "130%" }}
      transition={{ duration: 4.2, repeat: Infinity, repeatDelay: 4.5, ease: "easeInOut" }}
      className="absolute inset-y-0 w-1/3 pointer-events-none"
      style={{
        background: "linear-gradient(105deg, transparent, rgba(255,255,255,0.06), transparent)",
        mixBlendMode: "screen",
      }}
    />

    {/* grid floor + vignette */}
    <div
      className="absolute inset-x-0 bottom-0 h-2/3 opacity-[0.10]"
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
    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-carbon/45 to-carbon" />
  </div>
);

export default NativeHero3D;
