import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";

const testimonials = [
  {
    name: "أحمد سعيد",
    role: "صاحب مركز خدمة — القاهرة",
    text: "تعاملنا مع المصرية جروب من أكثر من 10 سنين، دايمًا القطع أصلية والتسليم في ميعاده.",
    rating: 5,
  },
  {
    name: "محمد عبد الرحمن",
    role: "موزع جملة — المنيا",
    text: "الانضباط السعري والدعم اللي بنلاقيه من الفريق خلانا نكبر شغلنا معاهم.",
    rating: 5,
  },
  {
    name: "كريم حسن",
    role: "مدير مشتريات — شركة نقل",
    text: "منتجات MTX وفرتلنا بديل ممتاز بسعر تنافسي وجودة مضمونة.",
    rating: 5,
  },
  {
    name: "طارق إبراهيم",
    role: "تاجر قطع غيار — الأقصر",
    text: "رغم بُعد المسافة، التوصيل منتظم والمخزون دايمًا متوفر.",
    rating: 5,
  },
];

const TestimonialsHome = () => {
  return (
    <section className="py-20 md:py-28 bg-muted/30">
      <div className="container mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-bold mb-4">
            آراء عملائنا
          </span>
          <h2 className="text-3xl md:text-4xl font-black text-foreground mb-3">
            ثقة <span className="text-primary">شركائنا</span>
          </h2>
          <p className="text-muted-foreground text-base max-w-lg mx-auto">
            أكثر من 1,000 عميل يثقون في المصرية جروب كشريك توزيع أساسي
          </p>
        </motion.div>

        {/* Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-5xl mx-auto">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.4 }}
            >
              <div className="bg-card border border-border rounded-xl p-6 h-full flex flex-col">
                <Quote className="w-7 h-7 text-primary/15 mb-3" />
                <div className="flex gap-0.5 mb-3">
                  {Array.from({ length: t.rating }).map((_, j) => (
                    <Star key={j} className="w-3.5 h-3.5 text-primary fill-primary" />
                  ))}
                </div>
                <p className="text-muted-foreground text-sm leading-7 flex-1 mb-4">
                  "{t.text}"
                </p>
                <div className="pt-3 border-t border-border">
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
