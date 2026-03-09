import { Helmet } from "react-helmet-async";

const SITE_URL = "https://almasriaautoparts.com";

/* ── Organization (global, rendered once on homepage) ── */
export const OrganizationSchema = () => (
  <Helmet>
    <script type="application/ld+json">{JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": "المصرية جروب",
      "alternateName": "Al Masria Group",
      "url": SITE_URL,
      "logo": `${SITE_URL}/logo.png`,
      "description": "موزع معتمد رسمي لقطع غيار وزيوت تويوتا الأصلية في مصر منذ 1999",
      "foundingDate": "1999",
      "telephone": "+201153961008",
      "email": "info@almasriaautoparts.com",
      "address": [
        {
          "@type": "PostalAddress",
          "streetAddress": "التوفيقية",
          "addressLocality": "القاهرة",
          "addressCountry": "EG"
        },
        {
          "@type": "PostalAddress",
          "streetAddress": "أوسيم",
          "addressLocality": "الجيزة",
          "addressCountry": "EG"
        },
        {
          "@type": "PostalAddress",
          "addressLocality": "الأقصر",
          "addressCountry": "EG"
        },
        {
          "@type": "PostalAddress",
          "addressLocality": "دبي",
          "addressCountry": "AE"
        }
      ],
      "sameAs": ["https://wa.me/201153961008"],
      "areaServed": {
        "@type": "Country",
        "name": "Egypt"
      },
      "numberOfEmployees": {
        "@type": "QuantitativeValue",
        "minValue": 50
      }
    })}</script>
  </Helmet>
);

/* ── WebSite with SearchAction ── */
export const WebSiteSchema = () => (
  <Helmet>
    <script type="application/ld+json">{JSON.stringify({
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": "المصرية جروب",
      "url": SITE_URL,
      "potentialAction": {
        "@type": "SearchAction",
        "target": `${SITE_URL}/products?search={search_term_string}`,
        "query-input": "required name=search_term_string"
      }
    })}</script>
  </Helmet>
);

/* ── FAQ Schema ── */
interface FAQItem { question: string; answer: string }

export const FAQSchema = ({ items }: { items: FAQItem[] }) => (
  <Helmet>
    <script type="application/ld+json">{JSON.stringify({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": items.map(i => ({
        "@type": "Question",
        "name": i.question,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": i.answer
        }
      }))
    })}</script>
  </Helmet>
);

/* ── BreadcrumbList ── */
interface BreadcrumbItem { name: string; url: string }

export const BreadcrumbSchema = ({ items }: { items: BreadcrumbItem[] }) => (
  <Helmet>
    <script type="application/ld+json">{JSON.stringify({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": items.map((item, i) => ({
        "@type": "ListItem",
        "position": i + 1,
        "name": item.name,
        "item": item.url
      }))
    })}</script>
  </Helmet>
);

/* ── Product (for product detail pages) ── */
interface ProductSchemaProps {
  name: string;
  sku: string;
  description?: string;
  image?: string;
  brand?: string;
  availability?: boolean;
}

export const ProductSchema = ({ name, sku, description, image, brand, availability = true }: ProductSchemaProps) => (
  <Helmet>
    <script type="application/ld+json">{JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Product",
      "name": name,
      "sku": sku,
      "description": description || name,
      "image": image || `${SITE_URL}/placeholder.svg`,
      "brand": {
        "@type": "Brand",
        "name": brand || "Toyota"
      },
      "offers": {
        "@type": "Offer",
        "availability": availability
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
        "priceCurrency": "EGP",
        "seller": {
          "@type": "Organization",
          "name": "المصرية جروب"
        }
      }
    })}</script>
  </Helmet>
);

/* ── ItemList (for category/catalog pages) ── */
interface ItemListItem { name: string; url: string; position?: number }

export const ItemListSchema = ({ name, items }: { name: string; items: ItemListItem[] }) => (
  <Helmet>
    <script type="application/ld+json">{JSON.stringify({
      "@context": "https://schema.org",
      "@type": "ItemList",
      "name": name,
      "numberOfItems": items.length,
      "itemListElement": items.map((item, i) => ({
        "@type": "ListItem",
        "position": item.position || i + 1,
        "name": item.name,
        "url": item.url
      }))
    })}</script>
  </Helmet>
);

/* ── LocalBusiness ── */
export const LocalBusinessSchema = () => (
  <Helmet>
    <script type="application/ld+json">{JSON.stringify({
      "@context": "https://schema.org",
      "@type": "AutoPartsStore",
      "name": "المصرية جروب",
      "image": `${SITE_URL}/logo.png`,
      "url": SITE_URL,
      "telephone": "+201153961008",
      "address": {
        "@type": "PostalAddress",
        "streetAddress": "أوسيم",
        "addressLocality": "الجيزة",
        "addressCountry": "EG"
      },
      "openingHoursSpecification": {
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"],
        "opens": "09:00",
        "closes": "18:00"
      },
      "priceRange": "$$"
    })}</script>
  </Helmet>
);
