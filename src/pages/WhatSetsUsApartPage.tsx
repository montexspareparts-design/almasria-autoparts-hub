import { motion, useInView, useScroll, useTransform } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import {
  Clock, Award, Users, Truck, Monitor, DollarSign, Wrench, Globe,
  ArrowLeft, MessageCircle, Sparkles, ChevronLeft, CheckCircle2, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const CountUpInline = ({ target, suffix = "" }: { target: number; suffix?: string }) => {
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
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [isInView, target]);

  return <span ref={ref}>{count.toLocaleString("ar-EG")}{suffix}</span>;
};

const sections = [
  {
    icon: Clock,
    title: "ريادة تمتد لأكثر من 25 عامًا",
    text: "منذ عام 1999، رسّخت المصرية جروب مكانتها كأحد أهم موزّعي قطع الغيار والزيوت في مصر، مستندة إلى خبرة تشغيلية قوية وعلاقات عميقة مع السوق.",
    stat: "1999",
    statLabel: "منذ",
    highlights: ["خبرة تشغيلية قوية", "علاقات عميقة مع السوق", "ريادة مستمرة لأكثر من 25 عامًا"],
  },
  {
    icon: Award,
    title: "موزّع معتمد لقطع غيار وزيوت تويوتا",
    text: "نلتزم بتوفير قطع غيار تويوتا الأصلية والزيوت المعتمدة عبر قنوات رسمية تتوافق مع معايير الشركات المصنّعة (OEM)، بما يضمن أعلى مستويات الجودة والأمان.",
    stat: "OEM",
    statLabel: "معايير",
    highlights: ["قنوات توريد رسمية", "معايير OEM عالمية", "أعلى مستويات الجودة"],
  },
  {
    icon: Users,
    title: "شبكة تضم أكثر من 2000 عميل",
    text: "نخدم موزعين، مراكز خدمة، شركات، وقطاع بترولي من خلال شبكة توزيع واسعة تغطي معظم المحافظات المصرية، بما يعزز استقرار السوق واستمرارية الإمداد.",
    stat: "2000+",
    statLabel: "عميل نشط",
    highlights: ["موزعين ومراكز خدمة", "شركات وقطاع بترولي", "تغطية لمعظم المحافظات"],
  },
  {
    icon: Truck,
    title: "تسليم خلال 48 ساعة",
    text: "نعتمد على بنية لوجستية احترافية تضمن توريدًا سريعًا ودقيقًا عبر مخازن مركزية منظمة، مع التزام دائم بمعايير التسليم.",
    stat: "48h",
    statLabel: "تسليم",
    highlights: ["بنية لوجستية احترافية", "مخازن مركزية منظمة", "التزام بمعايير التسليم"],
  },
  {
    icon: Monitor,
    title: "عمليات دقيقة مدعومة بـ ERP",
    text: "تُدار سلسلة التوريد من الاستلام وحتى التسليم عبر نظام ERP متكامل يضمن الشفافية، وتتبع الطلبات، ودقة التقارير التشغيلية.",
    stat: "ERP",
    statLabel: "نظام متكامل",
    highlights: ["شفافية كاملة", "تتبع الطلبات", "دقة التقارير التشغيلية"],
  },
  {
    icon: DollarSign,
    title: "انضباط سعري وحماية لقيمة العلامة",
    text: "تحافظ المصرية جروب على سياسات تسعير منضبطة تتماشى مع توقعات الشركات المصنّعة، لضمان استقرار السوق وتعزيز ثقة الشركاء.",
    stat: "100%",
    statLabel: "انضباط",
    highlights: ["سياسات تسعير منضبطة", "استقرار السوق", "تعزيز ثقة الشركاء"],
  },
  {
    icon: Wrench,
    title: "علامتنا الخاصة MTX",
    text: "نقدم منتجات MTX للأفترماركت بجودة موثوقة وقيمة ممتازة، مع التركيز على الأداء المتسق والسعر التنافسي لتلبية احتياجات السوق المصري.",
    stat: "MTX",
    statLabel: "علامة خاصة",
    highlights: ["جودة موثوقة", "أداء متسق", "سعر تنافسي"],
  },
  {
    icon: Globe,
    title: "دعم إقليمي من مكتب دبي",
    text: "يدعم مكتبنا الإقليمي في دبي عمليات التوريد والتواصل مع الموردين اليابانيين لضمان استمرارية المخزون وجودة المنتجات.",
    stat: "🇦🇪",
    statLabel: "دبي",
    highlights: ["موردين يابانيين", "استمرارية المخزون", "جودة المنتجات"],
  },
];

const quickStats = [
  { value: 25, suffix: "+", label: "سنة خبرة" },
  { value: 2000, suffix: "+", label: "عميل نشط" },
  { value: 960, suffix: "+", label: "صنف أصلي" },
  { value: 48, suffix: "h", label: "تسليم سريع" },
];

const FeatureBlock = ({ s, i }: { s: typeof sections[0]; i: number }) => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.3 });
  const isReversed = i % 2 !== 0;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0 }}
      animate={isInView ? { opacity: 1 } : {}}
      transition={{ duration: 0.5 }}
      className={`grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-center ${i > 0 ? "mt-16 md:mt-24" : ""}`}
    >
      {/* Stat card */}
      <motion.div
        initial={{ opacity: 0, x: isReversed ? 60 : -60 }}
        animate={isInView ? { opacity: 1, x: 0 } : {}}
        transition={{ duration: 0.7, type: "spring", stiffness: 60 }}
        className={`lg:col-span-4 ${isReversed ? "lg:order-2" : ""}`}
      >
        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-[hsl(var(--gold-accent))]/10 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
          <div className="relative bg-card border border-border rounded-3xl p-8 md:p-10 text-center hover:border-primary/30 transition-all duration-500 overflow-hidden">
            {/* Decorative corner */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-primary/5 to-transparent rounded-bl-[60px]" />
            <div className="absolute bottom-0 left-0 w-20 h-20 bg-gradient-to-tr from-[hsl(var(--gold-accent))]/5 to-transparent rounded-tr-[50px]" />

            <motion.div
              className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-[hsl(355,80%,55%)] flex items-center justify-center mx-auto mb-5 shadow-xl shadow-primary/25"
              whileHover={{ rotate: [0, -10, 10, 0], scale: 1.1 }}
              transition={{ duration: 0.6 }}
            >
              <s.icon className="w-8 h-8 text-white" />
            </motion.div>

            <div className="text-5xl md:text-6xl font-black text-foreground leading-none mb-1">{s.stat}</div>
            <div className="text-sm font-semibold text-muted-foreground">{s.statLabel}</div>

            <motion.div
              className="w-12 h-0.5 bg-gradient-to-l from-primary to-[hsl(var(--gold-accent))] mx-auto mt-4 rounded-full"
              initial={{ width: 0 }}
              animate={isInView ? { width: 48 } : {}}
              transition={{ delay: 0.5, duration: 0.6 }}
            />
          </div>
        </div>
      </motion.div>

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, x: isReversed ? -60 : 60 }}
        animate={isInView ? { opacity: 1, x: 0 } : {}}
        transition={{ duration: 0.7, delay: 0.15, type: "spring", stiffness: 60 }}
        className={`lg:col-span-8 ${isReversed ? "lg:order-1" : ""}`}
      >
        <div className="space-y-5">
          {/* Section number */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-primary bg-primary/8 px-3 py-1 rounded-full">
              {String(i + 1).padStart(2, "0")}
            </span>
            <div className="h-px flex-1 bg-gradient-to-l from-transparent via-border to-transparent" />
          </div>

          <h2 className="text-2xl md:text-3xl lg:text-4xl font-black text-foreground leading-snug">
            {s.title}
          </h2>

          <p className="text-muted-foreground text-base md:text-lg leading-[2] max-w-2xl">
            {s.text}
          </p>

          {/* Highlight bullets */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            {s.highlights.map((h, j) => (
              <motion.div
                key={h}
                initial={{ opacity: 0, y: 10 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.4 + j * 0.1 }}
                className="flex items-center gap-2 text-sm"
              >
                <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                <span className="text-muted-foreground">{h}</span>
              </motion.div>
            ))}
          </div>

          {/* Bottom gradient line */}
          <motion.div
            className="h-px bg-gradient-to-l from-primary/30 via-[hsl(var(--gold-accent))]/20 to-transparent mt-4"
            initial={{ scaleX: 0, originX: 1 }}
            animate={isInView ? { scaleX: 1 } : {}}
            transition={{ delay: 0.6, duration: 0.8 }}
          />
        </div>
      </motion.div>
    </motion.div>
  );
};

const WhatSetsUsApartPage = () => {
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.8], [1, 0.95]);

  useEffect(() => {
    document.title = "ما يميزنا | خبرة 25 عامًا في توزيع قطع الغيار والزيوت";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) {
      meta.setAttribute("content", "تعرف على مميزات المصرية جروب كموزع معتمد لقطع غيار وزيوت تويوتا، خبرة منذ 1999، شبكة توزيع 2000 عميل، توريد خلال 48 ساعة، ونظام ERP.");
    }
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* ===== HERO ===== */}
      <motion.section
        ref={heroRef}
        style={{ opacity: heroOpacity, scale: heroScale }}
        className="pt-28 pb-20 md:pt-40 md:pb-28 bg-dark-section relative overflow-hidden"
      >
        {/* Animated grid */}
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "linear-gradient(hsl(var(--section-dark-foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--section-dark-foreground)) 1px, transparent 1px)", backgroundSize: "80px 80px" }} />

        {/* Glows */}
        <motion.div
          className="absolute top-10 right-[10%] w-[600px] h-[600px] rounded-full bg-primary/[0.06] blur-[150px]"
          animate={{ scale: [1, 1.2, 1], x: [0, 30, 0] }}
          transition={{ duration: 8, repeat: Infinity }}
        />
        <motion.div
          className="absolute bottom-10 left-[10%] w-[400px] h-[400px] rounded-full bg-[hsl(var(--gold-accent))]/[0.04] blur-[120px]"
          animate={{ scale: [1.1, 1, 1.1] }}
          transition={{ duration: 10, repeat: Infinity }}
        />

        <div className="container mx-auto px-4 relative">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-4xl mx-auto"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-primary/12 border border-primary/20 text-primary text-sm font-bold mb-8 backdrop-blur-sm"
            >
              <Sparkles className="w-4 h-4" />
              المصرية جروب
            </motion.div>

            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-[hsl(var(--section-dark-foreground))] mb-6 tracking-tight leading-[1.1]">
              ما <span className="shimmer-text">يميزنا</span>
            </h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-[hsl(var(--section-dark-foreground))]/50 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed mb-10"
            >
              معايير عالمية في توزيع قطع الغيار والزيوت الأصلية
            </motion.p>

            {/* Stats row */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.6 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 max-w-3xl mx-auto"
            >
              {quickStats.map((s, i) => (
                <motion.div
                  key={s.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 + i * 0.1 }}
                  className="bg-[hsl(var(--section-dark-foreground))]/5 backdrop-blur-sm border border-[hsl(var(--section-dark-foreground))]/10 rounded-2xl p-5 text-center"
                >
                  <div className="text-3xl md:text-4xl font-black text-primary leading-none mb-1">
                    <CountUpInline target={s.value} suffix={s.suffix} />
                  </div>
                  <div className="text-xs text-[hsl(var(--section-dark-foreground))]/50 font-medium">{s.label}</div>
                </motion.div>
              ))}
            </motion.div>

            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "8rem" }}
              transition={{ duration: 1, delay: 0.8 }}
              className="h-1 bg-gradient-to-l from-primary to-[hsl(var(--gold-accent))] mx-auto rounded-full mt-10"
            />
          </motion.div>
        </div>
      </motion.section>

      {/* ===== FEATURES ===== */}
      <section className="py-20 md:py-32 relative">
        {/* Side line decoration */}
        <div className="absolute top-0 bottom-0 right-8 w-px bg-gradient-to-b from-transparent via-border to-transparent hidden xl:block" />

        <div className="container mx-auto px-4">
          {sections.map((s, i) => (
            <FeatureBlock key={s.title} s={s} i={i} />
          ))}
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="py-20 md:py-28 bg-dark-section relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "radial-gradient(circle, hsl(var(--section-dark-foreground)) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[200px]"
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 6, repeat: Infinity }}
        />

        <div className="container mx-auto px-4 relative">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center max-w-3xl mx-auto"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ type: "spring" }}
              className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-[hsl(355,80%,55%)] flex items-center justify-center mx-auto mb-8 shadow-xl shadow-primary/30"
            >
              <Zap className="w-8 h-8 text-white" />
            </motion.div>

            <h2 className="text-3xl md:text-5xl font-black text-[hsl(var(--section-dark-foreground))] mb-5 tracking-tight">
              جاهز <span className="text-gradient-red">للتعاون؟</span>
            </h2>
            <p className="text-[hsl(var(--section-dark-foreground))]/50 mb-10 text-base md:text-lg max-w-xl mx-auto leading-relaxed">
              تواصل معنا اليوم واكتشف كيف يمكن للمصرية جروب أن تكون شريكك الموثوق في قطع الغيار والزيوت.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <motion.div whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: 0.97 }}>
                <Button size="lg" className="gap-3 font-bold text-lg px-10 py-6 bg-gradient-to-l from-primary to-[hsl(355,80%,55%)] text-white shadow-xl shadow-primary/30 hover:shadow-primary/40 hover:shadow-2xl relative overflow-hidden group" asChild>
                  <a href="https://wa.me/201020412358" target="_blank" rel="noopener noreferrer">
                    <span className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 skew-x-12" />
                    <MessageCircle className="w-5 h-5" />
                    تواصل معنا
                  </a>
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: 0.97 }}>
                <Button
                  size="lg"
                  variant="outline"
                  className="gap-3 font-bold text-base px-8 py-6 border-[hsl(var(--section-dark-foreground))]/15 text-[hsl(var(--section-dark-foreground))] hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-300"
                  asChild
                >
                  <a href="/#contact">
                    <ArrowLeft className="w-4 h-4" />
                    اطلب عرض سعر
                  </a>
                </Button>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default WhatSetsUsApartPage;
