import { motion, useInView } from "framer-motion";
import { ArrowLeft, ArrowRight, ShieldCheck, Clock, Users, Globe, Award, Cog, Wrench, Droplets } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

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
    <div ref={ref} className="font-black text-5xl md:text-6xl text-white tabular-nums tracking-tight leading-none">
      <span className="text-toyota-red">{count.toLocaleString("en")}</span>
      <span className="text-toyota-red text-3xl md:text-4xl">{suffix}</span>
    </div>
  );
};

const mechanicalAccents = [
  { icon: Cog, x: "5%", y: "15%", size: 40, duration: 25, rotate: 360 },
  { icon: Cog, x: "92%", y: "80%", size: 32, duration: 20, rotate: -360 },
  { icon: Wrench, x: "88%", y: "20%", size: 24, duration: 18, rotate: 15 },
  { icon: Droplets, x: "8%", y: "75%", size: 20, duration: 22, rotate: 0 },
];

const AboutBrief = () => {
  const { t, isAr } = useLanguage();

  const highlights = [
    { icon: ShieldCheck, label: t("about.highlight1"), desc: t("about.highlight1_desc"), accent: "from-primary/20 to-primary/5" },
    { icon: Clock, label: t("about.highlight2"), desc: t("about.highlight2_desc"), accent: "from-amber-500/15 to-amber-500/5" },
    { icon: Users, label: t("about.highlight3"), desc: t("about.highlight3_desc"), accent: "from-emerald-500/15 to-emerald-500/5" },
    { icon: Globe, label: t("about.highlight4"), desc: t("about.highlight4_desc"), accent: "from-sky-500/15 to-sky-500/5" },
  ];

  const metrics = [
    { value: 25, suffix: "+", label: t("about.metric_years"), desc: t("about.metric_years_desc") },
    { value: 2000, suffix: "+", label: t("about.metric_clients"), desc: t("about.metric_clients_desc") },
    { value: 10, suffix: "K+", label: t("about.metric_parts"), desc: t("about.metric_parts_desc") },
    { value: 4, suffix: "", label: t("about.metric_branches"), desc: t("about.metric_branches_desc") },
  ];

  const ArrowIcon = isAr ? ArrowLeft : ArrowRight;

  return (
    <section id="about" className="relative py-24 md:py-32 bg-carbon overflow-hidden font-tajawal">
      {/* Red hairlines */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-toyota-red/40 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-toyota-red/20 to-transparent" />

      {/* Ambient red glow */}
      <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full bg-toyota-red/10 blur-[140px] pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] rounded-full bg-toyota-red/10 blur-[140px] pointer-events-none" />

      {/* Mechanical accents */}
      <div className="absolute inset-0 pointer-events-none hidden md:block">
        {mechanicalAccents.map((part, i) => (
          <motion.div key={i} className="absolute" style={{ left: part.x, top: part.y }} initial={{ opacity: 0 }} animate={{ opacity: [0, 0.08, 0.05, 0.08, 0], rotate: [0, part.rotate] }} transition={{ duration: part.duration, repeat: Infinity, ease: "linear" }}>
            <part.icon style={{ width: part.size, height: part.size }} className="text-white/10" strokeWidth={1} />
          </motion.div>
        ))}
      </div>

      {/* Subtle grid */}
      <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: `linear-gradient(hsl(var(--toyota-red)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--toyota-red)) 1px, transparent 1px)`, backgroundSize: "80px 80px" }} />

      <div className="container mx-auto px-4 relative z-10">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }} className="text-center mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-white leading-tight mb-4">
            {t("about.header")} <span className="text-toyota-red">{t("about.header_highlight")}</span>
          </h2>
          <p className="text-white/50 text-sm md:text-base leading-relaxed max-w-md mx-auto">{t("about.sub")}</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start mb-20">

          <motion.div className="lg:col-span-7 order-1" initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}>
            <div className="space-y-8 mb-10">
              {isAr ? (
                  <>
                  {[
                    <>تعمل المصرية منذ <strong className="text-toyota-red font-black">1999</strong>، بخبرة ممتدة كموزع معتمد لِـ <Link to="/products/toyota-genuine" className="text-toyota-red font-black hover:underline underline-offset-4 decoration-2 decoration-toyota-red/50">قطع غيار</Link> و<Link to="/products/toyota-oils" className="text-toyota-red font-black hover:underline underline-offset-4 decoration-2 decoration-toyota-red/50">زيوت تويوتا الأصلية</Link>، تعمل وفق <strong className="text-white font-bold">معايير تشغيل احترافية</strong> ورؤية استراتيجية طويلة المدى.</>,
                    <>نموذج أعمال متكامل يرتكز على <strong className="text-white font-bold">بنية تشغيلية متقدمة</strong>، و<strong className="text-white font-bold">شبكة توزيع واسعة</strong> داخل مصر، مدعومة بحضور إقليمي <strong className="text-toyota-red font-black">في دبي</strong> يعزز كفاءة سلاسل الإمداد ويواكب متطلبات الأسواق.</>,
                    <>كما تمثل علامتنا <Link to="/mtx" className="text-toyota-red font-black hover:underline underline-offset-4 decoration-2 decoration-toyota-red/50">MTX</Link> امتدادًا استراتيجيًا لمنظومة أعمالنا، تم تطويرها وفق معايير دقيقة تعكس التزامنا بالجودة والانضباط التشغيلي، وبمستوى يضاهي المنتجات الأصلية.</>,
                  ].map((text, i) => (
                    <motion.p key={i} className="text-white/80 text-lg md:text-[1.35rem] leading-[2.2] font-medium" initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }} transition={{ delay: 0.15 + i * 0.12, duration: 0.55, ease: "easeOut" }}>{text}</motion.p>
                  ))}
                </>
              ) : (
                <>
                  {[
                    <>Al Masria Group has been operating since <strong className="text-toyota-red font-black">1999</strong> as an authorized distributor of <Link to="/products/toyota-genuine" className="text-toyota-red font-black hover:underline underline-offset-4 decoration-2 decoration-toyota-red/50">Toyota Genuine Parts</Link> and <Link to="/products/toyota-oils" className="text-toyota-red font-black hover:underline underline-offset-4 decoration-2 decoration-toyota-red/50">Toyota Oils</Link>. We rely on a disciplined operational model built on <strong className="text-white font-bold">integrated digital management systems</strong> and a <strong className="text-white font-bold">distribution network</strong> covering all of Egypt.</>,
                    <>We provide <strong className="text-white font-bold">fast delivery</strong> within <strong className="text-toyota-red font-black">48&nbsp;hours</strong> through highly efficient central warehouses, with a <strong className="text-white font-bold">regional presence</strong> <strong className="text-toyota-red font-black">in Dubai</strong> supporting supply continuity and product quality.</>,
                    <>We also manage the <Link to="/mtx" className="text-toyota-red font-black hover:underline underline-offset-4 decoration-2 decoration-toyota-red/50">MTX</Link> brand for aftermarket parts with OEM-matching quality.</>,
                  ].map((text, i) => (
                    <motion.p key={i} className="text-white/80 text-lg md:text-[1.35rem] leading-[2.2] font-medium" initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }} transition={{ delay: 0.15 + i * 0.12, duration: 0.55, ease: "easeOut" }}>{text}</motion.p>
                  ))}
                </>
              )}
            </div>

            <motion.div className="flex flex-col sm:flex-row gap-4 mt-10" initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.5, duration: 0.5 }}>
              <motion.div whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.97 }} transition={{ duration: 0.2 }}>
                <Button size="lg" className="gap-2.5 font-black shadow-xl shadow-toyota-red/25 px-8 py-6 text-base" asChild>
                  <Link to="/about">
                    {t("about.discover")}
                    <motion.span animate={{ x: isAr ? [0, -5, 0] : [0, 5, 0] }} transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}>
                      <ArrowIcon className="w-5 h-5" />
                    </motion.span>
                  </Link>
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.97 }} transition={{ duration: 0.2 }}>
                <Button size="lg" variant="outline" className="gap-2.5 font-black px-8 py-6 text-base border-2 border-white/40 text-white bg-white/10 hover:bg-white/20 hover:border-white/60 " asChild>
                  <Link to="/what-sets-us-apart">
                    {t("about.what_sets_us_apart")}
                    <Award className="w-5 h-5" />
                  </Link>
                </Button>
              </motion.div>
            </motion.div>
          </motion.div>

          <motion.div className="lg:col-span-5 order-2" initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.3 }}>
            <div className="grid grid-cols-2 gap-4">
              {highlights.map((h, i) => (
                <motion.div key={h.label} initial={{ opacity: 0, y: 24, scale: 0.9 }} whileInView={{ opacity: 1, y: 0, scale: 1 }} viewport={{ once: true, margin: "-40px" }} transition={{ delay: 0.3 + i * 0.12, duration: 0.5, type: "spring", stiffness: 120 }} whileHover={{ y: -8, scale: 1.04, transition: { duration: 0.25 } }} className="group relative rounded-2xl p-6 transition-all duration-300 overflow-hidden bg-white/[0.06] border-2 border-white/10 hover:border-toyota-red/40 hover:shadow-2xl hover:shadow-toyota-red/15 cursor-default">
                  <div className={`absolute inset-0 bg-gradient-to-br ${h.accent} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                  <div className="relative z-10">
                    <motion.div className="w-14 h-14 bg-toyota-red/15 rounded-2xl flex items-center justify-center mb-5 group-hover:bg-toyota-red/25 transition-all duration-300 shadow-lg shadow-toyota-red/10 group-hover:shadow-xl group-hover:shadow-toyota-red/20" whileHover={{ rotate: [0, -12, 12, -6, 0], scale: 1.1 }} transition={{ duration: 0.6 }}>
                      <h.icon className="w-7 h-7 text-toyota-red" strokeWidth={2} />
                    </motion.div>
                    <h3 className="font-black text-white text-base mb-2">{h.label}</h3>
                    <p className="text-white/50 text-sm leading-relaxed font-medium">{h.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }} className="border-t border-white/10 pt-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-0">
            {metrics.map((m, i) => (
              <motion.div key={m.label} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.15 + i * 0.12, duration: 0.6, ease: "easeOut" }} className="relative px-8 py-10 text-center group cursor-default">
                {i < metrics.length - 1 && <div className="hidden md:block absolute left-0 top-1/2 -translate-y-1/2 w-px h-16 bg-white/10" />}
                <motion.div className="absolute top-0 left-1/2 -translate-x-1/2 h-[3px] bg-primary rounded-full" initial={{ width: 0 }} whileInView={{ width: 40 }} viewport={{ once: true }} transition={{ delay: 0.4 + i * 0.12, duration: 0.5, ease: [0.22, 1, 0.36, 1] }} />
                <div className="mb-3"><Counter target={m.value} suffix={m.suffix} /></div>
                <p className="text-white font-black text-lg tracking-wide mb-1">{m.label}</p>
                <p className="text-white/40 text-sm font-medium tracking-wider uppercase">{m.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
    </section>
  );
};

export default AboutBrief;
