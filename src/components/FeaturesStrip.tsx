import { motion } from "framer-motion";
import { ShieldCheck, Clock, Users, Truck } from "lucide-react";

const features = [
  { icon: ShieldCheck, title: "موزع معتمد", desc: "لقطع غيار وزيوت تويوتا", color: "from-primary/20 to-primary/5" },
  { icon: Clock, title: "خبرة +25 سنة", desc: "في سوق قطع الغيار", color: "from-[hsl(var(--gold-accent))]/20 to-[hsl(var(--gold-accent))]/5" },
  { icon: Users, title: "+2000 عميل", desc: "شبكة عملاء واسعة", color: "from-primary/20 to-primary/5" },
  { icon: Truck, title: "تسليم 48 ساعة", desc: "داخل مصر بالكامل", color: "from-[hsl(var(--gold-accent))]/20 to-[hsl(var(--gold-accent))]/5" },
];

const FeaturesStrip = () => {
  return (
    <section className="py-14 md:py-18 bg-card border-b border-border relative overflow-hidden">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "radial-gradient(circle, hsl(var(--primary)) 1px, transparent 1px)", backgroundSize: "30px 30px" }} />
      
      <div className="container mx-auto px-4 relative">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 30, scale: 0.9 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.12, type: "spring", stiffness: 100 }}
              whileHover={{ y: -6, scale: 1.03 }}
              className="flex flex-col items-center text-center group cursor-default"
            >
              <motion.div
                className={`w-16 h-16 bg-gradient-to-br ${f.color} rounded-2xl flex items-center justify-center mb-4 border border-primary/10 shadow-lg shadow-primary/5`}
                whileHover={{ rotate: [0, -5, 5, 0] }}
                transition={{ duration: 0.5 }}
              >
                <f.icon className="w-7 h-7 text-primary" />
              </motion.div>
              <h3 className="font-bold text-foreground text-sm md:text-base">{f.title}</h3>
              <p className="text-xs text-muted-foreground mt-1">{f.desc}</p>
              <motion.div
                className="w-8 h-0.5 bg-primary/30 mt-3 rounded-full"
                initial={{ width: 0 }}
                whileInView={{ width: 32 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12 + 0.3, duration: 0.5 }}
              />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesStrip;
