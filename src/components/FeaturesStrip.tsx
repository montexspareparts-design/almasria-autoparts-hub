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
    <section className="py-12 md:py-16 bg-card border-b border-border">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="flex flex-col items-center text-center group"
            >
              <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-3 transition-all duration-300 group-hover:bg-primary/20 group-hover:scale-110">
                <f.icon className="w-7 h-7 text-primary" />
              </div>
              <h3 className="font-bold text-foreground text-sm md:text-base">{f.title}</h3>
              <p className="text-xs text-muted-foreground mt-1">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesStrip;
