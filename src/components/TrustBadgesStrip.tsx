import { useEffect, useRef, useState } from "react";
import { Wrench, ShieldCheck, Truck, Award } from "lucide-react";

interface Badge {
  icon: typeof Wrench;
  prefix?: string;
  value: number;
  suffix?: string;
  label: string;
  isPercent?: boolean;
  isStatic?: string; // for non-numeric values
}

const BADGES: Badge[] = [
  { icon: Wrench, prefix: "+", value: 5000, label: "قطعة غيار أصلية" },
  { icon: ShieldCheck, value: 100, suffix: "%", label: "ضمان أصالة" },
  { icon: Truck, value: 48, suffix: " س", label: "توصيل سريع" },
  { icon: Award, prefix: "+", value: 10, label: "سنوات خبرة" },
];

const Counter = ({ to, prefix = "", suffix = "" }: { to: number; prefix?: string; suffix?: string }) => {
  const [n, setN] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !started.current) {
          started.current = true;
          const start = performance.now();
          const dur = 1600;
          const tick = (now: number) => {
            const t = Math.min((now - start) / dur, 1);
            const eased = 1 - Math.pow(1 - t, 3);
            setN(Math.round(to * eased));
            if (t < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [to]);

  return (
    <span ref={ref} className="font-display font-black tabular-nums">
      {prefix}
      {n.toLocaleString("en-US")}
      {suffix}
    </span>
  );
};

const TrustBadgesStrip = () => {
  return (
    <section className="relative bg-carbon border-y border-white/5 py-10 md:py-14">
      {/* red accents */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-toyota-red/60 to-transparent" />
      <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-toyota-red/60 to-transparent" />

      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-10">
          {BADGES.map((b) => {
            const Icon = b.icon;
            return (
              <div
                key={b.label}
                className="group flex flex-col items-center text-center"
              >
                <div className="relative mb-3">
                  <div className="absolute inset-0 bg-toyota-red/20 blur-xl rounded-full scale-0 group-hover:scale-150 transition-transform duration-500" />
                  <div className="relative w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-surface border border-white/10 flex items-center justify-center group-hover:border-toyota-red/60 transition-colors">
                    <Icon className="w-6 h-6 md:w-7 md:h-7 text-toyota-red" strokeWidth={2.2} />
                  </div>
                </div>
                <div className="text-2xl md:text-4xl text-white">
                  <Counter to={b.value} prefix={b.prefix} suffix={b.suffix} />
                </div>
                <div className="mt-1.5 font-tajawal text-soft text-sm md:text-base">
                  {b.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default TrustBadgesStrip;
