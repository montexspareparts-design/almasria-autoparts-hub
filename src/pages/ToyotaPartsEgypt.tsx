import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { ShieldCheck, Truck, Users, MapPin, Phone, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import { lazy, Suspense } from "react";

const Footer = lazy(() => import("@/components/Footer"));


const features = [
  { icon: ShieldCheck, title: "موزع معتمد", desc: "وكيل رسمي لقطع غيار تويوتا الأصلية وزيوت تويوتا في مصر" },
  { icon: Truck, title: "شحن لجميع المحافظات", desc: "منظومة لوجستية تضمن التوصيل السريع في كافة أنحاء الجمهورية" },
  { icon: Users, title: "+2000 عميل نشط", desc: "نخدم تجار الجملة والشركات ومراكز الصيانة والقطاعي" },
  { icon: MapPin, title: "شبكة فروع واسعة", desc: "فروع في القاهرة والجيزة والأقصر ومركز إقليمي في دبي" },
];

const categories = [
  "قطع غيار محرك تويوتا الأصلية",
  "فلاتر تويوتا الأصلية (زيت – هواء – بنزين – مكيف)",
  "زيوت تويوتا الأصلية بجميع اللزوجات",
  "قطع غيار فرامل تويوتا الأصلية",
  "قطع غيار تعليق تويوتا الأصلية",
  "قطع كهرباء تويوتا الأصلية",
  "سيور ومراوح تويوتا الأصلية",
  "قطع غيار تبريد تويوتا الأصلية",
];

const ToyotaPartsEgypt = () => {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>قطع غيار تويوتا الأصلية في مصر | المصرية جروب – موزع معتمد</title>
        <meta
          name="description"
          content="المصرية جروب موزع معتمد لقطع غيار تويوتا الأصلية وزيوت تويوتا في مصر. شحن لجميع المحافظات وخدمة تجار الجملة والشركات ومراكز الصيانة والقطاعي."
        />
        <link rel="canonical" href="https://www.almasriaautoparts.com/toyota-genuine-parts-egypt" />
      </Helmet>

      <Navbar />

      {/* Hero / Intro */}
      <section className="bg-secondary pt-28 pb-20">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="inline-flex items-center gap-2 border border-primary/25 rounded-full px-4 py-2 mb-8">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-primary">موزع معتمد — تويوتا مصر</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-secondary-foreground leading-[1.2] tracking-tight mb-8">
            قطع غيار تويوتا الأصلية في مصر – موزع معتمد
          </h1>

          <p className="text-secondary-foreground/70 text-base md:text-lg leading-[2] max-w-3xl mb-10">
            توفر المصرية جروب قطع غيار تويوتا الأصلية في مصر من خلال شبكة توزيع منظمة تخدم تجار الجملة والشركات ومراكز الصيانة والقطاعي. باعتبارنا موزعًا معتمدًا لقطع غيار تويوتا الأصلية وزيوت تويوتا الأصلية، نلتزم بتوفير منتجات مطابقة للمواصفات مع شحن لجميع المحافظات وسرعة في تلبية الطلبات.
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button size="lg" className="text-base px-8 py-6 gap-2.5 font-bold" asChild>
              <Link to="/products">
                <Package className="w-5 h-5" />
                تصفح قطع غيار تويوتا
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="text-base px-8 py-6 gap-2.5 font-bold border-secondary-foreground/15 text-secondary-foreground bg-secondary-foreground/[0.04] hover:bg-secondary-foreground/10" asChild>
              <Link to="/contact">
                <Phone className="w-5 h-5" />
                تواصل معنا
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Why Al Masria */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4 max-w-5xl">
          <h2 className="text-2xl md:text-3xl font-black text-foreground text-center mb-12">
            لماذا تختار المصرية جروب لشراء قطع غيار تويوتا الأصلية؟
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {features.map((f) => (
              <div key={f.title} className="flex gap-4 border border-border rounded-xl p-6 bg-card">
                <f.icon className="w-6 h-6 text-primary flex-shrink-0 mt-1" strokeWidth={1.8} />
                <div>
                  <h3 className="text-lg font-bold text-foreground mb-1">{f.title}</h3>
                  <p className="text-muted-foreground text-sm leading-[1.8]">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 1 – Why Authorized Distributor */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="text-2xl md:text-3xl font-black text-foreground text-center mb-10">
            لماذا تختار موزع معتمد لقطع غيار تويوتا؟
          </h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl mx-auto">
            {[
              "ضمان الحصول على قطع غيار تويوتا الأصلية المعتمدة",
              "جودة مطابقة للمواصفات",
              "استقرار في الإمداد",
              "دعم فني ومعرفة متخصصة بمنتجات تويوتا",
            ].map((item) => (
              <li key={item} className="flex items-start gap-3 border border-border rounded-lg px-5 py-4 bg-card">
                <ShieldCheck className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-foreground font-medium text-sm leading-[1.8]">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Section 2 – Wholesale Distribution */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="text-2xl md:text-3xl font-black text-foreground text-center mb-6">
            توزيع قطع غيار تويوتا جملة في جميع المحافظات
          </h2>
          <p className="text-muted-foreground text-center text-base md:text-lg leading-[2] max-w-3xl mx-auto">
            تخدم المصرية جروب تجار الجملة ومحلات قطع الغيار ومراكز الصيانة في جميع محافظات مصر من خلال منظومة توزيع تضمن الشحن السريع وتوافر الأصناف الأساسية بشكل مستمر.
          </p>
        </div>
      </section>

      {/* Section 3 – MTX Positioning */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="text-2xl md:text-3xl font-black text-foreground text-center mb-6">
            ماركات يابانية عالية الجودة تضاهي الأصلي
          </h2>
          <p className="text-muted-foreground text-center text-base md:text-lg leading-[2] max-w-3xl mx-auto">
            بالإضافة إلى قطع غيار تويوتا الأصلية، توفر المجموعة من خلال علامة MTX ماركات يابانية مختارة بعناية تضاهي جودة المنتج الأصلي، لتلبية احتياجات قطاع ما بعد البيع.
          </p>
        </div>
      </section>

      {/* Categories */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="text-2xl md:text-3xl font-black text-foreground text-center mb-4">
            فئات قطع غيار تويوتا الأصلية المتوفرة
          </h2>
          <p className="text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
            نوفر تشكيلة شاملة من قطع غيار تويوتا الأصلية التي تغطي جميع احتياجات الصيانة والإصلاح.
          </p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-3xl mx-auto">
            {categories.map((cat) => (
              <li key={cat} className="flex items-center gap-3 border border-border rounded-lg px-5 py-4 bg-card">
                <ShieldCheck className="w-4 h-4 text-primary flex-shrink-0" />
                <span className="text-foreground font-medium text-sm">{cat}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Coverage */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="text-2xl md:text-3xl font-black text-foreground text-center mb-6">
            شحن قطع غيار تويوتا لجميع محافظات مصر
          </h2>
          <p className="text-muted-foreground text-center text-base md:text-lg leading-[2] max-w-3xl mx-auto mb-8">
            تعتمد المصرية جروب على منظومة شحن وتوزيع تغطي جميع محافظات الجمهورية، مما يضمن وصول قطع غيار تويوتا الأصلية إلى عملائنا في أسرع وقت ممكن. سواء كنت تاجر جملة في القاهرة أو مركز صيانة في الصعيد، نضمن لك خدمة موثوقة ومنتظمة.
          </p>
          <div className="flex justify-center">
            <Button size="lg" className="text-base px-8 py-6 gap-2.5 font-bold" asChild>
              <Link to="/what-sets-us-apart#network">
                <MapPin className="w-5 h-5" />
                تعرف على شبكة فروعنا
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-secondary">
        <div className="container mx-auto px-4 max-w-3xl text-center">
          <h2 className="text-2xl md:text-3xl font-black text-secondary-foreground mb-4">
            تواصل معنا للحصول على قطع غيار تويوتا الأصلية
          </h2>
          <p className="text-secondary-foreground/60 mb-8 leading-[1.9]">
            سواء كنت تبحث عن قطع غيار تويوتا بالجملة أو تحتاج إلى توريد منتظم لمركز صيانتك، فريقنا جاهز لخدمتك.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/contact" className="glass-pill glass-pill-primary">اطلب عرض سعر</Link>
            <Link to="/contact" className="glass-pill">
              <Phone className="w-5 h-5" />
              تواصل مع فريق المبيعات
            </Link>
          </div>
        </div>
      </section>

      <Suspense fallback={null}><Footer /></Suspense>
      
    </div>
  );
};

export default ToyotaPartsEgypt;
