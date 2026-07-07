import { motion, useInView, useScroll, useTransform } from "framer-motion";
import { Helmet } from "react-helmet-async";
import { useEffect, useRef, useState } from "react";
import {
  Clock, Award, Users, Truck, Monitor, DollarSign, Wrench, Globe,
  ArrowLeft, MessageCircle, Sparkles, CheckCircle2, Zap, MapPin, Building2, Navigation,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

// Images
import heroWarehouse from "@/assets/hero-warehouse.webp";
import warehouseLogistics from "@/assets/warehouse-logistics.webp";
import partnershipToyota from "@/assets/partnership-toyota.webp";
import distributionMap from "@/assets/distribution-map.webp";
import erpSystem from "@/assets/erp-system.webp";
import brandMtx from "@/assets/brand-mtx.webp";
import dubaiOffice from "@/assets/dubai-office.webp";
import autotechExhibition from "@/assets/autotech-exhibition.webp";

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
    image: heroWarehouse,
    imageAlt: "مستودع المصرية جروب لقطع غيار تويوتا",
  },
  {
    icon: Award,
    title: "موزّع معتمد لقطع غيار وزيوت تويوتا",
    text: "نلتزم بتوفير قطع غيار تويوتا الأصلية والزيوت المعتمدة عبر قنوات رسمية تتوافق مع معايير الشركات المصنّعة (OEM)، بما يضمن أعلى مستويات الجودة والأمان.",
    stat: "OEM",
    statLabel: "معايير",
    highlights: ["قنوات توريد رسمية", "معايير OEM عالمية", "أعلى مستويات الجودة"],
    image: partnershipToyota,
    imageAlt: "شراكة المصرية جروب مع تويوتا",
  },
  {
    icon: Users,
    title: "شبكة تضم أكثر من 2000 عميل",
    text: "نخدم موزعين، مراكز خدمة، شركات، وقطاع بترولي من خلال شبكة توزيع واسعة تغطي معظم المحافظات المصرية، بما يعزز استقرار السوق واستمرارية الإمداد.",
    stat: "2000+",
    statLabel: "عميل نشط",
    highlights: ["موزعين ومراكز خدمة", "شركات وقطاع بترولي", "تغطية لمعظم المحافظات"],
    image: distributionMap,
    imageAlt: "شبكة توزيع المصرية جروب في مصر",
  },
  {
    icon: Truck,
    title: "تسليم خلال 48 ساعة",
    text: "نعتمد على بنية لوجستية احترافية تضمن توريدًا سريعًا ودقيقًا عبر مخازن مركزية منظمة، مع التزام دائم بمعايير التسليم.",
    stat: "48h",
    statLabel: "تسليم",
    highlights: ["بنية لوجستية احترافية", "مخازن مركزية منظمة", "التزام بمعايير التسليم"],
    image: warehouseLogistics,
    imageAlt: "مخازن المصرية جروب المركزية",
  },
  {
    icon: Monitor,
    title: "عمليات دقيقة مدعومة بـ ERP",
    text: "تُدار سلسلة التوريد من الاستلام وحتى التسليم عبر نظام ERP متكامل يضمن الشفافية، وتتبع الطلبات، ودقة التقارير التشغيلية.",
    stat: "ERP",
    statLabel: "نظام متكامل",
    highlights: ["شفافية كاملة", "تتبع الطلبات", "دقة التقارير التشغيلية"],
    image: erpSystem,
    imageAlt: "نظام ERP المتكامل للمصرية جروب",
  },
  {
    icon: DollarSign,
    title: "انضباط سعري وحماية لقيمة العلامة",
    text: "تحافظ المصرية جروب على سياسات تسعير منضبطة تتماشى مع توقعات الشركات المصنّعة، لضمان استقرار السوق وتعزيز ثقة الشركاء.",
    stat: "100%",
    statLabel: "انضباط",
    highlights: ["سياسات تسعير منضبطة", "استقرار السوق", "تعزيز ثقة الشركاء"],
    image: autotechExhibition,
    imageAlt: "مشاركة المصرية جروب في معرض AUTOTECH",
  },
  {
    icon: Wrench,
    title: "علامتنا الخاصة MTX",
    text: "نقدم منتجات MTX للأفترماركت بجودة موثوقة وقيمة ممتازة، مع التركيز على الأداء المتسق والسعر التنافسي لتلبية احتياجات السوق المصري.",
    stat: "MTX",
    statLabel: "علامة خاصة",
    highlights: ["جودة موثوقة", "أداء متسق", "سعر تنافسي"],
    image: brandMtx,
    imageAlt: "منتجات MTX أفترماركت",
    imageContain: true,
  },
  {
    icon: Globe,
    title: "دعم إقليمي من مكتب دبي",
    text: "يدعم مكتبنا الإقليمي في دبي عمليات التوريد والتواصل مع الموردين اليابانيين لضمان استمرارية المخزون وجودة المنتجات.",
    stat: "🇦🇪",
    statLabel: "دبي",
    highlights: ["موردين يابانيين", "استمرارية المخزون", "جودة المنتجات"],
    image: dubaiOffice,
    imageAlt: "مكتب المصرية جروب الإقليمي في دبي",
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
  const isInView = useInView(ref, { once: true, amount: 0.2 });
  const isReversed = i % 2 !== 0;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0 }}
      animate={isInView ? { opacity: 1 } : {}}
      transition={{ duration: 0.5 }}
      className={`grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-center ${i > 0 ? "mt-20 md:mt-32" : ""}`}
    >
      {/* Image */}
      <motion.div
        initial={{ opacity: 0, scale: 0.92, x: isReversed ? 50 : -50 }}
        animate={isInView ? { opacity: 1, scale: 1, x: 0 } : {}}
        transition={{ duration: 0.7, type: "spring", stiffness: 60 }}
        className={`lg:col-span-5 ${isReversed ? "lg:order-2" : ""}`}
      >
        <div className="relative group">
          {/* Glow behind image */}
          <div className="absolute -inset-3 bg-gradient-to-br from-primary/10 to-[hsl(var(--gold-accent))]/10 rounded-3xl blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

          <div className="relative rounded-2xl overflow-hidden border border-border group-hover:border-primary/30 transition-all duration-500 shadow-xl shadow-black/10 group-hover:shadow-primary/15 group-hover:shadow-2xl">
            <motion.img
              src={s.image}
              alt={s.imageAlt}
              loading="lazy"
              className={`w-full aspect-[4/3] ${s.imageContain ? "object-contain bg-white p-8" : "object-cover"}`}
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.6 }}
            />
            {/* Overlay gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            {/* Stat badge on image */}
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={isInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ delay: 0.5, type: "spring" }}
              className="absolute top-4 left-4 bg-white/90 dark:bg-card/90 backdrop-blur-md rounded-xl px-4 py-3 shadow-lg border border-border"
            >
              <div className="text-2xl font-black text-primary leading-none">{s.stat}</div>
              <div className="text-[10px] font-semibold text-muted-foreground mt-0.5">{s.statLabel}</div>
            </motion.div>

            {/* Icon badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={isInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ delay: 0.6, type: "spring" }}
              className="absolute bottom-4 right-4 w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-[hsl(355,80%,55%)] flex items-center justify-center shadow-lg shadow-primary/30"
            >
              <s.icon className="w-6 h-6 text-white" />
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, x: isReversed ? -50 : 50 }}
        animate={isInView ? { opacity: 1, x: 0 } : {}}
        transition={{ duration: 0.7, delay: 0.15, type: "spring", stiffness: 60 }}
        className={`lg:col-span-7 ${isReversed ? "lg:order-1" : ""}`}
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
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>ما يميزنا | خبرة 25 عامًا في قطاع قطع الغيار</title>
        <meta name="description" content="تعرف على مميزات المصرية جروب: موزع معتمد، شبكة واسعة، نظام ERP، وانضباط سعري." />
      </Helmet>
      <Navbar />

      {/* ===== HERO ===== */}
      <motion.section
        ref={heroRef}
        style={{ opacity: heroOpacity, scale: heroScale }}
        className="pt-28 pb-20 md:pt-40 md:pb-28 bg-dark-section relative overflow-hidden"
      >
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "linear-gradient(hsl(var(--section-dark-foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--section-dark-foreground)) 1px, transparent 1px)", backgroundSize: "80px 80px" }} />

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
        <div className="absolute top-0 bottom-0 right-8 w-px bg-gradient-to-b from-transparent via-border to-transparent hidden xl:block" />

        <div className="container mx-auto px-4">
          {sections.map((s, i) => (
            <FeatureBlock key={s.title} s={s} i={i} />
          ))}
        </div>
      </section>

      {/* ===== BRANCHES MAP ===== */}
      <section className="py-20 md:py-28 bg-muted/30 relative overflow-hidden">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-bold mb-4">
              <MapPin className="w-4 h-4 inline ml-1" />
              مواقعنا
            </span>
            <h2 className="text-3xl md:text-4xl font-black text-foreground mb-3">
              زُر أقرب <span className="text-primary">فرع</span>
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto">اختر الفرع وافتح الموقع مباشرة على خرائط جوجل</p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-4xl mx-auto">
            {[
              { name: "القاهرة – التوفيقية", detail: "سوق التوفيقية لقطع غيار السيارات", icon: Building2, mapUrl: "https://maps.app.goo.gl/B3Kb6At4dnfGy28T9" },
              { name: "الجيزة – أوسيم", detail: "أوسيم – الجيزة", icon: Building2, mapUrl: "https://maps.app.goo.gl/trZ9Q4ZhnwtsFXTB8" },
              { name: "الأقصر", detail: "صعيد مصر", icon: Building2, mapUrl: "https://maps.app.goo.gl/c9B4yDBY2QHWPKcT8" },
              { name: "المكتب الإداري", detail: "اللبيني – الجيزة", icon: Building2, mapUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent("اللبيني, الجيزة, مصر")}` },
              { name: "دبي – Spectra Cars & Parts FZC", detail: "مركز إقليمي – الإمارات 🇦🇪", icon: Globe, mapUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent("Spectra Cars & Parts FZC, Dubai, UAE")}` },
            ].map((b, i) => (
              <motion.a
                key={b.name}
                href={b.mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ scale: 1.03, y: -4 }}
                className="bg-card border border-border rounded-xl p-5 hover:border-primary/40 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 group"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                    <b.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-foreground text-sm">{b.name}</h4>
                    <p className="text-xs text-muted-foreground mt-1">{b.detail}</p>
                    <span className="inline-flex items-center gap-1.5 mt-2.5 text-xs font-semibold text-primary">
                      <Navigation className="w-3.5 h-3.5" />
                      افتح على خرائط جوجل
                    </span>
                  </div>
                </div>
              </motion.a>
            ))}
          </div>
        </div>
      </section>
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
              <motion.a
                href="https://wa.me/201034806288"
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ scale: 1.06, y: -3 }}
                whileTap={{ scale: 0.94 }}
                transition={{ type: "spring", stiffness: 400, damping: 15 }}
                className="glass-pill glass-pill-primary"
              >
                <MessageCircle className="w-5 h-5" />
                تواصل معنا
              </motion.a>
              <motion.a
                href="/#contact"
                whileHover={{ scale: 1.06, y: -3 }}
                whileTap={{ scale: 0.94 }}
                transition={{ type: "spring", stiffness: 400, damping: 15 }}
                className="glass-pill"
              >
                <ArrowLeft className="w-4 h-4" />
                اطلب عرض سعر
              </motion.a>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default WhatSetsUsApartPage;
