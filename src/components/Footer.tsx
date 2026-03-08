import { motion } from "framer-motion";
import { Phone, Mail, MapPin, MessageCircle, Globe } from "lucide-react";
import logo from "@/assets/logo.png";

const Footer = () => {
  return (
    <footer className="bg-secondary text-secondary-foreground py-14 pb-24 md:pb-14 border-t border-primary/20 overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-4 gap-10 mb-10">
          {/* Logo & About */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <img src={logo} alt="المصرية جروب" className="h-14 mb-4" />
            <p className="text-secondary-foreground/60 text-sm leading-relaxed">
              موزع معتمد رسمي لقطع غيار وزيوت تويوتا الأصلية في مصر. خبرة أكثر من 25 عامًا.
            </p>
            <div className="flex items-center gap-3 mt-4">
              <a
                href="https://wa.me/201153961008"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-lg bg-secondary-foreground/10 flex items-center justify-center hover:bg-primary/20 transition-colors"
              >
                <MessageCircle className="w-4 h-4 text-primary" />
              </a>
              <a
                href="mailto:info@almasriaautoparts.com"
                className="w-9 h-9 rounded-lg bg-secondary-foreground/10 flex items-center justify-center hover:bg-primary/20 transition-colors"
              >
                <Mail className="w-4 h-4 text-primary" />
              </a>
            </div>
          </motion.div>

          {/* Quick Links */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
          >
            <h4 className="font-bold mb-4 text-sm">روابط سريعة</h4>
            <ul className="space-y-2.5 text-sm text-secondary-foreground/60">
              {[
                { label: "الرئيسية", href: "#hero" },
                { label: "من نحن", href: "#about" },
                { label: "العلامات التجارية", href: "#brands" },
                { label: "لماذا نحن", href: "#why-us" },
                { label: "شبكة التوزيع", href: "#distribution" },
                { label: "اتصل بنا", href: "#contact" },
              ].map((l) => (
                <li key={l.href}>
                  <a href={l.href} className="hover:text-primary transition-colors relative group inline-block">
                    {l.label}
                    <span className="absolute bottom-0 right-0 w-0 h-px bg-primary transition-all duration-300 group-hover:w-full" />
                  </a>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Branches */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            <h4 className="font-bold mb-4 text-sm">فروعنا</h4>
            <ul className="space-y-2.5 text-sm text-secondary-foreground/60">
              {[
                { name: "القاهرة – التوفيقية", icon: MapPin },
                { name: "الجيزة – أوسيم", icon: MapPin },
                { name: "الأقصر", icon: MapPin },
                { name: "المكتب الإداري – اللبيني", icon: MapPin },
                { name: "دبي – Spectra Cars & Parts", icon: Globe },
              ].map((b) => (
                <li key={b.name} className="flex items-center gap-2">
                  <b.icon className="w-3 h-3 text-primary/60 flex-shrink-0" />
                  {b.name}
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Contact */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
          >
            <h4 className="font-bold mb-4 text-sm">تواصل معنا</h4>
            <ul className="space-y-3 text-sm text-secondary-foreground/60">
              <li className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-primary" />
                <a href="tel:+201020412358" className="hover:text-primary transition-colors" dir="ltr">+20 1020412358</a>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-primary" />
                <a href="mailto:info@almasriaautoparts.com" className="hover:text-primary transition-colors text-xs">info@almasriaautoparts.com</a>
              </li>
              <li className="text-xs text-secondary-foreground/40 mt-2">مواعيد العمل: 9 ص – 7 م</li>
            </ul>

            <div className="mt-5 bg-secondary-foreground/10 rounded-lg p-3 border border-primary/15">
              <div className="text-xs font-semibold text-secondary-foreground/80 mb-1">العلامات التي نوزعها</div>
              <div className="text-xs text-secondary-foreground/50 leading-relaxed">
                Toyota Genuine Parts • Toyota Lubricants • MTX Aftermarket
              </div>
            </div>
          </motion.div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-secondary-foreground/10 pt-6 text-center text-sm text-secondary-foreground/40">
          © {new Date().getFullYear()} المصرية جروب – Al Masria Group. جميع الحقوق محفوظة.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
