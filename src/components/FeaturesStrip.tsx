import { motion } from "framer-motion";
import { ShieldCheck, Clock, Users, Truck } from "lucide-react";

const features = [
  { icon: ShieldCheck, title: "موزع معتمد", desc: "لقطع غيار وزيوت تويوتا" },
  { icon: Clock, title: "خبرة +25 سنة", desc: "في سوق قطع الغيار" },
  { icon: Users, title: "+2000 عميل", desc: "شبكة عملاء واسعة" },
  { icon: Truck, title: "تسليم 48 ساعة", desc: "داخل مصر بالكامل" },
];

const FeaturesStrip = () => {
  return (
    <section aria-label="مميزات سريعة" className="py-10 md:py-12 bg-card border-b border-border relative">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
              className="flex flex-col items-center text-center gap-3"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/8 flex items-center justify-center">
                <f.icon className="w-6 h-6 text-primary" strokeWidth={1.8} />
              </div>
              <div>
                <h3 className="font-bold text-foreground text-sm md:text-base">{f.title}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{f.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesStrip;
