import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import brandMtx from "@/assets/brand-mtx.jpg";

const MTXSection = () => {
  return (
    <section id="mtx" className="py-20 md:py-28 bg-background overflow-hidden">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="flex flex-col md:flex-row items-center gap-10 md:gap-16">
          {/* Right side - Text content */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="flex-1 text-center md:text-right"
          >
            <h2 className="text-3xl md:text-5xl font-black text-foreground mb-4" style={{ lineHeight: 1.5 }}>
              جودة تضاهي{" "}<br className="hidden md:block" /><span className="text-primary">المواصفات الأصلية</span>
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-md md:max-w-none mb-8">
              قطع غيار بديلة مختارة بعناية بأسعار تنافسية
            </p>
            <motion.div
              whileHover={{ scale: 1.04, y: -1 }}
              whileTap={{ scale: 0.97 }}
              className="inline-block"
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
          </motion.div>

          {/* Left side - Full logo */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="flex-1 flex items-center justify-center"
          >
            <img
              src={brandMtx}
              alt="MTX Spare Parts"
              className="w-full max-w-md md:max-w-full object-contain"
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default MTXSection;
