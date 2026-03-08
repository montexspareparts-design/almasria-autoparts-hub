import { lazy, Suspense } from "react";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";

// Lazy load below-fold sections
const FeaturesStrip = lazy(() => import("@/components/FeaturesStrip"));
const BrandsWeDistribute = lazy(() => import("@/components/BrandsWeDistribute"));
const WhyUsBrief = lazy(() => import("@/components/WhyUsBrief"));
const DistributionNetwork = lazy(() => import("@/components/DistributionNetwork"));
const MTXSection = lazy(() => import("@/components/MTXSection"));
const AccreditationsSection = lazy(() => import("@/components/AccreditationsSection"));
const ContactSimple = lazy(() => import("@/components/ContactSimple"));
const Footer = lazy(() => import("@/components/Footer"));
const WhatsAppFloat = lazy(() => import("@/components/WhatsAppFloat"));
const BackToTop = lazy(() => import("@/components/BackToTop"));

const SectionFallback = () => (
  <div className="flex items-center justify-center py-20">
    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

const Index = () => {
  return (
    <div className="min-h-screen">
      <Navbar />
      <HeroSection />
      <Suspense fallback={<SectionFallback />}>
        <FeaturesStrip />
      </Suspense>
      <Suspense fallback={<SectionFallback />}>
        <BrandsWeDistribute />
      </Suspense>
      <Suspense fallback={<SectionFallback />}>
        <WhyUsBrief />
      </Suspense>
      <Suspense fallback={<SectionFallback />}>
        <DistributionNetwork />
      </Suspense>
      <Suspense fallback={<SectionFallback />}>
        <MTXSection />
      </Suspense>
      <Suspense fallback={<SectionFallback />}>
        <AccreditationsSection />
      </Suspense>
      <Suspense fallback={<SectionFallback />}>
        <ContactSimple />
      </Suspense>
      <Suspense fallback={null}>
        <Footer />
      </Suspense>
      <Suspense fallback={null}>
        <WhatsAppFloat />
      </Suspense>
      <Suspense fallback={null}>
        <BackToTop />
      </Suspense>
    </div>
  );
};

export default Index;
