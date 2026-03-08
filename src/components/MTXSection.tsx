import { motion } from "framer-motion";
import { ArrowLeft, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import brandMtx from "@/assets/brand-mtx.jpg";

const MTXSection = () => {
  return (
    <section id="mtx" className="py-20 md:py-28 bg-background overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-10 items-center max-w-5xl mx-auto">
          {/* Image */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="order-1 md:order-2"
          >
            <div className="bg-white rounded-2xl p-8 border border-border shadow-lg">
              <img src={brandMtx} alt="MTX Aftermarket" className="w-full h-auto object-contain" loading="lazy" />
            </div>
          </motion.div>

          {/* Content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="order-2 md:order-1 space-y-6"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-bold">
              <Wrench className="w-4 h-4" />
              علامتنا الخاصة
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-foreground">
              <span className="text-gradient-red">MTX</span> Aftermarket
            </h2>
            <p className="text-muted-foreground text-base leading-[2]">
              MTX هي العلامة الخاصة بالمصرية جروب، تقدّم منتجات أفترماركت عالية الجودة تم اختبارها لضمان الأداء والقيمة.
            </p>
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
              <Button size="lg" className="gap-2 red-glow font-bold" asChild>
                <Link to="/products/mtx-aftermarket">
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
