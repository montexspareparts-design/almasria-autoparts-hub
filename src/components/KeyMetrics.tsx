import { Award, Users, Truck, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useRef, useState, useCallback } from "react";
import { motion, useInView } from "framer-motion";

/* ── data ── */
const metrics = [
  {
    icon: Award,
    numericEnd: 25,
    prefix: "+",
    suffix: " سنة",
    title: "خبرة",
    desc: "خبرة ممتدة في توزيع قطع الغيار والزيوت منذ 1999.",
  },
  {
    icon: Users,
    numericEnd: 2000,
    prefix: "+",
    suffix: "",
    title: "عميل نشط",
    desc: "شبكة توزيع واسعة على مستوى الجمهورية.",
  },
  {
    icon: Truck,
    numericEnd: 48,
    prefix: "",
    suffix: " ساعة",
    title: "زمن التسليم",
    desc: "توصيل سريع عبر منظومة لوجستية منظمة.",
  },
  {
    icon: MapPin,
    numericEnd: null, // text-only
    staticValue: "مصر + دبي",
    prefix: "",
    suffix: "",
    title: "انتشار إقليمي",
    desc: "تواجد داخل مصر، ودعم توريد من مكتب دبي.",
  },
];

/* ── animated counter hook ── */
function useCounter(end: number | null, inView: boolean, duration = 1.6) {
  const [count, setCount] = useState(0);
  const hasRun = useRef(false);

  useEffect(() => {
    if (!inView || hasRun.current || end === null) return;
    hasRun.current = true;

    const steps = 40;
    const increment = end / steps;
    let current = 0;
    const interval = (duration * 1000) / steps;

    const timer = setInterval(() => {
      current += increment;
      if (current >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(Math.round(current));
      }
    }, interval);

    return () => clearInterval(timer);
  }, [inView, end, duration]);

  return count;
}

/* ── component ── */
const KeyMetrics = () => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section className="py-20 md:py-28 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-black text-foreground">
            أرقام تَمنح <span className="text-primary">الثقة</span>
          </h2>
        </div>

        <div ref={ref} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-5xl mx-auto">
          {metrics.map((m, i) => (
            <MetricCard key={m.title} metric={m} index={i} inView={inView} />
          ))}
        </div>
      </div>
    </section>
  );
};

function MetricCard({
  metric: m,
  index,
  inView,
}: {
  metric: (typeof metrics)[number];
  index: number;
  inView: boolean;
}) {
  const count = useCounter(m.numericEnd, inView);
  const displayValue =
    m.numericEnd !== null
      ? `${m.prefix}${count.toLocaleString("en-US")}${m.suffix}`
      : m.staticValue;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.12 }}
    >
      <Link
        to="/why-us"
        className="group flex flex-col items-center text-center border border-border rounded-xl px-6 py-7 bg-card hover:border-primary/30 transition-colors max-w-[260px] mx-auto w-full"
      >
        <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary/15 transition-colors">
          <m.icon className="w-6 h-6 text-primary" strokeWidth={1.8} />
        </div>
        <p className="text-2xl md:text-3xl font-black text-foreground leading-none mb-2 tabular-nums">
          {displayValue}
        </p>
        <p className="text-sm font-bold text-foreground mb-1">{m.title}</p>
        <p className="text-xs text-muted-foreground leading-[1.7]">{m.desc}</p>
      </Link>
    </motion.div>
  );
}

export default KeyMetrics;
