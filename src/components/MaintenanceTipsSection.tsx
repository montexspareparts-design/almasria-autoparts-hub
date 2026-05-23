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
];

const MaintenanceTipsSection = () => {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section ref={ref} className="relative bg-carbon py-20 md:py-28 overflow-hidden">
      {/* Hairlines */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-toyota-red/40 to-transparent" />
      <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-toyota-red/20 to-transparent" />

      {/* Ambient red glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-toyota-red/[0.05] rounded-full blur-[150px]" />
        <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-toyota-red/[0.04] rounded-full blur-[120px]" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <motion.div
          className="text-center mb-14"
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <span className="inline-flex items-center gap-2 border border-white/10 bg-white/[0.04] rounded-full px-4 py-1.5 mb-5">
            <Lightbulb className="w-3.5 h-3.5 text-toyota-red" />
            <span className="font-tajawal text-xs font-bold text-soft tracking-widest">مركز المعرفة</span>
          </span>
          <h2
            className="font-tajawal font-black text-white leading-tight mb-3"
            style={{ fontSize: "clamp(32px, 4.5vw, 56px)" }}
          >
            نصائح <span className="text-toyota-red">صيانة دورية</span> لسيارتك
          </h2>
          <motion.div
            initial={{ width: 0 }}
            animate={inView ? { width: "5rem" } : {}}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="h-[3px] bg-toyota-red mx-auto rounded-full mb-4 shadow-red-glow"
          />
          <p className="font-tajawal text-soft max-w-xl mx-auto text-base md:text-lg">
            حافظ على سيارتك في أفضل حالة مع نصائح خبرائنا — معلومات عملية توفر عليك وقت وفلوس
          </p>
        </motion.div>

        {/* Tips Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6 mb-10 max-w-6xl mx-auto">
          {tips.map((tip, i) => {
            const Icon = tip.icon;
            return (
              <motion.div
                key={tip.title}
                initial={{ opacity: 0, y: 30 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: i * 0.1, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
                whileHover={{ y: -6, transition: { duration: 0.25 } }}
                className="group relative bg-white/[0.04] backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:border-toyota-red/50 hover:shadow-2xl hover:shadow-toyota-red/15 transition-all duration-300 cursor-default overflow-hidden"
              >
                {/* Corner brackets */}
                <span className="pointer-events-none absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-toyota-red/50 rounded-tl-2xl" />
                <span className="pointer-events-none absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 border-toyota-red/50 rounded-tr-2xl" />

                <div className="relative z-10">
                  {/* Tag + Icon row */}
                  <div className="flex items-center justify-between mb-4">
                    <motion.div
                      className="w-12 h-12 bg-toyota-red/15 border border-toyota-red/30 rounded-xl flex items-center justify-center group-hover:scale-110 group-hover:bg-toyota-red/25 transition-all duration-300"
                      whileHover={{ rotate: [0, -10, 10, 0] }}
                      transition={{ duration: 0.4 }}
                    >
                      <Icon className="w-6 h-6 text-toyota-red" />
                    </motion.div>
                    <span className="font-tajawal text-xs font-bold text-white/60 bg-white/[0.06] border border-white/10 px-3 py-1 rounded-full">
                      {tip.tag}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="font-tajawal font-black text-white text-base md:text-lg mb-2 group-hover:text-toyota-red transition-colors duration-300">
                    {tip.title}
                  </h3>

                  {/* Description */}
                  <p className="font-tajawal text-soft text-sm leading-relaxed">
                    {tip.desc}
                  </p>

                  {/* Did you know accent */}
                  <div className="mt-4 pt-3 border-t border-white/10 flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-toyota-red/80 flex-shrink-0" />
                    <span className="font-tajawal text-xs text-white/50 font-medium">
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
            className="gap-2 font-tajawal font-bold shadow-lg shadow-toyota-red/30 hover:shadow-toyota-red/40 px-10 py-7 text-base bg-toyota-red hover:bg-toyota-red/90 text-white"
            onClick={() => {
              window.dispatchEvent(new CustomEvent('open-ai-chat', { detail: { message: 'محتاج استشارة صيانة لسيارتي' } }));
            }}
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
