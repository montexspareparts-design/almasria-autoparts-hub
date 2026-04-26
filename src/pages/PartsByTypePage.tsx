import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Filter, ChevronLeft, ShieldCheck, Car, Wrench, Droplets, Zap, Disc, Settings2, Wind } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

import { BreadcrumbSchema, ItemListSchema } from "@/components/SEOSchemaMarkup";
import SEOHead from "@/components/SEOHead";
import { getCategorySEO } from "@/lib/categorySeo";

const SITE = "https://www.almasriaautoparts.com";

interface PartTypeData {
  slug: string;
  nameAr: string;
  nameEn: string;
  icon: React.ElementType;
  intro: string;
  compatibleModels: string[];
  commonParts: { name: string; description: string }[];
  seoTitle: string;
  seoDescription: string;
  keywords: string;
}

const partTypes: PartTypeData[] = [
  {
    slug: "filters",
    nameAr: "فلاتر",
    nameEn: "Filters",
    icon: Filter,
    intro: "فلاتر تويوتا الأصلية تحمي محرك سيارتك وتضمن أداءً مثاليًا. نوفر فلاتر الزيت والهواء والبنزين والديزل والمكيف لجميع موديلات تويوتا. كل فلتر أصلي 100% ومطابق لمعايير تويوتا اليابان.",
    compatibleModels: ["Hiace", "Coaster", "Hilux", "Land Cruiser", "Yaris", "RAV4", "Fortuner", "Corolla", "Camry"],
    commonParts: [
      { name: "فلتر زيت المحرك", description: "حماية المحرك من الشوائب وضمان تدفق زيت نظيف" },
      { name: "فلتر هواء المحرك", description: "تنقية الهواء الداخل للمحرك لضمان احتراق مثالي" },
      { name: "فلتر بنزين / ديزل", description: "حماية نظام الوقود من الأوساخ والرواسب" },
      { name: "فلتر مكيف الهواء", description: "هواء نظيف داخل المقصورة لراحة الركاب" },
      { name: "فلتر ناقل الحركة", description: "حماية الفتيس الأوتوماتيك وضمان نعومة التعشيق" },
    ],
    seoTitle: "فلاتر تويوتا الأصلية في مصر | فلتر زيت وهواء وبنزين OEM",
    seoDescription: "فلاتر تويوتا الأصلية: زيت، هواء، بنزين، ديزل، ومكيف لجميع موديلات تويوتا (هايلوكس، لاند كروزر، كورولا، كامري، هايس). موزع معتمد، توصيل خلال 48 ساعة.",
    keywords: "فلاتر تويوتا الأصلية, فلتر زيت تويوتا, فلتر هواء تويوتا, فلتر بنزين تويوتا, فلتر مكيف, Toyota OEM filters Egypt",
  },
  {
    slug: "oils",
    nameAr: "زيوت وسوائل",
    nameEn: "Oils & Fluids",
    icon: Droplets,
    intro: "زيوت تويوتا الأصلية بجميع درجات اللزوجة لمحركات البنزين والديزل. نوفر أيضًا زيوت الفتيس وسوائل الفرامل وسائل التبريد. كل منتج أصلي ومعتمد من تويوتا لضمان أطول عمر افتراضي لمحركك.",
    compatibleModels: ["Hiace", "Coaster", "Hilux", "Land Cruiser", "Yaris", "RAV4", "Fortuner", "Corolla", "Camry", "Rush"],
    commonParts: [
      { name: "زيت محرك بنزين 5W-30", description: "الأنسب لمعظم موديلات تويوتا الحديثة" },
      { name: "زيت محرك ديزل 15W-40", description: "مثالي للهايلوكس والكوستر والهايس الديزل" },
      { name: "زيت فتيس أوتوماتيك ATF", description: "لنعومة تعشيق الفتيس وحماية التروس" },
      { name: "سائل فرامل DOT-4", description: "أداء فرملة آمن في جميع الظروف" },
      { name: "سائل تبريد المحرك", description: "حماية المحرك من الحرارة الزائدة" },
    ],
    seoTitle: "زيوت تويوتا الأصلية في مصر | زيت محرك 5W-30 و15W-40 و ATF",
    seoDescription: "زيوت محرك تويوتا الأصلية (5W-30، 10W-40، 15W-40)، زيت فتيس ATF، سائل فرامل DOT-4، وسائل تبريد. لجميع موديلات تويوتا، موزع معتمد، تسليم خلال 48 ساعة.",
    keywords: "زيوت تويوتا الأصلية, زيت محرك تويوتا 5W-30, زيت فتيس ATF, سائل فرامل DOT-4, Toyota Genuine Oil Egypt",
  },
  {
    slug: "brakes",
    nameAr: "فرامل",
    nameEn: "Brakes",
    icon: Disc,
    intro: "أنظمة فرامل تويوتا الأصلية لأمان لا يُساوم عليه. أقمشة فرامل أمامية وخلفية، هوبات، ديسكات، وخراطيم فرامل أصلية لجميع موديلات تويوتا. سلامتك أولوية ولذلك نوفر فقط قطع أصلية معتمدة.",
    compatibleModels: ["Hiace", "Coaster", "Hilux", "Land Cruiser", "Fortuner", "RAV4", "Corolla", "Yaris"],
    commonParts: [
      { name: "أقمشة فرامل أمامية", description: "تآكل متساوي وفرملة قوية وهادئة" },
      { name: "أقمشة فرامل خلفية", description: "أداء متوازن مع الفرامل الأمامية" },
      { name: "ديسك فرامل أمامي", description: "تبديد حرارة فعال لفرملة مستقرة" },
      { name: "هوبة فرامل خلفية", description: "متانة عالية لموديلات الدفع الخلفي" },
      { name: "خرطوم فرامل", description: "مقاومة ضغط عالية ومرونة ممتازة" },
    ],
    seoTitle: "فرامل تويوتا الأصلية | أقمشة وديسكات وهوبات OEM في مصر",
    seoDescription: "قطع فرامل تويوتا الأصلية: أقمشة أمامية وخلفية، ديسكات، هوبات، وخراطيم لجميع موديلات تويوتا. أمان معتمد من المصنع، توصيل لكل المحافظات.",
    keywords: "فرامل تويوتا الأصلية, أقمشة فرامل تويوتا, ديسك فرامل تويوتا, Toyota brake pads Egypt",
  },
  {
    slug: "suspension",
    nameAr: "تعليق وعفشة",
    nameEn: "Suspension & Chassis",
    icon: Settings2,
    intro: "قطع تعليق وعفشة تويوتا الأصلية لثبات وراحة على كل الطرق. مساعدين، كاوتشات مقصات، مقصات، روتينات، وطقم عفشة كامل لجميع الموديلات. نضمن لك قيادة مريحة وآمنة بقطع أصلية 100%.",
    compatibleModels: ["Hilux", "Land Cruiser", "Fortuner", "RAV4", "Corolla", "Camry", "Hiace"],
    commonParts: [
      { name: "مساعد أمامي", description: "امتصاص صدمات فعال لراحة القيادة" },
      { name: "مساعد خلفي", description: "ثبات الجزء الخلفي خاصة مع الحمولات" },
      { name: "كاوتش مقص", description: "عزل الاهتزازات ومنع الأصوات" },
      { name: "روتينة (كبيرة/صغيرة)", description: "تحكم دقيق في حركة العجلات" },
      { name: "مقص أمامي", description: "ربط العجلات بالشاسيه بثبات" },
    ],
    seoTitle: "قطع تعليق وعفشة تويوتا الأصلية | مساعدين ومقصات وروتينات",
    seoDescription: "قطع التعليق والعفشة (Chassis) الأصلية لتويوتا: مساعدين، مقصات، كاوتشات، روتينات لكل الموديلات. ثبات وراحة بضمان OEM وموزع معتمد في مصر.",
    keywords: "تعليق تويوتا الأصلي, مساعدات تويوتا, مقصات تويوتا, عفشة تويوتا الأصلية, Toyota suspension chassis Egypt",
  },
  {
    slug: "electrical",
    nameAr: "كهرباء",
    nameEn: "Electrical",
    icon: Zap,
    intro: "قطع كهرباء تويوتا الأصلية لأداء موثوق. بواجي، كويلات، دينامو، مارش، حساسات، ولمبات أصلية. جميع القطع مطابقة لمواصفات تويوتا وتضمن عمل كهرباء سيارتك بكفاءة تامة.",
    compatibleModels: ["Hiace", "Coaster", "Hilux", "Land Cruiser", "Yaris", "Corolla", "Camry", "Fortuner"],
    commonParts: [
      { name: "بواجي (شمعات إشعال)", description: "إشعال فعال واحتراق نظيف" },
      { name: "كويل إشعال", description: "توصيل الشرارة الكهربائية للبواجي" },
      { name: "دينامو", description: "شحن البطارية وتغذية الأنظمة الكهربائية" },
      { name: "مارش (بادئ الحركة)", description: "تشغيل المحرك بسلاسة وموثوقية" },
      { name: "حساس أكسجين", description: "ضبط نسبة الوقود والهواء لأداء مثالي" },
    ],
    seoTitle: "قطع كهرباء تويوتا الأصلية | بواجي وكويلات ودينامو ومارش",
    seoDescription: "قطع كهرباء تويوتا الأصلية: بواجي (Denso/NGK)، كويلات إشعال، دينامو، مارش، وحساسات أكسجين لكل موديلات تويوتا. أداء موثوق بضمان OEM.",
    keywords: "كهرباء تويوتا الأصلية, بواجي تويوتا, كويل تويوتا, دينامو تويوتا, مارش تويوتا, Toyota electrical OEM Egypt",
  },
  {
    slug: "engine",
    nameAr: "محرك",
    nameEn: "Motor & Engine",
    icon: Wrench,
    intro: "قطع محرك تويوتا الأصلية لقلب سيارتك. طقم سير توقيت، شداد، طرمبة مياه، جوانات، وقطع داخلية أصلية. نحرص على توفير كل ما يحتاجه محركك للعمل بأقصى كفاءة.",
    compatibleModels: ["Hiace", "Coaster", "Hilux", "Land Cruiser", "Fortuner", "Corolla", "Camry"],
    commonParts: [
      { name: "طقم سير توقيت", description: "مزامنة دقيقة لعمل المحرك" },
      { name: "طرمبة مياه", description: "تدوير سائل التبريد لمنع ارتفاع الحرارة" },
      { name: "جوان رأس المحرك", description: "عزل محكم بين رأس المحرك والبلوك" },
      { name: "شداد سير", description: "شد مناسب للسيور لمنع الانزلاق" },
      { name: "طرمبة زيت", description: "ضغط زيت كافي لتزييت جميع الأجزاء" },
    ],
    seoTitle: "قطع محرك تويوتا الأصلية (Motor) | سير توقيت وجوانات وطرمبات",
    seoDescription: "قطع محرك (Motor) تويوتا الأصلية: طقم سير توقيت، طرمبة مياه، طرمبة زيت، جوان رأس، وشدادات لجميع موديلات تويوتا بضمان OEM في مصر.",
    keywords: "قطع محرك تويوتا, موتور تويوتا الأصلي, سير توقيت تويوتا, طرمبة مياه تويوتا, Toyota engine motor parts Egypt",
  },
  {
    slug: "cooling",
    nameAr: "تبريد",
    nameEn: "Cooling System",
    icon: Wind,
    intro: "أنظمة تبريد تويوتا الأصلية لحماية محركك من الحرارة. رادياتير، طرمبة مياه، ثيرموستات، وخراطيم تبريد أصلية. خاصة في المناخ الحار، نظام التبريد الأصلي ضروري لعمر المحرك.",
    compatibleModels: ["Coaster", "Hiace", "Hilux", "Land Cruiser", "Fortuner"],
    commonParts: [
      { name: "رادياتير", description: "تبديد الحرارة من سائل التبريد" },
      { name: "ثيرموستات", description: "تنظيم درجة حرارة المحرك المثالية" },
      { name: "مروحة رادياتير", description: "سحب الهواء عبر الرادياتير للتبريد" },
      { name: "خرطوم تبريد علوي/سفلي", description: "نقل سائل التبريد بين المحرك والرادياتير" },
      { name: "غطاء رادياتير", description: "الحفاظ على ضغط نظام التبريد" },
    ],
    seoTitle: "نظام تبريد تويوتا الأصلي | رادياتير وثيرموستات وخراطيم تبريد",
    seoDescription: "قطع نظام التبريد الأصلية لتويوتا: رادياتير، ثيرموستات، مروحة، خراطيم، وغطاء رادياتير. حماية محركك من حرارة الصيف بقطع OEM معتمدة.",
    keywords: "تبريد تويوتا الأصلي, رادياتير تويوتا, ثيرموستات تويوتا, خرطوم تبريد تويوتا, Toyota cooling system Egypt",
  },
];

/* ── Part Type Detail ── */
const TypeDetailView = ({ type }: { type: PartTypeData }) => {
  const Icon = type.icon;

  // Prefer the centralised, DB-aligned bilingual SEO meta when this slug
  // maps to a real category in `product_categories.slug`. Fall back to
  // the page-local copy below for legacy slugs (e.g. `engine`, `oils`)
  // that don't have a 1:1 DB row — those still get reasonable Arabic-only
  // meta from the original `partTypes` list.
  const central = getCategorySEO(type.slug);

  const titleAr = central?.titleAr ?? type.seoTitle;
  const titleEn = central?.titleEn ?? type.seoTitle;
  const descriptionAr = central?.descriptionAr ?? type.seoDescription;
  const descriptionEn = central?.descriptionEn ?? type.seoDescription;
  const keywordsAr = central?.keywordsAr ?? type.keywords;
  const keywordsEn = central?.keywordsEn ?? type.keywords;

  return (
    <>
      <SEOHead
        titleAr={titleAr}
        titleEn={titleEn}
        descriptionAr={descriptionAr}
        descriptionEn={descriptionEn}
        keywordsAr={keywordsAr}
        keywordsEn={keywordsEn}
        ogType="website"
        canonical={`/parts-by-type/${type.slug}`}
        breadcrumbs={[
          { ar: "الرئيسية", en: "Home", url: "/" },
          { ar: "حسب نوع القطعة", en: "By Part Type", url: "/parts-by-type" },
          { ar: type.nameAr, en: type.nameEn, url: `/parts-by-type/${type.slug}` },
        ]}
      />
      <BreadcrumbSchema items={[
        { name: "الرئيسية", url: SITE },
        { name: "حسب نوع القطعة", url: `${SITE}/parts-by-type` },
        { name: type.nameAr, url: `${SITE}/parts-by-type/${type.slug}` },
      ]} />

      {/* Hero */}
      <section className="pt-24 md:pt-32 pb-12 bg-gradient-to-b from-secondary to-background">
        <div className="container mx-auto px-4">
          <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6 flex-wrap">
            <Link to="/" className="hover:text-primary transition-colors">الرئيسية</Link>
            <ChevronLeft className="w-3.5 h-3.5" />
            <Link to="/parts-by-type" className="hover:text-primary transition-colors">حسب نوع القطعة</Link>
            <ChevronLeft className="w-3.5 h-3.5" />
            <span className="text-foreground font-medium">{type.nameAr}</span>
          </nav>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-primary/10 rounded-full px-4 py-1.5 text-primary text-sm font-bold mb-4">
              <Icon className="w-4 h-4" />
              {type.nameEn}
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-foreground mb-4 leading-tight">
              {type.nameAr} تويوتا <span className="text-primary">الأصلية</span>
            </h1>
            <p className="text-muted-foreground text-base md:text-lg leading-[1.8]">{type.intro}</p>
          </motion.div>
        </div>
      </section>

      {/* Compatible Models */}
      <section className="py-10 bg-background border-b border-border">
        <div className="container mx-auto px-4">
          <h2 className="text-xl font-bold text-foreground mb-4">الموديلات المتوافقة</h2>
          <div className="flex flex-wrap gap-2">
            {type.compatibleModels.map(m => {
              const slug = m.toLowerCase().replace(/ /g, "-");
              return (
                <Link
                  key={m}
                  to={`/parts-by-model/${slug}`}
                  className="inline-flex items-center gap-1.5 bg-secondary hover:bg-primary/10 border border-border hover:border-primary/30 rounded-full px-4 py-2 text-sm font-medium text-foreground transition-colors"
                >
                  <Car className="w-3.5 h-3.5 text-primary" />
                  {m}
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Common Parts */}
      <section className="py-12 md:py-16 bg-background">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold text-foreground mb-8">أشهر قطع {type.nameAr}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
            {type.commonParts.map((p, i) => (
              <motion.div
                key={p.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="bg-card border border-border rounded-xl p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 p-2 rounded-lg bg-primary/10">
                    <ShieldCheck className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground text-sm mb-1">{p.name}</h3>
                    <p className="text-muted-foreground text-xs leading-relaxed">{p.description}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

        </div>
      </section>
    </>
  );
};

/* ── Landing ── */
const TypesLanding = () => (
  <>
    <SEOHead
      titleAr="قطع غيار تويوتا حسب نوع القطعة"
      titleEn="Toyota Parts by Category"
      descriptionAr="تصفح قطع غيار تويوتا الأصلية حسب نوع القطعة: فلاتر، زيوت بنزين/ديزل، فرامل، عفشة ومساعدين، كهرباء وبوجيهات، تبريد، جوانات وسيور. موزع معتمد في مصر."
      descriptionEn="Browse Toyota genuine parts by category: filters, gasoline & diesel oils, brakes, suspension & shocks, electrical & spark plugs, cooling, gaskets and belts. Authorized distributor in Egypt."
      keywordsAr="قطع غيار تويوتا, فلاتر تويوتا, زيوت تويوتا, فرامل تويوتا, عفشة تويوتا, كهرباء تويوتا, تبريد تويوتا"
      keywordsEn="Toyota parts Egypt, Toyota filters, Toyota oil, Toyota brakes, Toyota suspension, Toyota electrical, Toyota cooling"
      canonical="/parts-by-type"
      breadcrumbs={[
        { ar: "الرئيسية", en: "Home", url: "/" },
        { ar: "حسب نوع القطعة", en: "By Part Type", url: "/parts-by-type" },
      ]}
    />
    <BreadcrumbSchema items={[
      { name: "الرئيسية", url: SITE },
      { name: "حسب نوع القطعة", url: `${SITE}/parts-by-type` },
    ]} />
    <ItemListSchema name="أنواع قطع غيار تويوتا" items={partTypes.map((t, i) => ({
      name: `${t.nameAr} تويوتا الأصلية`,
      url: `${SITE}/parts-by-type/${t.slug}`,
      position: i + 1,
    }))} />

    <section className="pt-24 md:pt-32 pb-12 bg-gradient-to-b from-secondary to-background">
      <div className="container mx-auto px-4 text-center">
        <div className="inline-flex items-center gap-2 bg-primary/10 rounded-full px-4 py-1.5 text-primary text-sm font-bold mb-4">
          <Wrench className="w-4 h-4" />
          كتالوج حسب نوع القطعة
        </div>
        <h1 className="text-3xl md:text-5xl font-black text-foreground mb-4">
          قطع غيار تويوتا حسب <span className="text-primary">النوع</span>
        </h1>
        <p className="text-muted-foreground max-w-xl mx-auto text-base md:text-lg leading-relaxed">
          اختر نوع القطعة المطلوبة وتصفح التفاصيل والموديلات المتوافقة
        </p>
      </div>
    </section>

    <section className="py-12 md:py-16 bg-background">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {partTypes.map((pt, i) => {
            const Icon = pt.icon;
            return (
              <motion.div
                key={pt.slug}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
              >
                <Link
                  to={`/parts-by-type/${pt.slug}`}
                  className="group block bg-card border border-border rounded-2xl overflow-hidden hover:border-primary/40 hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
                >
                  <div className="bg-secondary/50 p-8 flex items-center justify-center">
                    <Icon className="w-12 h-12 text-primary/60 group-hover:text-primary transition-colors" />
                  </div>
                  <div className="p-4 text-center">
                    <h2 className="font-bold text-foreground text-base mb-1">{pt.nameAr}</h2>
                    <p className="text-xs text-muted-foreground mb-2">{pt.nameEn}</p>
                    <span className="text-xs text-muted-foreground">{pt.compatibleModels.length} موديل متوافق</span>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  </>
);

/* ── Main Page ── */
const PartsByTypePage = () => {
  const { type } = useParams<{ type: string }>();
  const typeData = type ? partTypes.find(t => t.slug === type) : null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      {typeData ? <TypeDetailView type={typeData} /> : <TypesLanding />}
      <Footer />
    </div>
  );
};

export default PartsByTypePage;
