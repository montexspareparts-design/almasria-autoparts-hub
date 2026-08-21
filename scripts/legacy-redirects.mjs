/**
 * Single source of truth for legacy (WordPress era) URLs.
 * Each entry is written at build time as a real static HTML file
 * containing canonical + instant meta refresh, because the hosting
 * layer ignores `public/_redirects`.
 *
 * Add every newly discovered legacy URL here — never in seo-routes.mjs
 * (these must stay out of the sitemap).
 */
export const LEGACY_REDIRECTS = {
  // English legacy URLs
  "/index.php": "/",
  "/shop": "/products",
  "/about-us": "/about",
  "/contact-us": "/contact",
  "/home": "/",
  "/home-2": "/",

  // Arabic legacy URLs
  "/تويوتا-هاي-اس": "/parts-by-model/hiace",
  "/تويوتا-هايس": "/parts-by-model/hiace",
  "/تويوتا-كوستر": "/parts-by-model/coaster",
  "/تويوتا-هايلوكس": "/parts-by-model/hilux",
  "/تويوتا-لاند-كروزر": "/parts-by-model/land-cruiser",
  "/تويوتا-كورولا": "/parts-by-model/corolla",
  "/كورولا": "/parts-by-model/corolla",
  "/تويوتا-كامري": "/parts-by-model/camry",
  "/تويوتا-ياريس": "/parts-by-model/yaris",
  "/تويوتا-راف-فور": "/parts-by-model/rav4",
  "/تويوتا-فورتشنر": "/parts-by-model/fortuner",
  "/تويوتا-رش": "/parts-by-model/rush",
  "/تويوتا-راش-2": "/parts-by-model/rush",
  "/تويوتا-روميون": "/parts-by-model/rumion",
  "/قطع-غيار-تويوتا": "/products/toyota-genuine",
  "/زيوت-تويوتا": "/products/toyota-oils",
  "/زيوت-وسوائل-تويوتا": "/products/toyota-oils",
  "/من-نحن": "/about",
  "/اتصل-بنا": "/contact",
};
