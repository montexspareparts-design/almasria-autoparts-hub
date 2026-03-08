import { Package, Building2, Wrench, ChevronLeft } from "lucide-react";
import { Link } from "react-router-dom";

const segments = [
  {
    icon: Package,
    title: "تجّار الجملة",
    desc: (
      <>
        توريد منتظم، أسعار منضبطة، ومخزون جاهز مع تسليم خلال 48&nbsp;ساعة على مستوى الجمهورية.
      </>
    ),
    cta: "اطلب عرض توريد",
    ctaTo: "/contact#quote",
    ariaLabel: "طلب عرض توريد لتجّار الجملة",
  },
  {
    icon: Building2,
    title: "الشركات والهيئات",
    desc: (
      <>
        عقود توريد مخصّصة، فواتير منظمة، ودعم لوجستي يلائم الأساطيل والمشروعات.
      </>
    ),
    cta: "تواصل مع فريق المبيعات",
    ctaTo: "/contact",
    ariaLabel: "التواصل مع المبيعات للشركات والهيئات",
  },
  {
    icon: Wrench,
    title: "القطاعي ومراكز الخدمة",
    desc: (
      <>
        <Link to="/products/genuine-toyota-parts" className="text-primary hover:underline font-semibold">قطع غيار تويوتا الأصلية</Link> و<Link to="/products/toyota-lubricants" className="text-primary hover:underline font-semibold">زيوت تويوتا</Link> ومنتجات{" "}
        <Link to="/mtx" className="text-primary hover:underline font-semibold">MTX</Link> بجودة تضاهي المواصفات، مع تغطية وطنية.
      </>
    ),
    cta: "تصفح القطاعات",
    ctaTo: "/products",
    ariaLabel: "تصفّح القطاعات والمنتجات",
  },
];

const WhoWeServe = () => {
  return (
    <section className="py-20 md:py-28 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-black text-foreground mb-3">
            من <span className="text-primary">نخدم؟</span>
          </h2>
          <p className="text-muted-foreground text-base md:text-lg">
            حلول توزيع مرنة ودعم توريد موثوق يلائم أحجام وأنماط أعمال مختلفة.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-5xl mx-auto">
          {segments.map((s) => (
            <div
              key={s.title}
              className="bg-card border border-border rounded-xl p-7 text-center flex flex-col items-center"
            >
              <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mb-5">
                <s.icon className="w-7 h-7 text-primary" strokeWidth={1.8} />
              </div>
              <p className="text-lg font-semibold text-foreground mb-2">{s.title}</p>
              <p className="text-muted-foreground text-sm leading-[1.7] max-w-[260px] mb-5">
                {s.desc}
              </p>
              <Link
                to={s.ctaTo}
                aria-label={s.ariaLabel}
                className="inline-flex items-center gap-1.5 text-primary text-sm font-bold hover:underline min-h-[44px] min-w-[44px] justify-center"
              >
                {s.cta}
                <ChevronLeft className="w-4 h-4" />
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhoWeServe;
