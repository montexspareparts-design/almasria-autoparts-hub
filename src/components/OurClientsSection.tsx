import { motion, useInView } from "framer-motion";
import { Users, Building2, Truck, Wrench, Store, Factory } from "lucide-react";
import { useRef } from "react";

const clientTypes = [
  {
    icon: Wrench,
    title: "مراكز الصيانة",
    count: "+400",
    desc: "مركز صيانة معتمد",
  },
  {
    icon: Store,
    title: "تجار قطع الغيار",
    count: "+300",
    desc: "تاجر ومتجر متخصص",
  },
  {
    icon: Truck,
    title: "شركات النقل",
    count: "+150",
    desc: "شركة نقل وأسطول",
  },
  {
    icon: Building2,
    title: "الشركات والمؤسسات",
    count: "+100",
    desc: "شركة ومؤسسة حكومية وخاصة",
  },
  {
    icon: Factory,
    title: "الموزعون الإقليميون",
    count: "+50",
    desc: "موزع في المحافظات",
  },
];

const trustedLogos = [
  "شركة النيل للنقل",
  "أسطول مصر",
  "مجموعة السلام",
  "شركة الأمل للتجارة",
  "النجم الذهبي",
  "المتحدة للنقل",
];

const OurClientsSection = () => {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section ref={ref} className="py-20 md:py-28 bg-muted/40 overflow-hidden">
      <div className="container mx-auto px-4">
        {/* Header */}
        <motion.div
          className="text-center mb-14"
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <span className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-1.5 text-sm font-bold mb-4">
            <Users className="w-4 h-4" />
            شركاء النجاح
          </span>
          <h2 className="text-3xl md:text-5xl font-black text-foreground mb-3">
            أكثر من <span className="text-gradient-red">١٠٠٠ عميل</span> يثقون بنا
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            نخدم شريحة واسعة من القطاع الخاص والحكومي في جميع محافظات مصر والمنطقة
          </p>
          <motion.div
            initial={{ width: 0 }}
            animate={inView ? { width: "5rem" } : {}}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="h-1 bg-primary mx-auto rounded-full mt-4"
          />
        </motion.div>

        {/* Client type cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6 mb-16">
          {clientTypes.map((client, i) => {
            const Icon = client.icon;
            return (
              <motion.div
                key={client.title}
                initial={{ opacity: 0, y: 30, scale: 0.9 }}
                animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
                transition={{ delay: i * 0.1, duration: 0.5, type: "spring", stiffness: 100 }}
                whileHover={{ y: -8, boxShadow: "0 20px 40px hsl(var(--primary) / 0.12)" }}
                className="relative bg-card rounded-2xl p-5 md:p-6 border border-border text-center group cursor-default transition-colors hover:border-primary/30"
              >
                <motion.div
                  className="w-14 h-14 mx-auto mb-3 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors"
                  whileHover={{ rotate: [0, -10, 10, 0] }}
                  transition={{ duration: 0.4 }}
                >
                  <Icon className="w-7 h-7 text-primary" />
                </motion.div>
                <motion.div
                  className="text-2xl md:text-3xl font-black text-primary mb-1"
                  initial={{ opacity: 0 }}
                  animate={inView ? { opacity: 1 } : {}}
                  transition={{ delay: i * 0.1 + 0.3 }}
                >
                  {client.count}
                </motion.div>
                <h3 className="font-bold text-foreground text-sm md:text-base mb-1">{client.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{client.desc}</p>
              </motion.div>
            );
          })}
        </div>

        {/* Trusted by marquee */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ delay: 0.6 }}
          className="relative"
        >
          <div className="text-center mb-6">
            <span className="text-sm font-semibold text-muted-foreground tracking-wide">
              يثقون بنا في توفير قطع الغيار الأصلية
            </span>
          </div>
          <div className="relative overflow-hidden py-4">
            {/* Gradient masks */}
            <div className="absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-muted/40 to-transparent z-10" />
            <div className="absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-muted/40 to-transparent z-10" />
            
            <motion.div
              className="flex gap-8 whitespace-nowrap"
              animate={{ x: ["0%", "-50%"] }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            >
              {[...trustedLogos, ...trustedLogos].map((name, i) => (
                <div
                  key={`${name}-${i}`}
                  className="flex-shrink-0 px-8 py-3 bg-card border border-border rounded-xl flex items-center gap-3 hover:border-primary/30 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-sm font-semibold text-foreground">{name}</span>
                </div>
              ))}
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default OurClientsSection;
