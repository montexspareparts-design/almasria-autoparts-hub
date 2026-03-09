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
    <section className="py-24 md:py-32 bg-background overflow-hidden">
      <div className="container mx-auto px-4">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="mb-20"
        >
          {/* Label */}
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-primary text-sm font-black tracking-[0.25em] uppercase mb-5"
          >
            لماذا تختارنا
          </motion.p>

          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <h2 className="text-4xl md:text-5xl font-black text-foreground leading-tight mb-0">
                معايير تشغيل تضعنا في{" "}
                <span className="text-primary">مستوى مختلف</span>
              </h2>
            </div>
            <p className="text-foreground/55 text-base md:text-lg max-w-md leading-[1.9] font-medium md:text-left shrink-0">
              التزام بالجودة والمواصفات منذ 1999 — لا استثناءات.
            </p>
          </div>

          {/* Divider */}
          <motion.div
            className="mt-8 h-px bg-border w-full"
            initial={{ scaleX: 0, originX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          />
        </motion.div>

        {/* Reasons — editorial grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
          {reasons.map((r, i) => (
            <motion.div
              key={r.number}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ delay: 0.1 + i * 0.12, duration: 0.6, ease: "easeOut" }}
              className={`group relative flex gap-8 p-10 border-border transition-all duration-500 hover:bg-muted/40 cursor-default
                ${i % 2 === 0 ? "md:border-l" : ""} 
                ${i < 2 ? "border-b" : ""}
                ${i === 0 ? "border-t" : ""}
                ${i === 1 ? "border-t" : ""}
              `}
            >
              {/* Red accent on hover */}
              <motion.div
                className="absolute top-0 right-0 w-[3px] h-0 bg-primary rounded-full group-hover:h-full transition-all duration-500"
              />

              {/* Number */}
              <div className="shrink-0 pt-1">
                <span className="font-black text-5xl md:text-6xl text-primary/15 group-hover:text-primary/25 transition-colors duration-300 leading-none tabular-nums">
                  {r.number}
                </span>
              </div>

              {/* Content */}
              <div className="flex-1">
                {/* Icon */}
                <div className="w-12 h-12 rounded-xl bg-primary/8 flex items-center justify-center mb-5 group-hover:bg-primary/15 transition-colors duration-300">
                  <r.icon className="w-6 h-6 text-primary" strokeWidth={1.8} />
                </div>

                <h3 className="font-black text-foreground text-xl mb-3 leading-tight">
                  {r.title}
                </h3>
                <p className="text-foreground/55 text-base leading-[1.9] font-medium">
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
