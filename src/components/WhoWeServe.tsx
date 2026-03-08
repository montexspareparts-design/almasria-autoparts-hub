import { Package, Building2, Wrench, ChevronLeft } from "lucide-react";
import { Link } from "react-router-dom";

const segments = [
  {
    icon: Package,
    title: "عملاء الجملة",
    desc: "توريد منتظم، أسعار منضبطة، ومخزون جاهز مع تسليم خلال 48\u00A0ساعة على مستوى الجمهورية.",
    cta: "اعرف المزيد",
    ctaTo: "/clients/wholesale",
    ariaLabel: "تفاصيل خدماتنا لعملاء الجملة",
  },
  {
    icon: Building2,
    title: "الشركات والهيئات الحكومية",
    desc: "عقود توريد مخصّصة، فواتير منظمة، ودعم لوجستي يلائم الأساطيل والمشروعات.",
    cta: "اعرف المزيد",
    ctaTo: "/clients/corporate",
    ariaLabel: "تفاصيل خدماتنا للشركات والهيئات",
  },
  {
    icon: Wrench,
    title: "عملاء القطاعي",
    desc: "قطع غيار تويوتا الأصلية وزيوت تويوتا ومنتجات MTX بجودة تضاهي المواصفات، مع تغطية وطنية.",
    cta: "اعرف المزيد",
    ctaTo: "/clients/retail",
    ariaLabel: "تفاصيل خدماتنا لعملاء القطاعي",
  },
];

const WhoWeServe = () => {
  return (
    <section className="py-20 md:py-28 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-black text-foreground mb-3">
            <span className="text-primary">عملائنا</span>
          </h2>
          <p className="text-muted-foreground text-base md:text-lg">
            حلول توزيع مرنة ودعم توريد موثوق يلائم أحجام وأنماط أعمال مختلفة.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-5xl mx-auto">
          {segments.map((s) => (
            <Link
              key={s.title}
              to={s.ctaTo}
              aria-label={s.ariaLabel}
              className="group bg-card border border-border rounded-xl p-7 text-center flex flex-col items-center hover:border-primary/30 transition-colors"
            >
              <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mb-5 group-hover:bg-primary/15 transition-colors">
                <s.icon className="w-7 h-7 text-primary" strokeWidth={1.8} />
              </div>
              <p className="text-lg font-semibold text-foreground mb-2">{s.title}</p>
              <p className="text-muted-foreground text-sm leading-[1.7] max-w-[260px] mb-5">{s.desc}</p>
              <span className="inline-flex items-center gap-1.5 text-primary text-sm font-bold group-hover:underline">
                {s.cta}
                <ChevronLeft className="w-4 h-4" />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhoWeServe;
