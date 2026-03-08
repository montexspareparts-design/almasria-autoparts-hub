import { motion, useInView } from "framer-motion";
import { useEffect, useRef, useState } from "react";

const stats = [
  { value: 25, suffix: "+", label: "عام خبرة" },
  { value: 2000, suffix: "+", label: "عميل نشط" },
  { value: 960, suffix: "+", label: "منتج أصلي" },
  { value: 48, suffix: "h", label: "تسليم سريع" },
];

const AnimatedNumber = ({ value, suffix }: { value: number; suffix: string }) => {
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref as React.RefObject<Element>, { once: true, amount: 0.5 });

  useEffect(() => {
    if (!inView) return;
    const duration = 1800;
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
      {suffix === "h" ? (
        <>{display}<span className="text-[0.5em] font-bold mr-0.5">h</span></>
      ) : (
        <>{suffix === "+" ? "+" : ""}{display.toLocaleString("en")}</>
      )}
    </span>
  );
};

const FeaturesStrip = () => {
  return (
    <section aria-label="إحصائيات الشركة" className="bg-primary relative overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_25%,rgba(255,255,255,0.06)_50%,transparent_75%)]" />
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-primary-foreground/15" dir="ltr">
          {stats.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="py-5 md:py-6 text-center"
            >
              <div className="text-primary-foreground font-black text-2xl md:text-4xl lg:text-5xl leading-none tracking-tight">
                <AnimatedNumber value={s.value} suffix={s.suffix} />
              </div>
              <div className="text-primary-foreground/60 text-xs md:text-sm mt-1.5 font-medium" dir="rtl">
                {s.label}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesStrip;
