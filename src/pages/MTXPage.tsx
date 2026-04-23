import { motion } from "framer-motion";
import {
  ShieldCheck, Wrench, CheckCircle2, ArrowLeft, Users,
  Truck, Award, Target, Globe, DollarSign, Building2, Search, TestTube,
  BarChart3, BadgeCheck, ChevronLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProductListingSection from "@/components/ProductListingSection";

import { useProductListing } from "@/hooks/useProductListing";

import brandMtx from "@/assets/brand-mtx.webp";
import brandDenso from "@/assets/brand-denso.webp";
import brandAisin from "@/assets/brand-aisin.webp";
import mtxHeroBg from "@/assets/mtx-hero-bg.webp";
import catFilters from "@/assets/cat-mtx-filters.webp";
import catBrakes from "@/assets/cat-mtx-brakes.webp";
import catSuspension from "@/assets/cat-mtx-suspension.webp";
import catElectrical from "@/assets/cat-mtx-electrical.webp";
import catBelts from "@/assets/cat-mtx-belts.webp";

const distributedBrands = [
  { logo: brandMtx, name: "MTX Aftermarket", desc: "علامتنا الخاصة — قطع غيار مستوردة بجودة تضاهي الأصلية وبسعر تنافسي.", to: "/products/mtx-aftermarket", scale: "scale-150" },
  { logo: brandDenso, name: "DENSO", desc: "الشركة اليابانية الرائدة في تصنيع مكونات السيارات عالية الأداء.", to: "/products/denso", scale: "scale-100" },
  { logo: brandAisin, name: "AISIN", desc: "قطع غيار يابانية أصلية متخصصة في أنظمة نقل الحركة والتعليق.", to: "/products/aisin", scale: "scale-100" },
];

const advantages = [
  { icon: CheckCircle2, title: "جودة تضاهي الأصلية", desc: "يتم اختبار جميع منتجات MTX لضمان أداء موثوق وعمر افتراضي ممتاز." },
  { icon: Globe, title: "ماركات عالمية", desc: "تعتمد MTX على موردين عالميين لديهم خبرة في تصنيع مكونات سيارات بجودة عالية." },
  { icon: DollarSign, title: "قيمة مقابل سعر", desc: "تقدم MTX جودة قوية بسعر تنافسي يناسب الفئات المختلفة من العملاء." },
  { icon: Building2, title: "دعم المصرية جروب", desc: "تستفيد MTX من خبرة 25 عامًا للمصرية جروب وشبكة توزيع تضم أكثر من 2000 عميل." },
];

const categories = [
  { image: catFilters, name: "فلاتر", detail: "زيت – هواء – وقود – تكييف", slug: "filters" },
  { image: catBrakes, name: "تيل فرامل", detail: "أقراص وتيل فرامل عالية الأداء", slug: "brakes" },
  { image: catSuspension, name: "قطع تعليق", detail: "مقصات – جلب – كراسي موتور", slug: "suspension" },
  { image: catElectrical, name: "كهرباء سيارات", detail: "بوجيهات – حساسات – ريلايات", slug: "electrical" },
  { image: catBelts, name: "سيور ومحركات", detail: "سيور توقيت – سيور مروحة", slug: "belts" },
];

const qualitySteps = [
  { icon: Search, label: "فحص الجودة" },
  { icon: TestTube, label: "مراجعة المواصفات" },
  { icon: BarChart3, label: "مقارنة الأداء" },
  { icon: BadgeCheck, label: "اعتماد المنتج" },
];

const audiences = [
  { icon: Users, label: "تجار الجملة" },
  { icon: Wrench, label: "مراكز الخدمة والصيانة" },
  { icon: Truck, label: "شركات قطاع النقل" },
  { icon: Target, label: "أساطيل التشغيل" },
  { icon: Award, label: "الباحثون عن جودة بسعر مناسب" },
];

const fadeUp = { initial: { opacity: 0, y: 30 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, amount: 0.05 } };
const stagger = (i: number) => ({ delay: i * 0.1 });

const MTXPage = () => {
  const listing = useProductListing({
    brandFilter: "mtx_aftermarket",
    queryKeySuffix: "mtx",
  });

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Helmet>
        <title>MTX | العلامة التابعة للمصرية جروب والمتخصصة في استيراد قطع غيار تويوتا</title>
        <meta name="description" content="MTX إحدى شركات المصرية جروب، توفر قطع غيار تويوتا مستوردة من أفضل الموردين العالميين بجودة تضاهي الأصلية وبسعر تنافسي، لخدمة التجار ومراكز الصيانة والشركات." />
        <meta name="keywords" content="MTX, قطع غيار تويوتا, استيراد قطع غيار, موزع معتمد, أفترماركت, جودة تضاهي الأصلية, DENSO, AISIN" />
        <link rel="canonical" href="https://www.almasriaautoparts.com/mtx" />
      </Helmet>
      <Navbar />

      {/* ═══ Section 1 — Hero ═══ */}
      <section className="relative pt-24 pb-20 md:pt-32 md:pb-28 overflow-hidden">
        <img src={mtxHeroBg} alt="" className="absolute inset-0 w-full h-full object-cover" loading="eager" />
        <div className="absolute inset-0 bg-secondary/80 backdrop-blur-[2px]" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-secondary/30 to-secondary" />
        <div className="absolute top-1/4 left-[10%] w-[500px] h-[500px] rounded-full bg-primary/8 blur-[180px]" />
        <div className="container mx-auto px-4 relative z-10">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-primary hover:underline mb-8 group">
            <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />العودة للرئيسية
          </Link>
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} className="text-center mb-14">
            <motion.span initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }} className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-primary/15 border border-primary/30 text-primary text-sm font-bold mb-6">
              <ShieldCheck className="w-4 h-4" />إحدى شركات المصرية جروب
            </motion.span>
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-black text-dark-section-foreground leading-[1.15] tracking-tight mb-5">
              <span className="shimmer-text">MTX</span> — إحدى شركات <span className="text-primary">المصرية جروب</span>
            </h1>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="text-dark-section-foreground/60 text-lg md:text-xl max-w-3xl mx-auto leading-relaxed">
              MTX هي إحدى شركات المصرية جروب، متخصصة في استيراد وتوزيع قطع غيار تويوتا، وتركّز على تلبية احتياجات السوق المحلي من خلال توفير علامات تجارية عالمية بمعايير جودة تضاهي قطع الغيار الأصلية.
            </motion.p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {distributedBrands.map((brand, i) => (
              <motion.div key={brand.name} initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.15, type: "spring", stiffness: 80 }}>
                <Link to={brand.to} className="block bg-dark-section-foreground/5 backdrop-blur-sm border border-dark-section-foreground/10 rounded-2xl p-6 hover:border-primary/40 hover:bg-dark-section-foreground/10 transition-all duration-500 group">
                  <div className="bg-white rounded-xl aspect-[4/3] flex items-center justify-center mb-5 overflow-hidden shadow-lg group-hover:shadow-primary/20 transition-shadow duration-500">
                    <motion.img src={brand.logo} alt={brand.name} className={`w-[80%] h-[80%] object-contain ${brand.scale}`} whileHover={{ scale: 1.08 }} transition={{ duration: 0.4 }} />
                  </div>
                  <h3 className="text-lg font-bold text-dark-section-foreground mb-2 group-hover:text-primary transition-colors">{brand.name}</h3>
                  <p className="text-dark-section-foreground/50 text-sm leading-relaxed mb-4">{brand.desc}</p>
                  <span className="inline-flex items-center gap-2 text-primary text-sm font-bold group-hover:gap-3 transition-all">استعرض المنتجات<ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" /></span>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ Section 2 — About MTX ═══ */}
      <section className="py-20 md:py-28 bg-background">
        <div className="container mx-auto px-4">
          <motion.div {...fadeUp} className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-black text-foreground mb-3">من نحن — <span className="text-primary">MTX</span></h2>
            <motion.div initial={{ width: 0 }} whileInView={{ width: "4rem" }} viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.3 }} className="h-1 bg-primary mx-auto rounded-full mb-8" />
            <p className="text-muted-foreground text-lg md:text-xl leading-[2] tracking-wide">
              MTX هي إحدى العلامات التابعة للمصرية جروب، وتعمل على توفير قطع غيار تويوتا بطريقة احترافية تعتمد على استيراد منتجات عالية الجودة من موردين عالميين، مما يجعلها خيارًا موثوقًا يلبي احتياجات العملاء الباحثين عن جودة قريبة من الأصلية وبسعر مناسب.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ═══ Section 3 — Key Advantages ═══ */}
      <section className="py-20 md:py-28 bg-dark-section">
        <div className="container mx-auto px-4">
          <motion.div {...fadeUp} className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-black text-dark-section-foreground mb-3">لماذا <span className="shimmer-text">MTX</span>؟</h2>
            <motion.div initial={{ width: 0 }} whileInView={{ width: "4rem" }} viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.3 }} className="h-1 bg-primary mx-auto rounded-full" />
          </motion.div>
          <div className="grid sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {advantages.map((item, i) => (
              <motion.div key={item.title} {...fadeUp} transition={{ ...stagger(i), duration: 0.5 }} className="relative bg-dark-section-foreground/5 border border-dark-section-foreground/10 rounded-2xl p-7 hover:border-primary/30 transition-all duration-300 group overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/0 to-primary/0 group-hover:from-primary/5 group-hover:to-transparent transition-all duration-500 rounded-2xl" />
                <div className="relative z-10 flex items-start gap-4">
                  <div className="w-14 h-14 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/25 transition-colors"><item.icon className="w-7 h-7 text-primary" /></div>
                  <div>
                    <h3 className="font-bold text-dark-section-foreground text-lg mb-2">{item.title}</h3>
                    <p className="text-dark-section-foreground/55 text-sm leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ Section 4 — Product Categories ═══ */}
      <section className="py-20 md:py-28 bg-background">
        <div className="container mx-auto px-4">
          <motion.div {...fadeUp} className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-black text-foreground mb-3">فئات منتجات <span className="text-primary">MTX</span></h2>
            <motion.div initial={{ width: 0 }} whileInView={{ width: "4rem" }} viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.3 }} className="h-1 bg-primary mx-auto rounded-full" />
          </motion.div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5 max-w-6xl mx-auto">
            {categories.map((cat, i) => (
              <motion.div key={cat.name} {...fadeUp} transition={{ ...stagger(i), duration: 0.5 }}>
                <Link to={`/products/mtx-aftermarket?category=${cat.slug}`} className="bg-card border border-border rounded-2xl overflow-hidden hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1 transition-all duration-300 group flex flex-col h-full">
                  <div className="aspect-square overflow-hidden"><img src={cat.image} alt={cat.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" loading="lazy" /></div>
                  <div className="p-4 text-center flex-1 flex flex-col">
                    <h3 className="font-bold text-foreground text-base mb-1.5">{cat.name}</h3>
                    <p className="text-muted-foreground text-xs leading-relaxed mb-4 flex-1">{cat.detail}</p>
                    <span className="mx-auto text-xs border border-primary/20 text-primary rounded-md px-3 py-1.5 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">اطلب عرض سعر</span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>


      {/* ═══ Section 4.5 — Product Browse ═══ */}
      <ProductListingSection
        {...listing}
        dailyLimit={listing.DAILY_LIMIT}
        sectionId="mtx-products"
        sectionClassName="py-12 md:py-16 bg-muted/30 border-y border-border"
        sectionTitle={
          <motion.div {...fadeUp}>
            <h2 className="text-3xl md:text-4xl font-black text-foreground mb-3">تصفح منتجات <span className="text-primary">MTX</span></h2>
            <motion.div initial={{ width: 0 }} whileInView={{ width: "4rem" }} viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.3 }} className="h-1 bg-primary mx-auto rounded-full" />
          </motion.div>
        }
      />

      {/* ═══ Section 5 — Quality Process ═══ */}
      <section className="py-20 md:py-28 bg-dark-section">
        <div className="container mx-auto px-4">
          <motion.div {...fadeUp} className="text-center mb-8">
            <h2 className="text-3xl md:text-4xl font-black text-dark-section-foreground mb-3">كيفية اختيار منتجات <span className="shimmer-text">MTX</span></h2>
            <motion.div initial={{ width: 0 }} whileInView={{ width: "4rem" }} viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.3 }} className="h-1 bg-primary mx-auto rounded-full mb-8" />
            <p className="text-dark-section-foreground/60 text-base md:text-lg leading-[2] max-w-3xl mx-auto">
              تعتمد MTX على عملية دقيقة لاختيار الموردين تشمل فحص الجودة، مراجعة المواصفات، مقارنة الأداء مع القطع الأصلية، وضمان اتساق المنتج قبل التوريد للسوق المصري.
            </p>
          </motion.div>
          <div className="flex flex-wrap justify-center gap-6 md:gap-10 mt-14 max-w-3xl mx-auto">
            {qualitySteps.map((step, i) => (
              <motion.div key={step.label} {...fadeUp} transition={{ ...stagger(i), duration: 0.5 }} className="flex flex-col items-center gap-3 text-center">
                <div className="relative">
                  <div className="w-20 h-20 rounded-2xl bg-primary/15 border border-primary/20 flex items-center justify-center"><step.icon className="w-9 h-9 text-primary" /></div>
                  <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shadow-lg">{i + 1}</span>
                </div>
                <p className="text-dark-section-foreground/80 text-sm font-semibold">{step.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ Section 6 — Target Audience ═══ */}
      <section className="py-20 md:py-28 bg-card border-y border-border">
        <div className="container mx-auto px-4">
          <motion.div {...fadeUp} className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-black text-foreground mb-3">من يخدمهم <span className="text-primary">MTX</span>؟</h2>
            <motion.div initial={{ width: 0 }} whileInView={{ width: "4rem" }} viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.3 }} className="h-1 bg-primary mx-auto rounded-full" />
          </motion.div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 sm:gap-8 max-w-4xl mx-auto">
            {audiences.map((a, i) => (
              <motion.div key={a.label} {...fadeUp} transition={{ ...stagger(i), duration: 0.5 }} className="flex flex-col items-center gap-4 text-center w-full">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/15 flex items-center justify-center"><a.icon className="w-8 h-8 text-primary" /></div>
                <h3 className="font-bold text-foreground text-sm">{a.label}</h3>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ Section 7 — Final CTA ═══ */}
      <section className="py-20 md:py-28 bg-dark-section relative overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[500px] h-[300px] rounded-full bg-primary/8 blur-[160px]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[250px] rounded-full bg-primary/5 blur-[140px]" />
        <div className="container mx-auto px-4 text-center relative z-10">
          <motion.div {...fadeUp}>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-dark-section-foreground mb-4">ابدأ تعاملاتك مع <span className="shimmer-text">MTX</span> الآن</h2>
            <p className="text-dark-section-foreground/50 text-lg mb-10 max-w-xl mx-auto">انضم لأكثر من 2000 عميل يثقون في منتجات المصرية جروب</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" className="gap-3 font-bold text-base px-8 py-6 bg-primary hover:bg-primary/90 text-primary-foreground shadow-xl shadow-primary/20 group" asChild>
                <a href="https://wa.me/201153961008?text=أريد كتالوج MTX" target="_blank" rel="noopener noreferrer">اطلب كتالوج MTX<ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" /></a>
              </Button>
              <Button size="lg" variant="outline" className="gap-2 font-bold border-dark-section-foreground/20 text-dark-section-foreground hover:bg-dark-section-foreground/10" asChild>
                <Link to="/dealer-apply">انضم كتاجر</Link>
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
