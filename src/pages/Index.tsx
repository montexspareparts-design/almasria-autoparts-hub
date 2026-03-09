import { lazy, Suspense } from "react";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import { OrganizationSchema, WebSiteSchema, LocalBusinessSchema, FAQSchema } from "@/components/SEOSchemaMarkup";

const AboutBrief = lazy(() => import("@/components/AboutBrief"));
const FeaturedProducts = lazy(() => import("@/components/FeaturedProducts"));
const WhyChooseUs = lazy(() => import("@/components/WhyChooseUs"));
const WhoWeServe = lazy(() => import("@/components/WhoWeServe"));
const KeyMetrics = lazy(() => import("@/components/KeyMetrics"));
const ProductsShowcase = lazy(() => import("@/components/ProductsShowcase"));
const SectionDivider = lazy(() => import("@/components/SectionDivider"));

const DistributionNetwork = lazy(() => import("@/components/DistributionNetwork"));
const MTXSection = lazy(() => import("@/components/MTXSection"));
const OurClientsSection = lazy(() => import("@/components/OurClientsSection"));
const ContactSimple = lazy(() => import("@/components/ContactSimple"));
const Footer = lazy(() => import("@/components/Footer"));
const WhatsAppFloat = lazy(() => import("@/components/WhatsAppFloat"));
const BackToTop = lazy(() => import("@/components/BackToTop"));
const AIChatBot = lazy(() => import("@/components/AIChatBot"));

const SectionFallback = () => (
  <div className="flex items-center justify-center py-20">
    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

const Index = () => {
  return (
    <div className="min-h-screen">
      <Helmet>
        <title>المصرية جروب | موزع معتمد لقطع غيار وزيوت تويوتا الأصلية في مصر</title>
        <meta name="description" content="منذ 1999 نقدم توزيعًا مؤسسيًا لقطع غيار وزيوت تويوتا الأصلية عبر شبكة تغطي مصر، تسليم خلال 48 ساعة، وعلامتنا MTX بجودة تضاهي المواصفات الأصلية." />
        <link rel="canonical" href="https://almasriaautoparts.com/" />
      </Helmet>
      <OrganizationSchema />
      <WebSiteSchema />
      <LocalBusinessSchema />
      <FAQSchema items={[
        { question: "هل جميع قطع الغيار أصلية؟", answer: "نعم، جميع قطع الغيار التي نوفرها أصلية ١٠٠٪ من تويوتا مباشرة. نحن موزع معتمد رسمي ونوفر ضمان وكالة على جميع المنتجات." },
        { question: "كيف أتحقق من أصالة القطعة؟", answer: "كل قطعة أصلية تحمل رقم تويوتا المرجعي وعلامة الهولوجرام. يمكنك التحقق عبر رقم الشاسيه أو التواصل معنا لتأكيد التوافق." },
        { question: "ما المطلوب من العميل لتحديد القطعة؟", answer: "يكفي توفير موديل السيارة وسنة الصنع ورقم الشاسيه. يمكنك أيضًا إرسال صورة للقطعة المطلوبة عبر واتساب لتسريع عملية التحديد." },
        { question: "ما هي مناطق التوصيل المتاحة؟", answer: "نوفر خدمة التوصيل لجميع محافظات مصر من خلال فروعنا المنتشرة في أنحاء الجمهورية. التوصيل يتم خلال ٢٤-٧٢ ساعة حسب المنطقة." },
        { question: "كيف أسجل كتاجر أو موزع؟", answer: "يمكنك التقديم من خلال صفحة تسجيل التجار على الموقع. ستحتاج لتقديم السجل التجاري والبطاقة الضريبية. يتم مراجعة الطلب خلال ٤٨ ساعة." },
        { question: "هل يوجد حد أدنى للطلب؟", answer: "الحد الأدنى يختلف حسب فئة العميل. للتجار والموزعين يوجد حد أدنى يتم تحديده عند فتح الحساب. للعملاء العاديين لا يوجد حد أدنى." },
        { question: "ما هي طرق الدفع المتاحة؟", answer: "نقبل الدفع نقدًا عند الاستلام، التحويل البنكي، وفودافون كاش. للتجار المعتمدين نوفر نظام ائتمان بحسب الاتفاق." },
        { question: "هل يمكن إرجاع أو استبدال المنتجات؟", answer: "نعم، نوفر سياسة إرجاع واستبدال خلال ١٤ يوم من تاريخ الشراء بشرط أن يكون المنتج في حالته الأصلية مع الفاتورة." },
      ]} />
      <Navbar />
      <HeroSection />

      {/* About — dark section */}
      <Suspense fallback={<SectionFallback />}><AboutBrief /></Suspense>

      {/* Metrics — light with gear divider */}
      <Suspense fallback={<SectionFallback />}><KeyMetrics /></Suspense>

      {/* Products Showcase — dark brands grid */}
      <Suspense fallback={<SectionFallback />}><ProductsShowcase /></Suspense>

      {/* Gear divider */}
      <Suspense fallback={null}><SectionDivider variant="light" /></Suspense>

      {/* Featured Products */}
      <Suspense fallback={<SectionFallback />}><FeaturedProducts /></Suspense>

      {/* Why Choose Us — light bg */}
      <Suspense fallback={<SectionFallback />}><WhyChooseUs /></Suspense>

      {/* Gear divider */}
      <Suspense fallback={null}><SectionDivider variant="light" /></Suspense>

      {/* Who We Serve */}
      <Suspense fallback={<SectionFallback />}><WhoWeServe /></Suspense>

      {/* Distribution — dark section */}
      <Suspense fallback={<SectionFallback />}><DistributionNetwork /></Suspense>

      {/* MTX — light bg */}
      <Suspense fallback={<SectionFallback />}><MTXSection /></Suspense>

      {/* Contact CTA — dark section */}
      <Suspense fallback={<SectionFallback />}><ContactSimple /></Suspense>

      <Suspense fallback={null}><Footer /></Suspense>
      <Suspense fallback={null}><WhatsAppFloat /></Suspense>
      <Suspense fallback={null}><BackToTop /></Suspense>
      <Suspense fallback={null}><AIChatBot /></Suspense>
    </div>
  );
};

export default Index;
