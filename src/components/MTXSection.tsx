import { motion } from "framer-motion";
import { ArrowLeft, Wrench, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import brandMtx from "@/assets/brand-mtx.jpg";

const benefits = [
  "منتجات أفترماركت عالية الجودة",
  "أسعار تنافسية مقارنة بالأصلي",
  "مطابقة لمعايير OE العالمية",
  "ضمان جودة من المصرية جروب",
];

const MTXSection = () => {
  return (
    <section id="mtx" className="py-20 md:py-28 bg-background overflow-hidden relative">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-10 items-center max-w-5xl mx-auto">
          {/* Image */}
          <motion.div
            initial={{ opacity: 0, x: 50, rotateY: -10 }}
            whileInView={{ opacity: 1, x: 0, rotateY: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, type: "spring" }}
            className="order-1 md:order-2"
          >
            <motion.div
              className="bg-white rounded-2xl p-8 border border-border shadow-lg relative overflow-hidden group"
              whileHover={{ scale: 1.02, boxShadow: "0 25px 50px hsl(355 90% 48% / 0.15)" }}
              transition={{ duration: 0.4 }}
            >
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"
              />
              <img src={brandMtx} alt="MTX Aftermarket" className="w-full h-auto object-contain relative z-10" loading="lazy" />
            </motion.div>
          </motion.div>

          {/* Content */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="order-2 md:order-1 space-y-6"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-bold"
            >
              <Wrench className="w-4 h-4" />
              علامتنا الخاصة
            </motion.div>
            <h2 className="text-3xl md:text-4xl font-black text-foreground">
              <span className="text-gradient-red">MTX</span> Aftermarket
            </h2>
            <p className="text-muted-foreground text-base leading-[2]">
              MTX هي العلامة الخاصة بالمصرية جروب، تقدّم منتجات أفترماركت عالية الجودة تم اختبارها لضمان الأداء والقيمة.
            </p>

            {/* Benefits list */}
            <div className="space-y-3">
              {benefits.map((b, i) => (
                <motion.div
                  key={b}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  className="flex items-center gap-3 text-sm text-muted-foreground"
                >
                  <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                  {b}
                </motion.div>
              ))}
            </div>

            <motion.div whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: 0.97 }}>
              <Button size="lg" className="gap-2 red-glow font-bold relative overflow-hidden group" asChild>
                <Link to="/mtx">
                  <span className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 skew-x-12" />
                  اكتشف MTX
                  <ArrowLeft className="w-4 h-4" />
                </Link>
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default MTXSection;
