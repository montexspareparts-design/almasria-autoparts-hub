import { motion } from "framer-motion";
import { ArrowLeft, ShieldCheck, Clock, Users, Globe, Cog, Truck, Award, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";

/* ── Animated Counter ── */
const Counter = ({ target, suffix = "" }: { target: number; suffix?: string }) => {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          let current = 0;
          const step = Math.max(1, Math.floor(target / 50));
          const interval = setInterval(() => {
            current += step;
            if (current >= target) { setCount(target); clearInterval(interval); }
            else setCount(current);
          }, 30);
        }
      },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target]);

  return (
    <div ref={ref} className="font-black text-3xl md:text-4xl text-primary tabular-nums">
      {count.toLocaleString("en")}{suffix}
    </div>
  );
};

/* ── Highlights ── */
const highlights = [
  { icon: ShieldCheck, label: "موزع معتمد رسمي", desc: "قنوات توريد مباشرة من تويوتا" },
  { icon: Clock, label: "تسليم 48 ساعة", desc: "شحن سريع لجميع المحافظات" },
  { icon: Users, label: "+2000 عميل", desc: "تجار وشركات وأساطيل" },
  { icon: Globe, label: "وجود إقليمي", desc: "مكتب دبي لدعم التوريد" },
];

const metrics = [
  { value: 25, suffix: "+", label: "سنة خبرة" },
  { value: 2000, suffix: "+", label: "عميل نشط" },
  { value: 10, suffix: "K+", label: "قطعة متوفرة" },
  { value: 4, suffix: "", label: "فروع رئيسية" },
];

const AboutBrief = () => {
  return (
    <section id="about" className="relative py-24 md:py-32 bg-background overflow-hidden">
      {/* Subtle background pattern */}
      <div
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `radial-gradient(hsl(var(--primary)) 1px, transparent 1px)`,
          backgroundSize: "32px 32px",
        }}
      />

      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-primary/10 text-primary text-sm font-bold mb-6"
          >
            <Building2 className="w-4 h-4" />
            تعرّف علينا
          </motion.span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-foreground mb-4 leading-tight">
            من نحن —{" "}
            <span className="relative inline-block">
              <span className="relative z-10">منصة توزيع مؤسسية</span>
              <motion.span
                className="absolute bottom-1 left-0 right-0 h-3 bg-primary/10 rounded-full -z-0"
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
                style={{ originX: 0 }}
              />
            </span>{" "}
            <span className="text-primary">مُعتمدة</span>
          </h2>
          <motion.div
            className="w-16 h-1 bg-primary mx-auto rounded-full"
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
          />
        </motion.div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start mb-20">
          {/* Left - Text content */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <p className="text-muted-foreground text-base md:text-lg leading-[1.9] mb-5">
              تعمل المصرية جروب منذ{" "}
              <strong className="text-foreground font-black">1999</strong> كموزّع معتمد لِـ{" "}
              <Link to="/products/toyota-genuine" className="text-primary font-bold hover:underline underline-offset-4">
                قطع غيار تويوتا الأصلية
              </Link>{" "}
              و
              <Link to="/products/toyota-oils" className="text-primary font-bold hover:underline underline-offset-4">
                زيوت تويوتا
              </Link>.
              نعتمد نموذج تشغيل منضبط قائم على{" "}
              <strong className="text-foreground">أنظمة إدارة رقمية متكاملة</strong>{" "}
              وشبكة توزيع تغطي الجمهورية.
            </p>
            <p className="text-muted-foreground text-base md:text-lg leading-[1.9] mb-5">
              نوفر{" "}
              <strong className="text-foreground">توصيلًا سريعًا خلال 48&nbsp;ساعة</strong>{" "}
              عبر مخازن مركزية عالية الكفاءة، مع{" "}
              <strong className="text-foreground">وجود إقليمي في دبي</strong>{" "}
              يدعم استمرارية التوريد وجودة المنتجات.
            </p>
            <p className="text-muted-foreground text-base md:text-lg leading-[1.9] mb-8">
              كما ندير علامة{" "}
              <Link to="/mtx" className="text-primary font-bold hover:underline underline-offset-4">
                MTX
              </Link>{" "}
              لقطع الغيار البديلة بجودة تضاهي المواصفات الأصلية.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Button size="lg" className="gap-2 font-bold shadow-lg shadow-primary/20" asChild>
                  <Link to="/about">
                    اكتشف قصتنا
                    <ArrowLeft className="w-4 h-4" />
                  </Link>
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Button size="lg" variant="outline" className="gap-2 font-bold" asChild>
                  <Link to="/what-sets-us-apart">
                    ما يميزنا
                    <Award className="w-4 h-4" />
                  </Link>
                </Button>
              </motion.div>
            </div>
          </motion.div>

          {/* Right - Highlight cards */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="grid grid-cols-2 gap-4"
          >
            {highlights.map((h, i) => (
              <motion.div
                key={h.label}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ 
                  delay: 0.2 + i * 0.15, 
                  duration: 0.5,
                  type: "spring",
                  stiffness: 100
                }}
                whileHover={{ 
                  y: -6, 
                  scale: 1.02,
                  boxShadow: "0 20px 25px -5px hsl(var(--primary) / 0.1), 0 8px 10px -6px hsl(var(--primary) / 0.1)",
                  borderColor: "hsl(var(--primary) / 0.4)",
                  transition: { duration: 0.2 } 
                }}
                className="group relative bg-card border border-border rounded-2xl p-5 transition-all duration-300 overflow-hidden"
              >
                {/* Background gradient effect on hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                <div className="relative z-10">
                  <motion.div 
                    className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors shadow-sm"
                    whileHover={{ rotate: [0, -10, 10, -5, 0] }}
                    transition={{ duration: 0.5 }}
                  >
                    <h.icon className="w-6 h-6 text-primary" strokeWidth={1.8} />
                  </motion.div>
                  <h3 className="font-bold text-foreground text-base mb-1.5">{h.label}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{h.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Metrics bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="bg-secondary rounded-2xl p-8 md:p-10"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-4">
            {metrics.map((m, i) => (
              <motion.div
                key={m.label}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 + i * 0.1 }}
                className="text-center relative"
              >
                {/* Separator line between items on desktop */}
                {i > 0 && (
                  <div className="hidden md:block absolute right-0 top-1/2 -translate-y-1/2 w-px h-12 bg-secondary-foreground/10" />
                )}
                <Counter target={m.value} suffix={m.suffix} />
                <p className="text-secondary-foreground/60 text-sm font-medium mt-1">{m.label}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default AboutBrief;
