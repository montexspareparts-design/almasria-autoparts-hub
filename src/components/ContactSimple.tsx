import { motion } from "framer-motion";
import { Phone, Mail, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const contactCards = [
  {
    href: "tel:+201153961008",
    icon: Phone,
    title: "الهاتف",
    detail: "+20 1153961008",
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
    dir: "ltr" as const,
  },
  {
    href: "mailto:info@almasriaautoparts.com",
    icon: Mail,
    title: "البريد الإلكتروني",
    detail: "info@almasriaautoparts.com",
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
    extraClass: "text-wrap break-all",
  },
  {
    href: "https://wa.me/201153961008",
    icon: MessageCircle,
    title: "واتساب",
    detail: "تواصل فوري",
    iconBg: "bg-[hsl(142,70%,40%)]/10",
    iconColor: "text-[hsl(142,70%,40%)]",
    external: true,
  },
];

const ContactSimple = () => {
  return (
    <section id="contact" className="py-20 md:py-28 bg-background overflow-hidden relative">
      {/* Subtle background */}
      <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: "radial-gradient(circle, hsl(var(--primary)) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />

      <div className="container mx-auto px-4 relative">
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
          {contactCards.map((c, i) => (
            <motion.a
              key={c.title}
              href={c.href}
              target={c.external ? "_blank" : undefined}
              rel={c.external ? "noopener noreferrer" : undefined}
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.12, type: "spring", stiffness: 100 }}
              whileHover={{ y: -6, scale: 1.02, boxShadow: "0 20px 40px hsl(355 90% 48% / 0.1)" }}
              className="bg-card border border-border rounded-xl p-6 text-center hover:border-primary/40 transition-all duration-300 group block relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/0 to-primary/0 group-hover:from-primary/3 group-hover:to-transparent transition-all duration-500" />
              <motion.div
                className={`w-14 h-14 ${c.iconBg} rounded-2xl flex items-center justify-center mx-auto mb-4 relative z-10`}
                whileHover={{ rotate: [0, -10, 10, 0], scale: 1.1 }}
                transition={{ duration: 0.5 }}
              >
                <c.icon className={`w-7 h-7 ${c.iconColor}`} />
              </motion.div>
              <h3 className="font-bold text-foreground mb-1 relative z-10">{c.title}</h3>
              <p className={`text-muted-foreground text-sm relative z-10 ${c.extraClass || ""}`} dir={c.dir}>{c.detail}</p>
            </motion.a>
          ))}
        </div>

        {/* WhatsApp CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <motion.div whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: 0.97 }}>
            <Button size="lg" className="gap-2 bg-[hsl(142,70%,40%)] hover:bg-[hsl(142,70%,35%)] text-white font-bold text-lg px-8 shadow-lg shadow-[hsl(142,70%,40%)]/20 relative overflow-hidden group" asChild>
              <a href="https://wa.me/201020412358" target="_blank" rel="noopener noreferrer">
                <span className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 skew-x-12" />
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
