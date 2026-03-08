import { motion } from "framer-motion";
import { ShieldCheck, Clock, Users, Truck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useInView } from "framer-motion";

const features = [
  { icon: ShieldCheck, num: 25, suffix: "+", label: "عام خبرة", desc: "في سوق قطع الغيار" },
  { icon: Users, num: 2000, suffix: "+", label: "عميل", desc: "شبكة عملاء واسعة" },
  { icon: Truck, num: 960, suffix: "+", label: "منتج أصلي", desc: "قطع غيار وزيوت" },
  { icon: Clock, num: 48, suffix: "h", label: "تسليم سريع", desc: "داخل مصر بالكامل" },
];

const CountUp = ({ target, suffix }: { target: number; suffix: string }) => {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (!isInView) return;
    let start = 0;
    const duration = 2000;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [isInView, target]);

  return (
    <span ref={ref} className="tabular-nums">
      {count.toLocaleString()}{suffix}
    </span>
  );
};

const cardVariants = {
  hidden: { opacity: 0, y: 40, scale: 0.9 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      delay: i * 0.12,
      duration: 0.6,
      type: "spring" as const,
      stiffness: 100,
      damping: 15,
    },
  }),
};

const FeaturesStrip = () => {
  return (
    <section aria-label="مميزات سريعة" className="py-14 md:py-16 bg-dark-section relative overflow-hidden">
      {/* Subtle animated glow */}
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] rounded-full bg-primary/[0.04] blur-[120px]"
        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 6, repeat: Infinity }}
      />

      <div className="container mx-auto px-4 relative">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {features.map((f, i) => (
            <motion.div
              key={f.label}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
              variants={cardVariants}
              whileHover={{ y: -6, scale: 1.03 }}
              className="group relative"
            >
              {/* Card */}
              <div className="relative bg-[hsl(var(--section-dark-foreground))]/[0.04] backdrop-blur-sm border border-[hsl(var(--section-dark-foreground))]/10 rounded-2xl p-5 md:p-6 text-center overflow-hidden hover:border-primary/40 transition-all duration-500 hover:shadow-lg hover:shadow-primary/10">
                {/* Hover gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/0 via-transparent to-primary/0 group-hover:from-primary/[0.06] group-hover:to-[hsl(var(--gold-accent))]/[0.04] transition-all duration-700" />

                {/* Top accent line */}
                <motion.div
                  className="absolute top-0 left-1/2 -translate-x-1/2 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent"
                  initial={{ width: 0, opacity: 0 }}
                  whileInView={{ width: "60%", opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.4 + i * 0.12, duration: 0.8 }}
                />

                {/* Icon */}
                <motion.div
                  className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4 relative z-10 group-hover:bg-primary/20 transition-colors duration-300"
                  whileHover={{ rotate: [0, -8, 8, 0], scale: 1.1 }}
                  transition={{ duration: 0.5 }}
                >
                  <f.icon className="w-6 h-6 md:w-7 md:h-7 text-primary" strokeWidth={1.8} />
                </motion.div>

                {/* Counter */}
                <div className="text-2xl md:text-3xl font-black text-primary leading-none mb-1 relative z-10">
                  <CountUp target={f.num} suffix={f.suffix} />
                </div>

                {/* Label */}
                <h3 className="font-bold text-[hsl(var(--section-dark-foreground))] text-sm md:text-base mb-1 relative z-10">
                  {f.label}
                </h3>
                <p className="text-xs text-[hsl(var(--section-dark-foreground))]/50 relative z-10">
                  {f.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesStrip;
