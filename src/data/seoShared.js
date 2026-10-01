/**
 * Single source of truth for SEO taxonomy, business/branch data and the
 * product → (model, part type) classifier. Plain JS so both the React app
 * and the Node build scripts (prerender / sitemap) import the same data.
 */

export const SITE = "https://www.almasriaautoparts.com";
export const ORG_ID = `${SITE}/#organization`;

export const MODELS = [
  { slug: "hiace", ar: "هايس", en: "Hiace", match: /هاي\s*اس|هايس|hiace/i },
  { slug: "coaster", ar: "كوستر", en: "Coaster", match: /كوستر|coaster/i },
  { slug: "hilux", ar: "هايلوكس", en: "Hilux", match: /هاي\s*لوكس|هيلوكس|hilux/i },
  { slug: "land-cruiser", ar: "لاند كروزر", en: "Land Cruiser", match: /لاند\s*كروزر|برادو|land\s*cruiser|prado/i },
  { slug: "yaris", ar: "ياريس", en: "Yaris", match: /ياريس|yaris/i },
  { slug: "rav4", ar: "راف فور", en: "RAV4", match: /راف\s*فور|راف\s*4|rav\s*4/i },
  { slug: "fortuner", ar: "فورتشنر", en: "Fortuner", match: /فورتش|fortuner/i },
  { slug: "rush", ar: "رش", en: "Rush", match: /(^|\s)(رش|راش)(\s|$)|rush/i },
  { slug: "corolla", ar: "كورولا", en: "Corolla", match: /كورولا|corolla/i },
  { slug: "camry", ar: "كامري", en: "Camry", match: /كامري|camry/i },
  { slug: "rumion", ar: "روميون", en: "Rumion", match: /روميون|rumion/i },
];

/** Order matters: the first matching type wins. */
export const TYPES = [
  { slug: "filters", ar: "فلاتر", en: "Filters", match: /فلتر|حشوة\s*(فلتر|جاز|بنزين|هواء|زيت)/ },
  { slug: "oils", ar: "زيوت وسوائل", en: "Oils & Fluids", match: /(^|\s)زيت|سائل|كولانت/ },
  { slug: "brakes", ar: "فرامل", en: "Brakes", match: /تيل|فرامل|طنبور|ديسك\s*امامي|ديسك\s*خلفي/ },
  { slug: "cooling", ar: "تبريد", en: "Cooling", match: /ريداتير|ثرموستات|مياه|رادياتير|مروحة|طرمبة\s*مياه|ترموستات|قربة\s*مياه|خرطوم\s*مياه|تكييف|كمبروسر|ثلاجة/ },
  { slug: "electrical", ar: "كهرباء", en: "Electrical", match: /بوجي|موبينة|مارش|دينامو|حساس|لمبة|فانوس|كشاف|بطارية|ريلاي|سويتش|كهرب/ },
  { slug: "suspension", ar: "عفشة وتعليق", en: "Suspension", match: /مساعد|مقص|بارة|عفشة|صرة|رولمان|كوبلن|جلبة|ميزان|ياي|مقصات|دركسيون|عمود\s*كردان|بلي\s*عجل|عجل|كاوتش|سوستة/ },
  { slug: "engine", ar: "قطع محرك", en: "Engine", match: /جوان|سبيكة|اويل\s*سيل|سير|دبرياج|بستم|شنبر|صباب|كاتينة|طرمبة|كرنك|سلندر|وش\s*سلندر|بلف|بلية|رشاش|فتيس|فولام|عمة/ },
];

export const BRANCHES = [
  {
    slug: "osim",
    name: "فرع أوسيم",
    city: "الجيزة",
    address: "أوسيم، الجيزة، مصر",
    phone: "+201153961008",
    hours: "السبت – الخميس، 9 صباحًا – 6 مساءً",
  },
  {
    slug: "tawfikia",
    name: "فرع التوفيقية",
    city: "القاهرة",
    address: "التوفيقية، وسط البلد، القاهرة، مصر",
    phone: "+201032104861",
    hours: "السبت – الخميس، 9 صباحًا – 6 مساءً",
  },
  {
    slug: "luxor",
    name: "فرع الأقصر",
    city: "الأقصر",
    address: "الأقصر، مصر",
    phone: "+201016177204",
    hours: "السبت – الخميس، 9 صباحًا – 6 مساءً",
  },
];

export const BUSINESS = {
  name: "المصرية جروب — Al Masria Auto Parts",
  shortName: "المصرية جروب",
  phone: "+201032104861",
  whatsapp: "201034806288",
  email: "info@almasriaautoparts.com",
};

export const branchId = (slug) => `${SITE}/branches/${slug}#store`;

/** Branch LocalBusiness schema (stable @id, linked to the organization). */
export const branchSchema = (b) => ({
  "@context": "https://schema.org",
  "@type": "AutoPartsStore",
  "@id": branchId(b.slug),
  name: `${BUSINESS.shortName} — ${b.name}`,
  url: `${SITE}/branches/${b.slug}`,
  image: `${SITE}/pwa-512x512.png`,
  telephone: b.phone,
  email: BUSINESS.email,
  priceRange: "EGP",
  address: { "@type": "PostalAddress", streetAddress: b.address, addressLocality: b.city, addressCountry: "EG" },
  openingHoursSpecification: {
    "@type": "OpeningHoursSpecification",
    dayOfWeek: ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"],
    opens: "09:00",
    closes: "18:00",
  },
  parentOrganization: { "@id": ORG_ID },
});

/** Organization schema referencing branches by @id (no duplicated branch data). */
export const orgSchema = () => ({
  "@context": "https://schema.org",
  "@type": "AutoPartsStore",
  "@id": ORG_ID,
  name: BUSINESS.name,
  url: SITE,
  logo: `${SITE}/pwa-512x512.png`,
  telephone: BUSINESS.phone,
  email: BUSINESS.email,
  priceRange: "EGP",
  address: { "@type": "PostalAddress", streetAddress: "أوسيم", addressLocality: "الجيزة", addressCountry: "EG" },
  areaServed: "EG",
  sameAs: [`https://wa.me/${BUSINESS.whatsapp}`],
  department: BRANCHES.map((b) => ({ "@id": branchId(b.slug) })),
});

/** Models a product name fits (may be several). */
export const matchModels = (name) => MODELS.filter((m) => m.match.test(String(name || ""))).map((m) => m.slug);

/** Single part type for a product name, or null. */
export const matchType = (name) => {
  const n = String(name || "");
  const t = TYPES.find((x) => x.match.test(n));
  return t ? t.slug : null;
};

export const productFits = (name, modelSlug, typeSlug) =>
  (!modelSlug || matchModels(name).includes(modelSlug)) && (!typeSlug || matchType(name) === typeSlug);
