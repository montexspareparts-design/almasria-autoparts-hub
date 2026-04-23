import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";

const SITE_URL = "https://www.almasriaautoparts.com";
const OG_IMAGE = `${SITE_URL}/og-image.jpg`;

interface RouteMeta {
  ar: { title: string; description: string };
  en: { title: string; description: string };
}

/* ── Per-route meta dictionary (Arabic + English) ── */
const ROUTE_META: Record<string, RouteMeta> = {
  "/": {
    ar: {
      title: "المصرية جروب | موزع تويوتا الأصلية والزيوت في مصر",
      description: "موزع معتمد رسمي لقطع غيار وزيوت تويوتا الأصلية في مصر منذ 1999. شبكة توزيع تغطي جميع المحافظات وتسليم خلال 48 ساعة.",
    },
    en: {
      title: "Al Masria Group | Toyota Genuine Parts & Oils Egypt",
      description: "Official authorized distributor of Toyota genuine parts and oils in Egypt since 1999. Nationwide distribution network with 48-hour delivery.",
    },
  },
  "/about": {
    ar: { title: "من نحن | المصرية جروب — موزع تويوتا المعتمد منذ 1999", description: "تعرف على المصرية جروب، الموزع المعتمد لقطع غيار وزيوت تويوتا الأصلية في مصر. خبرة 25 عامًا، فروع في مصر ودبي، شبكة توزيع وطنية." },
    en: { title: "About Al Masria Group — Toyota Distributor Since 1999", description: "Learn about Al Masria Group, the authorized distributor of Toyota genuine parts and oils in Egypt. 25 years of experience, offices in Egypt and Dubai." },
  },
  "/products": {
    ar: { title: "منتجاتنا | قطع غيار تويوتا الأصلية وزيوت وMTX", description: "تصفح كتالوج قطع غيار تويوتا الأصلية، الزيوت، وقطع MTX البديلة بأسعار الجملة وضمان الجودة." },
    en: { title: "Toyota Genuine Parts, Oils & MTX | Al Masria Group", description: "Browse our catalog of Toyota genuine parts, oils, and MTX aftermarket parts at wholesale prices with quality guarantee." },
  },
  "/contact": {
    ar: { title: "اتصل بنا | المصرية جروب — فروع تويوتا في مصر", description: "تواصل مع المصرية جروب — فروع التوفيقية وأوسيم والأقصر ودبي. مبيعات وخدمة عملاء على مدار الأسبوع." },
    en: { title: "Contact Al Masria Group | Toyota Parts Branches Egypt", description: "Contact Al Masria Group — branches in Tawfikiya, Awsim, Luxor, and Dubai. Sales and customer service available." },
  },
  "/mtx": {
    ar: { title: "قطع غيار MTX | البديل المضمون لتويوتا في مصر", description: "قطع غيار MTX Aftermarket بجودة تضاهي الأصلية وأسعار اقتصادية. علامتنا التجارية الحصرية لسيارات تويوتا في مصر." },
    en: { title: "MTX Parts | Premium Aftermarket Toyota Parts", description: "MTX aftermarket parts with OEM-matching quality and competitive pricing. Our exclusive brand by Al Masria Group." },
  },
  "/toyota-genuine-parts-egypt": {
    ar: { title: "قطع غيار تويوتا الأصلية في مصر | موزع معتمد", description: "قطع غيار تويوتا الأصلية 100٪ بضمان المصنع لجميع موديلات تويوتا في مصر. توصيل سريع لجميع المحافظات." },
    en: { title: "Toyota Genuine Parts Egypt | Authorized Distributor", description: "100% genuine Toyota parts with factory warranty for all Toyota models in Egypt. Fast delivery nationwide." },
  },
  "/catalogs": {
    ar: { title: "كشوفات الأسعار | قطع غيار تويوتا والزيوت — المصرية جروب", description: "تحميل كشوفات أسعار قطع غيار تويوتا الأصلية والزيوت وMTX المحدثة من المصرية جروب — موزع معتمد." },
    en: { title: "Price Catalogs | Toyota Parts & Oils — Al Masria Group", description: "Download up-to-date price catalogs for Toyota genuine parts, oils, and MTX." },
  },
  "/what-sets-us-apart": {
    ar: { title: "ما يميزنا | لماذا تختار المصرية جروب لقطع غيار تويوتا", description: "اكتشف ما يميز المصرية جروب: شبكة توزيع وطنية، ضمان أصلي، ودعم فني متخصص." },
    en: { title: "What Sets Us Apart | Al Masria Group Toyota", description: "Discover what sets Al Masria Group apart: nationwide distribution, genuine warranty, and expert technical support." },
  },
  "/policies": {
    ar: { title: "السياسات والشروط | المصرية جروب", description: "الشروط والأحكام، سياسة الخصوصية، الشحن، والاسترجاع لخدمات المصرية جروب." },
    en: { title: "Policies & Terms | Al Masria Group", description: "Terms & conditions, privacy policy, shipping, and refund policies for Al Masria Group services." },
  },
  "/install": {
    ar: { title: "حمّل تطبيق المصرية جروب | قطع غيار تويوتا في جيبك", description: "حمّل تطبيق المصرية جروب على Android و iOS لتصفح وطلب قطع غيار تويوتا الأصلية والزيوت بسهولة." },
    en: { title: "Install Al Masria Group App | Toyota Parts in Your Pocket", description: "Install the Al Masria Group app on Android and iOS to browse and order Toyota genuine parts and oils with ease." },
  },
  "/products/genuine-toyota-parts": {
    ar: { title: "قطع غيار تويوتا الأصلية 100٪ | بضمان الموزع المعتمد", description: "تسوق قطع غيار تويوتا الأصلية 100٪ بضمان المصنع — موزع معتمد رسمي في مصر منذ 1999." },
    en: { title: "100% Genuine Toyota Parts | Authorized Distributor Warranty", description: "Shop 100% genuine Toyota parts with factory warranty — official authorized distributor in Egypt since 1999." },
  },
  "/products/toyota-oils": {
    ar: { title: "زيوت تويوتا الأصلية | حماية مثالية لمحرك سيارتك", description: "زيوت تويوتا الأصلية لجميع موديلات المحركات. حماية مثالية وأداء طويل الأمد بضمان الموزع المعتمد." },
    en: { title: "Toyota Genuine Oils | Optimal Engine Protection", description: "Toyota genuine motor oils for all engine models. Optimal protection and long-lasting performance with authorized distributor warranty." },
  },
  "/parts-by-model": {
    ar: { title: "قطع غيار تويوتا حسب الموديل | ابحث بسهولة", description: "تصفح قطع غيار تويوتا الأصلية مرتبة حسب الموديل (كورولا، كامري، هايلكس، فورتشنر، رافور وغيرها)." },
    en: { title: "Toyota Parts by Model | Easy Browsing", description: "Browse genuine Toyota parts sorted by model (Corolla, Camry, Hilux, Fortuner, RAV4, and more)." },
  },
  "/parts-by-type": {
    ar: { title: "قطع غيار تويوتا حسب النوع | فلاتر، فرامل، شموع", description: "ابحث عن قطع غيار تويوتا الأصلية حسب نوع القطعة — فلاتر زيت، فرامل، شموع احتراق، بطاريات وأكثر." },
    en: { title: "Toyota Parts by Type | Filters, Brakes, Spark Plugs", description: "Find genuine Toyota parts by component type — oil filters, brakes, spark plugs, batteries, and more." },
  },
  "/clients": {
    ar: { title: "خدمات المصرية جروب لكل عميل | تجار، شركات، أساطيل", description: "حلول قطع غيار تويوتا المتخصصة لتجار التجزئة والجملة، شركات السيارات، إدارات الأساطيل، ومراكز الخدمة." },
    en: { title: "Al Masria Group Services | Dealers, Companies, Fleets", description: "Specialized Toyota parts solutions for retail and wholesale dealers, automotive companies, fleet management, and service centers." },
  },
  "/track-order": {
    ar: { title: "تتبع طلبك | المصرية جروب لقطع غيار تويوتا", description: "تتبع حالة طلب قطع الغيار من المصرية جروب برقم الطلب — تحديثات فورية لكل مرحلة." },
    en: { title: "Track Your Order | Al Masria Group", description: "Track your Al Masria Group parts order status by order number — instant updates at every stage." },
  },
};

/* Routes that should NOT be indexed (private/dealer/admin/checkout) */
const NOINDEX_PREFIXES = [
  "/admin",
  "/dealer",
  "/dealer-login",
  "/dealer-register",
  "/dealer-apply",
  "/client-register",
  "/cart",
  "/checkout",
  "/payment",
  "/payment-callback",
  "/reset-password",
  "/auth",
  "/my-profile",
  "/dev",
];

const SEOHead = () => {
  const { lang } = useLanguage();
  const { pathname } = useLocation();

  const isNoIndex = NOINDEX_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );

  // Find best route match (exact first, then prefix fallback)
  const meta =
    ROUTE_META[pathname] ||
    ROUTE_META[Object.keys(ROUTE_META).find((k) => k !== "/" && pathname.startsWith(k)) || "/"] ||
    ROUTE_META["/"];

  const { title, description } = meta[lang];
  const canonical = `${SITE_URL}${pathname === "/" ? "/" : pathname}`;
  const ogLocale = lang === "ar" ? "ar_EG" : "en_US";
  const ogLocaleAlt = lang === "ar" ? "en_US" : "ar_EG";

  return (
    <Helmet>
      <html lang={lang} dir={lang === "ar" ? "rtl" : "ltr"} />
      <title>{title}</title>
      <meta name="description" content={description} />

      {/* Canonical + hreflang alternates */}
      <link rel="canonical" href={canonical} />
      <link rel="alternate" hrefLang="ar" href={canonical} />
      <link rel="alternate" hrefLang="en" href={canonical} />
      <link rel="alternate" hrefLang="x-default" href={canonical} />

      {/* Robots */}
      {isNoIndex ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <meta name="robots" content="index, follow, max-image-preview:large" />
      )}

      {/* Open Graph */}
      <meta property="og:type" content="website" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonical} />
      <meta property="og:locale" content={ogLocale} />
      <meta property="og:locale:alternate" content={ogLocaleAlt} />
      <meta property="og:site_name" content={lang === "ar" ? "المصرية جروب" : "Al Masria Group"} />
      <meta property="og:image" content={OG_IMAGE} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content={title} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={OG_IMAGE} />
      <meta name="twitter:site" content="@almasriagroup" />
    </Helmet>
  );
};

export default SEOHead;
