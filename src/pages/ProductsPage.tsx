import ProductsShowcase from "@/components/ProductsShowcase";
import { useEffect, useRef, useState, lazy, Suspense } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { ShieldCheck } from "lucide-react";
import SEOHead from "@/components/SEOHead";
import { getCategorySEO } from "@/lib/categorySeo";
import { BreadcrumbSchema } from "@/components/SEOSchemaMarkup";
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

const brandConfig: Record<string, { title: string; subtitle: string; titleEn?: string; descriptionEn?: string; description: string; badge: string; brandKey: string; logo: string; backgroundImage?: string; logoScale?: number }> = {
  "toyota-genuine": {
    title: "قطع غيار تويوتا الأصلية", subtitle: "Toyota Genuine Parts",
    titleEn: "Toyota Genuine Parts",
    description: "قطع غيار أصلية 100% من تويوتا اليابان. نحن موزع معتمد رسمي لجميع أنواع قطع غيار تويوتا الأصلية في مصر.",
    descriptionEn: "100% genuine Toyota parts from Japan. Authorized distributor of every category of Toyota genuine parts in Egypt.",
    badge: "موزع معتمد رسمي", brandKey: "toyota_genuine", logo: brandGenuineParts, logoScale: 250,
  },
  "toyota-oils": {
    title: "زيوت تويوتا الأصلية", subtitle: "Toyota Genuine Motor Oil",
    titleEn: "Toyota Genuine Motor Oil",
    description: "زيوت تويوتا الأصلية بجميع درجات اللزوجة. زيوت المحرك، زيوت الفتيس، سوائل الفرامل، وجميع سوائل تويوتا الأصلية.",
    descriptionEn: "Toyota genuine oils across all viscosities — engine oils, transmission fluids, brake fluids, and complete fluid lineup.",
    badge: "موزع معتمد رسمي", brandKey: "toyota_oils", logo: brandToyotaOil, backgroundImage: oilBg, logoScale: 350,
  },
  "mtx-aftermarket": {
    title: "MTX Aftermarket", subtitle: "قطع غيار مستوردة بأعلى جودة",
    titleEn: "MTX Aftermarket — Premium Imported Parts",
    description: "MTX هي علامتنا التجارية المسجلة لقطع الغيار المستوردة عالية الجودة بأفضل الأسعار.",
    descriptionEn: "MTX is our registered aftermarket brand for premium imported parts at the most competitive prices.",
    badge: "علامة تجارية مسجلة", brandKey: "mtx_aftermarket", logo: brandMtx,
  },
  "fbk-brakes": {
    title: "تيل فرامل", subtitle: "FBK Brake Pads",
    titleEn: "FBK Brake Pads",
    description: "تشكيلة كبيرة من تيل فرامل عالية الجودة لجميع موديلات تويوتا تضمن أداء ممتاز وعمر افتراضي أطول.",
    descriptionEn: "Wide range of high-quality FBK brake pads for all Toyota models — superior performance and longer service life.",
    badge: "جودة ماليزية", brandKey: "fbk", logo: brandFbkBrakes, logoScale: 350,
  },
  "denso": {
    title: "DENSO", subtitle: "قطع غيار دينسو اليابانية",
    titleEn: "DENSO — Japanese Auto Components",
    description: "قطع غيار دينسو الأصلية - الشركة اليابانية الرائدة في تصنيع مكونات السيارات عالية الجودة.",
    descriptionEn: "Genuine DENSO parts — the leading Japanese manufacturer of high-quality automotive components.",
    badge: "وكيل معتمد", brandKey: "denso", logo: brandDenso,
  },
  "aisin": {
    title: "AISIN", subtitle: "قطع غيار أيسن اليابانية",
    titleEn: "AISIN — Japanese Auto Components",
    description: "قطع غيار أيسن الأصلية - من أكبر مصنعي قطع غيار السيارات في العالم، جودة يابانية معتمدة.",
    descriptionEn: "Genuine AISIN parts — one of the world's largest automotive parts manufacturers, certified Japanese quality.",
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
        <div className="pt-20">
          <ProductsShowcase />
        </div>
      </div>
    );
  }

  // When a category filter is active, prefer the centralised, DB-aligned
  // bilingual SEO meta from `categorySeo.ts` (Toyota-keyword + SKU-aware).
  // Otherwise fall back to brand config or generic catalog copy.
  const categorySlug = searchParams.get("category");
  const categoryMeta = getCategorySEO(categorySlug);

  const pageTitle = categoryMeta?.titleAr || config?.title || "تصفح حسب الفئة";
  const pageTitleEn = categoryMeta?.titleEn || config?.titleEn || "Browse by Category";
  const pageDescription = categoryMeta?.descriptionAr || config?.description || "تصفح جميع المنتجات حسب الفئة المختارة من جميع الماركات المتاحة.";
  const pageDescriptionEn = categoryMeta?.descriptionEn || config?.descriptionEn || "Browse all products by selected category across all available brands.";
  const pageKeywordsAr = categoryMeta?.keywordsAr;
  const pageKeywordsEn = categoryMeta?.keywordsEn;

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        titleAr={pageTitle}
        titleEn={pageTitleEn}
        descriptionAr={pageDescription}
        descriptionEn={pageDescriptionEn}
        keywordsAr={pageKeywordsAr}
        keywordsEn={pageKeywordsEn}
        ogType={config ? "product" : "website"}
        breadcrumbs={
          categoryMeta
            ? [
                { ar: "الرئيسية", en: "Home", url: "/" },
                { ar: "المنتجات", en: "Products", url: "/products" },
                { ar: categoryMeta.nameAr, en: categoryMeta.nameEn, url: `/products?category=${categoryMeta.slug}` },
              ]
            : config
              ? [
                  { ar: "الرئيسية", en: "Home", url: "/" },
                  { ar: "المنتجات", en: "Products", url: "/products" },
                  { ar: config.title, en: config.titleEn || config.subtitle, url: `/products/${brand}` },
                ]
              : [
                  { ar: "الرئيسية", en: "Home", url: "/" },
                  { ar: "المنتجات", en: "Products", url: "/products" },
                ]
        }
      />
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
