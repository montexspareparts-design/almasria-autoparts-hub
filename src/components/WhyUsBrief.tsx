import { motion, useInView } from "framer-motion";
import { Award, Clock, Users, Truck, ArrowLeft, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useRef, useEffect, useState } from "react";

const CountUp = ({ target, suffix = "", delay = 0 }: { target: number; suffix?: string; delay?: number }) => {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (!isInView) return;
    const timeout = setTimeout(() => {
      let start = 0;
      const duration = 1800;
      const step = target / (duration / 16);
      const timer = setInterval(() => {
        start += step;
        if (start >= target) { setCount(target); clearInterval(timer); }
        else setCount(Math.floor(start));
      }, 16);
      return () => clearInterval(timer);
    }, delay);
    return () => clearTimeout(timeout);
  }, [isInView, target, delay]);

  return <span ref={ref}>{count.toLocaleString("ar-EG")}{suffix}</span>;
};

const highlights = [
  {
    icon: Clock,
    stat: 25,
    statSuffix: "+",
    statLabel: "عامًا",
    title: "ريادة تمتد لأكثر من 25 عامًا",
    desc: "في توزيع قطع الغيار والزيوت الأصلية منذ 1999.",
    gradient: "from-[hsl(var(--primary))] to-[hsl(355,80%,58%)]",
  },
  {
    icon: Award,
    stat: 100,
    statSuffix: "%",
    statLabel: "أصلي",
    title: "موزّع معتمد لتويوتا",
    desc: "قطع غيار وزيوت أصلية عبر قنوات توريد رسمية.",
    gradient: "from-[hsl(var(--gold-accent))] to-[hsl(40,70%,45%)]",
  },
  {
    icon: Users,
    stat: 2000,
    statSuffix: "+",
    statLabel: "عميل",
    title: "شبكة توزيع وطنية",
    desc: "شبكة واسعة تغطي معظم محافظات مصر.",
    gradient: "from-[hsl(var(--primary))] to-[hsl(355,80%,58%)]",
  },
  {
    icon: Truck,
    stat: 48,
    statSuffix: "h",
    statLabel: "تسليم",
    title: "توريد وتسليم سريع",
    desc: "عبر مخازن مركزية منظمة وبنية لوجستية احترافية.",
    gradient: "from-[hsl(var(--gold-accent))] to-[hsl(40,70%,45%)]",
  },
];

const WhyUsBrief = () => {
  return (
    <section id="why-us" className="py-24 md:py-32 bg-background overflow-hidden relative">
      {/* Ambient background effects */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
        <motion.div
          className="absolute top-20 right-[5%] w-[500px] h-[500px] rounded-full bg-primary/[0.03] blur-[100px]"
          animate={{ scale: [1, 1.15, 1], x: [0, 20, 0] }}
          transition={{ duration: 10, repeat: Infinity }}
        />
        <motion.div
          className="absolute bottom-20 left-[5%] w-[400px] h-[400px] rounded-full bg-[hsl(var(--gold-accent))]/[0.03] blur-[100px]"
          animate={{ scale: [1.1, 1, 1.1], x: [0, -15, 0] }}
          transition={{ duration: 12, repeat: Infinity }}
        />
      </div>

      <div className="container mx-auto px-4 relative">
        {/* Premium header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="text-center mb-20"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15 }}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-primary/8 border border-primary/15 text-primary text-sm font-bold mb-6 backdrop-blur-sm"
          >
            <Sparkles className="w-4 h-4" />
            لماذا تختارنا
          </motion.div>
          <h2 className="text-4xl md:text-6xl font-black text-foreground mb-5 tracking-tight">
            ما <span className="text-gradient-red">يميزنا</span>
          </h2>
          <p className="text-muted-foreground text-base md:text-lg max-w-xl mx-auto leading-relaxed">
            أرقام حقيقية تعكس التزامنا بالتميز والجودة
          </p>
          <motion.div
            initial={{ width: 0 }}
            whileInView={{ width: "6rem" }}
            viewport={{ once: true }}
            transition={{ duration: 1, delay: 0.4 }}
            className="h-1 bg-gradient-to-l from-primary to-[hsl(var(--gold-accent))] mx-auto rounded-full mt-6"
          />
        </motion.div>

        {/* Premium cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6 max-w-6xl mx-auto">
          {highlights.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.6, type: "spring", stiffness: 80 }}
              className="group relative"
            >
              {/* Card */}
              <motion.div
                whileHover={{ y: -10, scale: 1.02 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="relative bg-card rounded-2xl p-7 border border-border hover:border-primary/30 transition-all duration-500 overflow-hidden h-full"
              >
                {/* Top gradient bar */}
                <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${item.gradient} opacity-40 group-hover:opacity-100 transition-opacity duration-500`} />

                {/* Hover glow */}
                <div className="absolute inset-0 bg-gradient-to-b from-primary/0 to-primary/0 group-hover:from-primary/[0.04] group-hover:to-transparent transition-all duration-500 rounded-2xl" />

                <div className="relative z-10">
                  {/* Stat number */}
                  <div className="mb-5">
                    <div className="text-4xl md:text-5xl font-black text-primary leading-none mb-1">
                      <CountUp target={item.stat} suffix={item.statSuffix} delay={i * 150} />
                    </div>
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{item.statLabel}</div>
                  </div>

                  {/* Icon */}
                  <motion.div
                    className={`w-12 h-12 rounded-xl bg-gradient-to-br ${item.gradient} flex items-center justify-center mb-4 shadow-lg`}
                    whileHover={{ rotate: [0, -8, 8, 0], scale: 1.1 }}
                    transition={{ duration: 0.5 }}
                  >
                    <item.icon className="w-6 h-6 text-white" />
                  </motion.div>

                  {/* Text */}
                  <h3 className="font-bold text-card-foreground text-base mb-2 leading-snug">{item.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{item.desc}</p>
                </div>

                {/* Corner decoration */}
                <div className="absolute -bottom-6 -left-6 w-20 h-20 rounded-full bg-primary/[0.03] group-hover:bg-primary/[0.06] transition-all duration-500" />
              </motion.div>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
          className="text-center mt-14"
        >
          <motion.div whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: 0.97 }}>
            <Button
              size="lg"
              className="gap-3 font-bold text-base px-10 py-6 bg-gradient-to-l from-primary to-[hsl(355,80%,55%)] text-primary-foreground shadow-xl shadow-primary/20 hover:shadow-primary/30 hover:shadow-2xl transition-all duration-300 relative overflow-hidden group"
              asChild
            >
              <Link to="/what-sets-us-apart">
                <span className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 skew-x-12" />
                اكتشف المزيد عن مميزاتنا
                <ArrowLeft className="w-5 h-5" />
              </Link>
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default WhyUsBrief;
