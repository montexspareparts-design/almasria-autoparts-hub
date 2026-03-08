import { motion } from "framer-motion";
import { Building2, Crosshair, MapPin, Lightbulb, Rocket } from "lucide-react";

const sections = [
  {
    icon: Building2,
    title: "نبذة عن المجموعة",
    content:
      "المصرية جروب مؤسسة مصرية تأسست منذ أكثر من 25 عامًا، وتُعد من أبرز الكيانات المتخصصة في مجال توزيع قطع غيار وزيوت تويوتا الأصلية في السوق المصري. نجحت المجموعة في بناء سمعة مؤسسية راسخة قائمة على الاعتمادية والالتزام، لتصبح شريكًا استراتيجيًا لعملاء الجملة والشركات والهيئات الحكومية على مستوى الجمهورية.",
  },
  {
    icon: Crosshair,
    title: "مجال التخصص",
    content:
      "تركّز المصرية جروب على ثلاثة خطوط توزيع رئيسية: قطع غيار تويوتا الأصلية بصفتنا موزعًا معتمدًا رسميًا، وزيوت تويوتا الأصلية المعتمدة لمحركات وناقلات الحركة، إضافةً إلى علامة MTX — العلامة التجارية المسجّلة للمجموعة والمتخصصة في استيراد وتوزيع ماركات يابانية عالمية بمعايير جودة تضاهي الأصلية.",
  },
  {
    icon: MapPin,
    title: "نطاق العمليات",
    content:
      "تدير المجموعة شبكة توزيع منظّمة تضم 4 فروع رئيسية: القاهرة (التوفيقية)، الجيزة (أوسيم)، الأقصر، ومكتب دبي كمركز إقليمي للتوسع في أسواق الخليج. تخدم هذه الشبكة أكثر من 1,000 عميل نشط في جميع محافظات مصر، مع التزام بالتوصيل خلال 48 ساعة مدعومًا بأنظمة إدارة رقمية متكاملة لإدارة المخزون وسلسلة الإمداد.",
  },
  {
    icon: Lightbulb,
    title: "فلسفة العمل",
    content:
      "تقوم فلسفة المصرية جروب على ثلاثة محاور: الأصالة — بتوفير منتجات أصلية موثّقة فقط، والانضباط — بسياسة تسعير شفافة تحمي هوامش ربح الموزعين وتحافظ على استقرار السوق، والشراكة — ببناء علاقات تجارية طويلة الأمد قائمة على الثقة والالتزام المتبادل بدلاً من التعاملات الموسمية.",
  },
  {
    icon: Rocket,
    title: "الرؤية المستقبلية",
    content:
      "تسعى المصرية جروب لتعزيز مكانتها كمنصة التوزيع الأولى لقطع غيار تويوتا في المنطقة، من خلال التوسع الإقليمي عبر مكتب دبي، وتطوير البنية التقنية لتشمل حلول طلب رقمية متقدمة، مع الحفاظ على معايير الجودة والخدمة التي بنت عليها المجموعة سمعتها على مدار أكثر من ربع قرن.",
  },
];

const AboutSection = () => {
  return (
    <section id="about" className="relative py-24 md:py-32 bg-background overflow-hidden">
      {/* Subtle background pattern */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, hsl(var(--foreground)) 1px, transparent 0)`,
          backgroundSize: "40px 40px",
        }}
      />

      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-bold mb-4">
            تعرّف علينا
          </span>
          <h2 className="text-3xl md:text-5xl font-black text-foreground mb-3">
            عن <span className="text-primary">المصرية جروب</span>
          </h2>
          <motion.div
            initial={{ width: 0 }}
            whileInView={{ width: "5rem" }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="h-1 bg-primary rounded-full mx-auto mt-4"
          />
        </motion.div>

        {/* Sections */}
        <div className="max-w-4xl mx-auto space-y-6">
          {sections.map((section, i) => {
            const Icon = section.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.45 }}
                className="bg-card border border-border rounded-2xl p-6 md:p-8"
              >
                <div className="flex items-start gap-4 md:gap-5">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg md:text-xl font-bold text-foreground mb-3">
                      {section.title}
                    </h3>
                    <p className="text-muted-foreground leading-[1.95] text-[15px]">
                      {section.content}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
