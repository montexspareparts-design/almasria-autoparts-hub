import { motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { Users, Package, MapPin, Award, Gauge, Volume2, VolumeX } from "lucide-react";

interface StatItem {
  label: string;
  value: number;
  suffix: string;
  icon: typeof Users;
  color: string;
}

const STATS: StatItem[] = [
  { label: "سنة خبرة", value: 25, suffix: "+", icon: Award, color: "hsl(355, 90%, 48%)" },
  { label: "عميل نشط", value: 1000, suffix: "+", icon: Users, color: "hsl(40, 80%, 55%)" },
  { label: "منتج متوفر", value: 5000, suffix: "+", icon: Package, color: "hsl(355, 70%, 55%)" },
  { label: "فروع", value: 5, suffix: "", icon: MapPin, color: "hsl(210, 60%, 50%)" },
];

const AnimatedCounter = ({ value, suffix }: { value: number; suffix: string }) => {
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setInView(true); },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!inView) return;
    const duration = 2000;
    const start = performance.now();
    const step = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * value));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [inView, value]);

  return (
    <span ref={ref} className="tabular-nums">
      {display.toLocaleString("ar-EG")}
      {suffix}
    </span>
  );
};

const SpeedometerDashboard = () => {
  const [activeIdx, setActiveIdx] = useState(0);
  const [soundOn, setSoundOn] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscRef = useRef<OscillatorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);

  const ratio = STATS[activeIdx].value / Math.max(...STATS.map((s) => s.value));
  const needleAngle = ratio * 180 - 90;

  // Engine sound: oscillator frequency maps to needle ratio
  const startEngine = useCallback(() => {
    if (audioCtxRef.current) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.value = 80 + ratio * 200;
    gain.gain.value = 0.06;
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    audioCtxRef.current = ctx;
    oscRef.current = osc;
    gainRef.current = gain;
  }, [ratio]);

  const stopEngine = useCallback(() => {
    oscRef.current?.stop();
    audioCtxRef.current?.close();
    audioCtxRef.current = null;
    oscRef.current = null;
    gainRef.current = null;
  }, []);

  // Update pitch when active stat changes
  useEffect(() => {
    if (oscRef.current) {
      oscRef.current.frequency.linearRampToValueAtTime(
        80 + ratio * 200,
        (audioCtxRef.current?.currentTime ?? 0) + 0.8
      );
    }
  }, [ratio]);

  // Toggle sound
  useEffect(() => {
    if (soundOn) startEngine();
    else stopEngine();
    return () => { stopEngine(); };
  }, [soundOn, startEngine, stopEngine]);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIdx((i) => (i + 1) % STATS.length);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: 0.3, duration: 0.6 }}
      className="bg-card border border-border rounded-xl p-6 relative overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />

      <div className="relative z-10">
        <div className="flex items-center justify-center gap-2 mb-5">
          <Gauge className="w-5 h-5 text-primary" />
          <h3 className="text-xl font-black text-foreground">أرقامنا بتتكلم 🏎️</h3>
        </div>

        {/* Speedometer SVG */}
        <div className="flex justify-center mb-6">
          <svg width="200" height="120" viewBox="0 0 200 120" className="drop-shadow-lg">
            {/* Gauge background arc */}
            <path
              d="M 20 110 A 80 80 0 0 1 180 110"
              fill="none"
              stroke="hsl(210, 10%, 88%)"
              strokeWidth="12"
              strokeLinecap="round"
            />
            {/* Gauge colored arc */}
            <motion.path
              d="M 20 110 A 80 80 0 0 1 180 110"
              fill="none"
              stroke="hsl(355, 90%, 48%)"
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray="251"
              initial={{ strokeDashoffset: 251 }}
              animate={{
                strokeDashoffset: 251 - (251 * STATS[activeIdx].value) / Math.max(...STATS.map((s) => s.value)),
              }}
              transition={{ duration: 1.5, ease: "easeOut" }}
            />
            {/* Tick marks */}
            {[...Array(9)].map((_, i) => {
              const angle = (-180 + i * 22.5) * (Math.PI / 180);
              const x1 = 100 + 70 * Math.cos(angle);
              const y1 = 110 + 70 * Math.sin(angle);
              const x2 = 100 + 80 * Math.cos(angle);
              const y2 = 110 + 80 * Math.sin(angle);
              return (
                <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="hsl(210, 8%, 45%)" strokeWidth="1.5" strokeLinecap="round" />
              );
            })}
            {/* Needle */}
            <motion.line
              x1="100"
              y1="110"
              x2="100"
              y2="40"
              stroke="hsl(355, 90%, 48%)"
              strokeWidth="3"
              strokeLinecap="round"
              style={{ transformOrigin: "100px 110px" }}
              animate={{ rotate: needleAngle }}
              transition={{ duration: 1.5, type: "spring", stiffness: 50, damping: 15 }}
            />
            {/* Center dot */}
            <circle cx="100" cy="110" r="6" fill="hsl(355, 90%, 48%)" />
            <circle cx="100" cy="110" r="3" fill="hsl(0, 0%, 100%)" />
          </svg>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          {STATS.map((stat, idx) => (
            <motion.div
              key={stat.label}
              onClick={() => setActiveIdx(idx)}
              className={`p-3 rounded-lg border cursor-pointer transition-all duration-300 ${
                activeIdx === idx
                  ? "border-primary/40 bg-primary/5 shadow-[0_0_15px_hsl(355_90%_48%/0.1)]"
                  : "border-border bg-card hover:border-primary/20"
              }`}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <div className="flex items-center gap-2 mb-1">
                <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
                <span className="text-xs text-muted-foreground">{stat.label}</span>
              </div>
              <div className="text-xl font-black text-foreground">
                <AnimatedCounter value={stat.value} suffix={stat.suffix} />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Auto-rotate indicator */}
        <div className="flex justify-center gap-1.5 mt-4">
          {STATS.map((_, i) => (
            <motion.div
              key={i}
              className="h-1.5 rounded-full cursor-pointer"
              animate={{
                width: activeIdx === i ? 20 : 6,
                backgroundColor: activeIdx === i ? "hsl(355, 90%, 48%)" : "hsl(210, 10%, 80%)",
              }}
              onClick={() => setActiveIdx(i)}
              transition={{ duration: 0.3 }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default SpeedometerDashboard;
