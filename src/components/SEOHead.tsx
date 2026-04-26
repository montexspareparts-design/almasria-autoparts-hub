import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { BreadcrumbSchema } from "@/components/SEOSchemaMarkup";

const SITE_URL = "https://www.almasriaautoparts.com";
const DEFAULT_OG_IMAGE =
  "https://storage.googleapis.com/gpt-engineer-file-uploads/94NoGeZ6b1dqwQe1OIUbTqwhr6Y2/social-images/social-1772812025078-6a50d56e-6e9b-44e2-be9e-64e7b896fb2e-removebg-preview.webp";

export interface SEOBreadcrumb {
  ar: string;
  en: string;
  url: string; // relative or absolute
}

export interface SEOHeadProps {
  /** Page title in Arabic (without site suffix). */
  titleAr: string;
  /** Page title in English (without site suffix). */
  titleEn: string;
  /** Meta description (≤160 chars). */
  descriptionAr: string;
  descriptionEn: string;
  /** Optional canonical override (absolute URL). Defaults to current pathname under SITE_URL. */
  canonical?: string;
  /** OG image absolute URL. */
  image?: string;
  /** Schema.org type for OG (default: website). */
  ogType?: "website" | "article" | "product";
  /** Optional keywords (comma-separated). */
  keywordsAr?: string;
  keywordsEn?: string;
  /** Tell crawlers not to index. */
  noindex?: boolean;
  /** Optional breadcrumb trail (rendered as JSON-LD). */
  breadcrumbs?: SEOBreadcrumb[];
}

/**
 * Centralized bilingual SEO head: titles, meta description, canonical,
 * hreflang (ar / en / x-default), Open Graph, Twitter, and breadcrumb JSON-LD.
 *
 * Usage:
 * ```tsx
 * <SEOHead
 *   titleAr="..." titleEn="..."
 *   descriptionAr="..." descriptionEn="..."
 *   breadcrumbs={[{ ar: "الرئيسية", en: "Home", url: "/" }]}
 * />
 * ```
 */
export const SEOHead = ({
  titleAr,
  titleEn,
  descriptionAr,
  descriptionEn,
  canonical,
  image = DEFAULT_OG_IMAGE,
  ogType = "website",
  keywordsAr,
  keywordsEn,
  noindex = false,
  breadcrumbs,
}: SEOHeadProps) => {
  const { isAr } = useLanguage();
  const { pathname, search } = useLocation();

  const path = pathname || "/";
  const cleanPath = path.endsWith("/") && path !== "/" ? path.slice(0, -1) : path;
  const canonicalUrl = canonical || `${SITE_URL}${cleanPath}`;

  const title = isAr
    ? `${titleAr} | المصرية جروب`
    : `${titleEn} | Al Masria Group`;
  const description = isAr ? descriptionAr : descriptionEn;
  const keywords = isAr ? keywordsAr : keywordsEn;

  const absoluteImage = image.startsWith("http") ? image : `${SITE_URL}${image}`;

  return (
    <>
      <Helmet>
        <html lang={isAr ? "ar" : "en"} dir={isAr ? "rtl" : "ltr"} />

        <title>{title}</title>
        <meta name="description" content={description} />
        {keywords && <meta name="keywords" content={keywords} />}
        {noindex ? (
          <meta name="robots" content="noindex, nofollow" />
        ) : (
          <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
        )}

        {/* Canonical */}
        <link rel="canonical" href={canonicalUrl} />

        {/* hreflang — same URL serves both languages via in-app switcher */}
        <link rel="alternate" hrefLang="ar-EG" href={canonicalUrl} />
        <link rel="alternate" hrefLang="en" href={canonicalUrl} />
        <link rel="alternate" hrefLang="x-default" href={canonicalUrl} />

        {/* Open Graph */}
        <meta property="og:type" content={ogType} />
        <meta property="og:site_name" content={isAr ? "المصرية جروب" : "Al Masria Group"} />
        <meta property="og:locale" content={isAr ? "ar_EG" : "en_US"} />
        <meta property="og:locale:alternate" content={isAr ? "en_US" : "ar_EG"} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:image" content={absoluteImage} />
        <meta property="og:image:alt" content={isAr ? titleAr : titleEn} />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={absoluteImage} />
      </Helmet>

      {breadcrumbs && breadcrumbs.length > 0 && (
        <BreadcrumbSchema
          items={breadcrumbs.map((b) => ({
            name: isAr ? b.ar : b.en,
            url: b.url.startsWith("http") ? b.url : `${SITE_URL}${b.url}`,
          }))}
        />
      )}
    </>
  );
};

export default SEOHead;
