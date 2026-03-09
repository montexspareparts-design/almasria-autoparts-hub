import { motion } from "framer-motion";
import { Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const ContactSimple = () => {
  return (
    <section className="py-16 md:py-20 bg-secondary overflow-hidden relative">
      {/* Subtle animated glow */}
      <motion.div
        className="absolute -top-24 left-1/4 w-60 h-60 bg-primary/10 rounded-full blur-3xl pointer-events-none"
        animate={{ x: [0, 40, 0], opacity: [0.2, 0.5, 0.2] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="container mx-auto px-4 max-w-3xl text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mb-8"
        >
          <p className="text-primary text-xs font-black tracking-[0.35em] uppercase mb-5">
            تواصل معنا
          </p>
          <h2 className="text-3xl md:text-4xl font-black text-secondary-foreground leading-snug mb-3">
            ابدأ <span className="text-primary">شراكتك</span> معنا اليوم
          </h2>
          <p className="text-secondary-foreground/50 text-sm leading-relaxed max-w-sm mx-auto">
            فريقنا جاهز لتقديم عرض توريد مخصص يلبي احتياجاتك
          </p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.35, duration: 0.5 }}
          className="flex flex-col sm:flex-row gap-3 justify-center"
        >
          <motion.div whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.97 }} transition={{ duration: 0.2 }}>
            <Button size="lg" className="text-base px-10 py-7 font-black shadow-xl shadow-primary/25 text-lg" asChild>
              <Link to="/contact#quote">
                اطلب عرض سعر الآن
              </Link>
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.97 }} transition={{ duration: 0.2 }}>
            <Button
              size="lg"
              variant="outline"
              className="text-base px-10 py-7 gap-3 font-black border-2 border-secondary-foreground/20 text-secondary-foreground hover:bg-secondary-foreground/10 hover:border-secondary-foreground/30 text-lg"
              asChild
            >
              <Link to="/contact">
                <Phone className="w-5 h-5" strokeWidth={2.5} />
                تواصل معنا
              </Link>
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default ContactSimple;
