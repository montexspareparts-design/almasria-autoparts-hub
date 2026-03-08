import { lazy, Suspense } from "react";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import { OrganizationSchema, WebSiteSchema, LocalBusinessSchema, FAQSchema } from "@/components/SEOSchemaMarkup";

const AboutBrief = lazy(() => import("@/components/AboutBrief"));
const WhoWeServe = lazy(() => import("@/components/WhoWeServe"));
const KeyMetrics = lazy(() => import("@/components/KeyMetrics"));
const DistributionSegments = lazy(() => import("@/components/DistributionSegments"));
const DistributionNetwork = lazy(() => import("@/components/DistributionNetwork"));
const MTXSection = lazy(() => import("@/components/MTXSection"));
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

/**
 * Homepage Structure (Corporate Distribution Platform):
 * ─────────────────────────────────────────────────
 * 1. Hero              → H1 الوحيد بالصفحة
 * 2. من نحن            → H2: نبذة مؤسسية + أرقام سريعة
 * 3. من نخدم           → H2: شرائح العملاء الثلاث
 * 4. قطاعات التوزيع    → H2: 3 خطوط رئيسية
 * 5. الانتشار والفروع  → H2: مواقع + شحن
 * 6. MTX               → H2: علامتنا الخاصة
 * 7. CTA ختامي         → ابدأ شراكتك
 * 8. Footer
 */
const Index = () => {
  return (
    <div className="min-h-screen">
      <Helmet>
        <title>المصرية جروب | موزع معتمد لقطع غيار وزيوت تويوتا الأصلية في مصر</title>
        <meta name="description" content="منذ 1999 نقدم توزيعًا مؤسسيًا لقطع غيار وزيوت تويوتا الأصلية عبر شبكة تغطي مصر، تسليم خلال 48 ساعة، وعلامتنا MTX بجودة تضاهي المواصفات الأصلية." />
        <link rel="canonical" href="https://almasriaautoparts.com/" />
      </Helmet>
      <Navbar />
      <HeroSection />
      <Suspense fallback={<SectionFallback />}><AboutBrief /></Suspense>
      <Suspense fallback={<SectionFallback />}><KeyMetrics /></Suspense>
      <Suspense fallback={<SectionFallback />}><WhoWeServe /></Suspense>
      <Suspense fallback={<SectionFallback />}><DistributionSegments /></Suspense>
      <Suspense fallback={<SectionFallback />}><DistributionNetwork /></Suspense>
      <Suspense fallback={<SectionFallback />}><MTXSection /></Suspense>
      <Suspense fallback={<SectionFallback />}><ContactSimple /></Suspense>
      <Suspense fallback={null}><Footer /></Suspense>
      <Suspense fallback={null}><WhatsAppFloat /></Suspense>
      <Suspense fallback={null}><BackToTop /></Suspense>
      <Suspense fallback={null}><AIChatBot /></Suspense>
    </div>
  );
};

export default Index;
