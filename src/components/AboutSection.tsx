import { motion } from "framer-motion";
import { MapPin, Target, TrendingUp, Building2 } from "lucide-react";

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
              شركة مصرية رائدة بخبرة تمتد لأكثر من 25 عامًا في سوق قطع غيار السيارات. نحن موزع معتمد رسمي لقطع غيار تويوتا الأصلية وزيوت تويوتا الأصلية في مصر، بالإضافة إلى علامتنا التجارية الخاصة MTX لقطع غيار Aftermarket المستوردة.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              نخدم شريحة واسعة من عملاء الجملة، الشركات والهيئات الحكومية، ومراكز الصيانة، مع تواجد قوي في القاهرة والجيزة والأقصر، وتوسع إقليمي مدروس عبر فرعنا في دبي.
            </p>

            {/* Divisions */}
            <div className="space-y-3">
              <h4 className="font-bold text-foreground text-lg flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" />
                أقسام الشركة
              </h4>
              {[
                { name: "المصرية – قطع غيار", desc: "موزع معتمد رسمي لقطع غيار تويوتا الأصلية" },
                { name: "المصرية – زيوت", desc: "موزع معتمد رسمي لجميع أنواع زيوت تويوتا الأصلية" },
                { name: "MTX", desc: "علامة تجارية مسجلة – استيراد جميع فئات قطع غيار تويوتا Aftermarket" },
              ].map((div) => (
                <div key={div.name} className="bg-muted rounded-lg p-4 border-r-4 border-primary">
                  <div className="font-bold text-foreground">{div.name}</div>
                  <div className="text-sm text-muted-foreground">{div.desc}</div>
                </div>
              ))}
            </div>

            {/* Vision */}
            <div className="bg-muted rounded-lg p-6 border-r-4 border-primary">
              <div className="flex items-center gap-3 mb-3">
                <Target className="w-6 h-6 text-primary" />
                <h4 className="font-bold text-foreground text-lg">رؤيتنا</h4>
              </div>
              <p className="text-muted-foreground">
                أن نكون المؤسسة الأقوى والأكثر موثوقية في توزيع قطع غيار السيارات في مصر والمنطقة، مع بناء شراكات استراتيجية تدعم التوسع الإقليمي المدروس.
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
              <div className="grid grid-cols-2 gap-3">
                {[
                  { city: "القاهرة", area: "التوفيقية" },
                  { city: "الجيزة", area: "أوسيم" },
                  { city: "الأقصر", area: "صعيد مصر" },
                  { city: "دبي 🇦🇪", area: "مركز إقليمي" },
                ].map((b) => (
                  <div key={b.city} className="bg-secondary-foreground/10 rounded-md p-4 text-center">
                    <div className="text-xl font-bold">{b.city}</div>
                    <div className="text-sm text-secondary-foreground/70">{b.area}</div>
                  </div>
                ))}
              </div>
              <div className="mt-3 bg-secondary-foreground/10 rounded-md p-4 text-center">
                <div className="text-lg font-bold">المكتب الإداري</div>
                <div className="text-sm text-secondary-foreground/70">اللبيني – الهرم – الجيزة</div>
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
                  "توزيع زيوت تويوتا الأصلية",
                  "MTX – قطع غيار Aftermarket مستوردة",
                  "خدمة عملاء الجملة والشركات",
                  "التوريد للهيئات الحكومية",
                  "التوسع الإقليمي عبر دبي",
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
