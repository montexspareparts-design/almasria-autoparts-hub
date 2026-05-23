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
  url: string;
}

export interface SEOHeadProps {
  titleAr?: string;
  titleEn?: string;
  descriptionAr?: string;
  descriptionEn?: string;
  canonical?: string;
  image?: string;
  ogType?: "website" | "article" | "product";
  keywordsAr?: string;
  keywordsEn?: string;
  noindex?: boolean;
  breadcrumbs?: SEOBreadcrumb[];
}

/**
 * Per-route bilingual fallbacks. When `<SEOHead />` is rendered globally
 * (e.g. inside <App />) without props, defaults are picked from this map
 * based on the current pathname. Pages that need richer SEO can render
 * their own `<SEOHead titleAr=... />` to override.
 */
const ROUTE_DEFAULTS: Record<
  string,
  {
    titleAr: string;
    titleEn: string;
    descriptionAr: string;
    descriptionEn: string;
    keywordsAr?: string;
    keywordsEn?: string;
  }
> = {
  "/": {
    titleAr: "قطع غيار وزيوت تويوتا الأصلية في مصر",
    titleEn: "Toyota Genuine Parts & Oils — Egypt",
    descriptionAr:
      "المصرية جروب — موزع معتمد لقطع غيار وزيوت تويوتا الأصلية منذ 1999. شبكة وطنية، تسليم 48 ساعة، وعلامة MTX.",
    descriptionEn:
      "Al Masria Group — authorized Toyota genuine parts & oils distributor in Egypt since 1999. 48h nationwide delivery, plus MTX brand.",
    keywordsAr: "قطع غيار تويوتا, زيوت تويوتا, موزع تويوتا مصر, MTX, قطع غيار اصلية",
    keywordsEn: "Toyota parts Egypt, Toyota genuine parts, Toyota oil, MTX aftermarket, auto parts Egypt",
  },
  "/products": {
    titleAr: "كتالوج قطع الغيار والزيوت الأصلية",
    titleEn: "Genuine Parts & Oils Catalog",
    descriptionAr:
      "تصفح كتالوج المصرية جروب: قطع غيار تويوتا الأصلية، زيوت تويوتا، MTX، Denso، Aisin وFBK — مع توفر فوري وأسعار محدثة.",
    descriptionEn:
      "Browse Al Masria Group catalog: Toyota genuine parts, oils, plus MTX, Denso, Aisin and FBK — live availability and updated pricing.",
    keywordsAr: "كتالوج قطع غيار, تويوتا, MTX, زيوت محرك, فلاتر, تيل فرامل",
    keywordsEn: "auto parts catalog, Toyota parts, MTX, motor oil, filters, brake pads",
  },
  "/about": {
    titleAr: "من نحن — المصرية جروب",
    titleEn: "About Us — Al Masria Group",
    descriptionAr:
      "تعرّف على المصرية جروب: 25+ سنة خبرة، موزع معتمد لقطع غيار وزيوت تويوتا، شبكة فروع تغطي مصر ومركز إقليمي في دبي.",
    descriptionEn:
      "Get to know Al Masria Group: 25+ years experience, authorized Toyota parts & oils distributor, nationwide branches and a Dubai regional hub.",
  },
  "/genuine-parts": {
    titleAr: "قطع غيار تويوتا الأصلية — ضمان الوكالة",
    titleEn: "Toyota Genuine Parts — Dealer Warranty",
    descriptionAr:
      "قطع غيار تويوتا الأصلية 100% بضمان الوكالة وتوافق دقيق مع موديلات تويوتا. توفر مستمر وتسليم سريع لكل المحافظات.",
    descriptionEn:
      "100% Toyota genuine parts with dealer warranty and precise model fitment. In-stock availability and fast delivery across Egypt.",
  },
  "/mtx": {
    titleAr: "MTX Aftermarket — قطع غيار بديلة عالية الجودة",
    titleEn: "MTX Aftermarket — Premium Replacement Parts",
    descriptionAr:
      "MTX هي العلامة التجارية المسجلة للمصرية جروب لقطع الغيار البديلة بمواصفات تنافس الأصلية وأسعار اقتصادية.",
    descriptionEn:
      "MTX is Al Masria Group's registered aftermarket brand: replacement parts engineered to OEM-grade specs at competitive prices.",
  },
  "/contact": {
    titleAr: "تواصل معنا — واتساب، بريد، وفروعنا",
    titleEn: "Contact Us — WhatsApp, Email, Branches",
    descriptionAr:
      "تواصل مع المصرية جروب عبر واتساب البيزنس، الهاتف، أو البريد الرسمي. وقم بزيارة فروعنا في القاهرة، الجيزة، الأقصر ودبي.",
    descriptionEn:
      "Reach Al Masria Group via WhatsApp Business, phone, or official email. Visit our branches in Cairo, Giza, Luxor, and Dubai.",
  },
  "/policies": {
    titleAr: "السياسات — الشروط والخصوصية والشحن",
    titleEn: "Policies — Terms, Privacy, Shipping, Returns",
    descriptionAr:
      "اطّلع على سياسات المصرية جروب: شروط الاستخدام، الخصوصية، سياسة الشحن، وسياسة الاسترجاع لضمان تجربة شراء آمنة.",
    descriptionEn:
      "Read Al Masria Group policies: terms of use, privacy, shipping, and returns — ensuring a secure shopping experience.",
  },
  "/track-order": {
    titleAr: "تتبع طلبك",
    titleEn: "Track Your Order",
    descriptionAr: "تتبع حالة طلبك من المصرية جروب لحظة بلحظة برقم الطلب وتفاصيل الشحن.",
    descriptionEn: "Track your Al Masria Group order status in real time using your order number and shipping details.",
  },
  "/catalogs": {
    titleAr: "كتالوجات الجملة — للتجار المعتمدين",
    titleEn: "Wholesale Catalogs — Approved Dealers",
    descriptionAr: "كتالوجات الجملة المتاحة للتجار المعتمدين بأسعار جملة وكميات متاحة لحظياً.",
    descriptionEn: "Wholesale catalogs for approved dealers with live availability and tier pricing.",
  },
  "/dealer-apply": {
    titleAr: "تسجيل تاجر جديد — انضم لشبكة المصرية جروب",
    titleEn: "Become a Dealer — Join Al Masria Network",
    descriptionAr: "قدّم طلب تاجر جديد للحصول على أسعار جملة، كتالوجات حصرية، ودعم مخصّص.",
    descriptionEn: "Apply as a new dealer to access wholesale pricing, exclusive catalogs, and dedicated support.",
  },
  "/auth": {
    titleAr: "تسجيل الدخول",
    titleEn: "Sign In",
    descriptionAr: "ادخل إلى حسابك لمتابعة طلباتك وعروضك الخاصة.",
    descriptionEn: "Sign in to manage your orders and personalized offers.",
  },
};

/**
 * Centralized bilingual SEO head: titles, meta description, canonical,
 * hreflang (ar / en / x-default), Open Graph, Twitter, and breadcrumb JSON-LD.
 *
 * Canonical / hreflang policy
 * ───────────────────────────
 * 1. If `props.canonical` is passed (a real, indexable URL — e.g. a product
 *    page at `/dealer/product/:id` or a brand landing at `/products/:brand`),
 *    we use it verbatim for both <link rel="canonical"> AND every hreflang
 *    variant. This keeps the per-product / per-dealer signal strong even
 *    when the same view is rendered from multiple list-page URLs.
 *
 * 2. Otherwise we derive canonical from `pathname`, but FIRST we strip
 *    trailing slashes, query strings, and hash fragments. This prevents
 *    UTM noise (`?utm_source=fb`) and modal anchors (`#detail`) from
 *    fragmenting the canonical signal across what is essentially the
 *    same page.
 *
 * 3. `<ProductDetailDialog>` is a modal — it has NO real URL of its own.
 *    To avoid telling Google "the listing page IS this product", that
 *    dialog passes both `canonical` (pointing at the dedicated product
 *    page) and `noindex` (telling crawlers not to index the modal-on-
 *    listing combo). The two together resolve the conflict cleanly.
 */
export const SEOHead = (props: SEOHeadProps = {}) => {
  const { isAr } = useLanguage();
  const { pathname } = useLocation();

  const path = pathname || "/";
  // Strip trailing slash (except root), query string, and hash so the
  // derived canonical is stable regardless of UTM tags or scroll anchors.
  const cleanPath = (() => {
    let p = path.split("?")[0].split("#")[0];
    if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
    return p || "/";
  })();
  const fallback = ROUTE_DEFAULTS[cleanPath] || ROUTE_DEFAULTS["/"];

  const titleAr = props.titleAr ?? fallback.titleAr;
  const titleEn = props.titleEn ?? fallback.titleEn;
  const descriptionAr = props.descriptionAr ?? fallback.descriptionAr;
  const descriptionEn = props.descriptionEn ?? fallback.descriptionEn;
  const keywordsAr = props.keywordsAr ?? fallback.keywordsAr;
  const keywordsEn = props.keywordsEn ?? fallback.keywordsEn;

  // Canonical priority: explicit prop → derived clean path.
  // If the caller passed a relative path ("/foo"), absolutise it.
  const canonicalUrl = (() => {
    if (!props.canonical) return `${SITE_URL}${cleanPath}`;
    return props.canonical.startsWith("http")
      ? props.canonical
      : `${SITE_URL}${props.canonical.startsWith("/") ? "" : "/"}${props.canonical}`;
  })();
  const image = props.image || DEFAULT_OG_IMAGE;
  const ogType = props.ogType || "website";

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
        {props.noindex ? (
          <meta name="robots" content="noindex, nofollow" />
        ) : (
          <meta
            name="robots"
            content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"
          />
        )}

        {/* Canonical + hreflang */}
        <link rel="canonical" href={canonicalUrl} />
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

      {props.breadcrumbs && props.breadcrumbs.length > 0 && (
        <BreadcrumbSchema
          items={props.breadcrumbs.map((b) => ({
            name: isAr ? b.ar : b.en,
            url: b.url.startsWith("http") ? b.url : `${SITE_URL}${b.url}`,
          }))}
        />
      )}
    </>
  );
};

export default SEOHead;
