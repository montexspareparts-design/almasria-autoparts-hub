import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "react-router-dom";
import { ReactNode } from "react";

const GEAR_TEETH = 12;
const OUTER_R = 48;
const INNER_R = 36;
const TOOTH_H = 10;
const HUB_R = 14;

function gearPath(cx: number, cy: number, teeth: number, outerR: number, innerR: number, toothH: number) {
  const points: string[] = [];
  const step = (Math.PI * 2) / teeth;
  const halfTooth = step * 0.3;

  for (let i = 0; i < teeth; i++) {
    const angle = i * step - Math.PI / 2;
    const a1 = angle - halfTooth;
    const a2 = angle + halfTooth;
    const a3 = angle + step / 2 - halfTooth * 0.5;
    const a4 = angle + step / 2 + halfTooth * 0.5;

    const tipR = outerR + toothH;
    points.push(
      `${cx + Math.cos(a1) * outerR},${cy + Math.sin(a1) * outerR}`,
      `${cx + Math.cos(a1) * tipR},${cy + Math.sin(a1) * tipR}`,
      `${cx + Math.cos(a2) * tipR},${cy + Math.sin(a2) * tipR}`,
      `${cx + Math.cos(a2) * outerR},${cy + Math.sin(a2) * outerR}`,
      `${cx + Math.cos(a3) * innerR},${cy + Math.sin(a3) * innerR}`,
      `${cx + Math.cos(a4) * innerR},${cy + Math.sin(a4) * innerR}`
    );
  }
  return `M${points.join("L")}Z`;
}

const GearSVG = ({ size = 120, className = "" }: { size?: number; className?: string }) => {
  const cx = size / 2;
  const cy = size / 2;
  const scale = size / 120;
  const path = gearPath(cx, cy, GEAR_TEETH, OUTER_R * scale, INNER_R * scale, TOOTH_H * scale);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={className}>
      <path d={path} fill="hsl(var(--primary))" opacity="0.9" />
      <circle cx={cx} cy={cy} r={HUB_R * scale} fill="hsl(var(--secondary))" />
      <circle cx={cx} cy={cy} r={HUB_R * scale * 0.5} fill="hsl(var(--primary))" opacity="0.6" />
    </svg>
  );
};

const SmallGear = ({ size = 60, className = "" }: { size?: number; className?: string }) => {
  const cx = size / 2;
  const cy = size / 2;
  const scale = size / 120;
  const path = gearPath(cx, cy, 8, OUTER_R * scale, INNER_R * scale, TOOTH_H * scale * 1.2);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={className}>
      <path d={path} fill="hsl(var(--primary))" opacity="0.5" />
      <circle cx={cx} cy={cy} r={HUB_R * scale} fill="hsl(var(--secondary))" />
    </svg>
  );
};

const PageTransition = ({ children }: { children: ReactNode }) => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <motion.div key={location.pathname}>
        {/* Dark overlay that wipes away */}
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none"
          style={{ backgroundColor: "hsl(var(--secondary))" }}
          initial={{ clipPath: "circle(150% at 50% 50%)" }}
          animate={{ clipPath: "circle(0% at 50% 50%)" }}
          transition={{ duration: 0.7, ease: [0.76, 0, 0.24, 1], delay: 0.15 }}
        >
          {/* Interlocking gears */}
          <div className="relative flex items-center justify-center">
            {/* Main large gear */}
            <motion.div
              initial={{ rotate: 0, scale: 1, opacity: 1 }}
              animate={{ rotate: 360, scale: 0.3, opacity: 0 }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="absolute"
            >
              <GearSVG size={140} />
            </motion.div>

            {/* Top-right small gear (counter-rotate) */}
            <motion.div
              initial={{ rotate: 0, scale: 1, opacity: 0.7 }}
              animate={{ rotate: -480, scale: 0.2, opacity: 0 }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="absolute"
              style={{ top: -55, right: -60 }}
            >
              <SmallGear size={70} />
            </motion.div>

            {/* Bottom-left small gear (counter-rotate) */}
            <motion.div
              initial={{ rotate: 0, scale: 1, opacity: 0.7 }}
              animate={{ rotate: -480, scale: 0.2, opacity: 0 }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="absolute"
              style={{ bottom: -55, left: -60 }}
            >
              <SmallGear size={70} />
            </motion.div>

            {/* Spark particles */}
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: "hsl(var(--primary))" }}
                initial={{
                  x: 0, y: 0, opacity: 0, scale: 0,
                }}
                animate={{
                  x: Math.cos((i * Math.PI * 2) / 6) * 100,
                  y: Math.sin((i * Math.PI * 2) / 6) * 100,
                  opacity: [0, 1, 0],
                  scale: [0, 1.5, 0],
                }}
                transition={{
                  duration: 0.6,
                  delay: 0.1 + i * 0.04,
                  ease: "easeOut",
                }}
              />
            ))}
          </div>
        </motion.div>

        {/* Exit overlay (enters from nothing when leaving) */}
        <motion.div
          className="fixed inset-0 z-[9999] pointer-events-none"
          style={{ backgroundColor: "hsl(var(--secondary))" }}
          initial={{ clipPath: "circle(0% at 50% 50%)" }}
          exit={{ clipPath: "circle(150% at 50% 50%)" }}
          transition={{ duration: 0.5, ease: [0.76, 0, 0.24, 1] }}
        />

        {/* Page content with fade */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2, ease: "easeOut" }}
        >
          {children}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default PageTransition;
