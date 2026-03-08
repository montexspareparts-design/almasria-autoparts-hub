import { motion } from "framer-motion";
import { Phone, Mail, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const ContactSimple = () => {
  return (
    <section id="contact" className="py-20 md:py-28 bg-background">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-bold mb-4">
            اتصل بنا
          </span>
          <h2 className="text-3xl md:text-4xl font-black text-foreground mb-3">
            نحن هنا <span className="text-primary">لخدمتك</span>
          </h2>
        </motion.div>

        <div className="grid sm:grid-cols-3 gap-5 max-w-3xl mx-auto mb-10">
          <a
            href="tel:+201020412358"
            className="bg-card border border-border rounded-xl p-6 text-center hover:border-primary/30 transition-colors"
          >
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Phone className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-bold text-foreground mb-1">الهاتف</h3>
            <p className="text-muted-foreground text-sm" dir="ltr">+20 1020412358</p>
          </a>
          <a
            href="mailto:info@almasriaautoparts.com"
            className="bg-card border border-border rounded-xl p-6 text-center hover:border-primary/30 transition-colors"
          >
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Mail className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-bold text-foreground mb-1">البريد الإلكتروني</h3>
            <p className="text-muted-foreground text-sm break-all">info@almasriaautoparts.com</p>
          </a>
          <a
            href="https://wa.me/201020412358"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-card border border-border rounded-xl p-6 text-center hover:border-primary/30 transition-colors"
          >
            <div className="w-12 h-12 bg-[hsl(142,70%,40%)]/10 rounded-xl flex items-center justify-center mx-auto mb-3">
              <MessageCircle className="w-6 h-6 text-[hsl(142,70%,40%)]" />
            </div>
            <h3 className="font-bold text-foreground mb-1">واتساب</h3>
            <p className="text-muted-foreground text-sm">تواصل فوري</p>
          </a>
        </div>

        <div className="text-center">
          <Button size="lg" className="gap-2 font-bold" asChild>
            <a href="https://wa.me/201020412358" target="_blank" rel="noopener noreferrer">
              <MessageCircle className="w-5 h-5" />
              ابدأ محادثة واتساب
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default ContactSimple;
