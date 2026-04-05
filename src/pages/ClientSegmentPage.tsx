import { Helmet } from "react-helmet-async";
import { Link, useParams, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Package, Building2, Wrench, ChevronLeft, ShieldCheck,
  Truck, Clock, FileText, Users, MapPin, Cog, CheckCircle2
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { lazy, Suspense } from "react";

const Footer = lazy(() => import("@/components/Footer"));
const WhatsAppFloat = lazy(() => import("@/components/WhatsAppFloat"));
const BackToTop = lazy(() => import("@/components/BackToTop"));

/* ── Segment Data ── */
type SegmentKey = "wholesale" | "corporate" | "retail";

interface SegmentData {
  title: string;
  metaTitle: string;
  metaDesc: string;
  icon: typeof Package;
  heroDesc: string;
  intro: string;
  features: { icon: typeof Package; title: string; desc: string }[];
  products: { name: string; to: string }[];
  ctaText: string;
  ctaTo: string;
}

const segmentsData: Record<SegmentKey, SegmentData> = {
  wholesale: {
    title: "عملاء الجملة",
    metaTitle: "خدماتنا لعملاء الجملة | المصرية جروب — موزع معتمد لقطع غيار تويوتا",
    metaDesc: "المصرية جروب توفر لتجار الجملة توريدًا منتظمًا لقطع غيار وزيوت تويوتا الأصلية، أسعار منضبطة، مخزون جاهز، وتسليم خلال 48 ساعة على مستوى الجمهورية.",
    icon: Package,
    heroDesc: "شريك التوريد الأول لتجار الجملة في سوق قطع غيار السيارات — إمداد مستمر، أسعار منضبطة، وتسليم سريع.",
    intro: "نُدرك أن تاجر الجملة يحتاج إلى شريك توريد يضمن استمرارية المخزون واستقرار الأسعار. لذلك نقدم في المصرية جروب نموذج توريد منضبط يعتمد على مخازن مركزية عالية الكفاءة وأنظمة ERP تضمن دقة الطلبات وسرعة التنفيذ. بخبرة تتجاوز 25 عامًا وشبكة توزيع تغطي جميع المحافظات، نوفر لتجار الجملة بيئة عمل مستقرة تدعم نمو أعمالهم.",
    features: [
      { icon: Truck, title: "تسليم خلال 48 ساعة", desc: "شحن سريع من مخازن مركزية إلى أي محافظة في مصر عبر منظومة لوجستية منظمة." },
      { icon: ShieldCheck, title: "أسعار منضبطة ومستقرة", desc: "سياسة تسعير واضحة تحمي هوامش ربح التاجر وتمنع تذبذب السوق." },
      { icon: Package, title: "مخزون جاهز ومتنوع", desc: "توفر دائم لقطع غيار تويوتا الأصلية والزيوت ومنتجات MTX بكميات الجملة." },
      { icon: Cog, title: "نظام طلبات إلكتروني", desc: "إدارة الطلبات عبر أنظمة ERP مع متابعة لحظية لحالة الشحن والتوريد." },
      { icon: Users, title: "مدير حساب مخصص", desc: "فريق مبيعات متخصص يتابع احتياجاتك ويقدم حلول توريد مرنة." },
      { icon: MapPin, title: "تغطية وطنية كاملة", desc: "شبكة توزيع تصل إلى جميع محافظات مصر مع دعم من مكتب دبي الإقليمي." },
    ],
    products: [
      { name: "قطع غيار تويوتا الأصلية", to: "/products/genuine-toyota-parts" },
      { name: "زيوت تويوتا الأصلية", to: "/products/toyota-lubricants" },
      { name: "MTX — بديل بجودة أصلية", to: "/mtx" },
    ],
    ctaText: "اطلب عرض توريد جملة",
    ctaTo: "/contact#quote",
  },
  corporate: {
    title: "الشركات والهيئات الحكومية",
    metaTitle: "خدماتنا للشركات والهيئات | المصرية جروب — عقود توريد مؤسسية",
    metaDesc: "المصرية جروب تقدم للشركات والهيئات الحكومية عقود توريد مخصصة لقطع غيار وزيوت تويوتا الأصلية، فواتير منظمة، ودعم لوجستي للأساطيل.",
    icon: Building2,
    heroDesc: "حلول توريد مؤسسية مصممة لأساطيل الشركات والهيئات الحكومية — التزام، شفافية، واستمرارية.",
    intro: "تحتاج الشركات والهيئات الحكومية إلى شريك توريد موثوق يلتزم بالمواعيد ويوفر فواتير منظمة وشفافية كاملة في التعاملات. المصرية جروب تقدم عقود توريد مخصصة تلائم احتياجات الأساطيل والمشروعات الكبرى، مع ضمان توفر قطع الغيار الأصلية والزيوت في الوقت المناسب. نعتمد على أنظمة ERP متطورة لإدارة العقود والمتابعة الدقيقة لكل طلب.",
    features: [
      { icon: FileText, title: "عقود توريد مخصصة", desc: "عقود مرنة تتناسب مع حجم الأسطول واحتياجات المؤسسة مع شروط واضحة." },
      { icon: Clock, title: "التزام صارم بالمواعيد", desc: "جدول توريد منتظم يضمن عدم توقف الأساطيل أو تأخر الصيانة." },
      { icon: ShieldCheck, title: "فواتير منظمة ومعتمدة", desc: "مستندات مالية واضحة تلائم إجراءات المحاسبة الحكومية والمؤسسية." },
      { icon: Truck, title: "دعم لوجستي للأساطيل", desc: "توصيل مباشر لمواقع العمل والجراجات مع متابعة حالة الشحن." },
      { icon: Cog, title: "تقارير دورية", desc: "تقارير استهلاك وتوريد مفصلة تساعد في التخطيط وإدارة الميزانية." },
      { icon: Users, title: "فريق دعم مؤسسي", desc: "مدير حساب مخصص وخط تواصل مباشر لمعالجة أي طلب عاجل." },
    ],
    products: [
      { name: "قطع غيار تويوتا الأصلية", to: "/products/genuine-toyota-parts" },
      { name: "زيوت تويوتا الأصلية", to: "/products/toyota-lubricants" },
      { name: "MTX — بديل بجودة أصلية", to: "/mtx" },
    ],
    ctaText: "تواصل مع فريق المبيعات المؤسسي",
    ctaTo: "/contact",
  },
  retail: {
    title: "عملاء القطاعي",
    metaTitle: "خدماتنا لعملاء القطاعي ومراكز الخدمة | المصرية جروب",
    metaDesc: "المصرية جروب توفر لعملاء القطاعي ومراكز الصيانة قطع غيار تويوتا الأصلية وزيوت ومنتجات MTX بجودة تضاهي الأصلية مع تغطية وطنية.",
    icon: Wrench,
    heroDesc: "قطع غيار أصلية وبدائل عالية الجودة لمراكز الخدمة وعملاء القطاعي — ضمان الجودة وسهولة الوصول.",
    intro: "سواء كنت مركز صيانة متخصص أو عميل قطاعي يبحث عن قطع غيار موثوقة، المصرية جروب توفر لك تشكيلة شاملة من قطع غيار تويوتا الأصلية والزيوت الأصلية، إضافة إلى منتجات MTX التي تضاهي المواصفات الأصلية بأسعار تنافسية. نضمن لك منتجات أصلية 100% مع تغطية توزيع تصل إلى جميع المحافظات.",
    features: [
      { icon: ShieldCheck, title: "ضمان الأصالة", desc: "كل قطعة غيار وزيت من توريد المصنع مباشرة مع ضمان المطابقة لمعايير OEM." },
      { icon: Package, title: "تشكيلة واسعة", desc: "قطع غيار لجميع موديلات تويوتا، زيوت بكل اللزوجات، وبدائل MTX." },
      { icon: MapPin, title: "تغطية وطنية", desc: "شبكة فروع في القاهرة والجيزة والأقصر مع شحن لجميع المحافظات." },
      { icon: Truck, title: "توصيل سريع", desc: "تسليم خلال 48 ساعة من مخازن مركزية عالية الكفاءة." },
      { icon: CheckCircle2, title: "MTX — جودة تضاهي الأصلي", desc: "علامتنا الخاصة بجودة يابانية وأسعار تنافسية لمراكز الخدمة." },
      { icon: Users, title: "دعم فني متخصص", desc: "فريقنا جاهز لمساعدتك في اختيار القطع المناسبة لكل موديل." },
    ],
    products: [
      { name: "قطع غيار تويوتا الأصلية", to: "/products/genuine-toyota-parts" },
      { name: "زيوت تويوتا الأصلية", to: "/products/toyota-lubricants" },
      { name: "MTX — بديل بجودة أصلية", to: "/mtx" },
    ],
    ctaText: "تصفّح المنتجات",
    ctaTo: "/products",
  },
};

const otherSegments: Record<SegmentKey, { key: SegmentKey; title: string }[]> = {
  wholesale: [
    { key: "corporate", title: "الشركات والهيئات الحكومية" },
    { key: "retail", title: "عملاء القطاعي" },
  ],
  corporate: [
    { key: "wholesale", title: "عملاء الجملة" },
    { key: "retail", title: "عملاء القطاعي" },
  ],
  retail: [
    { key: "wholesale", title: "عملاء الجملة" },
    { key: "corporate", title: "الشركات والهيئات الحكومية" },
  ],
};

const ClientSegmentPage = () => {
  const { segment } = useParams<{ segment: string }>();

  if (!segment || !segmentsData[segment as SegmentKey]) {
    return <Navigate to="/" replace />;
  }

  const data = segmentsData[segment as SegmentKey];
  const others = otherSegments[segment as SegmentKey];
  const Icon = data.icon;

  return (
    <div className="min-h-screen">
      <Helmet>
        <title>{data.metaTitle}</title>
        <meta name="description" content={data.metaDesc} />
        <link rel="canonical" href={`https://www.almasriaautoparts.com/clients/${segment}`} />
      </Helmet>

      <Navbar />

      {/* Hero */}
      <section className="bg-secondary text-secondary-foreground py-20 md:py-28">
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <div className="w-16 h-16 bg-primary/15 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Icon className="w-8 h-8 text-primary" strokeWidth={1.8} />
          </div>
          <p className="text-primary text-sm font-bold mb-3">من نخدم</p>
          <h1 className="text-3xl md:text-5xl font-black mb-5 leading-[1.4]">{data.title}</h1>
          <p className="text-secondary-foreground/70 text-base md:text-lg leading-[1.75] max-w-[660px] mx-auto">
            {data.heroDesc}
          </p>
        </div>
      </section>

      {/* Intro */}
      <section className="py-16 md:py-24 bg-background">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="text-2xl md:text-3xl font-black text-foreground mb-6">نبذة عن خدماتنا</h2>
          <p className="text-muted-foreground text-base md:text-lg leading-[1.75]">{data.intro}</p>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 md:py-24 bg-muted/30">
        <div className="container mx-auto px-4 max-w-5xl">
          <h2 className="text-2xl md:text-3xl font-black text-foreground text-center mb-12">
            ما نقدمه لـ<span className="text-primary">{data.title}</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.features.map((f) => (
              <div key={f.title} className="bg-card border border-border rounded-xl p-6">
                <div className="w-11 h-11 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <f.icon className="w-5 h-5 text-primary" strokeWidth={1.8} />
                </div>
                <p className="font-bold text-foreground mb-1.5">{f.title}</p>
                <p className="text-muted-foreground text-sm leading-[1.7]">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Products */}
      <section className="py-16 md:py-24 bg-background">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="text-2xl md:text-3xl font-black text-foreground text-center mb-10">
            قطاعات <span className="text-primary">التوزيع</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {data.products.map((p) => (
              <Link
                key={p.to}
                to={p.to}
                className="group bg-card border border-border rounded-xl p-6 text-center hover:border-primary/30 transition-colors"
              >
                <p className="font-bold text-foreground group-hover:text-primary transition-colors">{p.name}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Other segments */}
      <section className="py-16 md:py-24 bg-muted/30">
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <h2 className="text-2xl md:text-3xl font-black text-foreground mb-8">
            شرائح أخرى <span className="text-primary">نخدمها</span>
          </h2>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {others.map((o) => (
              <Button key={o.key} variant="outline" size="lg" className="font-bold gap-2" asChild>
                <Link to={`/clients/${o.key}`}>
                  {o.title}
                  <ChevronLeft className="w-4 h-4" />
                </Link>
              </Button>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 md:py-28 bg-secondary text-secondary-foreground">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <h2 className="text-3xl md:text-4xl font-black mb-6">
            ابدأ شراكتك مع <span className="text-primary">المصرية جروب</span>
          </h2>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" className="w-full sm:w-auto font-bold" asChild>
              <Link to={data.ctaTo}>{data.ctaText}</Link>
            </Button>
            <Button size="lg" variant="outline" className="w-full sm:w-auto font-bold border-secondary-foreground/30 text-secondary-foreground hover:bg-secondary-foreground/10" asChild>
              <Link to="/contact">تواصل مع فريق المبيعات</Link>
            </Button>
          </div>
        </div>
      </section>

      <Suspense fallback={null}><Footer /></Suspense>
      <Suspense fallback={null}><WhatsAppFloat /></Suspense>
      <Suspense fallback={null}><BackToTop /></Suspense>
    </div>
  );
};

export default ClientSegmentPage;
