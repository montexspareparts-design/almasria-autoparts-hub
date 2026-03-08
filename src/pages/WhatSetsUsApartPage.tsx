import { motion } from "framer-motion";
import { useEffect } from "react";
import {
  Clock, Award, Users, Truck, Monitor, DollarSign, Wrench, Globe,
  ArrowLeft, MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const sections = [
  {
    icon: Clock,
    title: "ريادة تمتد لأكثر من 25 عامًا",
    text: "منذ عام 1999، رسّخت المصرية جروب مكانتها كأحد أهم موزّعي قطع الغيار والزيوت في مصر، مستندة إلى خبرة تشغيلية قوية وعلاقات عميقة مع السوق.",
  },
  {
    icon: Award,
    title: "موزّع معتمد لقطع غيار وزيوت تويوتا",
    text: "نلتزم بتوفير قطع غيار تويوتا الأصلية والزيوت المعتمدة عبر قنوات رسمية تتوافق مع معايير الشركات المصنّعة (OEM)، بما يضمن أعلى مستويات الجودة والأمان.",
  },
  {
    icon: Users,
    title: "شبكة تضم أكثر من 2000 عميل",
    text: "نخدم موزعين، مراكز خدمة، شركات، وقطاع بترولي من خلال شبكة توزيع واسعة تغطي معظم المحافظات المصرية، بما يعزز استقرار السوق واستمرارية الإمداد.",
  },
  {
    icon: Truck,
    title: "تسليم خلال 48 ساعة",
    text: "نعتمد على بنية لوجستية احترافية تضمن توريدًا سريعًا ودقيقًا عبر مخازن مركزية منظمة، مع التزام دائم بمعايير التسليم.",
  },
  {
    icon: Monitor,
    title: "عمليات دقيقة مدعومة بـ ERP",
    text: "تُدار سلسلة التوريد من الاستلام وحتى التسليم عبر نظام ERP متكامل يضمن الشفافية، وتتبع الطلبات، ودقة التقارير التشغيلية.",
  },
  {
    icon: DollarSign,
    title: "انضباط سعري وحماية لقيمة العلامة",
    text: "تحافظ المصرية جروب على سياسات تسعير منضبطة تتماشى مع توقعات الشركات المصنّعة، لضمان استقرار السوق وتعزيز ثقة الشركاء.",
  },
  {
    icon: Wrench,
    title: "علامتنا الخاصة MTX",
    text: "نقدم منتجات MTX للأفترماركت بجودة موثوقة وقيمة ممتازة، مع التركيز على الأداء المتسق والسعر التنافسي لتلبية احتياجات السوق المصري.",
  },
  {
    icon: Globe,
    title: "دعم إقليمي من مكتب دبي",
    text: "يدعم مكتبنا الإقليمي في دبي عمليات التوريد والتواصل مع الموردين اليابانيين لضمان استمرارية المخزون وجودة المنتجات.",
  },
];

const WhatSetsUsApartPage = () => {
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

      {/* Hero banner */}
      <section className="pt-28 pb-16 md:pt-36 md:pb-20 bg-dark-section relative overflow-hidden">
        <motion.div
          className="absolute top-10 left-[10%] w-72 h-72 rounded-full bg-primary/8 blur-[120px]"
          animate={{ scale: [1, 1.3, 1] }}
          transition={{ duration: 6, repeat: Infinity }}
        />
        <div className="container mx-auto px-4 relative">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="text-center max-w-3xl mx-auto"
          >
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-block px-4 py-1.5 rounded-full bg-primary/15 text-primary text-sm font-bold mb-6"
            >
              <Award className="w-4 h-4 inline ml-1" />
              المصرية جروب
            </motion.span>
            <h1 className="text-4xl md:text-6xl font-black text-[hsl(var(--section-dark-foreground))] mb-6">
              ما <span className="shimmer-text">يميزنا</span>
            </h1>
            <p className="text-[hsl(var(--section-dark-foreground))]/60 text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
              خبرة تمتد لأكثر من 25 عامًا في توزيع قطع الغيار والزيوت الأصلية، مع شبكة توزيع تغطي جميع أنحاء مصر.
            </p>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "5rem" }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="h-1 bg-primary mx-auto mt-6 rounded-full"
            />
          </motion.div>
        </div>
      </section>

      {/* Sections */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto space-y-8">
            {sections.map((s, i) => {
              const isEven = i % 2 === 0;
              return (
                <motion.div
                  key={s.title}
                  initial={{ opacity: 0, x: isEven ? -40 : 40 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.6, type: "spring", stiffness: 80 }}
                  className={`flex flex-col md:flex-row items-start gap-6 p-6 md:p-8 rounded-2xl border transition-all duration-300 hover:shadow-lg group ${
                    isEven
                      ? "bg-card border-border hover:border-primary/30 hover:shadow-primary/5"
                      : "bg-dark-section border-[hsl(var(--section-dark-foreground))]/10 hover:border-primary/30 hover:shadow-primary/10"
                  }`}
                >
                  {/* Icon */}
                  <motion.div
                    className="w-16 h-16 flex-shrink-0 bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl flex items-center justify-center border border-primary/15"
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ type: "spring", stiffness: 200 }}
                  >
                    <s.icon className="w-8 h-8 text-primary" />
                  </motion.div>

                  {/* Content */}
                  <div className="flex-1">
                    <h2
                      className={`text-xl md:text-2xl font-bold mb-3 ${
                        isEven ? "text-card-foreground" : "text-[hsl(var(--section-dark-foreground))]"
                      }`}
                    >
                      {s.title}
                    </h2>
                    <p
                      className={`leading-[2] text-sm md:text-base ${
                        isEven ? "text-muted-foreground" : "text-[hsl(var(--section-dark-foreground))]/70"
                      }`}
                    >
                      {s.text}
                    </p>
                    <motion.div
                      className="h-0.5 bg-gradient-to-l from-primary/30 to-transparent mt-4 rounded-full origin-right"
                      initial={{ scaleX: 0 }}
                      whileInView={{ scaleX: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.3, duration: 0.6 }}
                    />
                  </div>

                  {/* Number badge */}
                  <div className="hidden md:flex w-12 h-12 flex-shrink-0 rounded-full border-2 border-primary/20 items-center justify-center">
                    <span className="text-primary font-black text-lg">{i + 1}</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-20 bg-dark-section relative overflow-hidden">
        <motion.div
          className="absolute bottom-0 right-0 w-96 h-96 rounded-full bg-primary/5 blur-[150px]"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 5, repeat: Infinity }}
        />
        <div className="container mx-auto px-4 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center max-w-2xl mx-auto"
          >
            <h2 className="text-2xl md:text-4xl font-black text-[hsl(var(--section-dark-foreground))] mb-4">
              جاهز <span className="text-gradient-red">للتعاون؟</span>
            </h2>
            <p className="text-[hsl(var(--section-dark-foreground))]/60 mb-8 text-sm md:text-base">
              تواصل معنا اليوم واكتشف كيف يمكن للمصرية جروب أن تكون شريكك الموثوق في قطع الغيار والزيوت.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <motion.div whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: 0.97 }}>
                <Button size="lg" className="gap-2 red-glow font-bold text-lg px-8 relative overflow-hidden group" asChild>
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
                  className="gap-2 font-bold border-[hsl(var(--section-dark-foreground))]/20 text-[hsl(var(--section-dark-foreground))] hover:bg-primary hover:text-primary-foreground hover:border-primary"
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
