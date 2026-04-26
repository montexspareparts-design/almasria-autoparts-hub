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

const faqItems = [
  { question: "هل جميع قطع الغيار أصلية؟", answer: "نعم، جميع قطع الغيار التي نوفرها أصلية ١٠٠٪ من تويوتا مباشرة. نحن موزع معتمد رسمي ونوفر ضمان وكالة على جميع المنتجات." },
  { question: "كيف أتحقق من أصالة القطعة؟", answer: "كل قطعة أصلية تحمل رقم تويوتا المرجعي وعلامة الهولوجرام. يمكنك التحقق عبر رقم الشاسيه أو التواصل معنا لتأكيد التوافق." },
  { question: "ما المطلوب من العميل لتحديد القطعة؟", answer: "يكفي توفير موديل السيارة وسنة الصنع ورقم الشاسيه. يمكنك أيضًا إرسال صورة للقطعة المطلوبة عبر واتساب لتسريع عملية التحديد." },
  { question: "ما هي مناطق التوصيل المتاحة؟", answer: "نوفر خدمة التوصيل لجميع محافظات مصر من خلال فروعنا المنتشرة في أنحاء الجمهورية. التوصيل يتم خلال ٢٤-٧٢ ساعة حسب المنطقة." },
  { question: "كيف أسجل كتاجر أو موزع؟", answer: "يمكنك التقديم من خلال صفحة تسجيل التجار على الموقع. ستحتاج لتقديم السجل التجاري والبطاقة الضريبية. يتم مراجعة الطلب خلال ٤٨ ساعة." },
  { question: "هل يوجد حد أدنى للطلب؟", answer: "الحد الأدنى يختلف حسب فئة العميل. للتجار والموزعين يوجد حد أدنى يتم تحديده عند فتح الحساب. للعملاء العاديين لا يوجد حد أدنى." },
  { question: "ما هي طرق الدفع المتاحة؟", answer: "نقبل الدفع نقدًا عند الاستلام، التحويل البنكي، وفودافون كاش. للتجار المعتمدين نوفر نظام ائتمان بحسب الاتفاق." },
  { question: "هل يمكن إرجاع أو استبدال المنتجات؟", answer: "نعم، نوفر سياسة إرجاع واستبدال خلال ١٤ يوم من تاريخ الشراء بشرط أن يكون المنتج في حالته الأصلية مع الفاتورة." },
];

const Index = () => {
  const { dealerAccount, isAdmin, isModerator, loading } = useAuth();
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
      <Helmet>
        <title>المصرية جروب | موزع معتمد لقطع غيار وزيوت تويوتا الأصلية في مصر</title>
        <meta name="description" content="منذ 1999 نقدم توزيعًا مؤسسيًا لقطع غيار وزيوت تويوتا الأصلية عبر شبكة تغطي مصر، تسليم خلال 48 ساعة، وعلامتنا MTX بجودة تضاهي المواصفات الأصلية." />
        <link rel="canonical" href="https://www.almasriaautoparts.com/" />
      </Helmet>
      <OrganizationSchema />
      <WebSiteSchema />
      <LocalBusinessSchema />
      <FAQSchema items={faqItems} />
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
