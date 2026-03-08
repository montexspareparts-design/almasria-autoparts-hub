import { lazy, Suspense } from "react";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";

// Lazy load below-fold sections for performance
const FeaturesStrip = lazy(() => import("@/components/FeaturesStrip"));
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
 * Homepage Structure (Conversion-Optimized Flow):
 * ─────────────────────────────────────────────────
 * 1. Hero          → H1: Value proposition + primary CTA
 * 2. FeaturesStrip → Trust numbers strip (social proof)
 * 3. Brands        → H2: What we distribute (products)
 * 4. MTX           → H2: Our own brand (product depth)
 * 5. WhyUs         → H2: Why choose us (differentiation)
 * 6. Distribution  → H2: Coverage network (logistics proof)
 * 7. Accreditations→ H2: Awards & trust signals
 * 8. Contact       → H2: Final CTA (conversion)
 * 9. Footer        → Navigation & info
 */
const Index = () => {
  return (
    <div className="min-h-screen">
      <Navbar />

      {/* 1. Hero — H1: Primary value proposition */}
      <HeroSection />

      {/* 2. Trust numbers strip — Quick social proof */}
      <Suspense fallback={<SectionFallback />}>
        <FeaturesStrip />
      </Suspense>

      {/* 3. Brands — H2: Product catalog entry point */}
      <Suspense fallback={<SectionFallback />}>
        <BrandsWeDistribute />
      </Suspense>

      {/* 4. MTX — H2: Our private label (product depth) */}
      <Suspense fallback={<SectionFallback />}>
        <MTXSection />
      </Suspense>

      {/* 5. Why Us — H2: Competitive differentiation */}
      <Suspense fallback={<SectionFallback />}>
        <WhyUsBrief />
      </Suspense>

      {/* 6. Distribution — H2: Logistics & coverage */}
      <Suspense fallback={<SectionFallback />}>
        <DistributionNetwork />
      </Suspense>

      {/* 7. Awards — H2: Trust & accreditations */}
      <Suspense fallback={<SectionFallback />}>
        <AccreditationsSection />
      </Suspense>

      {/* 8. Contact — H2: Final conversion CTA */}
      <Suspense fallback={<SectionFallback />}>
        <ContactSimple />
      </Suspense>

      {/* Footer & floating elements */}
      <Suspense fallback={null}>
        <Footer />
      </Suspense>
      <Suspense fallback={null}>
        <WhatsAppFloat />
      </Suspense>
      <Suspense fallback={null}>
        <BackToTop />
      </Suspense>
      <Suspense fallback={null}>
        <AIChatBot />
      </Suspense>
    </div>
  );
};

export default Index;
