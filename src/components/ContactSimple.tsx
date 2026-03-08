import { motion } from "framer-motion";
import { Phone, Mail, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const ContactSimple = () => {
  return (
    <section id="contact" className="py-20 md:py-28 bg-background overflow-hidden">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-bold mb-4"
          >
            <MessageCircle className="w-4 h-4 inline ml-1" />
            اتصل بنا
          </motion.span>
          <h2 className="text-3xl md:text-5xl font-black text-foreground mb-4">
            نحن هنا <span className="text-gradient-red">لخدمتك</span>
          </h2>
          <motion.div
            initial={{ width: 0 }}
            whileInView={{ width: "5rem" }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="h-1 bg-primary mx-auto rounded-full"
          />
        </motion.div>

        <div className="grid sm:grid-cols-3 gap-6 max-w-3xl mx-auto mb-10">
          {/* Phone */}
          <motion.a
            href="tel:+201020412358"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0 }}
            whileHover={{ y: -4 }}
            className="bg-card border border-border rounded-xl p-6 text-center hover:border-primary/40 transition-all duration-300 group block"
          >
            <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-transform group-hover:scale-110">
              <Phone className="w-7 h-7 text-primary" />
            </div>
            <h3 className="font-bold text-foreground mb-1">الهاتف</h3>
            <p className="text-muted-foreground text-sm" dir="ltr">+20 1020412358</p>
          </motion.a>

          {/* Email */}
          <motion.a
            href="mailto:info@almasriaautoparts.com"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            whileHover={{ y: -4 }}
            className="bg-card border border-border rounded-xl p-6 text-center hover:border-primary/40 transition-all duration-300 group block"
          >
            <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-transform group-hover:scale-110">
              <Mail className="w-7 h-7 text-primary" />
            </div>
            <h3 className="font-bold text-foreground mb-1">البريد الإلكتروني</h3>
            <p className="text-muted-foreground text-sm text-wrap break-all">info@almasriaautoparts.com</p>
          </motion.a>

          {/* WhatsApp */}
          <motion.a
            href="https://wa.me/201020412358"
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            whileHover={{ y: -4 }}
            className="bg-card border border-border rounded-xl p-6 text-center hover:border-primary/40 transition-all duration-300 group block"
          >
            <div className="w-14 h-14 bg-[hsl(142,70%,40%)]/10 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-transform group-hover:scale-110">
              <MessageCircle className="w-7 h-7 text-[hsl(142,70%,40%)]" />
            </div>
            <h3 className="font-bold text-foreground mb-1">واتساب</h3>
            <p className="text-muted-foreground text-sm">تواصل فوري</p>
          </motion.a>
        </div>

        {/* WhatsApp CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
            <Button size="lg" className="gap-2 bg-[hsl(142,70%,40%)] hover:bg-[hsl(142,70%,35%)] text-white font-bold text-lg px-8" asChild>
              <a href="https://wa.me/201020412358" target="_blank" rel="noopener noreferrer">
                <MessageCircle className="w-5 h-5" />
                ابدأ محادثة واتساب
              </a>
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default ContactSimple;
