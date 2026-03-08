import { motion, useInView } from "framer-motion";
import { Star, Quote } from "lucide-react";
import { useRef } from "react";

const testimonials = [
  {
    name: "أحمد محمود",
    role: "صاحب مركز صيانة",
    rating: 5,
    text: "تعاملنا مع المصرية جروب من أكتر من ١٠ سنين، دايمًا قطع الغيار أصلية ١٠٠٪ والتوصيل سريع. أفضل موزع اتعاملت معاه.",
  },
  {
    name: "محمد عبدالله",
    role: "موزع قطع غيار",
    rating: 5,
    text: "الأسعار تنافسية جدًا والمخزون دايمًا متوفر. الدعم الفني ممتاز وبيساعدونا نلاقي القطعة المناسبة بسرعة.",
  },
  {
    name: "خالد السيد",
    role: "صاحب شركة نقل",
    rating: 5,
    text: "بنعتمد عليهم في صيانة أسطول شاحناتنا بالكامل. الجودة ثابتة والتعامل احترافي من أول طلب.",
  },
  {
    name: "ياسر حسن",
    role: "ورشة متخصصة تويوتا",
    rating: 4,
    text: "خدمة العملاء ممتازة والتوصيل لحد باب الورشة. بننصح كل زملائنا بالتعامل مع المصرية جروب.",
  },
];

const cardVariants = {
  hidden: { opacity: 0, y: 40, rotateX: 10 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    rotateX: 0,
    transition: { delay: i * 0.15, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
};

const TestimonialsSection = () => {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="py-20 bg-muted/50 overflow-hidden">
      <div className="container mx-auto px-4">
        {/* Header */}
        <motion.div
          className="text-center mb-14"
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <span className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-1.5 text-sm font-semibold mb-4">
            <Star className="w-4 h-4 fill-primary" />
            آراء عملائنا
          </span>
          <h2 className="text-3xl md:text-4xl font-black text-foreground mb-3">
            ثقة عملائنا <span className="text-gradient-red">أكبر شهادة</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            أكثر من ١٠٠٠ عميل يثقون بنا في توفير قطع غيار تويوتا الأصلية
          </p>
        </motion.div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              custom={i}
              variants={cardVariants}
              initial="hidden"
              animate={inView ? "visible" : "hidden"}
              whileHover={{ y: -6, boxShadow: "0 20px 40px hsl(var(--primary) / 0.1)" }}
              className="relative bg-card rounded-2xl p-6 border border-border shadow-sm transition-colors group"
            >
              {/* Quote icon */}
              <div className="absolute top-4 left-4 text-primary/10 group-hover:text-primary/20 transition-colors">
                <Quote className="w-8 h-8" />
              </div>

              {/* Stars */}
              <div className="flex gap-0.5 mb-4">
                {Array.from({ length: 5 }).map((_, s) => (
                  <Star
                    key={s}
                    className={`w-4 h-4 ${s < t.rating ? "fill-primary text-primary" : "text-border"}`}
                  />
                ))}
              </div>

              {/* Text */}
              <p className="text-foreground/80 text-sm leading-relaxed mb-6 min-h-[80px]">
                "{t.text}"
              </p>

              {/* Author */}
              <div className="border-t border-border pt-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-sm text-foreground">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
