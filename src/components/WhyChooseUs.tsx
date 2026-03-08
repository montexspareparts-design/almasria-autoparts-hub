import { motion } from "framer-motion";
import { ShieldCheck, Banknote, Truck, Headphones } from "lucide-react";

const reasons = [
  {
    icon: ShieldCheck,
    title: "قطع غيار تويوتا الأصلية",
    desc: "جميع منتجاتنا أصلية بنسبة 100% من تويوتا مباشرة، مع ضمان وكالة على كل قطعة.",
  },
  {
    icon: Banknote,
    title: "أسعار تنافسية",
    desc: "أسعار منضبطة وعادلة لتجار الجملة والشركات ومراكز الصيانة، مع خصومات حسب الفئة.",
  },
  {
    icon: Truck,
    title: "توصيل سريع",
    desc: "تسليم خلال 48 ساعة لجميع محافظات مصر عبر منظومة لوجستية مركزية.",
  },
  {
    icon: Headphones,
    title: "دعم فني متخصص",
    desc: "فريق متخصص يساعدك في تحديد القطعة المطابقة عبر رقم الشاسيه أو صورة القطعة.",
  },
];

const WhyChooseUs = () => {
  return (
    <section className="py-20 md:py-28 bg-background">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-bold mb-4">
            مزايانا
          </span>
          <h2 className="text-3xl md:text-4xl font-black text-foreground mb-3">
            لماذا <span className="text-primary">تختارنا؟</span>
          </h2>
          <p className="text-muted-foreground text-base max-w-lg mx-auto">
            أربعة أسباب تجعل المصرية جروب الخيار الأول لتجار وموزعي قطع غيار تويوتا
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-5xl mx-auto">
          {reasons.map((r, i) => (
            <motion.div
              key={r.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.4 }}
              className="bg-card border border-border rounded-xl p-6 text-center hover:border-primary/30 transition-colors"
            >
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                <r.icon className="w-6 h-6 text-primary" strokeWidth={1.8} />
              </div>
              <h3 className="font-bold text-foreground text-sm mb-2">{r.title}</h3>
              <p className="text-muted-foreground text-xs leading-[1.8]">{r.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhyChooseUs;