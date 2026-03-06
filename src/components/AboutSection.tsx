import { motion } from "framer-motion";
import { MapPin, Target, TrendingUp } from "lucide-react";

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

        <div className="grid md:grid-cols-2 gap-12 items-start">
          {/* Story */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-6"
          >
            <h3 className="text-2xl font-bold text-foreground">
              المصرية جروب – Al Masria Group
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              شركة مصرية رائدة متخصصة في توزيع قطع غيار السيارات، تأسست بخبرة تمتد لأكثر من 15 عامًا في السوق المصري. نحن موزع معتمد لقطع غيار وزيوت تويوتا الأصلية في مصر.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              نتميز بخبرتنا العميقة في إدارة سلسلة الإمداد والتوريد المحلي والدولي، مع علاقات مباشرة مع موردين دوليين خاصة من اليابان. نعمل على بناء شراكات استراتيجية طويلة الأمد لضمان توفير أفضل المنتجات بأعلى جودة.
            </p>

            {/* Vision */}
            <div className="bg-muted rounded-lg p-6 border-r-4 border-primary">
              <div className="flex items-center gap-3 mb-3">
                <Target className="w-6 h-6 text-primary" />
                <h4 className="font-bold text-foreground text-lg">رؤيتنا</h4>
              </div>
              <p className="text-muted-foreground">
                أن نكون حلقة الوصل الأقوى بين الموردين الدوليين والسوق المصري، ومركز التوزيع الأكثر موثوقية في منطقة الشرق الأوسط وشمال أفريقيا.
              </p>
            </div>
          </motion.div>

          {/* Info Cards */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-6"
          >
            {/* Locations */}
            <div className="bg-secondary text-secondary-foreground rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <MapPin className="w-6 h-6 text-primary" />
                <h4 className="font-bold text-lg">فروعنا</h4>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-secondary-foreground/10 rounded-md p-4 text-center">
                  <div className="text-xl font-bold">القاهرة</div>
                  <div className="text-sm text-secondary-foreground/70">التوفيقية</div>
                </div>
                <div className="bg-secondary-foreground/10 rounded-md p-4 text-center">
                  <div className="text-xl font-bold">الأقصر</div>
                  <div className="text-sm text-secondary-foreground/70">صعيد مصر</div>
                </div>
              </div>
            </div>

            {/* Expertise */}
            <div className="bg-muted rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <TrendingUp className="w-6 h-6 text-primary" />
                <h4 className="font-bold text-foreground text-lg">تخصصاتنا</h4>
              </div>
              <ul className="space-y-2 text-muted-foreground">
                {[
                  "توزيع قطع غيار تويوتا الأصلية",
                  "إدارة سلسلة الإمداد والمخزون",
                  "الاستيراد المباشر من اليابان",
                  "التوريد لتجار الجملة والموزعين",
                  "خدمة مراكز الصيانة وشركات الأساطيل",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
