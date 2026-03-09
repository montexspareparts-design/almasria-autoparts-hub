import { motion } from "framer-motion";
import { ShieldCheck, Banknote, Truck, Headphones } from "lucide-react";

const reasons = [
  {
    number: "01",
    icon: ShieldCheck,
    title: "قطع غيار تويوتا الأصلية",
    desc: "جميع منتجاتنا أصلية بنسبة 100% من تويوتا مباشرة، مع ضمان وكالة كامل على كل قطعة.",
  },
  {
    number: "02",
    icon: Banknote,
    title: "أسعار مؤسسية منضبطة",
    desc: "أسعار عادلة وشفافة لتجار الجملة والشركات ومراكز الصيانة، مع خصومات مدروسة حسب الفئة.",
  },
  {
    number: "03",
    icon: Truck,
    title: "تسليم خلال 48 ساعة",
    desc: "منظومة لوجستية مركزية تضمن وصول طلبك لجميع محافظات مصر في أقل من يومين.",
  },
  {
    number: "04",
    icon: Headphones,
    title: "دعم فني متخصص",
    desc: "فريق مختص يحدد القطعة المطابقة بدقة عبر رقم الشاسيه أو الصورة، دون تخمين.",
  },
];

const WhyChooseUs = () => {
  return (
    <section className="relative py-20 md:py-28 bg-background overflow-hidden section-glow" dir="rtl">
      <div className="container mx-auto px-6 max-w-6xl">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mb-16"
        >
          <div className="text-center">
            <p className="text-[hsl(var(--gold-accent))] text-sm font-black tracking-[0.3em] uppercase mb-5">
              لماذا تختارنا
            </p>
            <h2 className="text-4xl md:text-5xl font-black text-foreground leading-tight mb-4">
              معايير تشغيل تضعنا في{" "}
              <span className="text-primary">مستوى مختلف</span>
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-sm mx-auto">
              التزام بالجودة والمواصفات منذ 1999 — لا استثناءات.
            </p>
          </div>

          {/* Divider */}
          <motion.div
            className="mt-8 h-px bg-border w-full"
            initial={{ scaleX: 0, originX: 1 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.9, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          />
        </motion.div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y divide-border md:divide-y-0">
          {reasons.map((r, i) => (
            <motion.div
              key={r.number}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: 0.08 * i, duration: 0.55, ease: "easeOut" }}
              className={`group relative flex gap-6 p-8 transition-colors duration-400 hover:bg-muted/30 cursor-default
                ${i % 2 === 0 ? "md:border-l border-border" : ""}
                ${i < 2 ? "md:border-b border-border" : ""}
              `}
            >
              {/* Left accent bar */}
              <div className="absolute top-0 right-0 w-[2px] bg-primary scale-y-0 group-hover:scale-y-100 transition-transform duration-500 origin-top h-full rounded-full" />

              {/* Number */}
              <div className="shrink-0 w-12 pt-0.5">
                <span className="font-black text-3xl text-primary/12 group-hover:text-primary/22 transition-colors duration-300 tabular-nums leading-none select-none">
                  {r.number}
                </span>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-primary/8 flex items-center justify-center mb-4 group-hover:bg-primary/14 transition-colors duration-300">
                  <r.icon className="w-4 h-4 text-primary" strokeWidth={1.8} />
                </div>
                <h3 className="font-bold text-foreground text-base mb-2 leading-snug">
                  {r.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {r.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
};

export default WhyChooseUs;
