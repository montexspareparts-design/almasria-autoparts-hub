import { Helmet } from "react-helmet-async";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Car, ChevronLeft, Search, ShieldCheck, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

import { BreadcrumbSchema, ItemListSchema } from "@/components/SEOSchemaMarkup";

const SITE = "https://almasriaautoparts.com";

interface ModelData {
  name: string;
  nameAr: string;
  slug: string;
  image: string;
  intro: string;
  partTypes: { label: string; slug: string }[];
}

const models: ModelData[] = [
  {
    name: "Hiace",
    nameAr: "هايس",
    slug: "hiace",
    image: "https://images.unsplash.com/photo-1559416523-140ddc3d238c?w=600&q=80",
    intro: "تويوتا هايس من أكثر السيارات التجارية انتشارًا في مصر والشرق الأوسط. نوفر جميع قطع غيار هايس الأصلية بما يشمل فلاتر المحرك، أقمشة الفرامل، مساعدين العفشة، طرمبات المياه، وقطع الكهرباء. سواء كانت سيارتك للنقل التجاري أو السياحي، نضمن توفير القطعة المطابقة برقم الشاسيه.",
    partTypes: [
      { label: "فلاتر هايس", slug: "filters" },
      { label: "فرامل هايس", slug: "brakes" },
      { label: "محرك هايس", slug: "engine" },
      { label: "كهرباء هايس", slug: "electrical" },
      { label: "تعليق هايس", slug: "suspension" },
      { label: "زيوت هايس", slug: "oils" },
    ],
  },
  {
    name: "Coaster",
    nameAr: "كوستر",
    slug: "coaster",
    image: "https://images.unsplash.com/photo-1570125909232-eb263c188f7e?w=600&q=80",
    intro: "تويوتا كوستر الباص الأشهر في قطاع النقل الجماعي. نوفر قطع الغيار الأصلية للكوستر بجميع موديلاته من المحرك والفلاتر وحتى أنظمة الفرامل والتبريد. خبرتنا في خدمة أساطيل النقل تضمن لك قطعًا أصلية 100% مع ضمان التوافق.",
    partTypes: [
      { label: "فلاتر كوستر", slug: "filters" },
      { label: "فرامل كوستر", slug: "brakes" },
      { label: "محرك كوستر", slug: "engine" },
      { label: "تبريد كوستر", slug: "cooling" },
      { label: "كهرباء كوستر", slug: "electrical" },
    ],
  },
  {
    name: "Hilux",
    nameAr: "هايلوكس",
    slug: "hilux",
    image: "https://images.unsplash.com/photo-1559416523-140ddc3d238c?w=600&q=80",
    intro: "تويوتا هايلوكس البيك أب الأقوى والأكثر مبيعًا. نوفر كامل قطع الغيار الأصلية للهايلوكس من فلاتر الزيت والهواء والديزل، أقمشة وهوبات الفرامل، مساعدين وطقم عفشة، وقطع المحرك. متاح لجميع الموديلات من 2005 حتى 2025.",
    partTypes: [
      { label: "فلاتر هايلوكس", slug: "filters" },
      { label: "فرامل هايلوكس", slug: "brakes" },
      { label: "عفشة هايلوكس", slug: "suspension" },
      { label: "محرك هايلوكس", slug: "engine" },
      { label: "زيوت هايلوكس", slug: "oils" },
    ],
  },
  {
    name: "Land Cruiser",
    nameAr: "لاند كروزر",
    slug: "land-cruiser",
    image: "https://images.unsplash.com/photo-1559416523-140ddc3d238c?w=600&q=80",
    intro: "تويوتا لاند كروزر رمز القوة والفخامة. نوفر قطع غيار أصلية لجميع إصدارات لاند كروزر بما يشمل LC200 وLC300 وبرادو. من فلاتر المحرك والزيوت إلى أنظمة التعليق والفرامل والكهرباء، كل قطعة أصلية 100% من تويوتا.",
    partTypes: [
      { label: "فلاتر لاند كروزر", slug: "filters" },
      { label: "فرامل لاند كروزر", slug: "brakes" },
      { label: "عفشة لاند كروزر", slug: "suspension" },
      { label: "محرك لاند كروزر", slug: "engine" },
      { label: "كهرباء لاند كروزر", slug: "electrical" },
      { label: "زيوت لاند كروزر", slug: "oils" },
    ],
  },
  {
    name: "Yaris",
    nameAr: "ياريس",
    slug: "yaris",
    image: "https://images.unsplash.com/photo-1559416523-140ddc3d238c?w=600&q=80",
    intro: "تويوتا ياريس السيارة الاقتصادية الأكثر انتشارًا. نوفر جميع قطع الغيار الأصلية لياريس من فلاتر وزيوت وأقمشة فرامل وقطع كهرباء ومساعدين. أسعار تنافسية مع ضمان الجودة الأصلية.",
    partTypes: [
      { label: "فلاتر ياريس", slug: "filters" },
      { label: "فرامل ياريس", slug: "brakes" },
      { label: "زيوت ياريس", slug: "oils" },
      { label: "كهرباء ياريس", slug: "electrical" },
    ],
  },
  {
    name: "RAV4",
    nameAr: "راف فور",
    slug: "rav4",
    image: "https://images.unsplash.com/photo-1559416523-140ddc3d238c?w=600&q=80",
    intro: "تويوتا RAV4 من أنجح سيارات الـ SUV في العالم. نوفر كامل قطع الغيار الأصلية للـ RAV4 بما يشمل فلاتر المحرك والمكيف، أقمشة الفرامل، زيوت المحرك والفتيس، وقطع التعليق. متاح لجميع الموديلات.",
    partTypes: [
      { label: "فلاتر RAV4", slug: "filters" },
      { label: "فرامل RAV4", slug: "brakes" },
      { label: "عفشة RAV4", slug: "suspension" },
      { label: "زيوت RAV4", slug: "oils" },
    ],
  },
  {
    name: "Fortuner",
    nameAr: "فورتشنر",
    slug: "fortuner",
    image: "https://images.unsplash.com/photo-1559416523-140ddc3d238c?w=600&q=80",
    intro: "تويوتا فورتشنر SUV العائلي المفضل. نوفر جميع قطع الغيار الأصلية للفورتشنر من فلاتر وفرامل وعفشة ومحرك وزيوت. كل القطع أصلية ومطابقة لمعايير تويوتا اليابان مع توصيل لجميع المحافظات.",
    partTypes: [
      { label: "فلاتر فورتشنر", slug: "filters" },
      { label: "فرامل فورتشنر", slug: "brakes" },
      { label: "عفشة فورتشنر", slug: "suspension" },
      { label: "محرك فورتشنر", slug: "engine" },
      { label: "زيوت فورتشنر", slug: "oils" },
    ],
  },
  {
    name: "Rush",
    nameAr: "رش",
    slug: "rush",
    image: "https://images.unsplash.com/photo-1559416523-140ddc3d238c?w=600&q=80",
    intro: "تويوتا رش SUV المدمجة العملية. نوفر قطع الغيار الأصلية لتويوتا رش بأسعار تنافسية وتوصيل سريع. فلاتر، فرامل، زيوت، وقطع كهرباء متوفرة بالكامل.",
    partTypes: [
      { label: "فلاتر رش", slug: "filters" },
      { label: "فرامل رش", slug: "brakes" },
      { label: "زيوت رش", slug: "oils" },
    ],
  },
  {
    name: "Corolla",
    nameAr: "كورولا",
    slug: "corolla",
    image: "https://images.unsplash.com/photo-1559416523-140ddc3d238c?w=600&q=80",
    intro: "تويوتا كورولا السيارة الأكثر مبيعًا في التاريخ. نوفر جميع قطع الغيار الأصلية للكورولا بكافة موديلاتها. فلاتر، فرامل، زيوت، كهرباء، وتعليق — كل شيء أصلي 100% مع ضمان الجودة.",
    partTypes: [
      { label: "فلاتر كورولا", slug: "filters" },
      { label: "فرامل كورولا", slug: "brakes" },
      { label: "زيوت كورولا", slug: "oils" },
      { label: "كهرباء كورولا", slug: "electrical" },
      { label: "عفشة كورولا", slug: "suspension" },
    ],
  },
  {
    name: "Camry",
    nameAr: "كامري",
    slug: "camry",
    image: "https://images.unsplash.com/photo-1559416523-140ddc3d238c?w=600&q=80",
    intro: "تويوتا كامري سيدان الفخامة والراحة. نوفر كامل قطع الغيار الأصلية للكامري من فلاتر وزيوت وفرامل وكهرباء. كل القطع مطابقة لمعايير تويوتا مع شحن سريع لجميع المحافظات.",
    partTypes: [
      { label: "فلاتر كامري", slug: "filters" },
      { label: "فرامل كامري", slug: "brakes" },
      { label: "زيوت كامري", slug: "oils" },
      { label: "كهرباء كامري", slug: "electrical" },
    ],
  },
];

/* ── Model Detail Page ── */
const ModelDetailView = ({ model }: { model: ModelData }) => (
  <>
    <Helmet>
      <title>قطع غيار تويوتا {model.nameAr} الأصلية | المصرية جروب</title>
      <meta name="description" content={`قطع غيار تويوتا ${model.nameAr} (${model.name}) الأصلية. فلاتر، فرامل، زيوت، محرك وكهرباء. موزع معتمد في مصر — توصيل لجميع المحافظات.`} />
      <link rel="canonical" href={`${SITE}/parts-by-model/${model.slug}`} />
    </Helmet>
    <BreadcrumbSchema items={[
      { name: "الرئيسية", url: SITE },
      { name: "حسب الموديل", url: `${SITE}/parts-by-model` },
      { name: `تويوتا ${model.nameAr}`, url: `${SITE}/parts-by-model/${model.slug}` },
    ]} />

    {/* Hero */}
    <section className="pt-24 md:pt-32 pb-12 bg-gradient-to-b from-secondary to-background">
      <div className="container mx-auto px-4">
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6 flex-wrap">
          <Link to="/" className="hover:text-primary transition-colors">الرئيسية</Link>
          <ChevronLeft className="w-3.5 h-3.5" />
          <Link to="/parts-by-model" className="hover:text-primary transition-colors">حسب الموديل</Link>
          <ChevronLeft className="w-3.5 h-3.5" />
          <span className="text-foreground font-medium">تويوتا {model.nameAr}</span>
        </nav>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-3xl"
        >
          <div className="inline-flex items-center gap-2 bg-primary/10 rounded-full px-4 py-1.5 text-primary text-sm font-bold mb-4">
            <ShieldCheck className="w-4 h-4" />
            قطع غيار أصلية 100%
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-foreground mb-4 leading-tight">
            قطع غيار تويوتا {model.nameAr} <span className="text-primary">({model.name})</span>
          </h1>
          <p className="text-muted-foreground text-base md:text-lg leading-[1.8] mb-6">
            {model.intro}
          </p>
        </motion.div>
      </div>
    </section>

    {/* Part Types Grid */}
    <section className="py-12 md:py-16 bg-background">
      <div className="container mx-auto px-4">
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-8">
          أنواع القطع المتوفرة لـ {model.nameAr}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-12">
          {model.partTypes.map((pt, i) => (
            <motion.div
              key={pt.slug}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
            >
              <Link
                to={`/parts-by-type/${pt.slug}`}
                className="block bg-card border border-border rounded-xl p-5 text-center hover:border-primary/40 hover:shadow-md hover:-translate-y-1 transition-all duration-300"
              >
                <Wrench className="w-8 h-8 text-primary mx-auto mb-3" />
                <span className="font-bold text-foreground text-sm">{pt.label}</span>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* CTA + Form */}
        <div className="max-w-2xl mx-auto">
          <PartRequestForm defaultModel={model.name} />
        </div>
      </div>
    </section>
  </>
);

/* ── Landing (all models) ── */
const ModelsLanding = () => (
  <>
    <Helmet>
      <title>قطع غيار تويوتا حسب الموديل | المصرية جروب</title>
      <meta name="description" content="تصفح قطع غيار تويوتا الأصلية حسب موديل السيارة: هايس، كوستر، هايلوكس، لاند كروزر، ياريس، RAV4، فورتشنر، رش، كورولا، كامري. موزع معتمد في مصر." />
      <link rel="canonical" href={`${SITE}/parts-by-model`} />
    </Helmet>
    <BreadcrumbSchema items={[
      { name: "الرئيسية", url: SITE },
      { name: "حسب الموديل", url: `${SITE}/parts-by-model` },
    ]} />
    <ItemListSchema name="موديلات تويوتا المدعومة" items={models.map((m, i) => ({
      name: `قطع غيار تويوتا ${m.nameAr}`,
      url: `${SITE}/parts-by-model/${m.slug}`,
      position: i + 1,
    }))} />

    <section className="pt-24 md:pt-32 pb-12 bg-gradient-to-b from-secondary to-background">
      <div className="container mx-auto px-4 text-center">
        <div className="inline-flex items-center gap-2 bg-primary/10 rounded-full px-4 py-1.5 text-primary text-sm font-bold mb-4">
          <Car className="w-4 h-4" />
          كتالوج حسب الموديل
        </div>
        <h1 className="text-3xl md:text-5xl font-black text-foreground mb-4">
          قطع غيار تويوتا حسب <span className="text-primary">الموديل</span>
        </h1>
        <p className="text-muted-foreground max-w-xl mx-auto text-base md:text-lg leading-relaxed">
          اختر موديل سيارتك وتصفح جميع قطع الغيار الأصلية المتوفرة له
        </p>
      </div>
    </section>

    <section className="py-12 md:py-16 bg-background">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
          {models.map((m, i) => (
            <motion.div
              key={m.slug}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
            >
              <Link
                to={`/parts-by-model/${m.slug}`}
                className="group block bg-card border border-border rounded-2xl overflow-hidden hover:border-primary/40 hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
              >
                <div className="bg-secondary/50 p-6 flex items-center justify-center">
                  <Car className="w-12 h-12 text-primary/60 group-hover:text-primary transition-colors" />
                </div>
                <div className="p-4 text-center">
                  <h2 className="font-bold text-foreground text-base mb-1">{m.nameAr}</h2>
                  <p className="text-xs text-muted-foreground">{m.name}</p>
                  <span className="inline-flex items-center gap-1 text-primary text-xs font-semibold mt-2 group-hover:gap-2 transition-all">
                    تصفح القطع
                    <ChevronLeft className="w-3 h-3" />
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  </>
);

/* ── Main Page ── */
const PartsByModelPage = () => {
  const { model } = useParams<{ model: string }>();
  const modelData = model ? models.find(m => m.slug === model) : null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      {modelData ? <ModelDetailView model={modelData} /> : <ModelsLanding />}
      <Footer />
    </div>
  );
};

export default PartsByModelPage;
