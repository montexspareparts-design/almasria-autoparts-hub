import { useEffect, useRef, useState, lazy, Suspense } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { Package, ChevronLeft, ShieldCheck } from "lucide-react";
import { BreadcrumbSchema } from "@/components/SEOSchemaMarkup";
import AutoPartsBackground from "@/components/AutoPartsBackground";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import BrandHeroBanner from "@/components/BrandHeroBanner";
import ProductListingSection from "@/components/ProductListingSection";
import { useProductListing } from "@/hooks/useProductListing";
import { usePersonalization } from "@/hooks/usePersonalization";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import CategoryBrowseSlider from "@/components/CategoryBrowseSlider";

// Lazy load heavy below-fold components
const Footer = lazy(() => import("@/components/Footer"));
const TrendingProducts = lazy(() => import("@/components/TrendingProducts"));
const CarRecommendations = lazy(() => import("@/components/CarRecommendations"));
const PersonalizedProducts = lazy(() => import("@/components/PersonalizedProducts"));
const DealerVehicleRecommendations = lazy(() => import("@/components/dealer/DealerVehicleRecommendations"));

import brandGenuineParts from "@/assets/brand-genuine-parts.webp";
import brandToyotaOil from "@/assets/brand-toyota-oil.webp";
import brandMtx from "@/assets/brand-mtx.webp";
import brandDenso from "@/assets/brand-denso.webp";
import brandAisin from "@/assets/brand-aisin.webp";
import brandFbkBrakes from "@/assets/brand-fbk-logo.webp";
import oilBg from "@/assets/oil-hero-bg.webp";

const brandConfig: Record<string, { title: string; subtitle: string; description: string; badge: string; brandKey: string; logo: string; backgroundImage?: string; logoScale?: number }> = {
  "toyota-genuine": {
    title: "قطع غيار تويوتا الأصلية", subtitle: "Toyota Genuine Parts",
    description: "قطع غيار أصلية 100% من تويوتا اليابان. نحن موزع معتمد رسمي لجميع أنواع قطع غيار تويوتا الأصلية في مصر.",
    badge: "موزع معتمد رسمي", brandKey: "toyota_genuine", logo: brandGenuineParts, logoScale: 250,
  },
  "toyota-oils": {
    title: "زيوت تويوتا الأصلية", subtitle: "Toyota Genuine Motor Oil",
    description: "زيوت تويوتا الأصلية بجميع درجات اللزوجة. زيوت المحرك، زيوت الفتيس، سوائل الفرامل، وجميع سوائل تويوتا الأصلية.",
    badge: "موزع معتمد رسمي", brandKey: "toyota_oils", logo: brandToyotaOil, backgroundImage: oilBg, logoScale: 350,
  },
  "mtx-aftermarket": {
    title: "MTX Aftermarket", subtitle: "قطع غيار مستوردة بأعلى جودة",
    description: "MTX هي علامتنا التجارية المسجلة لقطع الغيار المستوردة عالية الجودة بأفضل الأسعار.",
    badge: "علامة تجارية مسجلة", brandKey: "mtx_aftermarket", logo: brandMtx,
  },
  "fbk-brakes": {
    title: "تيل فرامل", subtitle: "FBK Brake Pads",
    description: "تشكيلة كبيرة من تيل فرامل عالية الجودة لجميع موديلات تويوتا تضمن أداء ممتاز وعمر افتراضي أطول.",
    badge: "جودة ماليزية", brandKey: "fbk", logo: brandFbkBrakes, logoScale: 350,
  },
  "denso": {
    title: "DENSO", subtitle: "قطع غيار دينسو اليابانية",
    description: "قطع غيار دينسو الأصلية - الشركة اليابانية الرائدة في تصنيع مكونات السيارات عالية الجودة.",
    badge: "وكيل معتمد", brandKey: "denso", logo: brandDenso,
  },
  "aisin": {
    title: "AISIN", subtitle: "قطع غيار أيسن اليابانية",
    description: "قطع غيار أيسن الأصلية - من أكبر مصنعي قطع غيار السيارات في العالم، جودة يابانية معتمدة.",
    badge: "وكيل معتمد", brandKey: "aisin", logo: brandAisin,
  },
};

const allBrands = [
  { label: "قطع غيار تويوتا الأصلية", labelEn: "Toyota Genuine Parts", image: brandGenuineParts, to: "/products/toyota-genuine", scale: "scale-125" },
  { label: "زيوت تويوتا الأصلية", labelEn: "Toyota Genuine Lubricants", image: brandToyotaOil, to: "/products/toyota-oils", scale: "scale-150" },
  { label: "MTX Aftermarket", labelEn: "MTX Aftermarket", image: brandMtx, to: "/products/mtx-aftermarket", scale: "scale-150" },
  { label: "DENSO", labelEn: "DENSO", image: brandDenso, to: "/products/denso", scale: "scale-125" },
  { label: "AISIN", labelEn: "AISIN", image: brandAisin, to: "/products/aisin", scale: "scale-125" },
  { label: "تيل فرامل", labelEn: "FBK Brake Pads", image: brandFbkBrakes, to: "/products/fbk-brakes", scale: "scale-150" },
];

const ProductsPage = () => {
  const { brand } = useParams<{ brand: string }>();
  const [searchParams] = useSearchParams();
  const productsRef = useRef<HTMLDivElement>(null);
  const config = brand ? brandConfig[brand] : null;
  const { trackBrand, trackCategory, trackSearch } = usePersonalization();
  const { user, isDealer, dealerAccount } = useAuth();
  const [vehicleTypes, setVehicleTypes] = useState<string[]>([]);

  // Fetch dealer vehicle types
  useEffect(() => {
    if (isDealer && dealerAccount?.vehicle_types) {
      setVehicleTypes(dealerAccount.vehicle_types);
    }
  }, [isDealer, dealerAccount]);

  const listing = useProductListing({
    brandFilter: config?.brandKey,
    queryKeySuffix: brand,
  });

  // Auto-scroll to products when coming from category slider
  useEffect(() => {
    if (searchParams.get("search") && productsRef.current) {
      setTimeout(() => {
        productsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 500);
    }
  }, [searchParams]);

  // Track personalization
  useEffect(() => { if (config?.brandKey) trackBrand(config.brandKey); }, [config?.brandKey, trackBrand]);
  useEffect(() => {
    if (listing.filters.search) {
      const timer = setTimeout(() => trackSearch(listing.filters.search), 1000);
      return () => clearTimeout(timer);
    }
  }, [listing.filters.search, trackSearch]);
  useEffect(() => { if (listing.filters.categoryId) trackCategory(listing.filters.categoryId); }, [listing.filters.categoryId, trackCategory]);

  // Brand showcase page (no specific brand selected AND no category filter)
  const hasCategoryFilter = searchParams.has("category");
  if (!config && !hasCategoryFilter) {
    return (
      <div className="min-h-screen bg-dark-section">
        <SEOHead
          titleAr="منتجاتنا — قطع غيار وزيوت تويوتا الأصلية"
          titleEn="Our Products — Toyota Genuine Parts & Oils"
          descriptionAr="تصفح كتالوج المصرية جروب: قطع غيار تويوتا الأصلية، زيوت تويوتا، MTX Aftermarket، DENSO، وAISIN. أكثر من 960 صنف متاح."
          descriptionEn="Browse Al Masria Group catalog: Toyota genuine parts, oils, MTX Aftermarket, DENSO, and AISIN — 960+ items in stock."
          keywordsAr="منتجات تويوتا, قطع غيار اصلية, زيوت تويوتا, MTX, DENSO, AISIN"
          keywordsEn="Toyota products, genuine parts, Toyota oil, MTX, DENSO, AISIN"
          breadcrumbs={[
            { ar: "الرئيسية", en: "Home", url: "/" },
            { ar: "المنتجات", en: "Products", url: "/products" },
          ]}
        />
        <Navbar />
        <section className="min-h-screen pt-24 pb-20 relative overflow-hidden flex flex-col">
          <div className="absolute inset-0">
            <AutoPartsBackground count={22} />
            <motion.div className="absolute top-20 right-[5%] w-[600px] h-[600px] rounded-full bg-primary/[0.05] blur-[180px]" animate={{ scale: [1, 1.3, 1], x: [0, 40, 0] }} transition={{ duration: 10, repeat: Infinity }} />
            <motion.div className="absolute bottom-20 left-[5%] w-[400px] h-[400px] rounded-full bg-[hsl(var(--gold-accent))]/[0.04] blur-[140px]" animate={{ scale: [1.2, 1, 1.2] }} transition={{ duration: 12, repeat: Infinity }} />
          </div>
          <div className="container mx-auto px-4 relative z-10 flex-1 flex flex-col justify-center">
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} className="text-center mb-8 md:mb-16">
              <motion.span initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }} className="inline-flex items-center gap-2 px-4 md:px-5 py-1.5 md:py-2 rounded-full bg-primary/12 border border-primary/20 text-primary text-xs md:text-sm font-bold mb-4 md:mb-6 backdrop-blur-sm">
                <Package className="w-3.5 h-3.5 md:w-4 md:h-4" />5 علامات تجارية معتمدة
              </motion.span>
              <h1 className="text-3xl md:text-5xl lg:text-7xl font-black text-[hsl(var(--section-dark-foreground))] mb-3 md:mb-5 tracking-tight leading-[1.1]">
                اكتشف <span className="shimmer-text">منتجاتنا</span>
              </h1>
              <p className="text-[hsl(var(--section-dark-foreground))]/50 text-sm md:text-lg max-w-xl mx-auto leading-relaxed">اختر العلامة التجارية وتصفح جميع المنتجات المتاحة</p>
              <motion.div initial={{ width: 0 }} animate={{ width: "6rem" }} transition={{ duration: 1, delay: 0.5 }} className="h-1 bg-gradient-to-l from-primary to-[hsl(var(--gold-accent))] mx-auto rounded-full mt-4 md:mt-6" />
            </motion.div>

            <div className="max-w-5xl mx-auto w-full">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
                {allBrands.slice(0, 3).map((b, i) => (
                  <motion.div key={b.to} initial={{ opacity: 0, y: 50, rotateX: -10 }} animate={{ opacity: 1, y: 0, rotateX: 0 }} transition={{ delay: 0.3 + i * 0.12, type: "spring", stiffness: 70 }}>
                    <Link to={b.to} className="group block relative rounded-2xl overflow-hidden transition-all duration-500 hover:-translate-y-3">
                      <div className="bg-[hsl(var(--section-dark-foreground))]/[0.06] backdrop-blur-md border border-[hsl(var(--section-dark-foreground))]/10 hover:border-primary/40 rounded-2xl overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-primary/20">
                        <motion.div className="h-1 bg-gradient-to-r from-primary via-[hsl(var(--gold-accent))] to-primary" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 0.6 + i * 0.15, duration: 0.8 }} />
                        <div className="bg-white/95 mx-4 mt-4 rounded-xl p-6 flex items-center justify-center aspect-[3/2] relative overflow-hidden group-hover:shadow-lg transition-shadow duration-500">
                          <div className="absolute inset-0 bg-gradient-to-br from-primary/0 to-primary/0 group-hover:from-primary/5 group-hover:to-primary/8 transition-all duration-500" />
                          <motion.div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                          <motion.img src={b.image} alt={b.label} className={`relative z-10 max-h-20 w-auto object-contain ${b.scale}`} whileHover={{ scale: 1.08 }} transition={{ duration: 0.3 }} />
                        </div>
                        <div className="p-5 text-center">
                          <h3 className="font-bold text-[hsl(var(--section-dark-foreground))] text-base mb-1">{b.label}</h3>
                          <p className="text-xs text-[hsl(var(--section-dark-foreground))]/40 mb-3">{b.labelEn}</p>
                          <span className="inline-flex items-center gap-1.5 text-primary text-sm font-semibold group-hover:gap-3 transition-all duration-300">
                            تصفح المنتجات<ChevronLeft className="w-4 h-4 transition-transform duration-300 group-hover:-translate-x-1" />
                          </span>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:max-w-3xl mx-auto">
                {allBrands.slice(3).map((b, i) => (
                  <motion.div key={b.to} initial={{ opacity: 0, y: 50, rotateX: -10 }} animate={{ opacity: 1, y: 0, rotateX: 0 }} transition={{ delay: 0.65 + i * 0.12, type: "spring", stiffness: 70 }}>
                    <Link to={b.to} className="group block relative rounded-2xl overflow-hidden transition-all duration-500 hover:-translate-y-3">
                      <div className="bg-[hsl(var(--section-dark-foreground))]/[0.06] backdrop-blur-md border border-[hsl(var(--section-dark-foreground))]/10 hover:border-primary/40 rounded-2xl overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-primary/20">
                        <motion.div className="h-1 bg-gradient-to-r from-primary via-[hsl(var(--gold-accent))] to-primary" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 0.8 + i * 0.15, duration: 0.8 }} />
                        <div className="bg-white/95 mx-4 mt-4 rounded-xl p-6 flex items-center justify-center aspect-[3/2] relative overflow-hidden group-hover:shadow-lg transition-shadow duration-500">
                          <div className="absolute inset-0 bg-gradient-to-br from-primary/0 to-primary/0 group-hover:from-primary/5 group-hover:to-primary/8 transition-all duration-500" />
                          <motion.div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                          <motion.img src={b.image} alt={b.label} className={`relative z-10 max-h-20 w-auto object-contain ${b.scale}`} whileHover={{ scale: 1.08 }} transition={{ duration: 0.3 }} />
                        </div>
                        <div className="p-5 text-center">
                          <h3 className="font-bold text-[hsl(var(--section-dark-foreground))] text-base mb-1">{b.label}</h3>
                          <p className="text-xs text-[hsl(var(--section-dark-foreground))]/40 mb-3">{b.labelEn}</p>
                          <span className="inline-flex items-center gap-1.5 text-primary text-sm font-semibold group-hover:gap-3 transition-all duration-300">
                            تصفح المنتجات<ChevronLeft className="w-4 h-4 transition-transform duration-300 group-hover:-translate-x-1" />
                          </span>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  const pageTitle = config?.title || "تصفح حسب الفئة";
  const pageDescription = config?.description || "تصفح جميع المنتجات حسب الفئة المختارة من جميع الماركات المتاحة.";

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{pageTitle} | المصرية جروب</title>
        <meta name="description" content={pageDescription} />
        <link rel="canonical" href={`https://www.almasriaautoparts.com/products${brand ? `/${brand}` : ''}`} />
      </Helmet>
      {config && (
        <BreadcrumbSchema items={[
          { name: "الرئيسية", url: "https://www.almasriaautoparts.com/" },
          { name: "المنتجات", url: "https://www.almasriaautoparts.com/products" },
          { name: config.title, url: `https://www.almasriaautoparts.com/products/${brand}` },
        ]} />
      )}
      <Navbar />
      {config && (
        <BrandHeroBanner
          logo={config.logo} title={config.title} subtitle={config.subtitle}
          description={config.description} badge={config.badge}
          backgroundImage={config.backgroundImage} logoScale={config.logoScale}
        />
      )}

      <CategoryBrowseSlider
        onCategorySelect={(categoryId, categoryName) => {
          listing.setFilters((prev: any) => ({ ...prev, categoryId, search: "", brandKey: null }));
          productsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }}
      />

      

      <div ref={productsRef} />
      {isDealer && (
        <Suspense fallback={<div className="container mx-auto px-4 pt-6"><div className="h-40 bg-muted/30 rounded-xl animate-pulse" /></div>}>
          <div className="container mx-auto px-4 pt-6">
            <DealerVehicleRecommendations compact />
          </div>
        </Suspense>
      )}
      <ProductListingSection
        {...listing}
        dailyLimit={listing.DAILY_LIMIT}
        showBrands={true}
        beforeGrid={
          <Suspense fallback={null}>
            <div className="mb-6"><PersonalizedProducts /></div>
          </Suspense>
        }
        sectionClassName="py-8"
      />
      <Suspense fallback={<div className="h-40" />}>
        <CarRecommendations />
      </Suspense>
      <Suspense fallback={<div className="h-40" />}>
        <TrendingProducts />
      </Suspense>

      <Suspense fallback={null}>
        <Footer />
      </Suspense>
    </div>
  );
};

export default ProductsPage;
