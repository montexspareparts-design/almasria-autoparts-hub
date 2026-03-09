import { motion, useInView } from "framer-motion";
import { ArrowLeft, ShieldCheck, Clock, Users, Globe, Award, Cog, Wrench, Droplets } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";

/* ── Animated Counter ── */
const Counter = ({ target, suffix = "" }: { target: number; suffix?: string }) => {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref as any, { once: true, margin: "-60px" });
  const started = useRef(false);

  useEffect(() => {
    if (!inView || started.current) return;
    started.current = true;
    let current = 0;
    const step = Math.max(1, Math.floor(target / 50));
    const interval = setInterval(() => {
      current += step;
      if (current >= target) { setCount(target); clearInterval(interval); }
      else setCount(current);
    }, 30);
    return () => clearInterval(interval);
  }, [inView, target]);

  return (
    <div ref={ref} className="font-black text-4xl md:text-5xl text-primary tabular-nums tracking-tight">
      {count.toLocaleString("en")}{suffix}
    </div>
  );
};

/* ── Highlights ── */
const highlights = [
  { icon: ShieldCheck, label: "موزع معتمد رسمي", desc: "قنوات توريد مباشرة من تويوتا", accent: "from-primary/20 to-primary/5" },
  { icon: Clock, label: "تسليم 48 ساعة", desc: "شحن سريع لجميع المحافظات", accent: "from-amber-500/15 to-amber-500/5" },
  { icon: Users, label: "+2,000 عميل", desc: "تجار وشركات وأساطيل", accent: "from-emerald-500/15 to-emerald-500/5" },
  { icon: Globe, label: "وجود إقليمي", desc: "مكتب دبي لدعم التوريد", accent: "from-sky-500/15 to-sky-500/5" },
];

const metrics = [
  { value: 25, suffix: "+", label: "سنة خبرة", desc: "منذ 1999" },
  { value: 2000, suffix: "+", label: "عميل نشط", desc: "في كل المحافظات" },
  { value: 10, suffix: "K+", label: "قطعة متوفرة", desc: "بالمخازن" },
  { value: 4, suffix: "", label: "فروع رئيسية", desc: "مصر + دبي" },
];

/* ── Floating mechanical accents ── */
const mechanicalAccents = [
  { icon: Cog, x: "5%", y: "15%", size: 40, duration: 25, rotate: 360 },
  { icon: Cog, x: "92%", y: "80%", size: 32, duration: 20, rotate: -360 },
  { icon: Wrench, x: "88%", y: "20%", size: 24, duration: 18, rotate: 15 },
  { icon: Droplets, x: "8%", y: "75%", size: 20, duration: 22, rotate: 0 },
];

const AboutBrief = () => {
  return (
    <section id="about" className="relative py-28 md:py-36 bg-secondary overflow-hidden">
      {/* Mechanical floating accents */}
      <div className="absolute inset-0 pointer-events-none hidden md:block">
        {mechanicalAccents.map((part, i) => (
          <motion.div
            key={i}
            className="absolute"
            style={{ left: part.x, top: part.y }}
            initial={{ opacity: 0 }}
            animate={{
              opacity: [0, 0.06, 0.04, 0.06, 0],
              rotate: [0, part.rotate],
            }}
            transition={{ duration: part.duration, repeat: Infinity, ease: "linear" }}
          >
            <part.icon style={{ width: part.size, height: part.size }} className="text-secondary-foreground/10" strokeWidth={1} />
          </motion.div>
        ))}
      </div>

      {/* Subtle grid */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)`,
          backgroundSize: "80px 80px",
        }}
      />

      {/* Red accent line top */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

      <div className="container mx-auto px-4 relative z-10">
        {/* Header - Dramatic */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="text-center mb-20"
        >
          <motion.div
            className="w-20 h-1 bg-primary mx-auto rounded-full mb-8"
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          />
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-secondary-foreground mb-5 leading-[1.3]">
            شريك التوزيع{" "}
            <span className="text-primary relative inline-block">
              الأول
              <motion.span
                className="absolute -bottom-2 left-0 right-0 h-1 bg-primary/40 rounded-full"
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.6 }}
                style={{ originX: 1 }}
              />
            </span>
            {" "}لقطع غيار تويوتا
          </h2>
          <p className="text-secondary-foreground/50 text-lg md:text-xl max-w-2xl mx-auto font-medium leading-relaxed">
            أكثر من 25 عامًا في بناء أكبر شبكة توزيع معتمدة في مصر
          </p>
        </motion.div>

        {/* Main Content - Asymmetric Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start mb-24">
          
          {/* Right side - Text (7 cols) */}
          <motion.div
            className="lg:col-span-7 order-1"
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Big quote-style block */}
            <div className="relative pr-6 border-r-4 border-primary/30 mb-10">
              <motion.div
                className="absolute -top-2 -right-3 w-6 h-6 bg-primary rounded-full"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 3, repeat: Infinity }}
              />
              
              {[
                <>
                  تعمل المصرية جروب منذ{" "}
                  <strong className="text-primary font-black text-xl">1999</strong> كموزّع معتمد لِـ{" "}
                  <Link to="/products/toyota-genuine" className="text-primary font-black hover:underline underline-offset-4 decoration-2 decoration-primary/50">
                    قطع غيار تويوتا الأصلية
                  </Link>{" "}
                  و
                  <Link to="/products/toyota-oils" className="text-primary font-black hover:underline underline-offset-4 decoration-2 decoration-primary/50">
                    زيوت تويوتا
                  </Link>.
                  نعتمد نموذج تشغيل منضبط قائم على{" "}
                  <strong className="text-secondary-foreground font-bold">أنظمة إدارة رقمية متكاملة</strong>{" "}
                  وشبكة توزيع تغطي الجمهورية.
                </>,
                <>
                  نوفر{" "}
                  <strong className="text-primary font-black">توصيلًا سريعًا خلال 48&nbsp;ساعة</strong>{" "}
                  عبر مخازن مركزية عالية الكفاءة، مع{" "}
                  <strong className="text-primary font-black">وجود إقليمي في دبي</strong>{" "}
                  يدعم استمرارية التوريد وجودة المنتجات.
                </>,
                <>
                  كما ندير علامة{" "}
                  <Link to="/mtx" className="text-primary font-black hover:underline underline-offset-4 decoration-2 decoration-primary/50">
                    MTX
                  </Link>{" "}
                  لقطع الغيار البديلة بجودة تضاهي المواصفات الأصلية.
                </>
              ].map((text, i) => (
                <motion.p
                  key={i}
                  className="text-secondary-foreground/75 text-lg md:text-xl leading-[2.1] mb-6 last:mb-0 font-medium"
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ delay: 0.15 + i * 0.12, duration: 0.55, ease: "easeOut" }}
                >
                  {text}
                </motion.p>
              ))}
            </div>

            {/* CTAs */}
            <motion.div
              className="flex flex-col sm:flex-row gap-4 mt-10"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5, duration: 0.5 }}
            >
              <motion.div whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.97 }} transition={{ duration: 0.2 }}>
                <Button size="lg" className="gap-2.5 font-black shadow-xl shadow-primary/25 px-8 py-6 text-base" asChild>
                  <Link to="/about">
                    اكتشف قصتنا
                    <motion.span
                      animate={{ x: [0, -5, 0] }}
                      transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </motion.span>
                  </Link>
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.97 }} transition={{ duration: 0.2 }}>
                <Button size="lg" variant="outline" className="gap-2.5 font-black px-8 py-6 text-base border-2 border-secondary-foreground/20 text-secondary-foreground hover:bg-secondary-foreground/10" asChild>
                  <Link to="/what-sets-us-apart">
                    ما يميزنا
                    <Award className="w-5 h-5" />
                  </Link>
                </Button>
              </motion.div>
            </motion.div>
          </motion.div>

          {/* Left side - Highlight cards (5 cols) */}
          <motion.div
            className="lg:col-span-5 order-2"
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <div className="grid grid-cols-2 gap-4">
              {highlights.map((h, i) => (
                <motion.div
                  key={h.label}
                  initial={{ opacity: 0, y: 24, scale: 0.9 }}
                  whileInView={{ opacity: 1, y: 0, scale: 1 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{
                    delay: 0.3 + i * 0.12,
                    duration: 0.5,
                    type: "spring",
                    stiffness: 120,
                  }}
                  whileHover={{
                    y: -8,
                    scale: 1.04,
                    transition: { duration: 0.25 },
                  }}
                  className="group relative rounded-2xl p-6 transition-all duration-300 overflow-hidden bg-secondary-foreground/[0.06] border-2 border-secondary-foreground/10 hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/15 cursor-default"
                >
                  {/* Gradient on hover */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${h.accent} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

                  <div className="relative z-10">
                    <motion.div
                      className="w-14 h-14 bg-primary/15 rounded-2xl flex items-center justify-center mb-5 group-hover:bg-primary/25 transition-all duration-300 shadow-lg shadow-primary/10 group-hover:shadow-xl group-hover:shadow-primary/20"
                      whileHover={{ rotate: [0, -12, 12, -6, 0], scale: 1.1 }}
                      transition={{ duration: 0.6 }}
                    >
                      <h.icon className="w-7 h-7 text-primary" strokeWidth={2} />
                    </motion.div>
                    <h3 className="font-black text-secondary-foreground text-base mb-2">{h.label}</h3>
                    <p className="text-secondary-foreground/50 text-sm leading-relaxed font-medium">{h.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Metrics - Full width dramatic bar */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="relative rounded-3xl overflow-hidden"
        >
          {/* Background */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/90 to-primary" />
          
          {/* Pattern overlay */}
          <div
            className="absolute inset-0 opacity-[0.08]"
            style={{
              backgroundImage: `radial-gradient(circle, white 1px, transparent 1px)`,
              backgroundSize: "24px 24px",
            }}
          />
          
          {/* Animated glow */}
          <motion.div
            className="absolute -top-20 left-1/4 w-60 h-60 bg-white/10 rounded-full blur-3xl"
            animate={{ x: [0, 60, 0], opacity: [0.1, 0.3, 0.1] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          />

          <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-1 p-2">
            {metrics.map((m, i) => (
              <motion.div
                key={m.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 + i * 0.12, type: "spring", stiffness: 80 }}
                className="text-center py-8 md:py-10 px-4 rounded-2xl bg-white/[0.08] backdrop-blur-sm hover:bg-white/[0.15] transition-colors duration-300 cursor-default group"
              >
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  transition={{ duration: 0.2 }}
                >
                  <Counter target={m.value} suffix={m.suffix} />
                </motion.div>
                <p className="text-white font-black text-base mt-2">{m.label}</p>
                <p className="text-white/50 text-sm font-medium mt-1">{m.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Red accent line bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
    </section>
  );
};

export default AboutBrief;
