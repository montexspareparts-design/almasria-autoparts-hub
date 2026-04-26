import { lazy, Suspense } from "react";
import SEOHead from "@/components/SEOHead";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Clock, Cog, Truck, Package, MapPin, FileText, Users, ChevronLeft } from "lucide-react";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import ProductListingSection from "@/components/ProductListingSection";

import { useProductListing } from "@/hooks/useProductListing";
import heroBg from "@/assets/parts-bg.webp";

const Footer = lazy(() => import("@/components/Footer"));

const BackToTop = lazy(() => import("@/components/BackToTop"));

const whyOem = [
  { icon: ShieldCheck, title: "موثوقية المصنع", desc: "مطابقة 100% لمعايير تويوتا اليابان." },
  { icon: Clock, title: "عمر افتراضي أطول", desc: "مواد مصنّعة وفق أعلى معايير التحمل والجودة." },
  { icon: Cog, title: "أداء وتوافق كامل", desc: "تركيب مثالي لكل موديل دون أي تعديل." },
  { icon: Package, title: "توريد رسمي معتمد", desc: "قنوات توريد مباشرة من الموزع المعتمد." },
];

const models = ["كوستر", "هاي إس", "هاي لوكس", "لاند كروزر", "كورولا / راش / بيلتا"];

const logistics = [
  { icon: Package, text: "استمرارية مخزون" },
  { icon: MapPin, text: "تغطية مصر بالكامل" },
  { icon: Users, text: "دعم للشركات والهيئات" },
  { icon: FileText, text: "فواتير منظمة وأنظمة ERP" },
];

const GenuinePartsPage = () => {
  const listing = useProductListing({
    brandFilter: "toyota_genuine",
    queryKeySuffix: "genuine",
  });

  return (
    <div className="min-h-screen overflow-x-hidden">
      <SEOHead
        titleAr="قطع غيار تويوتا الأصلية في مصر — موزع معتمد"
        titleEn="Toyota Genuine Parts in Egypt — Authorized Distributor"
        descriptionAr="المصرية جروب موزع معتمد لقطع غيار تويوتا الأصلية في مصر. توريد عبر قنوات رسمية، تغطية وطنية، وتسليم خلال 48 ساعة عبر شبكة توزيع منظمة."
        descriptionEn="Al Masria Group is the authorized distributor for Toyota genuine parts in Egypt — official supply channels, nationwide coverage, and 48-hour delivery."
        keywordsAr="قطع غيار تويوتا الاصلية, موزع تويوتا معتمد, ضمان وكالة تويوتا, مصر"
        keywordsEn="Toyota genuine parts, authorized Toyota distributor, dealer warranty, Egypt"
        breadcrumbs={[
          { ar: "الرئيسية", en: "Home", url: "/" },
          { ar: "قطع غيار تويوتا الأصلية", en: "Toyota Genuine Parts", url: "/genuine-parts" },
        ]}
      />
      <Navbar />

      {/* ═══ 1. Hero ═══ */}
      <section className="relative min-h-[55vh] flex items-center justify-center overflow-hidden" style={{ backgroundImage: `url(${heroBg})`, backgroundSize: "cover", backgroundPosition: "center" }}>
        <div className="absolute inset-0 bg-black/45" aria-hidden="true" />
        <div className="relative z-10 container mx-auto px-6 py-24 text-center max-w-[760px]">
          <h1 className="text-2xl sm:text-3xl md:text-5xl font-black text-white leading-[1.4] mb-5">قطع غيار تويوتا الأصلية</h1>
          <p className="text-white/85 text-sm sm:text-base md:text-lg leading-[1.75] mb-8 max-w-[660px] mx-auto">
            نوفّر قطع غيار تويوتا الأصلية عبر قنوات توريد رسمية ووفق معايير المصنع (OEM)، مع تغطية وطنية وتسليم خلال 48&nbsp;ساعة.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" className="font-bold gap-2" asChild><Link to="/contact#quote">اطلب عرض سعر</Link></Button>
            <Button size="lg" variant="outline" className="font-bold gap-2 border-white/20 text-white bg-white/5 hover:bg-white/10" asChild>
              <a href="#genuine-products">تصفح المنتجات<ChevronLeft className="w-4 h-4" /></a>
            </Button>
          </div>
        </div>
      </section>

      {/* ═══ 2. لماذا القطع الأصلية؟ ═══ */}
      <section className="py-20 md:py-28 bg-background">
        <div className="container mx-auto px-4 max-w-5xl">
          <h2 className="text-3xl md:text-4xl font-black text-foreground text-center mb-4">لماذا تختار قطع تويوتا <span className="text-primary">الأصلية؟</span></h2>
          <p className="text-muted-foreground text-center max-w-[720px] mx-auto mb-12 leading-[1.7]">باعتبار المصرية جروب موزعًا معتمدًا لقطع الغيار الأصلية، نضمن حصولك على منتجات موثوقة مطابقة لمعايير تويوتا.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {whyOem.map((item) => (
              <div key={item.title} className="bg-card border border-border rounded-xl p-6 text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4"><item.icon className="w-6 h-6 text-primary" strokeWidth={1.8} /></div>
                <p className="font-bold text-foreground mb-1">{item.title}</p>
                <p className="text-muted-foreground text-sm leading-[1.7]">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* ═══ 3. تصفح المنتجات ═══ */}
      <ProductListingSection
        {...listing}
        dailyLimit={listing.DAILY_LIMIT}
        sectionId="genuine-products"
        sectionClassName="py-12 md:py-16 bg-background border-y border-border"
        sectionTitle={
          <>
            <h2 className="text-3xl md:text-4xl font-black text-foreground mb-3">تصفح قطع غيار تويوتا <span className="text-primary">الأصلية</span></h2>
            <div className="h-1 w-16 bg-primary mx-auto rounded-full" />
          </>
        }
      />

      {/* ═══ 4. التوافق والموديلات ═══ */}
      <section className="py-20 md:py-28 bg-muted/30">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="text-3xl md:text-4xl font-black text-foreground text-center mb-10">ملائمة لأشهر موديلات <span className="text-primary">تويوتا</span></h2>
          <div className="flex flex-wrap justify-center gap-3 mb-8">
            {models.map((m) => (<span key={m} className="px-5 py-2.5 bg-card border border-border rounded-full text-sm font-bold text-foreground">{m}</span>))}
          </div>
          <p className="text-muted-foreground text-center text-sm">نوفر دعمًا لموديلات إضافية حسب الطلب — <Link to="/contact" className="text-primary font-bold hover:underline">تواصل معنا</Link>.</p>
        </div>
      </section>

      {/* ═══ 5. اللوجستيات ═══ */}
      <section className="py-20 md:py-28 bg-background">
        <div className="container mx-auto px-4 max-w-5xl">
          <h2 className="text-3xl md:text-4xl font-black text-foreground text-center mb-4">توريد سريع و<span className="text-primary">تغطية وطنية</span></h2>
          <p className="text-muted-foreground text-center max-w-[720px] mx-auto mb-10 leading-[1.7]">نعتمد على مخازن مركزية وشبكة لوجستية منظمة تتيح تسليم الطلبات خلال 48&nbsp;ساعة على مستوى الجمهورية.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
            {logistics.map((l) => (
              <div key={l.text} className="bg-card border border-border rounded-xl p-5 flex items-center gap-4">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0"><l.icon className="w-5 h-5 text-primary" strokeWidth={1.8} /></div>
                <p className="text-sm font-bold text-foreground">{l.text}</p>
              </div>
            ))}
          </div>
          <div className="text-center"><Button className="font-bold gap-2" asChild><Link to="/contact">تواصل مع فريق المبيعات<ChevronLeft className="w-4 h-4" /></Link></Button></div>
        </div>
      </section>

      {/* ═══ 6. MTX Upsell ═══ */}
      <section className="py-20 md:py-28 bg-muted/30">
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <h2 className="text-3xl md:text-4xl font-black text-foreground mb-4">بدائل عالية الجودة عبر <span className="text-primary">MTX</span></h2>
          <p className="text-muted-foreground max-w-[720px] mx-auto mb-8 leading-[1.7]">نوفر أيضًا منتجات <Link to="/mtx" className="text-primary font-bold hover:underline">MTX</Link> بجودة تضاهي المواصفات الأصلية كخيار تكميلي لجميع فئات العملاء.</p>
          <Button variant="outline" className="font-bold gap-2" asChild><Link to="/mtx">تعرف على MTX<ChevronLeft className="w-4 h-4" /></Link></Button>
        </div>
      </section>

      {/* ═══ 7. CTA ═══ */}
      <section className="py-20 md:py-28 bg-secondary text-secondary-foreground">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <h2 className="text-3xl md:text-4xl font-black mb-6">اطلب قطع الغيار <span className="text-primary">الأصلية</span> الآن</h2>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            <Button size="lg" className="w-full sm:w-auto font-bold" asChild><Link to="/contact#quote">اطلب عرض سعر</Link></Button>
            <Button size="lg" variant="outline" className="w-full sm:w-auto font-bold border-secondary-foreground/30 text-secondary-foreground hover:bg-secondary-foreground/10" asChild><Link to="/contact">تواصل معنا</Link></Button>
          </div>
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            <Link to="/about" className="text-secondary-foreground/60 hover:text-primary transition-colors">من نحن</Link>
            <Link to="/mtx" className="text-secondary-foreground/60 hover:text-primary transition-colors">MTX</Link>
            <Link to="/what-sets-us-apart" className="text-secondary-foreground/60 hover:text-primary transition-colors">ما يميزنا</Link>
          </div>
        </div>
      </section>

      <Suspense fallback={null}><Footer /></Suspense>
      
      <Suspense fallback={null}><BackToTop /></Suspense>
    </div>
  );
};

export default GenuinePartsPage;
