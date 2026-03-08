import { lazy, Suspense } from "react";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";

const FeaturesStrip = lazy(() => import("@/components/FeaturesStrip"));
const AboutBrief = lazy(() => import("@/components/AboutBrief"));
const BrandsWeDistribute = lazy(() => import("@/components/BrandsWeDistribute"));
const WhyUsBrief = lazy(() => import("@/components/WhyUsBrief"));
const DistributionNetwork = lazy(() => import("@/components/DistributionNetwork"));
const TestimonialsHome = lazy(() => import("@/components/TestimonialsHome"));
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
 * Homepage Structure (Corporate-First):
 * ─────────────────────────────────────────────────
 * 1. Hero           → H1: المصرية جروب — موزع معتمد لقطع غيار تويوتا
 * 2. FeaturesStrip  → Trust numbers
 * 3. About Brief    → H2: من نحن (corporate intro)
 * 4. WhyUs Brief    → H2: ما يميزنا (differentiators + CTA)
 * 5. Distribution   → H2: شبكة التوزيع
 * 6. Brands         → H2: العلامات التي نوزعها
 * 7. Testimonials   → H2: آراء عملائنا
 * 8. Contact CTA    → H2: اتصل بنا
 * 9. Footer
 */
const Index = () => {
  return (
    <div className="min-h-screen">
      <Helmet>
        <title>المصرية جروب | موزع معتمد لقطع غيار تويوتا الأصلية والزيوت في مصر</title>
        <meta name="description" content="خبرة 25 عامًا في توزيع قطع غيار تويوتا الأصلية والزيوت، شبكة تضم أكثر من 2000 عميل وتسليم خلال 48 ساعة." />
        <link rel="canonical" href="https://almasriaautoparts.com/" />
      </Helmet>
      <Navbar />
      <HeroSection />
      <Suspense fallback={<SectionFallback />}><FeaturesStrip /></Suspense>
      <Suspense fallback={<SectionFallback />}><AboutBrief /></Suspense>
      <Suspense fallback={<SectionFallback />}><WhyUsBrief /></Suspense>
      <Suspense fallback={<SectionFallback />}><DistributionNetwork /></Suspense>
      <Suspense fallback={<SectionFallback />}><BrandsWeDistribute /></Suspense>
      <Suspense fallback={<SectionFallback />}><TestimonialsHome /></Suspense>
      <Suspense fallback={<SectionFallback />}><ContactSimple /></Suspense>
      <Suspense fallback={null}><Footer /></Suspense>
      <Suspense fallback={null}><WhatsAppFloat /></Suspense>
      <Suspense fallback={null}><BackToTop /></Suspense>
      <Suspense fallback={null}><AIChatBot /></Suspense>
    </div>
  );
};

export default Index;
