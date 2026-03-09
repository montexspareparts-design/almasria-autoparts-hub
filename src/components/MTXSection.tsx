import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const MTXSection = () => {
  return (
    <section id="mtx" className="py-20 md:py-28 bg-background overflow-hidden">
      <div className="container mx-auto px-4 max-w-3xl text-center">
        <motion.span
          initial={{ opacity: 0, scale: 0.85 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-bold mb-4"
        >
          علامتنا الخاصة
        </motion.span>
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="text-3xl md:text-4xl font-black text-foreground mb-4"
        >
          MTX — علامتنا بجودة تضاهي المواصفات الأصلية
        </motion.h2>
        <motion.div
          className="w-14 h-1 bg-primary mx-auto rounded-full mb-6"
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
        />
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.25 }}
          className="text-muted-foreground text-base md:text-lg leading-[2] mb-8 max-w-2xl mx-auto"
        >
          من خلال علامة MTX، نوفر قطع غيار بديلة مختارة بعناية تضاهي جودة المنتج الأصلي بأسعار تنافسية، لتلبية احتياجات خدمة ما بعد البيع في مصر والمنطقة.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4, duration: 0.5 }}
          whileHover={{ scale: 1.04, y: -1 }}
          whileTap={{ scale: 0.97 }}
        >
          <Button size="lg" className="gap-2 font-bold shadow-lg shadow-primary/20" asChild>
            <Link to="/mtx">
              اكتشف MTX
              <motion.span
                animate={{ x: [0, -4, 0] }}
                transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
              >
                <ArrowLeft className="w-4 h-4" />
              </motion.span>
            </Link>
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

export default MTXSection;
