import { motion, useInView } from "framer-motion";
import { ShieldCheck, Clock, Users, Truck } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const features = [
  { icon: ShieldCheck, title: "موزع معتمد", desc: "لقطع غيار وزيوت تويوتا", value: 25, suffix: "+", unit: "عام" },
  { icon: Clock, title: "خبرة +25 سنة", desc: "في سوق قطع الغيار", value: 2000, suffix: "+", unit: "عميل" },
  { icon: Users, title: "+2000 عميل", desc: "شبكة عملاء واسعة", value: 960, suffix: "+", unit: "منتج" },
  { icon: Truck, title: "تسليم 48 ساعة", desc: "داخل مصر بالكامل", value: 48, suffix: "h", unit: "ساعة" },
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
        <>{suffix === "+" ? "+" : ""}{display.toLocaleString("en")}{suffix === "+" ? "" : suffix}</>
      )}
    </span>
  );
};

const FeaturesStrip = () => {
  return (
    <section className="relative overflow-hidden">
      {/* Top: Bold number strip */}
      <div className="bg-primary relative">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_25%,rgba(255,255,255,0.08)_50%,transparent_75%)]" />
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-4 divide-x divide-primary-foreground/20" dir="ltr">
            {features.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="py-4 md:py-5 text-center"
              >
                <div className="text-primary-foreground font-black text-2xl md:text-4xl lg:text-5xl leading-none tracking-tight">
                  <AnimatedNumber value={f.value} suffix={f.suffix} />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom: Feature cards */}
      <div className="bg-card border-b border-border py-12 md:py-16 relative">
        <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: "radial-gradient(circle, hsl(var(--primary)) 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
        <div className="container mx-auto px-4 relative">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 25 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.15 + i * 0.1, type: "spring", stiffness: 120 }}
                className="flex flex-col items-center text-center group"
              >
                <motion.div
                  className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-primary/[0.07] flex items-center justify-center mb-4 border border-primary/10"
                  whileHover={{ scale: 1.1, rotate: [0, -3, 3, 0] }}
                  transition={{ duration: 0.4 }}
                >
                  <f.icon className="w-6 h-6 md:w-7 md:h-7 text-primary" strokeWidth={1.8} />
                </motion.div>
                <h3 className="font-bold text-foreground text-sm md:text-base leading-snug">{f.title}</h3>
                <p className="text-xs text-muted-foreground mt-1.5">{f.desc}</p>
                <motion.div
                  className="w-6 h-[3px] bg-primary/40 mt-3 rounded-full"
                  initial={{ scaleX: 0 }}
                  whileInView={{ scaleX: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 + i * 0.1, duration: 0.4 }}
                />
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturesStrip;
