import { motion } from "framer-motion";
import { ShieldCheck, Banknote, Truck, Headphones } from "lucide-react";

const reasons = [
  {
    icon: ShieldCheck,
    title: "قطع غيار تويوتا الأصلية",
    desc: "جميع منتجاتنا أصلية بنسبة 100% من تويوتا مباشرة، مع ضمان وكالة على كل قطعة",
  },
  {
    icon: Banknote,
    title: "أسعار تنافسية",
    desc: "أسعار منضبطة وعادلة لتجار الجملة والشركات ومراكز الصيانة، مع خصومات حسب الفئة",
  },
  {
    icon: Truck,
    title: "توصيل سريع",
    desc: "تسليم خلال 48 ساعة لجميع محافظات مصر عبر منظومة لوجستية مركزية",
  },
  {
    icon: Headphones,
    title: "دعم فني متخصص",
    desc: "فريق متخصص يساعدك في تحديد القطعة المطابقة عبر رقم الشاسيه أو صورة القطعة",
  },
];

const WhyChooseUs = () => {
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
          <motion.span
            initial={{ opacity: 0, scale: 0.85 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-bold mb-4"
          >
            مزايانا
          </motion.span>
          <h2 className="text-3xl md:text-4xl font-black text-foreground mb-3">
            لماذا <span className="text-primary">تختارنا؟</span>
          </h2>
          <motion.div
            className="w-14 h-1 bg-primary mx-auto rounded-full mb-4"
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
          />
          <p className="text-foreground/70 text-base md:text-lg max-w-2xl mx-auto leading-[1.9] font-medium">
            أربعة أسباب تجعل المصرية جروب الخيار الأول لتجار وموزعي قطع غيار تويوتا
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-5xl mx-auto">
          {reasons.map((r, i) => (
            <motion.div
              key={r.title}
              initial={{ opacity: 0, y: 24, scale: 0.95 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{
                delay: 0.15 + i * 0.12,
                duration: 0.5,
                type: "spring",
                stiffness: 100,
              }}
              whileHover={{
                y: -6,
                scale: 1.02,
                boxShadow: "0 20px 25px -5px hsl(var(--primary) / 0.1), 0 8px 10px -6px hsl(var(--primary) / 0.1)",
                borderColor: "hsl(var(--primary) / 0.4)",
                transition: { duration: 0.2 },
              }}
              className="group relative bg-card border border-border rounded-xl p-6 text-center transition-all duration-300 overflow-hidden"
            >
              {/* Hover gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              <div className="relative z-10">
                <motion.div
                  className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-colors"
                  whileHover={{ rotate: [0, -10, 10, -5, 0] }}
                  transition={{ duration: 0.5 }}
                >
                  <r.icon className="w-6 h-6 text-primary" strokeWidth={1.8} />
                </motion.div>
                <h3 className="font-black text-foreground text-base mb-2.5">{r.title}</h3>
                <p className="text-foreground/70 text-sm leading-[1.9] font-medium">{r.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhyChooseUs;
