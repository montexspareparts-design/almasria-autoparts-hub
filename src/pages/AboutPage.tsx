import { lazy, Suspense } from "react";
import { Helmet } from "react-helmet-async";
import SEOHead from "@/components/SEOHead";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Award, Clock, Users, Globe, ShieldCheck, Handshake,
  MapPin, Truck, Building2, Wrench, ChevronLeft,
  Eye, Target, Heart, Scale, Leaf, Link2,
  Cog, Package, BadgeCheck
} from "lucide-react";
import Navbar from "@/components/Navbar";
import heroBg from "@/assets/hero-corporate.webp";

const Footer = lazy(() => import("@/components/Footer"));

const BackToTop = lazy(() => import("@/components/BackToTop"));

const SectionFallback = () => (
  <div className="flex items-center justify-center py-20">
    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

/* ── Data ──────────────────────────────────────── */

const values = [
  { icon: ShieldCheck, label: "الجودة" },
  { icon: Scale, label: "الانضباط" },
  { icon: Eye, label: "الشفافية" },
  { icon: BadgeCheck, label: "حماية قيمة العلامة" },
  { icon: Leaf, label: "الاستدامة" },
  { icon: Handshake, label: "الشراكة طويلة الأمد" },
];

const whyUsPoints = [
  { icon: Award, title: "موزع معتمد لقطع غيار وزيوت تويوتا" },
  { icon: Clock, title: "خبرة +25 سنة" },
  { icon: Users, title: "شبكة +2000 عميل وتغطية وطنية" },
  { icon: Truck, title: "تسليم خلال 48 ساعة" },
  { icon: Cog, title: "تشغيل مدعوم بأنظمة إدارة رقمية" },
  { icon: Package, title: "MTX — جودة تضاهي المواصفات الأصلية" },
];

const branches = [
  { city: "القاهرة – التوفيقية", desc: "مركز الجملة" },
  { city: "الجيزة – أوسيم", desc: "فرع التوزيع" },
  { city: "الأقصر – الصعيد", desc: "فرع الصعيد" },
  { city: "مكتب دبي", desc: "Spectra FZC" },
];

const segments = [
  { icon: Truck, title: "تجّار الجملة", desc: "إمداد مستمر بالكميات وأسعار تنافسية لتجار الجملة في جميع المحافظات." },
  { icon: Building2, title: "الشركات والهيئات", desc: "عقود توريد مؤسسية مع التزام بالمواعيد واستقرار الإمداد لأساطيل الشركات." },
  { icon: Wrench, title: "القطاعي ومراكز الخدمة", desc: "قطع غيار أصلية وبدائل MTX عالية الجودة لمراكز الصيانة." },
];

const distributionSectors = [
  { title: "قطع غيار تويوتا الأصلية", desc: "قطع غيار أصلية بالكامل، مطابقة لمعايير المصنع، لكل موديلات تويوتا.", to: "/products/toyota-genuine" },
  { title: "زيوت تويوتا الأصلية", desc: "زيوت محركات تويوتا بجميع اللزوجات، أصلية 100% وبضمان الجودة.", to: "/products/toyota-oils" },
  { title: "MTX — جودة تضاهي الأصلي", desc: "علامتنا الخاصة لقطع الغيار البديلة بجودة تضاهي المواصفات الأصلية.", to: "/mtx" },
];

/* ── Page ──────────────────────────────────────── */

const AboutPage = () => {
  return (
    <div className="min-h-screen">
      <SEOHead
        titleAr="من نحن — توزيع مؤسسي منذ 1999"
        titleEn="About Us — Distributors Since 1999"
        descriptionAr="المصرية جروب مجموعة توزيع رائدة منذ 1999، موزع معتمد لقطع غيار وزيوت تويوتا الأصلية. شبكة +2000 عميل، توصيل سريع خلال 48 ساعة، وعلامة MTX."
        descriptionEn="Al Masria Group — leading distributor since 1999, authorized for Toyota genuine parts & oils. 2,000+ customers, 48h delivery, plus MTX."
        keywordsAr="عن المصرية جروب, تاريخ الشركة, موزع تويوتا مصر, MTX"
        keywordsEn="about Al Masria Group, company history, Toyota distributor Egypt, MTX"
        breadcrumbs={[
          { ar: "الرئيسية", en: "Home", url: "/" },
          { ar: "من نحن", en: "About", url: "/about" },
        ]}
      />

      <Navbar />

      {/* ═══ 1. Hero ═══ */}
      <section
        className="relative min-h-[55vh] flex items-center justify-center overflow-hidden"
        style={{
          backgroundImage: `url(${heroBg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative z-10 container mx-auto px-4 py-24 text-center max-w-[760px]">
          <h1 className="text-3xl md:text-5xl font-black text-white leading-[1.4] mb-5">
            من نحن — منصة توزيع مؤسسية مُعتمدة
          </h1>
          <p className="text-base md:text-lg text-white/90 leading-[1.8] mb-8">
            منذ 1999، نعمل كموزع معتمد لقطع غيار وزيوت تويوتا الأصلية عبر شبكة توزيع منظمة تغطي مصر،
            مع وجود إقليمي في دبي، وتشغيل مدعوم بأنظمة إدارة رقمية لضمان الجودة والشفافية.
          </p>
          <Button size="lg" className="font-bold gap-2" asChild>
            <Link to="/contact" aria-label="تواصل مع فريق مبيعات المصرية جروب">
              تواصل مع فريق المبيعات
              <ChevronLeft className="w-4 h-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* ═══ 2. من نحن ═══ */}
      <section className="py-20 md:py-28 bg-background">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="text-3xl md:text-4xl font-black text-foreground mb-6">من نحن</h2>
          <p className="text-muted-foreground text-base md:text-lg leading-[1.8]">
            المصرية جروب مجموعة متخصصة في توزيع قطع الغيار والزيوت لقطاع السيارات، بخبرة تتجاوز 25 عامًا في السوق المصري.
            نعمل كموزّع معتمد لـ<Link to="/products/toyota-genuine" className="text-primary font-bold hover:underline">قطع غيار تويوتا الأصلية</Link> و<Link to="/products/toyota-oils" className="text-primary font-bold hover:underline">زيوت تويوتا الأصلية</Link>،
            مع نموذج تشغيل منضبط قائم على أنظمة إدارة رقمية متكاملة، وشبكة توزيع تتجاوز 2000 عميل من تجار الجملة ومراكز الخدمة والشركات.
            نلتزم بسياسات تسعير منضبطة، وحماية لقيمة العلامة، وتغطية وطنية مع توصيل سريع خلال 48 ساعة من مخازن مركزية عالية الكفاءة.
            كما ندير علامة <Link to="/mtx" className="text-primary font-bold hover:underline">MTX</Link> لقطع الغيار البديلة بجودة تضاهي المواصفات الأصلية.
          </p>
        </div>
      </section>

      {/* ═══ 3. رسالتنا ورؤيتنا وقيمنا ═══ */}
      <section className="py-20 md:py-28 bg-muted/30">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-16">
            {/* رسالتنا */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Target className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-2xl md:text-3xl font-black text-foreground">رسالتنا</h2>
              </div>
              <p className="text-muted-foreground leading-[1.8]">
                تمكين السوق من منتجات أصلية موثوقة ومنتجات أفترماركت مختارة، عبر توزيع منضبط يحافظ على استقرار الأسعار وثقة الشركاء، ويضمن استمرارية التوريد.
              </p>
            </div>
            {/* رؤيتنا */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Eye className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-2xl md:text-3xl font-black text-foreground">رؤيتنا</h2>
              </div>
              <p className="text-muted-foreground leading-[1.8]">
                قيادة التوزيع المؤسسي لمنتجات تويوتا والمنتجات اليابانية المختارة في مصر، بنمو مستدام وشراكات طويلة الأمد تتماشى مع معايير المصنع (OEM).
              </p>
            </div>
          </div>

          {/* قيمنا */}
          <div>
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Heart className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-2xl md:text-3xl font-black text-foreground">قيمنا</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
              {values.map((v) => (
                <div key={v.label} className="bg-card border border-border rounded-xl p-5 text-center">
                  <v.icon className="w-7 h-7 text-primary mx-auto mb-3" strokeWidth={1.8} />
                  <span className="text-sm font-bold text-foreground">{v.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ 4. لماذا المصرية جروب؟ ═══ */}
      <section className="py-20 md:py-28 bg-background">
        <div className="container mx-auto px-4 max-w-5xl">
          <h2 className="text-3xl md:text-4xl font-black text-foreground text-center mb-12">
            لماذا <span className="text-primary">المصرية جروب؟</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mb-10">
            {whyUsPoints.map((p) => (
              <div key={p.title} className="bg-card border border-border rounded-xl p-6 text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <p.icon className="w-6 h-6 text-primary" strokeWidth={1.8} />
                </div>
                <h3 className="text-sm font-bold text-foreground leading-[1.6]">{p.title}</h3>
              </div>
            ))}
          </div>
          <div className="text-center">
            <Button variant="outline" className="font-bold gap-2" asChild>
              <Link to="/what-sets-us-apart">
                اقرأ التفاصيل
                <ChevronLeft className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ═══ 5. انتشارنا وفروعنا ═══ */}
      <section id="coverage" className="py-20 md:py-28 bg-muted/30">
        <div className="container mx-auto px-4 max-w-5xl">
          <h2 className="text-3xl md:text-4xl font-black text-foreground text-center mb-12">
            انتشارنا <span className="text-primary">وفروعنا</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-10">
            {branches.map((b) => (
              <div key={b.city} className="bg-card border border-border rounded-xl p-6 text-center">
                <MapPin className="w-7 h-7 text-primary mx-auto mb-3" strokeWidth={1.8} />
                <h3 className="font-bold text-foreground mb-1">{b.city}</h3>
                <span className="text-xs text-muted-foreground">{b.desc}</span>
              </div>
            ))}
          </div>
          <p className="text-muted-foreground text-center leading-[1.8] max-w-3xl mx-auto mb-8">
            نغطي المحافظات كافة عبر منظومة لوجستية منظمة ومخازن مركزية، ما يضمن سرعة الاستجابة واستمرارية التوريد.
            تسليم الطلبات خلال 48 ساعة داخل مصر.
          </p>
          <div className="text-center">
            <Button className="font-bold gap-2" asChild>
              <Link to="/contact">
                تواصل معنا
                <ChevronLeft className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ═══ 6. من نخدم؟ ═══ */}
      <section className="py-20 md:py-28 bg-background">
        <div className="container mx-auto px-4 max-w-5xl">
          <h2 className="text-3xl md:text-4xl font-black text-foreground text-center mb-3">
            من <span className="text-primary">نخدم؟</span>
          </h2>
          <p className="text-muted-foreground text-center mb-12">
            حلول توريد مرنة، دعم فني، وخطط إمداد تتناسب مع حجم أعمال كل شريحة.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            {segments.map((s) => (
              <div key={s.title} className="bg-card border border-border rounded-xl p-8 text-center">
                <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-5">
                  <s.icon className="w-7 h-7 text-primary" strokeWidth={1.8} />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">{s.title}</h3>
                <p className="text-muted-foreground text-sm leading-[1.8]">{s.desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center">
            <Button className="font-bold gap-2" asChild>
              <Link to="/contact#quote">اطلب عرض توريد</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ═══ 7. قطاعات التوزيع ═══ */}
      <section className="py-20 md:py-28 bg-muted/30">
        <div className="container mx-auto px-4 max-w-5xl">
          <h2 className="text-3xl md:text-4xl font-black text-foreground text-center mb-12">
            قطاعات <span className="text-primary">التوزيع</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {distributionSectors.map((d) => (
              <Link
                key={d.to}
                to={d.to}
                className="group bg-card border border-border rounded-xl p-8 text-center hover:border-primary/40 transition-colors"
              >
                <h3 className="text-lg font-bold text-foreground mb-2 group-hover:text-primary transition-colors">{d.title}</h3>
                <p className="text-muted-foreground text-sm leading-[1.8]">{d.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ 8. شركاؤنا واعترافاتنا ═══ */}
      <section className="py-20 md:py-28 bg-background">
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <h2 className="text-3xl md:text-4xl font-black text-foreground mb-4">
            شركاؤنا <span className="text-primary">واعترافاتنا</span>
          </h2>
          <p className="text-muted-foreground leading-[1.8] max-w-2xl mx-auto">
            التزام بمعايير المصنع، ومشاركات في فعاليات القطاع، وتكريمات مرتبطة بأداء التوزيع.
          </p>
          {/* Placeholder for logos/certificates */}
          <div className="mt-10 flex items-center justify-center gap-8 flex-wrap opacity-50">
            <Link2 className="w-10 h-10 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">(مكان لوجوهات الشركاء والاعتمادات عند توفرها)</span>
          </div>
        </div>
      </section>

      {/* ═══ 9. CTA ختامي ═══ */}
      <section className="py-20 md:py-28 bg-secondary text-secondary-foreground">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <h2 className="text-3xl md:text-4xl font-black mb-6">
            ابدأ شراكتك مع <span className="text-primary">المصرية جروب</span>
          </h2>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" className="w-full sm:w-auto font-bold gap-2" asChild>
              <Link to="/contact#quote" aria-label="اطلب عرض سعر من المصرية جروب">
                اطلب عرض سعر
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="w-full sm:w-auto font-bold gap-2 border-secondary-foreground/30 text-secondary-foreground hover:bg-secondary-foreground/10" asChild>
              <Link to="/contact" aria-label="تواصل مع فريق مبيعات المصرية جروب">
                تواصل مع فريق المبيعات
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <Suspense fallback={null}><Footer /></Suspense>
      
      <Suspense fallback={null}><BackToTop /></Suspense>
    </div>
  );
};

export default AboutPage;
