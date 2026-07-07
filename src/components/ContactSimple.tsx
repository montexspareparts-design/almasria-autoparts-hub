import { motion } from "framer-motion";
import { Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const ContactSimple = () => {
  return (
    <section className="relative bg-carbon py-20 md:py-24 overflow-hidden">
      {/* Hairlines */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-toyota-red/40 to-transparent" />
      <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-toyota-red/20 to-transparent" />

      {/* Ambient glow */}
      <motion.div
        className="absolute -top-24 left-1/4 w-[500px] h-[500px] bg-toyota-red/[0.08] rounded-full blur-[150px] pointer-events-none"
        animate={{ x: [0, 40, 0], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="absolute -bottom-24 right-1/4 w-[400px] h-[400px] bg-toyota-red/[0.05] rounded-full blur-[120px] pointer-events-none" />

      <div className="container mx-auto px-4 max-w-3xl text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mb-8"
        >
          <div className="inline-flex items-center gap-2 border border-white/10 bg-white/[0.04] rounded-full px-4 py-1.5 mb-5">
            <Phone className="w-3.5 h-3.5 text-toyota-red" />
            <span className="font-tajawal text-xs font-bold text-soft tracking-widest">
              شراكة موثوقة
            </span>
          </div>
          <h2
            className="font-tajawal font-black text-white leading-tight mb-3"
            style={{ fontSize: "clamp(32px, 4.5vw, 56px)" }}
          >
            ابدأ <span className="text-toyota-red">شراكتك</span> معنا اليوم
          </h2>
          <div className="flex items-center justify-center mb-4">
            <span className="h-[3px] w-20 bg-toyota-red rounded-full shadow-red-glow" />
          </div>
          <p className="font-tajawal text-soft text-base md:text-lg max-w-md mx-auto">
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
          <motion.div
            whileHover={{ scale: 1.06, y: -3 }}
            whileTap={{ scale: 0.94 }}
            transition={{ type: "spring", stiffness: 400, damping: 15 }}
          >
            <Link to="/contact#quote" className="glass-pill glass-pill-primary font-tajawal text-lg px-10 py-5">
              اطلب عرض سعر الآن
            </Link>
          </motion.div>
          <motion.div
            whileHover={{ scale: 1.06, y: -3 }}
            whileTap={{ scale: 0.94 }}
            transition={{ type: "spring", stiffness: 400, damping: 15 }}
          >
            <Link to="/contact" className="glass-pill font-tajawal text-lg px-10 py-5">
              <Phone className="w-5 h-5" strokeWidth={2.5} />
              تواصل معنا
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default ContactSimple;
