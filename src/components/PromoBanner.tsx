import { motion } from "framer-motion";
import { Tag, Zap, ChevronLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const PromoBanner = () => {
  return (
    <section className="py-0">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-l from-primary/15 via-primary/8 to-transparent border border-primary/20"
        >
          {/* Animated shimmer */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent"
            animate={{ x: ["-100%", "100%"] }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          />

          <div className="relative z-10 flex flex-col sm:flex-row items-center gap-4 sm:gap-6 p-5 sm:p-6">
            {/* Icon */}
            <div className="shrink-0 w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center">
              <Tag className="w-6 h-6 text-primary" />
            </div>

            {/* Text */}
            <div className="flex-1 text-center sm:text-right">
              <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
                <Zap className="w-4 h-4 text-primary" />
                <p className="font-black text-foreground text-sm sm:text-base">
                  خصومات على الكميات + كوبونات خصم
                </p>
              </div>
              <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed">
                احصل على خصومات تصاعدية عند شراء كميات أكبر، واستخدم كوبونات الخصم للحصول على أفضل الأسعار.
              </p>
            </div>

            {/* CTA */}
            <Button size="sm" className="shrink-0 font-bold gap-1.5" asChild>
              <Link to="/contact#quote">
                اطلب عرض سعر
                <ChevronLeft className="w-3.5 h-3.5" />
              </Link>
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default PromoBanner;
