import { motion } from "framer-motion";
import { Package, Building2, Wrench, ChevronLeft } from "lucide-react";
import { Link } from "react-router-dom";

const segments = [
  {
    icon: Package,
    title: "تجار الجملة",
    desc: "توريد منتظم بأسعار منضبطة ومخزون جاهز مع تسليم خلال 48 ساعة على مستوى الجمهورية"
    cta: "اعرف المزيد",
    ctaTo: "/clients/wholesale",
    ariaLabel: "تفاصيل خدماتنا لعملاء الجملة",
  },
  {
    icon: Building2,
    title: "الشركات والأساطيل",
    desc: "عقود توريد مخصّصة وفواتير منظمة ودعم لوجستي يلائم الأساطيل والمشروعات الكبرى"
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
    <section className="py-20 md:py-28 bg-background overflow-hidden">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-14"
        >
          <h2 className="text-3xl md:text-4xl font-black text-foreground mb-3">
            <span className="text-primary">عملائنا</span>
          </h2>
          <motion.div
            className="w-14 h-1 bg-primary mx-auto rounded-full mb-4"
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
          />
          <p className="text-muted-foreground text-base md:text-lg">
            حلول توزيع مرنة ودعم توريد موثوق يلائم أحجام وأنماط أعمال مختلفة.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-5xl mx-auto">
          {segments.map((s, i) => (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, y: 24, scale: 0.95 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{
                delay: 0.15 + i * 0.15,
                duration: 0.5,
                type: "spring",
                stiffness: 100,
              }}
              whileHover={{
                y: -6,
                scale: 1.02,
                boxShadow: "0 20px 25px -5px hsl(var(--primary) / 0.08), 0 8px 10px -6px hsl(var(--primary) / 0.08)",
                transition: { duration: 0.2 },
              }}
            >
              <Link
                to={s.ctaTo}
                aria-label={s.ariaLabel}
                className="group relative bg-card border border-border rounded-xl p-7 text-center flex flex-col items-center hover:border-primary/30 transition-all duration-300 h-full overflow-hidden"
              >
                {/* Hover gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                <div className="relative z-10 flex flex-col items-center">
                  <motion.div
                    className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mb-5 group-hover:bg-primary/20 transition-colors"
                    whileHover={{ rotate: [0, -10, 10, -5, 0] }}
                    transition={{ duration: 0.5 }}
                  >
                    <s.icon className="w-7 h-7 text-primary" strokeWidth={1.8} />
                  </motion.div>
                  <p className="text-lg font-semibold text-foreground mb-2">{s.title}</p>
                  <p className="text-muted-foreground text-sm leading-[1.7] max-w-[260px] mb-5">{s.desc}</p>
                  <span className="inline-flex items-center gap-1.5 text-primary text-sm font-bold group-hover:gap-3 transition-all">
                    {s.cta}
                    <motion.span
                      animate={{ x: [0, -3, 0] }}
                      transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </motion.span>
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhoWeServe;
