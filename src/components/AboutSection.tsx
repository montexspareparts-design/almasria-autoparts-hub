import { motion } from "framer-motion";
import { MapPin, Target, TrendingUp, Building2, Shield, Globe, Award } from "lucide-react";
import { useEffect, useRef } from "react";

/* ── Animated counter ── */
const Counter = ({ value, suffix = "" }: { value: number; suffix?: string }) => {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let start = 0;
    const duration = 2000;
    const step = (ts: number) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      el.textContent = Math.floor(progress * value) + suffix;
      if (progress < 1) requestAnimationFrame(step);
    };
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { requestAnimationFrame(step); observer.disconnect(); } },
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [value, suffix]);
  return <span ref={ref}>0{suffix}</span>;
};

/* ── Decorative red line ── */
const RedLine = () => (
  <motion.div
    initial={{ width: 0 }}
    whileInView={{ width: "5rem" }}
    viewport={{ once: true }}
    transition={{ duration: 0.8 }}
    className="h-1 bg-primary rounded-full"
  />
);

const AboutSection = () => {
  const stats = [
    { value: 25, suffix: "+", label: "سنة خبرة", icon: Award },
    { value: 4, suffix: "", label: "فروع", icon: MapPin },
    { value: 3, suffix: "", label: "أقسام رئيسية", icon: Building2 },
    { value: 1000, suffix: "+", label: "عميل نشط", icon: TrendingUp },
  ];

  const divisions = [
    { name: "المصرية – قطع غيار", desc: "موزع معتمد رسمي لقطع غيار تويوتا الأصلية", icon: Shield },
    { name: "المصرية – زيوت", desc: "موزع معتمد رسمي لجميع أنواع زيوت تويوتا الأصلية", icon: Shield },
    { name: "MTX", desc: "علامة تجارية مسجلة – استيراد جميع فئات قطع غيار تويوتا Aftermarket", icon: Globe },
  ];

  const branches = [
    { city: "القاهرة", area: "التوفيقية" },
    { city: "الجيزة", area: "أوسيم" },
    { city: "الأقصر", area: "صعيد مصر" },
    { city: "دبي 🇦🇪", area: "مركز إقليمي" },
  ];

  const expertise = [
    "توزيع قطع غيار تويوتا الأصلية",
    "توزيع زيوت تويوتا الأصلية",
    "MTX – قطع غيار Aftermarket مستوردة",
    "خدمة عملاء الجملة والشركات",
    "التوريد للهيئات الحكومية",
    "التوسع الإقليمي عبر دبي",
  ];

  return (
    <section id="about" className="relative py-24 md:py-32 bg-background overflow-hidden">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-[0.02]" style={{
        backgroundImage: `radial-gradient(circle at 1px 1px, hsl(var(--foreground)) 1px, transparent 0)`,
        backgroundSize: "40px 40px",
      }} />

      <div className="container mx-auto px-4 relative z-10">
        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-20"
        >
          <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-bold mb-4"
          >
            تعرّف علينا
          </motion.span>
          <h2 className="text-4xl md:text-6xl font-black text-foreground mb-4">
            من <span className="text-gradient-red">نحن</span>
          </h2>
          <div className="flex justify-center">
            <RedLine />
          </div>
        </motion.div>

        {/* ── Stats Bar ── */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-20"
        >
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="relative group"
            >
              <div className="bg-card border border-border rounded-xl p-6 text-center transition-all duration-300 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5">
                <stat.icon className="w-6 h-6 text-primary mx-auto mb-3 transition-transform duration-300 group-hover:scale-110" />
                <div className="text-3xl md:text-4xl font-black text-foreground mb-1">
                  <Counter value={stat.value} suffix={stat.suffix} />
                </div>
                <div className="text-sm text-muted-foreground font-medium">{stat.label}</div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* ── Main Content Grid ── */}
        <div className="grid lg:grid-cols-5 gap-10 items-start">

          {/* Right Column – Story (3/5) */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-3 space-y-8"
          >
            {/* Intro text */}
            <div className="space-y-5">
              <h3 className="text-2xl md:text-3xl font-bold text-foreground leading-tight">
                المصرية جروب
                <span className="block text-base font-medium text-muted-foreground mt-1">Al Masria Group</span>
              </h3>
              <p className="text-muted-foreground leading-[1.9] text-[15px]">
                المصرية جروب مؤسسة مصرية رائدة بخبرة تتجاوز 25 عامًا في قطاع توزيع قطع غيار وزيوت تويوتا الأصلية داخل السوق المصري، وتمثل أحد الكيانات المستقرة والموثوقة في هذا المجال.
              </p>
              <p className="text-muted-foreground leading-[1.9] text-[15px]">
                بصفتنا موزعًا معتمدًا رسميًا لقطع غيار وزيوت تويوتا الأصلية في مصر، نجحنا في بناء منظومة توزيع قوية تغطي مختلف المحافظات، وتخدم عملاء الجملة والشركات والهيئات بكفاءة تشغيلية عالية وإدارة احترافية لسلسلة الإمداد.
              </p>
            </div>

            {/* Divisions */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" />
                <h4 className="font-bold text-foreground text-lg">أقسام الشركة</h4>
              </div>
              <div className="grid sm:grid-cols-3 gap-3">
                {divisions.map((div, i) => (
                  <motion.div
                    key={div.name}
                    initial={{ opacity: 0, y: 15 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="group bg-card border border-border rounded-xl p-5 transition-all duration-300 hover:border-primary/30 hover:shadow-md hover:shadow-primary/5"
                  >
                    <div.icon className="w-8 h-8 text-primary mb-3 transition-transform duration-300 group-hover:scale-110" />
                    <div className="font-bold text-foreground text-sm mb-1">{div.name}</div>
                    <div className="text-xs text-muted-foreground leading-relaxed">{div.desc}</div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Vision */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="relative bg-secondary text-secondary-foreground rounded-xl p-6 overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
                    <Target className="w-5 h-5 text-primary" />
                  </div>
                  <h4 className="font-bold text-lg">رؤيتنا</h4>
                </div>
                <p className="text-secondary-foreground/80 leading-[1.9] text-[15px]">
                  نلتزم بتقديم منتجات أصلية موثوقة، ومعايير تشغيل احترافية، ونهج مؤسسي قائم على الجودة والاستدامة، بما يعكس خبرة تمتد لأكثر من ربع قرن في السوق.
                </p>
              </div>
            </motion.div>
          </motion.div>

          {/* Left Column – Info Cards (2/5) */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="lg:col-span-2 space-y-6"
          >
            {/* Branches */}
            <div className="bg-secondary text-secondary-foreground rounded-xl p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-primary" />
                </div>
                <h4 className="font-bold text-lg">فروعنا</h4>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {branches.map((b, i) => (
                  <motion.div
                    key={b.city}
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.08 }}
                    className="bg-secondary-foreground/10 rounded-lg p-4 text-center transition-all duration-200 hover:bg-secondary-foreground/15"
                  >
                    <div className="text-lg font-bold">{b.city}</div>
                    <div className="text-xs text-secondary-foreground/60 mt-0.5">{b.area}</div>
                  </motion.div>
                ))}
              </div>
              <div className="mt-3 bg-primary/15 rounded-lg p-4 text-center border border-primary/20">
                <div className="text-sm font-bold">المكتب الإداري</div>
                <div className="text-xs text-secondary-foreground/60 mt-0.5">اللبيني – الهرم – الجيزة</div>
              </div>
            </div>

            {/* Expertise */}
            <div className="bg-card border border-border rounded-xl p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-primary" />
                </div>
                <h4 className="font-bold text-foreground text-lg">تخصصاتنا</h4>
              </div>
              <ul className="space-y-3">
                {expertise.map((item, i) => (
                  <motion.li
                    key={item}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.06 }}
                    className="flex items-center gap-3 text-muted-foreground text-sm group"
                  >
                    <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0 transition-transform duration-200 group-hover:scale-150" />
                    {item}
                  </motion.li>
                ))}
              </ul>
            </div>

            {/* Dubai expansion callout */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-card border border-primary/20 rounded-xl p-5 flex items-start gap-4"
            >
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <Globe className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="font-bold text-foreground text-sm mb-1">التوسع الإقليمي</div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  يمتد حضورنا إقليميًا من خلال فرعنا في دبي – الإمارات، ضمن رؤية توسعية لتعزيز العلاقات التجارية في الخليج.
                </p>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
