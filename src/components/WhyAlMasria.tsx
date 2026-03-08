import { motion } from "framer-motion";
import { ShieldCheck, Network, Scale, Handshake } from "lucide-react";

const blocks = [
  {
    icon: ShieldCheck,
    title: "موزع معتمد لقطع الغيار الأصلية",
    description:
      "وكالة رسمية لتوزيع قطع غيار وزيوت تويوتا الأصلية، بشهادات اعتماد موثّقة تضمن أصالة كل منتج.",
  },
  {
    icon: Network,
    title: "شبكة توزيع منظمة",
    description:
      "تغطية شاملة لجميع محافظات مصر عبر 4 فروع رئيسية ونظام لوجستي يضمن التسليم خلال 48 ساعة.",
  },
  {
    icon: Scale,
    title: "انضباط في التسعير وحماية السوق",
    description:
      "سياسة تسعير واضحة ومنضبطة تحمي هامش ربح الموزعين وتحافظ على استقرار السوق.",
  },
  {
    icon: Handshake,
    title: "شراكات طويلة الأمد قائمة على الثقة",
    description:
      "أكثر من 1,000 عميل دائم بعلاقات تجارية مبنية على الشفافية والالتزام المتبادل.",
  },
];

const WhyAlMasria = () => {
  return (
    <section className="py-20 md:py-28 bg-background">
      <div className="container mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <span className="inline-block text-sm font-bold text-primary bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 mb-4">
            لماذا نحن
          </span>
          <h2 className="text-3xl md:text-4xl font-black text-foreground mb-3">
            لماذا <span className="text-primary">المصرية؟</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            أربعة ركائز تجعلنا الشريك الأمثل لتجارة قطع غيار تويوتا في مصر
          </p>
        </motion.div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {blocks.map((block, i) => {
            const Icon = block.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.4 }}
                className="bg-card border border-border rounded-2xl p-6 text-center flex flex-col items-center"
              >
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-5">
                  <Icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2 leading-snug">
                  {block.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {block.description}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default WhyAlMasria;
