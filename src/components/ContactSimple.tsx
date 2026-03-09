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
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-2xl md:text-3xl font-black text-secondary-foreground mb-4"
        >
          ابدأ شراكتك مع المصرية جروب
        </motion.h2>
        <motion.div
          className="w-14 h-1 bg-primary mx-auto rounded-full mb-5"
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
        />
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-secondary-foreground/50 mb-8 leading-[1.9]"
        >
          سواء كنت تاجر جملة أو شركة أو مركز صيانة، فريقنا جاهز لتقديم عرض توريد مخصص لاحتياجاتك.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.35, duration: 0.5 }}
          className="flex flex-col sm:flex-row gap-3 justify-center"
        >
          <motion.div whileHover={{ scale: 1.04, y: -1 }} whileTap={{ scale: 0.97 }} transition={{ duration: 0.15 }}>
            <Button size="lg" className="text-base px-8 py-6 font-bold shadow-lg shadow-primary/20" asChild>
              <Link to="/contact#quote">
                اطلب عرض سعر
              </Link>
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.04, y: -1 }} whileTap={{ scale: 0.97 }} transition={{ duration: 0.15 }}>
            <Button
              size="lg"
              variant="outline"
              className="text-base px-8 py-6 gap-2.5 font-bold border-secondary-foreground/15 text-secondary-foreground hover:bg-secondary-foreground/10"
              asChild
            >
              <Link to="/contact">
                <Phone className="w-5 h-5" />
                تواصل مع فريق المبيعات
              </Link>
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default ContactSimple;
