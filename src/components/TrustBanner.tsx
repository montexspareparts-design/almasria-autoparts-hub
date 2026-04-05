import { motion, useInView } from "framer-motion";
import { ShieldCheck, Award, Stamp, BadgeCheck } from "lucide-react";
import { useRef } from "react";

const guarantees = [
  {
    icon: ShieldCheck,
    title: "ضمان الأصالة",
    desc: "كل قطعة غيار تحمل الرقم التسلسلي الأصلي من تويوتا",
  },
  {
    icon: Award,
    title: "شهادة الجودة",
    desc: "حاصلون على شهادة الموزع المعتمد من تويوتا موتورز",
  },
  {
    icon: BadgeCheck,
    title: "تتبع المصدر",
    desc: "كل منتج قابل للتتبع حتى خط الإنتاج الأصلي",
  },
];

const TrustBanner = () => {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section ref={ref} className="relative py-20 overflow-hidden bg-secondary">
      {/* Animated background pattern */}
      <div className="absolute inset-0 opacity-[0.03]">
        {Array.from({ length: 8 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute text-secondary-foreground font-black text-[120px] whitespace-nowrap select-none"
            style={{ top: `${i * 13}%`, right: "-10%" }}
            animate={{ x: i % 2 === 0 ? ["0%", "-50%"] : ["-50%", "0%"] }}
            transition={{ duration: 30 + i * 5, repeat: Infinity, ease: "linear" }}
          >
            GENUINE PARTS ● TOYOTA ● أصلي ● GENUINE PARTS ● TOYOTA ● أصلي ●
          </motion.div>
        ))}
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="flex flex-col items-center mb-14">
          {/* Animated seal */}
          <motion.div
            className="relative mb-8"
            initial={{ scale: 0, rotate: -180 }}
            animate={inView ? { scale: 1, rotate: 0 } : {}}
            transition={{ type: "spring", stiffness: 100, damping: 12, delay: 0.2 }}
          >
            <motion.div
              className="w-28 h-28 rounded-full border-4 border-primary/40 flex items-center justify-center"
              animate={{ boxShadow: ["0 0 0px hsl(var(--primary) / 0)", "0 0 40px hsl(var(--primary) / 0.3)", "0 0 0px hsl(var(--primary) / 0)"] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              <motion.div
                className="w-20 h-20 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center"
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
              >
                <Stamp className="w-10 h-10 text-primary" />
              </motion.div>
            </motion.div>
            {/* Orbiting dot */}
            <motion.div
              className="absolute w-3 h-3 bg-primary rounded-full"
              style={{ top: "50%", left: "50%" }}
              animate={{
                x: [56, 0, -56, 0, 56],
                y: [0, -56, 0, 56, 0],
              }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            />
          </motion.div>

          <motion.h2
            className="text-3xl md:text-4xl font-black text-secondary-foreground text-center mb-3"
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.4 }}
          >
            <span className="shimmer-text">أصلي 100% — مضمون</span>
          </motion.h2>
          <motion.p
            className="text-secondary-foreground/60 text-center max-w-lg"
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ delay: 0.6 }}
          >
            نفخر بأن نكون الموزع المعتمد رسميًا لقطع غيار وزيوت تويوتا الأصلية في مصر والمنطقة
          </motion.p>
        </div>

        {/* Guarantee cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {guarantees.map((g, i) => (
            <motion.div
              key={g.title}
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.5 + i * 0.15, type: "spring", stiffness: 100 }}
              whileHover={{ y: -6, borderColor: "hsl(var(--primary) / 0.5)" }}
              className="bg-secondary-foreground/5  border border-secondary-foreground/10 rounded-2xl p-6 text-center transition-colors group"
            >
              <motion.div
                className="w-14 h-14 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-4"
                whileHover={{ scale: 1.15, rotate: 10 }}
              >
                <g.icon className="w-7 h-7 text-primary" />
              </motion.div>
              <h3 className="text-lg font-bold text-secondary-foreground mb-2">{g.title}</h3>
              <p className="text-secondary-foreground/60 text-sm leading-relaxed">{g.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TrustBanner;
