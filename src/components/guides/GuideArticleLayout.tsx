import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowLeft, BookOpen, Phone, MessageCircle, CheckCircle2, XCircle, AlertTriangle, Info } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { FAQSchema, BreadcrumbSchema, ArticleSchema } from "@/components/SEOSchemaMarkup";
import { Button } from "@/components/ui/button";

const SITE_URL = "https://www.almasriaautoparts.com";

export interface GuideSection {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
  table?: { headers: string[]; rows: string[][] };
  callout?: { type: "info" | "warning" | "success"; text: string };
}

export interface GuideFAQ {
  question: string;
  answer: string;
}

export interface GuideArticleLayoutProps {
  slug: string;                // e.g. "genuine-vs-mtx-vs-denso"
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  keywordsAr?: string;
  heroBadge?: string;
  intro: string;
  sections: GuideSection[];
  faqs: GuideFAQ[];
  ctaTitle?: string;
  ctaSubtitle?: string;
  datePublished?: string;
  dateModified?: string;
}

const calloutStyles = {
  info: { bg: "bg-primary/5", border: "border-primary/20", icon: Info, color: "text-primary" },
  warning: { bg: "bg-destructive/5", border: "border-destructive/20", icon: AlertTriangle, color: "text-destructive" },
  success: { bg: "bg-emerald-500/5", border: "border-emerald-500/20", icon: CheckCircle2, color: "text-emerald-600" },
};

const GuideArticleLayout = ({
  slug,
  titleAr,
  titleEn,
  descriptionAr,
  descriptionEn,
  keywordsAr,
  heroBadge = "دليل احترافي من المصرية جروب",
  intro,
  sections,
  faqs,
  ctaTitle = "محتاج مساعدة من خبير؟",
  ctaSubtitle = "فريقنا الفني جاهز يساعدك تختار القطعة الصح لسيارتك.",
  datePublished = "2026-06-01",
  dateModified = "2026-06-01",
}: GuideArticleLayoutProps) => {
  const PAGE_URL = `${SITE_URL}/guides/${slug}`;

  return (
    <>
      <SEOHead
        titleAr={titleAr}
        titleEn={titleEn}
        descriptionAr={descriptionAr}
        descriptionEn={descriptionEn}
        keywordsAr={keywordsAr}
        canonical={PAGE_URL}
        ogType="article"
        breadcrumbs={[
          { ar: "الرئيسية", en: "Home", url: SITE_URL },
          { ar: "أدلة", en: "Guides", url: `${SITE_URL}/guides` },
          { ar: titleAr, en: titleEn, url: PAGE_URL },
        ]}
      />
      <FAQSchema items={faqs} />
      <BreadcrumbSchema
        items={[
          { name: "الرئيسية", url: SITE_URL },
          { name: titleAr, url: PAGE_URL },
        ]}
      />
      <ArticleSchema
        headline={titleAr}
        description={descriptionAr}
        datePublished={datePublished}
        dateModified={dateModified}
      />

      <div className="min-h-screen bg-background" dir="rtl">
        <Navbar />

        <main className="container mx-auto px-4 py-8 md:py-12 max-w-4xl">
          {/* Breadcrumb */}
          <nav className="text-sm text-muted-foreground mb-6 flex items-center gap-2" aria-label="مسار التنقل">
            <Link to="/" className="hover:text-primary">الرئيسية</Link>
            <span>/</span>
            <Link to="/guides/identifying-genuine-toyota-parts" className="hover:text-primary">الأدلة</Link>
            <span>/</span>
            <span className="text-foreground line-clamp-1">{titleAr}</span>
          </nav>

          {/* Hero */}
          <motion.header
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-10 md:mb-14"
          >
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-semibold mb-4">
              <BookOpen className="w-4 h-4" aria-hidden="true" />
              {heroBadge}
            </div>
            <h1 className="text-3xl md:text-5xl font-bold mb-4 leading-tight">{titleAr}</h1>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">{intro}</p>
          </motion.header>

          {/* Sections */}
          <article className="prose prose-lg max-w-none space-y-10">
            {sections.map((sec, i) => (
              <section key={i} className="scroll-mt-20">
                <h2 className="text-2xl md:text-3xl font-bold mb-4 text-foreground border-b-2 border-primary/20 pb-2">
                  {sec.heading}
                </h2>

                {sec.paragraphs?.map((p, idx) => (
                  <p key={idx} className="text-base md:text-lg text-foreground/90 leading-relaxed mb-4">
                    {p}
                  </p>
                ))}

                {sec.bullets && (
                  <ul className="space-y-2 my-4">
                    {sec.bullets.map((b, idx) => (
                      <li key={idx} className="flex gap-3 items-start">
                        <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                        <span className="text-foreground/90 leading-relaxed">{b}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {sec.table && (
                  <div className="overflow-x-auto my-6 rounded-xl border border-border">
                    <table className="w-full text-sm md:text-base">
                      <thead className="bg-primary/10">
                        <tr>
                          {sec.table.headers.map((h, idx) => (
                            <th key={idx} className="p-3 text-right font-bold text-foreground">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {sec.table.rows.map((row, ridx) => (
                          <tr key={ridx} className="border-t border-border even:bg-muted/30">
                            {row.map((cell, cidx) => (
                              <td key={cidx} className="p-3 text-foreground/90">
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {sec.callout && (() => {
                  const cs = calloutStyles[sec.callout.type];
                  const Icon = cs.icon;
                  return (
                    <div className={`${cs.bg} border ${cs.border} rounded-2xl p-5 my-6 flex gap-3`}>
                      <Icon className={`w-6 h-6 ${cs.color} flex-shrink-0`} />
                      <p className="text-foreground/90 leading-relaxed">{sec.callout.text}</p>
                    </div>
                  );
                })()}
              </section>
            ))}

            {/* FAQ */}
            <section className="scroll-mt-20">
              <h2 className="text-2xl md:text-3xl font-bold mb-6 text-foreground border-b-2 border-primary/20 pb-2">
                أسئلة شائعة
              </h2>
              <div className="space-y-4">
                {faqs.map((f, i) => (
                  <details key={i} className="bg-card border border-border rounded-xl p-5 group">
                    <summary className="font-bold text-lg cursor-pointer text-foreground list-none flex justify-between items-center gap-3">
                      {f.question}
                      <span className="text-primary text-2xl group-open:rotate-45 transition-transform">+</span>
                    </summary>
                    <p className="mt-4 text-foreground/85 leading-relaxed">{f.answer}</p>
                  </details>
                ))}
              </div>
            </section>
          </article>

          {/* CTA */}
          <section className="mt-14 bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-2xl p-8 text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">{ctaTitle}</h2>
            <p className="text-muted-foreground mb-6 max-w-xl mx-auto">{ctaSubtitle}</p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button asChild size="lg" className="gap-2">
                <a href="https://wa.me/201034806288" target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="w-5 h-5" />
                  واتساب فوري
                </a>
              </Button>
              <Button asChild size="lg" variant="outline" className="gap-2">
                <a href="tel:+201153961008">
                  <Phone className="w-5 h-5" />
                  اتصل بنا
                </a>
              </Button>
              <Button asChild size="lg" variant="secondary" className="gap-2">
                <Link to="/products">
                  <ArrowLeft className="w-5 h-5" />
                  تصفّح المنتجات
                </Link>
              </Button>
            </div>
          </section>

          {/* Related guides */}
          <section className="mt-12">
            <h3 className="text-xl font-bold mb-4">📚 أدلة أخرى مفيدة</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              {RELATED_GUIDES.filter((g) => g.slug !== slug).slice(0, 4).map((g) => (
                <Link
                  key={g.slug}
                  to={`/guides/${g.slug}`}
                  className="block bg-card border border-border rounded-xl p-4 hover:border-primary hover:shadow-md transition-all"
                >
                  <p className="font-bold text-foreground mb-1">{g.title}</p>
                  <p className="text-sm text-muted-foreground line-clamp-2">{g.summary}</p>
                </Link>
              ))}
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </>
  );
};

const RELATED_GUIDES = [
  { slug: "identifying-genuine-toyota-parts", title: "دليل تمييز قطع تويوتا الأصلية", summary: "6 علامات احترافية للتأكد من أصالة القطعة." },
  { slug: "genuine-vs-mtx-vs-denso", title: "أصلي vs MTX vs Denso — أيهما أفضل؟", summary: "مقارنة شاملة بين الفئات الثلاث في الأداء والسعر." },
  { slug: "when-to-change-oil-filter", title: "متى تغيّر فلتر الزيت؟", summary: "كل ما تحتاج معرفته عن استبدال فلتر الزيت في تويوتا." },
  { slug: "when-to-change-brake-pads", title: "متى تغيّر تيل الفرامل؟", summary: "علامات تآكل تيل الفرامل والمسافة المثالية للتغيير." },
  { slug: "toyota-corolla-maintenance", title: "دليل صيانة تويوتا كورولا", summary: "جدول صيانة كامل لكورولا حسب الكيلومتر." },
  { slug: "toyota-hilux-maintenance", title: "دليل صيانة تويوتا هايلوكس", summary: "صيانة هايلوكس للعمل الشاق والظروف الصعبة." },
];

export default GuideArticleLayout;
