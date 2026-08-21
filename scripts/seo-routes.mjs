/**
 * Single source of truth for prerendered (crawlable) pages.
 * Each entry produces a real HTML file at build time with a unique
 * <title>, meta description, canonical, Open Graph tags and readable
 * content inside #root — so search engines and social crawlers see the
 * page without executing any JavaScript.
 */

export const SITE = "https://www.almasriaautoparts.com";

const MODELS = [
  { slug: "hiace", ar: "هايس", en: "Hiace" },
  { slug: "coaster", ar: "كوستر", en: "Coaster" },
  { slug: "hilux", ar: "هايلوكس", en: "Hilux" },
  { slug: "land-cruiser", ar: "لاند كروزر", en: "Land Cruiser" },
  { slug: "yaris", ar: "ياريس", en: "Yaris" },
  { slug: "rav4", ar: "راف فور", en: "RAV4" },
  { slug: "fortuner", ar: "فورتشنر", en: "Fortuner" },
  { slug: "rush", ar: "رش", en: "Rush" },
  { slug: "corolla", ar: "كورولا", en: "Corolla" },
  { slug: "camry", ar: "كامري", en: "Camry" },
  { slug: "rumion", ar: "روميون", en: "Rumion" },
];

const TYPES = [
  { slug: "filters", ar: "فلاتر", en: "Filters" },
  { slug: "oils", ar: "زيوت وسوائل", en: "Oils & Fluids" },
  { slug: "brakes", ar: "فرامل", en: "Brakes" },
  { slug: "suspension", ar: "عفشة وتعليق", en: "Suspension" },
  { slug: "electrical", ar: "كهرباء", en: "Electrical" },
  { slug: "engine", ar: "قطع محرك", en: "Engine" },
  { slug: "cooling", ar: "تبريد", en: "Cooling" },
];

const BRANDS = [
  {
    slug: "toyota-genuine",
    title: "قطع غيار تويوتا الأصلية في مصر | المصرية جروب",
    description:
      "قطع غيار تويوتا الأصلية 100% من موزع معتمد في مصر. فلاتر، فرامل، عفشة، كهرباء ومحرك بأسعار محدثة وتوصيل لكل المحافظات.",
    h1: "قطع غيار تويوتا الأصلية",
  },
  {
    slug: "toyota-oils",
    title: "زيوت تويوتا الأصلية — أسعار محدثة | المصرية جروب",
    description:
      "زيوت تويوتا الأصلية بكل درجات اللزوجة: زيت محرك، زيت فتيس، سوائل فرامل وتبريد. موزع معتمد وأسعار محدثة في مصر.",
    h1: "زيوت وسوائل تويوتا الأصلية",
  },
  {
    slug: "mtx-aftermarket",
    title: "MTX قطع غيار بديلة عالية الجودة | المصرية جروب",
    description:
      "MTX هي العلامة التجارية المسجلة للمصرية جروب لقطع الغيار البديلة بمواصفات تنافس الأصلي وأسعار اقتصادية.",
    h1: "MTX — قطع غيار بديلة عالية الجودة",
  },
  {
    slug: "denso",
    title: "قطع غيار DENSO الأصلية في مصر | المصرية جروب",
    description:
      "قطع غيار دينسو DENSO اليابانية الأصلية: فلاتر، بوچيهات، مراوح، ودوائر تكييف. وكيل معتمد في مصر بأسعار محدثة.",
    h1: "قطع غيار DENSO الأصلية",
  },
  {
    slug: "aisin",
    title: "قطع غيار AISIN الأصلية في مصر | المصرية جروب",
    description:
      "قطع غيار أيسن AISIN اليابانية الأصلية: طرمبات مياه، دبرياج، وقطع نقل الحركة. وكيل معتمد في مصر.",
    h1: "قطع غيار AISIN الأصلية",
  },
  {
    slug: "fbk-brakes",
    title: "تيل فرامل FBK لكل موديلات تويوتا | المصرية جروب",
    description:
      "تيل فرامل FBK بجودة عالية لكل موديلات تويوتا — أداء ثابت وعمر أطول، متوفر بأسعار محدثة في مصر.",
    h1: "تيل فرامل FBK",
  },
  {
    slug: "kyb",
    title: "مساعدين KYB الأصلية لتويوتا في مصر | المصرية جروب",
    description:
      "مساعدين KYB اليابانية الأصلية لموديلات تويوتا: هايس، هايلوكس، كورولا، لاند كروزر وغيرها — توفر فوري وأسعار محدثة.",
    h1: "مساعدين ومكونات تعليق KYB",
  },
  {
    slug: "tp",
    title: "فلاتر TP الأصلية لتويوتا في مصر | المصرية جروب",
    description:
      "فلاتر TP بجودة يابانية لكل موديلات تويوتا: فلتر زيت، فلتر هواء، فلتر بنزين وفلتر مكيف — أسعار محدثة وتوصيل سريع.",
    h1: "فلاتر ومنتجات TP",
  },
  {
    slug: "genuine-toyota-parts",
    title: "دليل قطع غيار تويوتا الأصلية في مصر | المصرية جروب",
    description:
      "كل ما تحتاج معرفته عن قطع غيار تويوتا الأصلية في مصر: الفرق عن المقلد، ضمان الجودة، والأسعار من موزع معتمد.",
    h1: "قطع غيار تويوتا الأصلية — موزع معتمد",
  },
];

const GUIDES = [
  {
    slug: "identifying-genuine-toyota-parts",
    title: "إزاي تفرق بين قطع غيار تويوتا الأصلية والمقلدة",
    description:
      "دليل عملي للتفريق بين قطعة تويوتا الأصلية والمقلدة: الباركود، جودة الطباعة، رقم القطعة، والعبوة — من المصرية جروب.",
  },
  {
    slug: "genuine-vs-mtx-vs-denso",
    title: "الأصلي وMTX وDENSO — إيه الفرق وإمتى تختار كل واحد",
    description:
      "مقارنة تفصيلية بين قطع غيار تويوتا الأصلية وMTX وDENSO من حيث الجودة والسعر والعمر الافتراضي والضمان.",
  },
  {
    slug: "when-to-change-oil-filter",
    title: "إمتى تغير فلتر الزيت في تويوتا؟",
    description:
      "المواعيد الصحيحة لتغيير فلتر الزيت حسب الموديل والكيلومترات، وعلامات إن الفلتر محتاج تغيير فورًا.",
  },
  {
    slug: "when-to-change-brake-pads",
    title: "إمتى تغير تيل الفرامل؟ العلامات والمواعيد",
    description:
      "علامات تلف تيل الفرامل، عمر التيل المتوقع بالكيلومترات، وأنواع التيل المتاحة لموديلات تويوتا في مصر.",
  },
  {
    slug: "toyota-corolla-maintenance",
    title: "جدول صيانة تويوتا كورولا بالكيلومترات",
    description:
      "جدول صيانة كورولا الكامل: الزيوت والفلاتر والفرامل والبوچيهات بكل مرحلة كيلومترات — وقطع الغيار المطلوبة.",
  },
  {
    slug: "toyota-hilux-maintenance",
    title: "جدول صيانة تويوتا هايلوكس بالكيلومترات",
    description:
      "جدول صيانة هايلوكس الكامل حسب الكيلومترات مع قائمة القطع الأصلية المطلوبة في كل خدمة.",
  },
];

const BRANCHES = [
  { name: "فرع أوسيم", address: "أوسيم، الجيزة، مصر", phone: "+201020412358" },
  { name: "فرع التوفيقية", address: "التوفيقية، وسط البلد، القاهرة، مصر", phone: "+201034806288" },
  { name: "فرع الأقصر", address: "الأقصر، مصر", phone: "+201020412358" },
];

const brandLink = (b) => `<li><a href="/products/${b.slug}">${b.h1}</a></li>`;
const modelLink = (m) => `<li><a href="/parts-by-model/${m.slug}">قطع غيار تويوتا ${m.ar}</a></li>`;
const typeLink = (t) => `<li><a href="/parts-by-type/${t.slug}">${t.ar} تويوتا</a></li>`;

const commonLinks = `
  <nav aria-label="روابط الموقع">
    <ul>
      <li><a href="/">الرئيسية</a></li>
      <li><a href="/products">كتالوج المنتجات</a></li>
      <li><a href="/parts-by-model">قطع الغيار حسب الموديل</a></li>
      <li><a href="/parts-by-type">قطع الغيار حسب النوع</a></li>
      <li><a href="/about">عن الشركة</a></li>
      <li><a href="/contact">اتصل بنا</a></li>
    </ul>
  </nav>`;

const orgSchema = {
  "@context": "https://schema.org",
  "@type": "AutoPartsStore",
  name: "المصرية جروب — Al Masria Auto Parts",
  url: SITE,
  logo: `${SITE}/pwa-512x512.png`,
  telephone: "+201020412358",
  email: "info@almasriaautoparts.com",
  priceRange: "EGP",
  address: {
    "@type": "PostalAddress",
    streetAddress: "أوسيم",
    addressLocality: "الجيزة",
    addressCountry: "EG",
  },
  areaServed: "EG",
  sameAs: ["https://wa.me/201020412358"],
  department: BRANCHES.map((b) => ({
    "@type": "LocalBusiness",
    name: `المصرية جروب — ${b.name}`,
    telephone: b.phone,
    priceRange: "EGP",
    address: { "@type": "PostalAddress", streetAddress: b.address, addressCountry: "EG" },
  })),
};

const breadcrumb = (items) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map((it, i) => ({
    "@type": "ListItem",
    position: i + 1,
    name: it.name,
    item: `${SITE}${it.path}`,
  })),
});

/** @type {{path:string,title:string,description:string,body:string,schema?:object[]}[]} */
export const ROUTES = [
  {
    path: "/",
    title: "قطع غيار وزيوت تويوتا الأصلية في مصر | المصرية جروب",
    description:
      "المصرية جروب — موزع معتمد لقطع غيار وزيوت تويوتا الأصلية في مصر منذ 1999. أسعار محدثة، توفر فوري، وتوصيل لكل المحافظات خلال 48 ساعة.",
    body: `
      <h1>قطع غيار وزيوت تويوتا الأصلية في مصر</h1>
      <p>المصرية جروب موزع معتمد لقطع غيار وزيوت تويوتا الأصلية في مصر منذ 1999، مع علامتنا المسجلة MTX للقطع البديلة عالية الجودة، ووكالات DENSO وAISIN وFBK وKYB وTP. توفر فوري وأسعار محدثة يوميًا وتوصيل لكل المحافظات.</p>
      <h2>تصفح حسب العلامة</h2><ul>${BRANDS.slice(0, 8).map(brandLink).join("")}</ul>
      <h2>تصفح حسب موديل السيارة</h2><ul>${MODELS.map(modelLink).join("")}</ul>
      <h2>تصفح حسب نوع القطعة</h2><ul>${TYPES.map(typeLink).join("")}</ul>
      <h2>فروعنا</h2><ul>${BRANCHES.map((b) => `<li>${b.name} — ${b.address} — هاتف: ${b.phone}</li>`).join("")}</ul>
      ${commonLinks}`,
    schema: [orgSchema],
  },
  {
    path: "/about",
    title: "عن المصرية جروب — 25 سنة في قطع غيار تويوتا",
    description:
      "المصرية جروب: أكثر من 25 سنة في توزيع قطع غيار وزيوت تويوتا الأصلية في مصر، شبكة فروع وطنية ومركز إقليمي في دبي.",
    body: `<h1>عن المصرية جروب</h1>
      <p>المصرية جروب شركة مصرية متخصصة في استيراد وتوزيع قطع غيار وزيوت تويوتا الأصلية منذ 1999، بخبرة تتجاوز 25 عامًا وشبكة فروع تغطي القاهرة والجيزة والصعيد، بالإضافة إلى مركز إقليمي في دبي.</p>
      <h2>فروعنا</h2><ul>${BRANCHES.map((b) => `<li>${b.name} — ${b.address} — هاتف: ${b.phone}</li>`).join("")}</ul>
      ${commonLinks}`,
    schema: [orgSchema],
  },
  {
    path: "/contact",
    title: "اتصل بنا — فروع وأرقام المصرية جروب",
    description:
      "أرقام وعناوين فروع المصرية جروب: أوسيم (الجيزة)، التوفيقية (القاهرة)، والأقصر. تواصل معنا واتساب أو هاتف للاستعلام عن الأسعار والتوفر.",
    body: `<h1>اتصل بالمصرية جروب</h1>
      <p>تقدر تتواصل معنا مباشرة للاستعلام عن توفر أي قطعة غيار تويوتا أو سعرها الحالي.</p>
      <h2>الفروع</h2>
      <ul>${BRANCHES.map(
        (b) =>
          `<li><strong>${b.name}</strong> — العنوان: ${b.address} — هاتف/واتساب: <a href="tel:${b.phone}">${b.phone}</a></li>`
      ).join("")}</ul>
      <p>البريد الإلكتروني: <a href="mailto:info@almasriaautoparts.com">info@almasriaautoparts.com</a></p>
      ${commonLinks}`,
    schema: [orgSchema],
  },
  {
    path: "/what-sets-us-apart",
    title: "ليه المصرية جروب؟ مميزاتنا في قطع غيار تويوتا",
    description:
      "توفر فوري، أسعار محدثة يوميًا من نظام ERP، ضمان أصالة القطعة، وتوصيل خلال 48 ساعة لكل محافظات مصر.",
    body: `<h1>ليه تشتري من المصرية جروب</h1>
      <p>أصالة مضمونة، مخزون حقيقي محدّث لحظيًا، أسعار جملة ونصف جملة وقطاعي واضحة، وتوصيل سريع لكل المحافظات.</p>${commonLinks}`,
  },
  {
    path: "/products",
    title: "كتالوج قطع غيار وزيوت تويوتا | المصرية جروب",
    description:
      "تصفح كتالوج المصرية جروب: قطع غيار تويوتا الأصلية، الزيوت، MTX، DENSO، AISIN، FBK، KYB وTP — بتوفر فوري وأسعار محدثة.",
    body: `<h1>كتالوج قطع الغيار والزيوت</h1>
      <p>كل العلامات المتاحة لدى المصرية جروب في مكان واحد.</p>
      <ul>${BRANDS.map(brandLink).join("")}</ul>${commonLinks}`,
  },
  {
    path: "/toyota-genuine-parts-egypt",
    title: "قطع غيار تويوتا الأصلية في مصر — دليل شامل",
    description:
      "دليل شامل لقطع غيار تويوتا الأصلية في مصر: الفئات، الأسعار، الفروع، وكيفية التأكد من أصالة القطعة.",
    body: `<h1>قطع غيار تويوتا الأصلية في مصر</h1>
      <p>دليل شامل لكل ما يخص قطع غيار تويوتا الأصلية في السوق المصري: الفئات المتاحة، طريقة التحقق من الأصالة، والأسعار المحدثة.</p>
      <ul>${MODELS.map(modelLink).join("")}</ul>${commonLinks}`,
  },
  {
    path: "/mtx",
    title: "MTX — علامة المصرية جروب لقطع الغيار البديلة",
    description:
      "MTX علامة تجارية مسجلة للمصرية جروب: قطع غيار بديلة بمواصفات عالية وأسعار اقتصادية لكل موديلات تويوتا.",
    body: `<h1>MTX Aftermarket</h1>
      <p>MTX هي العلامة التجارية المسجلة للمصرية جروب لقطع الغيار البديلة عالية الجودة، مصنعة بمواصفات تنافس الأصلي وبأسعار اقتصادية.</p>${commonLinks}`,
  },
  {
    path: "/catalogs",
    title: "كتالوجات وقوائم أسعار قطع غيار تويوتا",
    description: "حمّل أحدث كتالوجات وقوائم أسعار قطع غيار وزيوت تويوتا من المصرية جروب.",
    body: `<h1>الكتالوجات وقوائم الأسعار</h1><p>أحدث كتالوجات المصرية جروب وقوائم الأسعار المحدثة.</p>${commonLinks}`,
  },
  {
    path: "/policies",
    title: "السياسات — الشحن والاسترجاع والخصوصية",
    description: "سياسات المصرية جروب: الشحن والتوصيل، الاسترجاع والاستبدال، الخصوصية، وشروط الاستخدام.",
    body: `<h1>سياسات المصرية جروب</h1><p>سياسة الشحن والتوصيل، سياسة الاسترجاع والاستبدال، سياسة الخصوصية، وشروط الاستخدام.</p>${commonLinks}`,
  },
  {
    path: "/install",
    title: "حمّل تطبيق المصرية جروب",
    description: "تطبيق المصرية جروب لطلب قطع غيار تويوتا الأصلية ومتابعة الأسعار والتوفر لحظيًا.",
    body: `<h1>تطبيق المصرية جروب</h1><p>حمّل التطبيق لمتابعة الأسعار والتوفر وطلب القطع مباشرة.</p>${commonLinks}`,
  },
  {
    path: "/track-order",
    title: "تتبع طلبك — المصرية جروب",
    description: "تابع حالة طلبك لحظة بلحظة من الاستلام حتى التسليم عبر صفحة تتبع الطلبات.",
    body: `<h1>تتبع الطلب</h1><p>أدخل رقم طلبك لمتابعة حالته من التجهيز حتى التسليم.</p>${commonLinks}`,
  },
  {
    path: "/parts-by-model",
    title: "قطع غيار تويوتا حسب الموديل | المصرية جروب",
    description:
      "اختر موديل تويوتا بتاعك واعرف كل قطع الغيار الأصلية المتاحة له: هايس، كوستر، هايلوكس، كورولا، لاند كروزر وغيرها.",
    body: `<h1>قطع غيار تويوتا حسب الموديل</h1><ul>${MODELS.map(modelLink).join("")}</ul>${commonLinks}`,
  },
  {
    path: "/parts-by-type",
    title: "قطع غيار تويوتا حسب النوع | المصرية جروب",
    description: "تصفح قطع غيار تويوتا حسب النوع: فلاتر، زيوت، فرامل، عفشة، كهرباء، محرك وتبريد.",
    body: `<h1>قطع غيار تويوتا حسب النوع</h1><ul>${TYPES.map(typeLink).join("")}</ul>${commonLinks}`,
  },
  ...MODELS.map((m) => ({
    path: `/parts-by-model/${m.slug}`,
    title: `قطع غيار تويوتا ${m.ar} الأصلية — أسعار وتوفر | المصرية جروب`,
    description: `قطع غيار تويوتا ${m.ar} (${m.en}) الأصلية في مصر: فلاتر، فرامل، عفشة، كهرباء، محرك وزيوت. موزع معتمد، أسعار محدثة وتوصيل لكل المحافظات.`,
    body: `<h1>قطع غيار تويوتا ${m.ar} (${m.en}) الأصلية</h1>
      <p>المصرية جروب توفر كل قطع غيار تويوتا ${m.ar} الأصلية بضمان الأصالة وأسعار محدثة يوميًا، مع توصيل لكل محافظات مصر خلال 48 ساعة.</p>
      <h2>أنواع القطع المتاحة لتويوتا ${m.ar}</h2>
      <ul>${TYPES.map((t) => `<li><a href="/parts-by-type/${t.slug}">${t.ar} تويوتا ${m.ar}</a></li>`).join("")}</ul>
      <h2>موديلات أخرى</h2><ul>${MODELS.filter((x) => x.slug !== m.slug).map(modelLink).join("")}</ul>
      ${commonLinks}`,
    schema: [
      breadcrumb([
        { name: "الرئيسية", path: "/" },
        { name: "حسب الموديل", path: "/parts-by-model" },
        { name: `تويوتا ${m.ar}`, path: `/parts-by-model/${m.slug}` },
      ]),
    ],
  })),
  ...TYPES.map((t) => ({
    path: `/parts-by-type/${t.slug}`,
    title: `${t.ar} تويوتا الأصلية — أسعار وتوفر | المصرية جروب`,
    description: `${t.ar} تويوتا الأصلية لكل الموديلات في مصر. موزع معتمد، أسعار محدثة، وتوصيل سريع لكل المحافظات.`,
    body: `<h1>${t.ar} تويوتا الأصلية (${t.en})</h1>
      <p>تشكيلة كاملة من ${t.ar} تويوتا الأصلية لكل الموديلات، بضمان الأصالة وأسعار محدثة.</p>
      <h2>حسب الموديل</h2>
      <ul>${MODELS.map((m) => `<li><a href="/parts-by-model/${m.slug}">${t.ar} تويوتا ${m.ar}</a></li>`).join("")}</ul>
      ${commonLinks}`,
    schema: [
      breadcrumb([
        { name: "الرئيسية", path: "/" },
        { name: "حسب النوع", path: "/parts-by-type" },
        { name: t.ar, path: `/parts-by-type/${t.slug}` },
      ]),
    ],
  })),
  ...BRANDS.map((b) => ({
    path: `/products/${b.slug}`,
    title: b.title,
    description: b.description,
    body: `<h1>${b.h1}</h1><p>${b.description}</p>
      <h2>متاح لكل موديلات تويوتا</h2><ul>${MODELS.map(modelLink).join("")}</ul>
      <h2>علامات أخرى</h2><ul>${BRANDS.filter((x) => x.slug !== b.slug).map(brandLink).join("")}</ul>
      ${commonLinks}`,
    schema: [
      breadcrumb([
        { name: "الرئيسية", path: "/" },
        { name: "المنتجات", path: "/products" },
        { name: b.h1, path: `/products/${b.slug}` },
      ]),
    ],
  })),
  ...GUIDES.map((g) => ({
    path: `/guides/${g.slug}`,
    title: `${g.title} | المصرية جروب`,
    description: g.description,
    body: `<h1>${g.title}</h1><p>${g.description}</p>
      <p>دليل من المصرية جروب — موزع معتمد لقطع غيار وزيوت تويوتا الأصلية في مصر.</p>${commonLinks}`,
    schema: [
      {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: g.title,
        description: g.description,
        inLanguage: "ar",
        mainEntityOfPage: `${SITE}/guides/${g.slug}`,
        publisher: { "@type": "Organization", name: "المصرية جروب", url: SITE },
      },
    ],
  })),
  ...["wholesale", "workshop", "company"].map((seg) => {
    const label =
      seg === "wholesale" ? "تجار الجملة" : seg === "workshop" ? "مراكز الصيانة والورش" : "الشركات وأساطيل السيارات";
    return {
      path: `/clients/${seg}`,
      title: `حلول ${label} — قطع غيار تويوتا | المصرية جروب`,
      description: `برنامج المصرية جروب لـ${label}: أسعار خاصة، توفر مضمون، حساب أونلاين، وتوصيل مجدول لكل المحافظات.`,
      body: `<h1>حلول ${label}</h1>
        <p>برنامج المصرية جروب لـ${label} يشمل أسعار خاصة، حساب أونلاين لمتابعة الأرصدة والطلبات، وتوصيل مجدول.</p>${commonLinks}`,
    };
  }),
];

export const PRERENDER_MODELS = MODELS;
export const PRERENDER_TYPES = TYPES;
export const PRERENDER_BRANDS = BRANDS;
export const PRERENDER_GUIDES = GUIDES;
