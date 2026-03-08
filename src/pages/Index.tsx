import { lazy, Suspense } from "react";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";

const FeaturesStrip = lazy(() => import("@/components/FeaturesStrip"));
const AboutBrief = lazy(() => import("@/components/AboutBrief"));
const BrandsWeDistribute = lazy(() => import("@/components/BrandsWeDistribute"));
const MTXSection = lazy(() => import("@/components/MTXSection"));
const WhyUsBrief = lazy(() => import("@/components/WhyUsBrief"));
const DistributionNetwork = lazy(() => import("@/components/DistributionNetwork"));
const AccreditationsSection = lazy(() => import("@/components/AccreditationsSection"));
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
 * Homepage Structure (SEO + Conversion Optimized):
 * ─────────────────────────────────────────────────
 * 1. Hero           → H1: المصرية جروب — موزع معتمد لقطع غيار تويوتا
 * 2. FeaturesStrip  → Trust numbers
 * 3. About Brief    → H2: من نحن (40-60 word summary)
 * 4. Brands         → H2: العلامات التي نوزعها (3 brands)
 * 5. WhyUs Brief    → H2: ما يميزنا (short version + CTA)
 * 6. Distribution   → H2: شبكة التوزيع
 * 7. MTX Section    → H2: علامتنا الخاصة MTX
 * 8. Accreditations → H2: الاعتمادات
 * 9. Contact CTA    → H2: اتصل بنا
 * 10. Footer
 */
const Index = () => {
  return (
    <div className="min-h-screen">
      <Navbar />
      <HeroSection />
      <Suspense fallback={<SectionFallback />}><FeaturesStrip /></Suspense>
      <Suspense fallback={<SectionFallback />}><AboutBrief /></Suspense>
      <Suspense fallback={<SectionFallback />}><BrandsWeDistribute /></Suspense>
      <Suspense fallback={<SectionFallback />}><WhyUsBrief /></Suspense>
      <Suspense fallback={<SectionFallback />}><DistributionNetwork /></Suspense>
      <Suspense fallback={<SectionFallback />}><MTXSection /></Suspense>
      <Suspense fallback={<SectionFallback />}><AccreditationsSection /></Suspense>
      <Suspense fallback={<SectionFallback />}><ContactSimple /></Suspense>
      <Suspense fallback={null}><Footer /></Suspense>
      <Suspense fallback={null}><WhatsAppFloat /></Suspense>
      <Suspense fallback={null}><BackToTop /></Suspense>
      <Suspense fallback={null}><AIChatBot /></Suspense>
    </div>
  );
};

export default Index;
