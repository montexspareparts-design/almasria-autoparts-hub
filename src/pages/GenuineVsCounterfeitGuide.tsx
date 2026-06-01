import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  ShieldCheck, AlertTriangle, CheckCircle2, XCircle, Package, Barcode,
  Sparkles, Phone, MessageCircle, ArrowLeft, Eye, Wrench, FileBadge,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { FAQSchema, BreadcrumbSchema, HowToSchema } from "@/components/SEOSchemaMarkup";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";

const SITE_URL = "https://www.almasriaautoparts.com";
const PAGE_URL = `${SITE_URL}/guides/identifying-genuine-toyota-parts`;

const GenuineVsCounterfeitGuide = () => {
  const { isAr } = useLanguage();

  const checkpoints = isAr ? [
    {
      icon: Package,
      title: "العبوة والطباعة",
      genuine: "طباعة حادة، ألوان ثابتة، شعار تويوتا واضح بدون تشويش، وكرتون متين بسماكة موحدة.",
      fake: "ألوان باهتة أو متفاوتة، أخطاء إملائية في الاسم، شعار مطبوع بصورة ضعيفة، وكرتون رقيق.",
    },
    {
      icon: Sparkles,
      title: "الهولوجرام (الملصق الأمني)",
      genuine: "هولوجرام ثلاثي الأبعاد يتغيّر لونه مع زاوية الإضاءة، ويحتوي على شعار TOYOTA متكرر داخل النقش.",
      fake: "ملصق فضي مسطّح لا يتغيّر مع الإضاءة، أو هولوجرام مزيف بدون تفاصيل دقيقة.",
    },
    {
      icon: Barcode,
      title: "رقم القطعة (Part Number)",
      genuine: "رقم قطعة من 10 أو 11 خانة (مثل 90915-YZZD2) منقوش/مطبوع على القطعة نفسها وعلى العبوة بنفس الرقم.",
      fake: "اختلاف بين رقم العبوة ورقم القطعة، أو طباعة الرقم بحبر يُمسح بسهولة.",
    },
    {
      icon: FileBadge,
      title: "بلد المنشأ وبيانات الباركود",
      genuine: "Made in Japan / Thailand / Indonesia مع باركود يقرأ صحيحاً، وملصق بياني كامل (Lot, Date).",
      fake: "بلد منشأ غير منطقي، باركود مكرر، أو لا يوجد رقم تشغيلة (Lot No.).",
    },
    {
      icon: Wrench,
      title: "جودة التصنيع",
      genuine: "حواف نظيفة، لُحام منتظم، وزن مطابق للأصلي، ومواد بجودة عالية بدون شوائب أو روائح كيميائية.",
      fake: "حواف خشنة، أوزان أخف من المتوقع، روائح بلاستيكية أو مطاطية قوية، تشطيب رديء.",
    },
    {
      icon: ShieldCheck,
      title: "مصدر الشراء",
      genuine: "موزع معتمد أو فرع رسمي للوكيل — بفاتورة ضريبية رسمية وضمان مكتوب.",
      fake: "أسعار أقل بكثير من السوق، بدون فاتورة، بائع مجهول الهوية أو إعلانات على منصات بدون عنوان واضح.",
    },
  ] : [
    {
      icon: Package,
      title: "Packaging & Print",
      genuine: "Sharp print, consistent colors, clear TOYOTA logo, sturdy uniform-thickness cardboard.",
      fake: "Faded or mismatched colors, spelling mistakes, blurred logo, thin flimsy box.",
    },
    {
      icon: Sparkles,
      title: "Hologram Security Sticker",
      genuine: "3D hologram that shifts color with viewing angle, with repeated TOYOTA wordmark inside.",
      fake: "Flat silver sticker that doesn't shift, or a low-resolution fake hologram.",
    },
    {
      icon: Barcode,
      title: "Part Number",
      genuine: "10–11 digit part number (e.g. 90915-YZZD2) printed/embossed on the part AND matching the box.",
      fake: "Mismatch between box number and part number, or ink that wipes off easily.",
    },
    {
      icon: FileBadge,
      title: "Country of Origin & Barcode",
      genuine: "Made in Japan / Thailand / Indonesia, scannable barcode, complete data label (Lot, Date).",
      fake: "Implausible country, duplicate barcodes, or missing Lot No.",
    },
    {
      icon: Wrench,
      title: "Build Quality",
      genuine: "Clean edges, even welds, correct weight, premium materials with no chemical smell.",
      fake: "Rough edges, lighter than expected, strong plastic/rubber smell, poor finishing.",
    },
    {
      icon: ShieldCheck,
      title: "Source of Purchase",
      genuine: "Authorized distributor or official dealer branch — with tax invoice and written warranty.",
      fake: "Prices far below market, no invoice, unknown seller or online ads without an address.",
    },
  ];

  const partsExamples = isAr ? [
    { name: "فلتر الزيت", code: "90915-YZZD2 / 90915-YZZE1", note: "ابحث عن ختم TOYOTA على جسم الفلتر وليس على الملصق فقط." },
    { name: "بوجيهات (Denso/NGK)", code: "90919-01247", note: "الأصلي يحمل ليزر مارك واضح على العازل السيراميك." },
    { name: "تيل فرامل أمامي", code: "04465-0K…", note: "الأصلي يحتوي على شريحة معدنية مدمجة للتحذير من التآكل." },
    { name: "فلتر هواء", code: "17801-…", note: "ثنيات منتظمة، إطار مطاطي ناعم، وختم تويوتا داخل الإطار." },
    { name: "زيت محرك تويوتا", code: "08880-…", note: "الغطاء بختم أمني، ورقم تشغيلة محفور بالليزر على قاع العبوة." },
  ] : [
    { name: "Oil Filter", code: "90915-YZZD2 / 90915-YZZE1", note: "Look for the TOYOTA stamp on the filter body — not only the label." },
    { name: "Spark Plugs (Denso/NGK)", code: "90919-01247", note: "Genuine plugs carry a sharp laser-mark on the ceramic insulator." },
    { name: "Front Brake Pads", code: "04465-0K…", note: "Genuine pads include a built-in metal wear-warning shim." },
    { name: "Air Filter", code: "17801-…", note: "Even pleats, soft rubber frame, TOYOTA stamp inside the frame." },
    { name: "Toyota Engine Oil", code: "08880-…", note: "Tamper-evident cap, laser-etched lot number on the bottom." },
  ];

  const faqs = isAr ? [
    {
      question: "إزاي أعرف إن قطعة غيار تويوتا أصلية في مصر؟",
      answer: "افحص 6 عناصر: العبوة، الهولوجرام، رقم القطعة (Part Number)، بلد المنشأ، جودة التصنيع، ومصدر الشراء. اشترِ فقط من موزع معتمد مثل المصرية جروب واطلب فاتورة ضريبية وضمان مكتوب.",
    },
    {
      question: "إيه الفرق بين قطع غيار تويوتا الأصلية والمقلدة؟",
      answer: "الأصلية تصنّعها تويوتا (TMC) أو موردوها المعتمدون (Denso, Aisin, Toyota Boshoku) بمعايير الوكالة وضمان. المقلدة تُصنّع في مصانع غير مرخّصة بمواد أقل جودة، وعمرها الافتراضي أقصر بكثير، وقد تتسبب في أعطال للمحرك أو فقدان الضمان.",
    },
    {
      question: "هل الهولوجرام ضمان كافي إن القطعة أصلية؟",
      answer: "الهولوجرام مؤشر مهم لكنه ليس كافياً وحده — لأنه يمكن تقليده. لازم تتأكد كمان من رقم القطعة المنقوش على القطعة نفسها، ومن مصدر الشراء (موزع معتمد + فاتورة رسمية).",
    },
    {
      question: "هل المصرية جروب موزع معتمد لتويوتا؟",
      answer: "نعم. المصرية جروب موزع معتمد رسمياً لقطع غيار وزيوت تويوتا الأصلية في مصر منذ 1999، مع فروع في القاهرة والجيزة والأقصر، ومركز إقليمي في دبي.",
    },
    {
      question: "إيه الضرر من تركيب قطعة غيار مقلدة؟",
      answer: "القطع المقلدة قد تسبب: استهلاك زيت زيادة، تآكل سريع للمحرك، فشل في الفرامل، إلغاء ضمان السيارة من الوكالة، وفي بعض الحالات حوادث جسيمة بسبب فشل قطع الأمان (فرامل، توجيه، تعليق).",
    },
  ] : [
    {
      question: "How do I know if a Toyota part is genuine in Egypt?",
      answer: "Check 6 items: packaging, hologram, Part Number, country of origin, build quality, and source. Buy only from an authorized distributor like Al Masria Group and request a tax invoice and written warranty.",
    },
    {
      question: "What's the difference between genuine and counterfeit Toyota parts?",
      answer: "Genuine parts are manufactured by Toyota (TMC) or its approved suppliers (Denso, Aisin, Toyota Boshoku) to dealer-grade standards with warranty. Counterfeits are produced in unlicensed factories with inferior materials, have a much shorter lifespan, and may void your vehicle warranty.",
    },
    {
      question: "Is the hologram enough proof that a part is genuine?",
      answer: "The hologram is an important indicator but not enough on its own — it can be copied. Always verify the part number embossed on the part itself AND the source (authorized distributor + official invoice).",
    },
    {
      question: "Is Al Masria Group an authorized Toyota distributor?",
      answer: "Yes. Al Masria Group has been an officially authorized distributor of Toyota genuine parts and oils in Egypt since 1999, with branches in Cairo, Giza, Luxor, and a regional hub in Dubai.",
    },
    {
      question: "What's the risk of installing a counterfeit part?",
      answer: "Counterfeit parts can cause: excessive oil consumption, rapid engine wear, brake failure, vehicle warranty void from the dealer, and in some cases serious accidents due to failure of safety parts (brakes, steering, suspension).",
    },
  ];

  return (
    <>
      <SEOHead
        titleAr="دليل التحقق من قطع غيار تويوتا الأصلية في مصر"
        titleEn="Spotting Genuine vs Counterfeit Toyota Parts in Egypt"
        descriptionAr="دليل شامل من المصرية جروب: 6 علامات للتمييز بين قطع غيار تويوتا الأصلية والمقلدة — الهولوجرام، رقم القطعة، العبوة، ومصدر الشراء."
        descriptionEn="Complete guide from Al Masria Group: 6 signs to identify genuine vs counterfeit Toyota parts — hologram, part number, packaging, and source verification."
        canonical={PAGE_URL}
        ogType="article"
        keywordsAr="قطع غيار تويوتا الاصلية مصر, التحقق من قطع غيار تويوتا, قطع تويوتا مقلدة, هولوجرام تويوتا, رقم قطعة تويوتا"
        keywordsEn="genuine Toyota parts Egypt, Toyota parts verification, counterfeit Toyota parts, Toyota hologram, Toyota part number"
        breadcrumbs={[
          { ar: "الرئيسية", en: "Home", url: SITE_URL },
          { ar: "أدلة", en: "Guides", url: `${SITE_URL}/guides` },
          { ar: "التحقق من قطع غيار تويوتا الأصلية", en: "Identifying Genuine Toyota Parts", url: PAGE_URL },
        ]}
      />
      <FAQSchema items={faqs} />
      <BreadcrumbSchema items={[
        { name: isAr ? "الرئيسية" : "Home", url: SITE_URL },
        { name: isAr ? "التحقق من قطع غيار تويوتا" : "Identifying Genuine Toyota Parts", url: PAGE_URL },
      ]} />
      <Helmet>
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          headline: isAr
            ? "دليل التحقق من قطع غيار تويوتا الأصلية في مصر"
            : "Spotting Genuine vs Counterfeit Toyota Parts in Egypt",
          author: { "@type": "Organization", name: "Al Masria Group" },
          publisher: {
            "@type": "Organization",
            name: "Al Masria Group",
            logo: { "@type": "ImageObject", url: `${SITE_URL}/logo.png` },
          },
          datePublished: "2026-06-01",
          dateModified: "2026-06-01",
          mainEntityOfPage: PAGE_URL,
          inLanguage: isAr ? "ar-EG" : "en",
        })}</script>
      </Helmet>

      <div className="min-h-screen bg-background">
        <Navbar />

        <main className="container mx-auto px-4 py-8 md:py-12 max-w-5xl">
          {/* Breadcrumb */}
          <nav className="text-sm text-muted-foreground mb-6 flex items-center gap-2" aria-label={isAr ? "مسار التنقل" : "Breadcrumb"}>
            <Link to="/" className="hover:text-primary">{isAr ? "الرئيسية" : "Home"}</Link>
            <span>/</span>
            <span className="text-foreground">{isAr ? "التحقق من قطع غيار تويوتا الأصلية" : "Identifying Genuine Toyota Parts"}</span>
          </nav>

          {/* Hero */}
          <motion.header
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-semibold mb-4">
              <ShieldCheck className="w-4 h-4" aria-hidden="true" />
              {isAr ? "دليل المصرية جروب الرسمي" : "Al Masria Group Official Guide"}
            </div>
            <h1 className="text-3xl md:text-5xl font-bold mb-4 leading-tight">
              {isAr
                ? "كيف تميّز قطع غيار تويوتا الأصلية من المقلدة؟"
                : "How to Identify Genuine vs Counterfeit Toyota Parts"}
            </h1>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              {isAr
                ? "6 علامات احترافية يستخدمها فنيو تويوتا للتمييز بين القطعة الأصلية والمقلدة — مع أرقام قطع حقيقية وأمثلة من السوق المصري."
                : "6 professional signs Toyota technicians use to spot fakes — with real part numbers and examples from the Egyptian market."}
            </p>
          </motion.header>

          {/* Warning callout */}
          <div className="bg-destructive/5 border border-destructive/20 rounded-2xl p-6 mb-12 flex gap-4">
            <AlertTriangle className="w-8 h-8 text-destructive flex-shrink-0" aria-hidden="true" />
            <div>
              <h2 className="font-bold text-lg mb-2 text-destructive">
                {isAr ? "لماذا يهمك هذا الدليل؟" : "Why does this matter?"}
              </h2>
              <p className="text-sm text-foreground/80 leading-relaxed">
                {isAr
                  ? "السوق المصري يضم نسبة عالية من قطع الغيار المقلدة، خصوصاً في فلاتر الزيت والبوجيهات وتيل الفرامل. تركيب قطعة مقلدة قد يكلفك إصلاح محرك كامل، يلغي ضمان السيارة، ويعرّض حياتك للخطر في قطع الأمان."
                  : "The Egyptian market has a high share of counterfeit parts — especially oil filters, spark plugs, and brake pads. Installing a fake can cost you an engine rebuild, void your warranty, and risk your safety with critical components."}
              </p>
            </div>
          </div>

          {/* 6 Checkpoints */}
          <section className="mb-16">
            <h2 className="text-2xl md:text-3xl font-bold mb-8 text-center">
              {isAr ? "الـ 6 نقاط الحاسمة للفحص" : "The 6 Critical Checkpoints"}
            </h2>
            <div className="grid gap-6">
              {checkpoints.map((cp, i) => {
                const Icon = cp.icon;
                return (
                  <motion.article
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.05 }}
                    className="bg-card border border-border rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start gap-4 mb-4">
                      <div className="bg-primary/10 text-primary p-3 rounded-xl flex-shrink-0">
                        <Icon className="w-6 h-6" aria-hidden="true" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-primary mb-1">
                          {isAr ? `النقطة ${i + 1}` : `Checkpoint ${i + 1}`}
                        </div>
                        <h3 className="text-xl font-bold">{cp.title}</h3>
                      </div>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4 mt-4">
                      <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2 text-green-700 dark:text-green-400 font-semibold text-sm">
                          <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                          {isAr ? "علامة القطعة الأصلية" : "Genuine sign"}
                        </div>
                        <p className="text-sm text-foreground/80 leading-relaxed">{cp.genuine}</p>
                      </div>
                      <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2 text-red-700 dark:text-red-400 font-semibold text-sm">
                          <XCircle className="w-4 h-4" aria-hidden="true" />
                          {isAr ? "علامة القطعة المقلدة" : "Counterfeit sign"}
                        </div>
                        <p className="text-sm text-foreground/80 leading-relaxed">{cp.fake}</p>
                      </div>
                    </div>
                  </motion.article>
                );
              })}
            </div>
          </section>

          {/* Real part examples */}
          <section className="mb-16">
            <h2 className="text-2xl md:text-3xl font-bold mb-6 text-center">
              {isAr ? "أمثلة من قطع الغيار الأكثر تقليداً" : "Most Commonly Counterfeited Parts"}
            </h2>
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-start p-4 font-semibold">{isAr ? "القطعة" : "Part"}</th>
                    <th className="text-start p-4 font-semibold hidden md:table-cell">{isAr ? "رقم القطعة" : "Part Number"}</th>
                    <th className="text-start p-4 font-semibold">{isAr ? "علامة الأصلي" : "Genuine Marker"}</th>
                  </tr>
                </thead>
                <tbody>
                  {partsExamples.map((p, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="p-4 font-semibold">{p.name}</td>
                      <td className="p-4 font-mono text-xs text-muted-foreground hidden md:table-cell">{p.code}</td>
                      <td className="p-4 text-foreground/80">{p.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* FAQ */}
          <section className="mb-16">
            <h2 className="text-2xl md:text-3xl font-bold mb-6 text-center">
              {isAr ? "أسئلة شائعة" : "Frequently Asked Questions"}
            </h2>
            <div className="space-y-4">
              {faqs.map((f, i) => (
                <details key={i} className="bg-card border border-border rounded-xl p-5 group">
                  <summary className="font-semibold cursor-pointer flex items-center gap-3">
                    <Eye className="w-5 h-5 text-primary flex-shrink-0" aria-hidden="true" />
                    {f.question}
                  </summary>
                  <p className="mt-3 text-sm text-foreground/80 leading-relaxed pt-3 border-t border-border">
                    {f.answer}
                  </p>
                </details>
              ))}
            </div>
          </section>

          {/* CTA */}
          <section className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground rounded-3xl p-8 md:p-12 text-center">
            <ShieldCheck className="w-14 h-14 mx-auto mb-4 opacity-90" aria-hidden="true" />
            <h2 className="text-2xl md:text-3xl font-bold mb-3">
              {isAr ? "اشتري بأمان من موزع معتمد" : "Buy Safely from an Authorized Distributor"}
            </h2>
            <p className="text-base md:text-lg mb-6 opacity-90 max-w-2xl mx-auto">
              {isAr
                ? "المصرية جروب — موزع معتمد رسمياً لقطع غيار وزيوت تويوتا الأصلية في مصر منذ 1999. كل قطعة بفاتورة ضريبية وضمان مكتوب."
                : "Al Masria Group — officially authorized Toyota genuine parts & oils distributor in Egypt since 1999. Every part comes with a tax invoice and written warranty."}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild size="lg" variant="secondary">
                <Link to="/products/genuine-toyota-parts">
                  {isAr ? "تصفّح القطع الأصلية" : "Browse Genuine Parts"}
                  <ArrowLeft className="w-4 h-4 ms-2 rtl:rotate-180" aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="bg-transparent border-white text-white hover:bg-white/10">
                <a href="https://wa.me/201153961008" target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="w-4 h-4 me-2" aria-hidden="true" />
                  {isAr ? "تواصل واتساب" : "WhatsApp Us"}
                </a>
              </Button>
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default GenuineVsCounterfeitGuide;
