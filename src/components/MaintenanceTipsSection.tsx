import { motion, useInView } from "framer-motion";
import { Lightbulb, AlertTriangle, Gauge, Droplets, Wind, Disc, Battery, ThermometerSun, ArrowLeft } from "lucide-react";
import { useRef } from "react";
import { Button } from "@/components/ui/button";

const tips = [
  {
    icon: Droplets,
    title: "متى تغيّر زيت المحرك؟",
    desc: "كل 5,000 – 10,000 كم حسب نوع الزيت. التأخير يسبب تآكل أجزاء المحرك الداخلية وارتفاع الحرارة.",
    tag: "زيوت",
    color: "from-amber-500/15 to-amber-500/5",
    iconBg: "bg-amber-500/15",
    iconColor: "text-amber-600",
  },
  {
    icon: Disc,
    title: "علامات تلف الفرامل",
    desc: "صوت صرير عند الضغط، اهتزاز الدركسيون، أو زيادة مسافة الوقوف — كلها مؤشرات لتغيير التيل أو الأقراص.",
    tag: "فرامل",
    color: "from-primary/15 to-primary/5",
    iconBg: "bg-primary/15",
    iconColor: "text-primary",
  },
  {
    icon: Wind,
    title: "أهمية فلتر الهواء",
    desc: "فلتر هواء متسخ يقلل كفاءة المحرك 10-15%. يُغيّر كل 15,000 – 20,000 كم أو حسب بيئة القيادة.",
    tag: "فلاتر",
    color: "from-sky-500/15 to-sky-500/5",
    iconBg: "bg-sky-500/15",
    iconColor: "text-sky-600",
  },
  {
    icon: Battery,
    title: "عمر البطارية",
    desc: "البطارية تعيش 2-4 سنوات. افحصها دوريًا خاصة في الصيف — الحرارة العالية أكبر عدو للبطارية.",
    tag: "كهرباء",
    color: "from-emerald-500/15 to-emerald-500/5",
    iconBg: "bg-emerald-500/15",
    iconColor: "text-emerald-600",
  },
  {
    icon: ThermometerSun,
    title: "نظام التبريد",
    desc: "افحص مستوى سائل التبريد شهريًا. نقصه يسبب ارتفاع حرارة المحرك وقد يؤدي لأعطال مكلفة.",
    tag: "تبريد",
    color: "from-cyan-500/15 to-cyan-500/5",
    iconBg: "bg-cyan-500/15",
    iconColor: "text-cyan-600",
  },
  {
    icon: Gauge,
    title: "ضغط الإطارات",
    desc: "افحص الضغط أسبوعيًا والإطارات باردة. ضغط غلط يزيد استهلاك البنزين ويقلل عمر الكاوتش.",
    tag: "إطارات",
    color: "from-violet-500/15 to-violet-500/5",
    iconBg: "bg-violet-500/15",
    iconColor: "text-violet-600",
  },
];

const MaintenanceTipsSection = () => {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section ref={ref} className="py-20 md:py-28 bg-secondary overflow-hidden relative">
      {/* Subtle top accent */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <motion.div
          className="text-center mb-14"
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <span className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-1.5 text-sm font-bold mb-4">
            <Lightbulb className="w-4 h-4" />
            مركز المعرفة
          </span>
          <h2 className="text-2xl md:text-4xl font-black text-secondary-foreground mb-3">
            نصائح <span className="text-gradient-red">صيانة دورية</span> لسيارتك
          </h2>
          <p className="text-secondary-foreground/50 max-w-xl mx-auto text-sm md:text-base">
            حافظ على سيارتك في أفضل حالة مع نصائح خبرائنا — معلومات عملية توفر عليك وقت وفلوس
          </p>
          <motion.div
            initial={{ width: 0 }}
            animate={inView ? { width: "5rem" } : {}}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="h-1 bg-primary mx-auto rounded-full mt-4"
          />
        </motion.div>

        {/* Tips Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6 mb-10">
          {tips.map((tip, i) => {
            const Icon = tip.icon;
            return (
              <motion.div
                key={tip.title}
                initial={{ opacity: 0, y: 30 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: i * 0.1, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
                whileHover={{ y: -6, transition: { duration: 0.25 } }}
                className="group relative bg-secondary-foreground/[0.04] border border-secondary-foreground/10 rounded-2xl p-6 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/10 transition-all duration-300 cursor-default overflow-hidden"
              >
                {/* Hover gradient */}
                <div className={`absolute inset-0 bg-gradient-to-br ${tip.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

                <div className="relative z-10">
                  {/* Tag + Icon row */}
                  <div className="flex items-center justify-between mb-4">
                    <motion.div
                      className={`w-12 h-12 ${tip.iconBg} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}
                      whileHover={{ rotate: [0, -10, 10, 0] }}
                      transition={{ duration: 0.4 }}
                    >
                      <Icon className={`w-6 h-6 ${tip.iconColor}`} />
                    </motion.div>
                    <span className="text-xs font-bold text-secondary-foreground/40 bg-secondary-foreground/[0.06] px-3 py-1 rounded-full">
                      {tip.tag}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="font-bold text-secondary-foreground text-base md:text-lg mb-2 group-hover:text-primary transition-colors duration-300">
                    {tip.title}
                  </h3>

                  {/* Description */}
                  <p className="text-secondary-foreground/60 text-sm leading-relaxed">
                    {tip.desc}
                  </p>

                  {/* Did you know accent */}
                  <div className="mt-4 pt-3 border-t border-secondary-foreground/[0.06] flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-primary/60 flex-shrink-0" />
                    <span className="text-xs text-secondary-foreground/40 font-medium">
                      الإهمال يضاعف تكلفة الإصلاح
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* CTA */}
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.7, duration: 0.5 }}
        >
          <Button
            size="lg"
            variant="outline"
            className="gap-2 font-bold border-2 border-secondary-foreground/20 text-secondary-foreground hover:border-primary hover:text-primary hover:bg-primary/5 px-8"
            onClick={() => window.open("https://wa.me/201234567890?text=محتاج استشارة صيانة", "_blank")}
          >
            استشر خبراءنا مجانًا
            <motion.span animate={{ x: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}>
              <ArrowLeft className="w-4 h-4" />
            </motion.span>
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

export default MaintenanceTipsSection;
