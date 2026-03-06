import { motion } from "framer-motion";

const AboutSection = () => {
  return (
    <section id="about" className="py-20 md:py-28 bg-background">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-black text-foreground mb-4">
            من <span className="text-gradient-red">نحن</span>
          </h2>
          <div className="w-20 h-1 bg-primary mx-auto" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto space-y-6 text-right"
        >
          <p className="text-muted-foreground leading-relaxed text-lg">
            المصرية جروب مؤسسة مصرية رائدة بخبرة تتجاوز 25 عامًا في قطاع توزيع قطع غيار وزيوت تويوتا الأصلية داخل السوق المصري، وتمثل أحد الكيانات المستقرة والموثوقة في هذا المجال.
          </p>
          <p className="text-muted-foreground leading-relaxed text-lg">
            بصفتنا موزعًا معتمدًا رسميًا لقطع غيار وزيوت تويوتا الأصلية في مصر، نجحنا في بناء منظومة توزيع قوية تغطي مختلف المحافظات، وتخدم عملاء الجملة والشركات والهيئات بكفاءة تشغيلية عالية وإدارة احترافية لسلسلة الإمداد.
          </p>
          <p className="text-muted-foreground leading-relaxed text-lg">
            ويمتد حضورنا إقليميًا من خلال فرعنا في دبي – الإمارات العربية المتحدة، والذي يمثل خطوة استراتيجية ضمن رؤية توسعية مدروسة لتعزيز العلاقات التجارية في منطقة الخليج وبناء شراكات طويلة الأمد.
          </p>
          <p className="text-muted-foreground leading-relaxed text-lg">
            نلتزم بتقديم منتجات أصلية موثوقة، ومعايير تشغيل احترافية، ونهج مؤسسي قائم على الجودة والاستدامة، بما يعكس خبرة تمتد لأكثر من ربع قرن في السوق.
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default AboutSection;
