import { lazy, Suspense, memo } from "react";
import { Navigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import SEOHead from "@/components/SEOHead";
import { OrganizationSchema, WebSiteSchema, LocalBusinessSchema, FAQSchema } from "@/components/SEOSchemaMarkup";
import { useLazyVisible } from "@/hooks/useLazyVisible";

/* ── Above-the-fold: eager ── */
const AboutBrief = lazy(() => import("@/components/AboutBrief"));
const KeyMetrics = lazy(() => import("@/components/KeyMetrics"));

/* ── Below-the-fold: deferred until near viewport ── */
const ProductsShowcase = lazy(() => import("@/components/ProductsShowcase"));
const SectionDivider = lazy(() => import("@/components/SectionDivider"));
const FeaturedProducts = lazy(() => import("@/components/FeaturedProducts"));
const CarRecommendations = lazy(() => import("@/components/CarRecommendations"));
const MaintenanceBundles = lazy(() => import("@/components/MaintenanceBundles"));
const WhyChooseUs = lazy(() => import("@/components/WhyChooseUs"));
const WhoWeServe = lazy(() => import("@/components/WhoWeServe"));
const DistributionNetwork = lazy(() => import("@/components/DistributionNetwork"));
const MTXSection = lazy(() => import("@/components/MTXSection"));
const OurClientsSection = lazy(() => import("@/components/OurClientsSection"));
const MaintenanceTipsSection = lazy(() => import("@/components/MaintenanceTipsSection"));
const ContactSimple = lazy(() => import("@/components/ContactSimple"));
const Footer = lazy(() => import("@/components/Footer"));

const BackToTop = lazy(() => import("@/components/BackToTop"));
const CarProfilePopup = lazy(() => import("@/components/CarProfilePopup"));
const StickyHeroSearch = lazy(() => import("@/components/hero/StickyHeroSearch"));
const ExitIntentPopup = lazy(() => import("@/components/hero/ExitIntentPopup"));

const SectionFallback = () => (
  <div className="flex items-center justify-center py-20">
    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

/** Renders children only after the sentinel enters viewport (200px margin). */
const LazySection = memo(({ children, fallback = <SectionFallback /> }: { children: React.ReactNode; fallback?: React.ReactNode }) => {
  const [ref, visible] = useLazyVisible("300px");
  return (
    <div ref={ref}>
      {visible ? <Suspense fallback={fallback}>{children}</Suspense> : fallback}
    </div>
  );
});
LazySection.displayName = "LazySection";

const faqItemsAr = [
  { question: "هل جميع قطع الغيار أصلية؟", answer: "نعم، جميع قطع الغيار التي نوفرها أصلية ١٠٠٪ من تويوتا مباشرة. نحن موزع معتمد رسمي ونوفر ضمان وكالة على جميع المنتجات." },
  { question: "كيف أتحقق من أصالة القطعة؟", answer: "كل قطعة أصلية تحمل رقم تويوتا المرجعي وعلامة الهولوجرام. يمكنك التحقق عبر رقم الشاسيه أو التواصل معنا لتأكيد التوافق." },
  { question: "ما المطلوب من العميل لتحديد القطعة؟", answer: "يكفي توفير موديل السيارة وسنة الصنع ورقم الشاسيه. يمكنك أيضًا إرسال صورة للقطعة المطلوبة عبر واتساب لتسريع عملية التحديد." },
  { question: "ما هي مناطق التوصيل المتاحة؟", answer: "نوفر خدمة التوصيل لجميع محافظات مصر من خلال فروعنا المنتشرة في أنحاء الجمهورية. التوصيل يتم خلال ٢٤-٧٢ ساعة حسب المنطقة." },
  { question: "كيف أسجل كتاجر أو موزع؟", answer: "يمكنك التقديم من خلال صفحة تسجيل التجار على الموقع. ستحتاج لتقديم السجل التجاري والبطاقة الضريبية. يتم مراجعة الطلب خلال ٤٨ ساعة." },
  { question: "هل يوجد حد أدنى للطلب؟", answer: "الحد الأدنى يختلف حسب فئة العميل. للتجار والموزعين يوجد حد أدنى يتم تحديده عند فتح الحساب. للعملاء العاديين لا يوجد حد أدنى." },
  { question: "ما هي طرق الدفع المتاحة؟", answer: "نقبل الدفع نقدًا عند الاستلام، التحويل البنكي، وفودافون كاش. للتجار المعتمدين نوفر نظام ائتمان بحسب الاتفاق." },
  { question: "هل يمكن إرجاع أو استبدال المنتجات؟", answer: "نعم، نوفر سياسة إرجاع واستبدال خلال ١٤ يوم من تاريخ الشراء بشرط أن يكون المنتج في حالته الأصلية مع الفاتورة." },
];

const faqItemsEn = [
  { question: "Are all parts genuine?", answer: "Yes — every part we sell is 100% genuine Toyota. We are an authorized distributor and offer dealer warranty on all products." },
  { question: "How do I verify part authenticity?", answer: "Each genuine part carries a Toyota reference number and a hologram seal. You can verify via the chassis (VIN) number or contact us to confirm compatibility." },
  { question: "What information do I need to identify a part?", answer: "Provide your car model, year, and VIN. You can also send a photo of the required part via WhatsApp for faster identification." },
  { question: "What are the available delivery areas?", answer: "We deliver to all governorates of Egypt through our nationwide branch network. Delivery typically takes 24–72 hours depending on the area." },
  { question: "How can I register as a dealer or distributor?", answer: "Apply through the Dealer Registration page. You'll need to submit your commercial register and tax card. Applications are reviewed within 48 hours." },
  { question: "Is there a minimum order value?", answer: "The minimum varies by customer tier. Dealers and distributors have a minimum agreed at account opening. Retail customers have no minimum." },
  { question: "What payment methods are available?", answer: "We accept cash on delivery, bank transfer, and Vodafone Cash. Approved dealers have a credit facility based on agreement." },
  { question: "Can I return or exchange products?", answer: "Yes — we offer a 14-day return and exchange policy provided the product is in original condition with the invoice." },
];

const Index = () => {
  const { dealerAccount, isAdmin, isModerator, loading } = useAuth();
  const { isAr } = useLanguage();
  const isDealer = !!dealerAccount && !isModerator;
  const savedRole = typeof window !== "undefined" ? localStorage.getItem("almasria_last_role") : null;

  // Moderator-only employees should never see the B2C homepage
  if (!loading && isModerator && !isAdmin && !isDealer) {
    return <Navigate to="/admin" replace />;
  }

  // Dual-role users (admin + dealer): respect their saved choice; otherwise stay on homepage
  // so the role-selection dialog can be shown without instantly redirecting.
  if (!loading && isDealer && isAdmin) {
    if (savedRole === "dealer") return <Navigate to="/dealer" replace />;
    if (savedRole === "admin") return <Navigate to="/admin" replace />;
    // No saved role → render homepage; RoleSelectionDialog (in AuthProvider) handles the choice.
  } else if (!loading && isDealer) {
    // Pure dealer (no admin role) → always go to dealer dashboard
    return <Navigate to="/dealer" replace />;
  }

  return (
    <div className="min-h-screen">
      <SEOHead
        titleAr="موزع معتمد لقطع غيار وزيوت تويوتا الأصلية في مصر"
        titleEn="Authorized Toyota Genuine Parts & Oils Distributor in Egypt"
        descriptionAr="منذ 1999 نقدم توزيعًا مؤسسيًا لقطع غيار وزيوت تويوتا الأصلية عبر شبكة تغطي مصر، تسليم خلال 48 ساعة، وعلامتنا MTX بجودة تضاهي المواصفات الأصلية."
        descriptionEn="Since 1999, Al Masria Group delivers Toyota genuine parts & oils across Egypt within 48 hours — plus our MTX brand engineered to OEM-grade quality."
        keywordsAr="قطع غيار تويوتا, زيوت تويوتا, موزع تويوتا مصر, MTX, قطع غيار اصلية, تويوتا"
        keywordsEn="Toyota parts Egypt, Toyota genuine parts, Toyota oil, MTX aftermarket, auto parts Egypt"
      />
      <OrganizationSchema />
      <WebSiteSchema />
      <LocalBusinessSchema />
      <FAQSchema items={isAr ? faqItemsAr : faqItemsEn} />
      <Navbar />
      <HeroSection />

      {/* Above-the-fold sections — load immediately */}
      <Suspense fallback={<SectionFallback />}><AboutBrief /></Suspense>
      <Suspense fallback={<SectionFallback />}><KeyMetrics /></Suspense>

      {/* Below-the-fold — only load when scrolled near */}
      <LazySection><ProductsShowcase /></LazySection>
      <LazySection fallback={null}><SectionDivider variant="light" /></LazySection>
      <LazySection><FeaturedProducts /></LazySection>
      <LazySection fallback={null}><CarRecommendations /></LazySection>
      <LazySection><MaintenanceBundles /></LazySection>
      <LazySection><WhyChooseUs /></LazySection>
      <LazySection fallback={null}><SectionDivider variant="light" /></LazySection>
      <LazySection><WhoWeServe /></LazySection>
      <LazySection><DistributionNetwork /></LazySection>
      <LazySection><MTXSection /></LazySection>
      <LazySection><OurClientsSection /></LazySection>
      <LazySection><MaintenanceTipsSection /></LazySection>
      <LazySection><ContactSimple /></LazySection>
      <LazySection fallback={null}><Footer /></LazySection>
      
      <Suspense fallback={null}><BackToTop /></Suspense>
      <Suspense fallback={null}><CarProfilePopup /></Suspense>
    </div>
  );
};

export default Index;
