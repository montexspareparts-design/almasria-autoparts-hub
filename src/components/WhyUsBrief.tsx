import { motion } from "framer-motion";
import { Award, Clock, Users, Truck, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const highlights = [
  {
    icon: Clock,
    title: "ريادة تمتد لأكثر من 25 عامًا",
    desc: "ريادة تمتد لأكثر من 25 عامًا في توزيع قطع الغيار والزيوت الأصلية.",
  },
  {
    icon: Award,
    title: "موزّع معتمد لتويوتا",
    desc: "موزّع معتمد لقطع غيار وزيوت تويوتا عبر قنوات توريد رسمية.",
  },
  {
    icon: Users,
    title: "شبكة توزيع واسعة",
    desc: "شبكة توزيع وطنية تضم أكثر من 2000 عميل نشط.",
  },
  {
    icon: Truck,
    title: "توريد وتسليم سريع",
    desc: "توريد وتسليم خلال 48 ساعة عبر مخازن مركزية منظمة.",
  },
];

const WhyUsBrief = () => {
  return (
    <section id="why-us" className="py-20 md:py-28 bg-background overflow-hidden relative">
      {/* Subtle dot pattern */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: "radial-gradient(circle, hsl(var(--primary)) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="container mx-auto px-4 relative">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-bold mb-4"
          >
            مميزاتنا
          </motion.span>
          <h2 className="text-3xl md:text-5xl font-black text-foreground mb-4">
            ما <span className="text-gradient-red">يميزنا</span>
          </h2>
          <motion.div
            initial={{ width: 0 }}
            whileInView={{ width: "5rem" }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="h-1 bg-primary mx-auto rounded-full"
          />
        </motion.div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
          {highlights.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.12, type: "spring", stiffness: 80 }}
              whileHover={{ y: -6 }}
              className="bg-card border border-border rounded-xl p-6 text-center hover:border-primary/40 transition-all duration-300 group"
            >
              <motion.div
                className="w-14 h-14 bg-gradient-to-br from-primary/15 to-primary/5 rounded-xl flex items-center justify-center mx-auto mb-4 border border-primary/10"
                whileHover={{ scale: 1.12, rotate: 5 }}
                transition={{ type: "spring", stiffness: 200 }}
              >
                <item.icon className="w-7 h-7 text-primary" />
              </motion.div>
              <h3 className="font-bold text-card-foreground text-sm md:text-base mb-2">{item.title}</h3>
              <p className="text-muted-foreground text-xs md:text-sm leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mt-12"
        >
          <motion.div whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: 0.97 }}>
            <Button size="lg" variant="outline" className="gap-2 font-bold text-primary border-primary/30 hover:bg-primary hover:text-primary-foreground transition-all duration-300" asChild>
              <Link to="/what-sets-us-apart">
                اكتشف المزيد عن مميزاتنا
                <ArrowLeft className="w-4 h-4" />
              </Link>
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default WhyUsBrief;
