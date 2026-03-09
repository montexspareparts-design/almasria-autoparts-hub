import { Award, Users, Truck, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
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
    numericEnd: null,
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
    <section className="py-20 md:py-28 bg-muted/30 overflow-hidden">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-black text-foreground">
            أرقام تَمنح <span className="text-primary">الثقة</span>
          </h2>
          <motion.div
            className="w-14 h-1 bg-primary mx-auto rounded-full mt-4"
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
          />
        </motion.div>

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
      initial={{ opacity: 0, y: 24, scale: 0.95 }}
      animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
      transition={{ duration: 0.5, delay: index * 0.12, type: "spring", stiffness: 100 }}
    >
      <Link
        to="/why-us"
        className="group relative flex flex-col items-center text-center border border-border rounded-xl px-6 py-7 bg-card hover:border-primary/30 transition-all duration-300 max-w-[260px] mx-auto w-full overflow-hidden"
      >
        {/* Hover gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        <div className="relative z-10 flex flex-col items-center">
          <motion.div
            className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors"
            whileHover={{ rotate: [0, -10, 10, -5, 0] }}
            transition={{ duration: 0.5 }}
          >
            <m.icon className="w-6 h-6 text-primary" strokeWidth={1.8} />
          </motion.div>
          <motion.p
            className="text-2xl md:text-3xl font-black text-foreground leading-none mb-2 tabular-nums"
            whileHover={{ scale: 1.08 }}
            transition={{ duration: 0.2 }}
          >
            {displayValue}
          </motion.p>
          <p className="text-sm font-bold text-foreground mb-1">{m.title}</p>
          <p className="text-xs text-muted-foreground leading-[1.7]">{m.desc}</p>
        </div>
      </Link>
    </motion.div>
  );
}

export default KeyMetrics;
