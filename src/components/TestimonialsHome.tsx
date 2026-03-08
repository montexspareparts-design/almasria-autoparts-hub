import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";

const testimonials = [
  {
    name: "أحمد سعيد",
    role: "صاحب مركز خدمة — القاهرة",
    text: "تعاملنا مع المصرية جروب من أكثر من 10 سنين، دايمًا القطع أصلية والتسليم في ميعاده. شريك موثوق فعلاً.",
    rating: 5,
  },
  {
    name: "محمد عبد الرحمن",
    role: "موزع جملة — المنيا",
    text: "الانضباط السعري والدعم اللي بنلاقيه من الفريق خلانا نكبر شغلنا معاهم. أسعار عادلة وجودة ثابتة.",
    rating: 5,
  },
  {
    name: "كريم حسن",
    role: "مدير مشتريات — شركة نقل",
    text: "منتجات MTX وفرتلنا بديل ممتاز بسعر تنافسي وجودة مضمونة. التسليم خلال 48 ساعة فعلاً بيفرق معانا.",
    rating: 5,
  },
  {
    name: "طارق إبراهيم",
    role: "تاجر قطع غيار — الأقصر",
    text: "رغم بُعد المسافة، التوصيل منتظم والمخزون دايمًا متوفر. المصرية جروب أفضل موزع اتعاملت معاه في الصعيد.",
    rating: 5,
  },
];

const TestimonialsHome = () => {
  return (
    <section className="py-20 md:py-28 bg-card border-y border-border overflow-hidden relative">
      {/* Subtle pattern */}
      <div
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage:
            "radial-gradient(circle, hsl(var(--foreground)) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      <div className="container mx-auto px-4 relative">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-bold mb-4"
          >
            <Star className="w-4 h-4 fill-current" />
            آراء عملائنا
          </motion.span>
          <h2 className="text-3xl md:text-5xl font-black text-foreground mb-4">
            ثقة <span className="text-gradient-red">شركائنا</span>
          </h2>
          <p className="text-muted-foreground text-base max-w-lg mx-auto">
            أكثر من 2000 عميل يثقون في المصرية جروب كشريك توزيع أساسي
          </p>
          <motion.div
            initial={{ width: 0 }}
            whileInView={{ width: "5rem" }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="h-1 bg-primary mx-auto rounded-full mt-5"
          />
        </motion.div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl mx-auto">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true }}
              transition={{
                delay: i * 0.1,
                duration: 0.5,
                type: "spring" as const,
                stiffness: 100,
                damping: 15,
              }}
              whileHover={{ y: -6 }}
              className="group"
            >
              <div className="bg-background border border-border rounded-2xl p-6 h-full flex flex-col hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 relative overflow-hidden">
                {/* Hover gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/0 to-primary/0 group-hover:from-primary/[0.03] group-hover:to-transparent transition-all duration-500" />

                {/* Quote icon */}
                <div className="relative z-10 mb-4">
                  <Quote className="w-8 h-8 text-primary/20 group-hover:text-primary/40 transition-colors" />
                </div>

                {/* Stars */}
                <div className="flex gap-0.5 mb-3 relative z-10">
                  {Array.from({ length: t.rating }).map((_, j) => (
                    <Star
                      key={j}
                      className="w-4 h-4 text-[hsl(var(--gold-accent))] fill-[hsl(var(--gold-accent))]"
                    />
                  ))}
                </div>

                {/* Text */}
                <p className="text-muted-foreground text-sm leading-7 flex-1 relative z-10 mb-5">
                  "{t.text}"
                </p>

                {/* Author */}
                <div className="relative z-10 pt-4 border-t border-border">
                  <h4 className="font-bold text-foreground text-sm">{t.name}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">{t.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsHome;
