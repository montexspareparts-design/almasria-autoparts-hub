import { motion } from "framer-motion";
import {
  ShieldCheck, Wrench, CheckCircle2, Filter, Disc, Settings, Zap, Cable,
  ArrowLeft, MessageCircle, Users, Truck, Award, Target
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import brandMtx from "@/assets/brand-mtx.jpg";

const whyMtx = [
  { icon: CheckCircle2, text: "جودة مختبرة وموثوقة" },
  { icon: Award, text: "قيمة مقابل سعر ممتازة" },
  { icon: Users, text: "مدعومة بشبكة المصرية جروب — 2000+ عميل" },
  { icon: Truck, text: "تسليم خلال 48 ساعة داخل مصر" },
  { icon: ShieldCheck, text: "انضباط سعري يحمي السوق" },
];

const categories = [
  { icon: Filter, name: "فلاتر", detail: "زيت – هواء – وقود – تكييف" },
  { icon: Disc, name: "تيل فرامل", detail: "أقراص وتيل فرامل عالية الأداء" },
  { icon: Settings, name: "قطع تعليق", detail: "مساعدين – كبالن – جلب" },
  { icon: Zap, name: "كهرباء سيارات", detail: "بوجيهات – كويلات – حساسات" },
  { icon: Cable, name: "سيور ومحرك", detail: "سيور توقيت – سيور مروحة" },
];

const audiences = [
  { icon: Users, label: "تجار الجملة" },
  { icon: Wrench, label: "مراكز الخدمة" },
  { icon: Target, label: "الشركات" },
  { icon: Truck, label: "أساطيل النقل" },
];

const MTXPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>MTX | علامة المصرية جروب للأفترماركت</title>
        <meta name="description" content="MTX منتجات أفترماركت عالية الجودة مدعومة بخبرة المصرية جروب وشبكة توزيع تغطي مصر." />
      </Helmet>
      <Navbar />

      {/* Hero */}
      <section className="pt-28 md:pt-36 pb-16 md:pb-24 bg-dark-section relative overflow-hidden">
        <div className="absolute top-1/4 right-[10%] w-96 h-96 rounded-full bg-primary/5 blur-[150px]" />
        <div className="container mx-auto px-4 relative">
          <div className="grid md:grid-cols-2 gap-10 items-center max-w-5xl mx-auto">
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7 }}
            >
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/15 text-primary text-sm font-bold mb-5">
                <Wrench className="w-4 h-4" />
                علامتنا الخاصة
              </span>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-[hsl(var(--section-dark-foreground))] leading-[1.2] tracking-tight mb-6">
                <span className="text-gradient-red">MTX</span> — علامتنا الخاصة للأفترماركت
              </h1>
              <p className="text-[hsl(var(--section-dark-foreground))]/65 text-lg leading-relaxed max-w-lg">
                MTX هي علامة أفترماركت تقدمها المصرية جروب، بجودة موثوقة وسعر تنافسي، مدعومة بخبرة 25 عامًا وشبكة توزيع تشمل أكثر من 2000 عميل.
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
            >
              <div className="bg-white rounded-2xl p-8 border border-border shadow-xl">
                <img src={brandMtx} alt="MTX Aftermarket" className="w-full h-auto object-contain" />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Why MTX */}
      <section className="py-20 md:py-24 bg-background">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-black text-foreground mb-4">لماذا <span className="text-gradient-red">MTX</span>؟</h2>
            <motion.div initial={{ width: 0 }} whileInView={{ width: "4rem" }} viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.3 }} className="h-1 bg-primary mx-auto rounded-full" />
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-4xl mx-auto">
            {whyMtx.map((item, i) => (
              <motion.div
                key={item.text}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="flex items-start gap-3 bg-card rounded-xl border border-border p-5 hover:border-primary/25 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/8 flex items-center justify-center flex-shrink-0">
                  <item.icon className="w-5 h-5 text-primary" />
                </div>
                <p className="text-foreground text-sm font-medium leading-relaxed pt-2">{item.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Product Categories */}
      <section className="py-20 md:py-24 bg-dark-section">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-black text-[hsl(var(--section-dark-foreground))] mb-4">فئات منتجات <span className="shimmer-text">MTX</span></h2>
            <motion.div initial={{ width: 0 }} whileInView={{ width: "4rem" }} viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.3 }} className="h-1 bg-primary mx-auto rounded-full" />
          </motion.div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5 max-w-5xl mx-auto">
            {categories.map((cat, i) => (
              <motion.div
                key={cat.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-[hsl(var(--section-dark-foreground))]/5 border border-[hsl(var(--section-dark-foreground))]/10 rounded-xl p-5 text-center hover:border-primary/40 transition-all duration-300 group"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center mx-auto mb-3 group-hover:bg-primary/25 transition-colors">
                  <cat.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-bold text-[hsl(var(--section-dark-foreground))] text-sm mb-1">{cat.name}</h3>
                <p className="text-xs text-[hsl(var(--section-dark-foreground))]/50">{cat.detail}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Quality Assurance */}
      <section className="py-20 md:py-24 bg-background">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-3xl mx-auto text-center"
          >
            <h2 className="text-3xl md:text-4xl font-black text-foreground mb-6">ضمان <span className="text-gradient-red">الجودة</span></h2>
            <p className="text-muted-foreground text-base md:text-lg leading-8">
              تخضع جميع منتجات MTX لمراحل فحص صارمة تبدأ من اختيار الموردين المعتمدين، مرورًا بمراقبة خطوط التصنيع، وحتى اختبارات الأداء النهائية. نضمن أن كل قطعة تحمل شعار MTX تستوفي معايير OE العالمية وتوفر أداءً موثوقًا يُرضي عملاءنا.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Target Audience */}
      <section className="py-20 md:py-24 bg-card border-y border-border">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-black text-foreground mb-4">الجمهور المستهدف</h2>
            <motion.div initial={{ width: 0 }} whileInView={{ width: "4rem" }} viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.3 }} className="h-1 bg-primary mx-auto rounded-full" />
          </motion.div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto">
            {audiences.map((a, i) => (
              <motion.div
                key={a.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="flex flex-col items-center gap-3 text-center"
              >
                <div className="w-14 h-14 rounded-2xl bg-primary/8 flex items-center justify-center">
                  <a.icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="font-bold text-foreground text-sm">{a.label}</h3>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 md:py-24 bg-dark-section">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-black text-[hsl(var(--section-dark-foreground))] mb-8">
              ابدأ التعامل مع <span className="shimmer-text">MTX</span>
            </h2>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" className="gap-3 font-bold text-base px-8 py-6 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg group" asChild>
                <a href="https://wa.me/201153961008?text=%D8%A3%D8%B1%D9%8A%D8%AF%20%D9%83%D8%AA%D8%A7%D9%84%D9%88%D8%AC%20MTX" target="_blank" rel="noopener noreferrer">
                  اطلب كتالوج MTX
                  <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
                </a>
              </Button>
              <Button size="lg" variant="outline" className="gap-3 font-bold text-base px-8 py-6 border-2 border-[hsl(var(--section-dark-foreground))]/20 text-[hsl(var(--section-dark-foreground))] bg-transparent hover:bg-[hsl(var(--section-dark-foreground))]/10" asChild>
                <a href="https://wa.me/201153961008?text=%D8%A3%D8%B1%D9%8A%D8%AF%20%D8%A7%D9%84%D8%AA%D8%AD%D8%AF%D8%AB%20%D9%85%D8%B9%20%D9%82%D8%B3%D9%85%20%D8%A7%D9%84%D9%85%D8%A8%D9%8A%D8%B9%D8%A7%D8%AA" target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="w-5 h-5" />
                  تحدث مع قسم المبيعات
                </a>
              </Button>
              <Button size="lg" variant="outline" className="gap-3 font-bold text-base px-8 py-6 border-2 border-[hsl(var(--section-dark-foreground))]/20 text-[hsl(var(--section-dark-foreground))] bg-transparent hover:bg-[hsl(var(--section-dark-foreground))]/10" asChild>
                <a href="https://wa.me/201153961008?text=%D8%A3%D8%B1%D9%8A%D8%AF%20%D8%A7%D9%84%D8%A7%D9%86%D8%B6%D9%85%D8%A7%D9%85%20%D9%83%D9%85%D9%88%D8%B2%D8%B9%20MTX" target="_blank" rel="noopener noreferrer">
                  انضم كموزع لمنتجات MTX
                </a>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default MTXPage;
