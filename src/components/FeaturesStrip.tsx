import { ShieldCheck, Clock, Users, Truck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useInView } from "framer-motion";

const features = [
  { icon: ShieldCheck, num: 25, suffix: "+", label: "عام خبرة" },
  { icon: Users, num: 1000, suffix: "+", label: "عميل نشط" },
  { icon: Truck, num: 960, suffix: "+", label: "منتج أصلي" },
  { icon: Clock, num: 48, suffix: "h", label: "تسليم سريع" },
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

const FeaturesStrip = () => {
  return (
    <section aria-label="مميزات سريعة" className="py-10 md:py-12 bg-secondary border-b border-secondary-foreground/[0.06]">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
          {features.map((f) => (
            <div key={f.label} className="text-center">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <f.icon className="w-5 h-5 text-primary" strokeWidth={1.8} />
              </div>
              <div className="text-2xl md:text-3xl font-black text-primary leading-none mb-1">
                <CountUp target={f.num} suffix={f.suffix} />
              </div>
              <p className="text-secondary-foreground/60 text-sm font-medium">{f.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesStrip;
