import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const MTXSection = () => {
  return (
    <section id="mtx" className="py-20 md:py-28 bg-background overflow-hidden">
      <div className="container mx-auto px-4 max-w-3xl text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mb-8"
        >
          <p className="text-primary text-xs font-black tracking-[0.35em] uppercase mb-5">
            علامتنا الخاصة
          </p>
          <h2 className="text-2xl md:text-3xl font-black text-foreground leading-snug mb-3">
            MTX — جودة تضاهي <span className="text-primary">المواصفات الأصلية</span>
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed max-w-md mx-auto">
            قطع غيار بديلة مختارة بعناية بأسعار تنافسية
          </p>
        </motion.div>
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
