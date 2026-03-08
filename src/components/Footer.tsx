import { motion } from "framer-motion";
import { Phone, Mail, MapPin, MessageCircle, Globe } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import logo from "@/assets/logo.png";

const quickLinks = [
  { label: "الرئيسية", href: "/#hero" },
  { label: "من نحن", href: "/#about" },
  { label: "العلامات التجارية", href: "/products" },
  { label: "لماذا نحن", href: "/what-sets-us-apart" },
  { label: "شبكة التوزيع", href: "/#distribution" },
  { label: "اتصل بنا", href: "/contact" },
];

const branches = [
  { name: "القاهرة – التوفيقية", icon: MapPin, href: "https://maps.app.goo.gl/B3Kb6At4dnfGy28T9" },
  { name: "الجيزة – أوسيم", icon: MapPin, href: "https://maps.app.goo.gl/trZ9Q4ZhnwtsFXTB8" },
  { name: "الأقصر", icon: MapPin, href: "https://maps.app.goo.gl/c9B4yDBY2QHWPKcT8" },
  { name: "المكتب الإداري – اللبيني", icon: MapPin, href: null },
  { name: "دبي – Spectra Cars & Parts", icon: Globe, href: null },
];

const FooterLink = ({ href, children }: { href: string; children: React.ReactNode }) => {
  const isHash = href.includes("#");
  const isExternal = href.startsWith("http");

  if (isExternal) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors relative group inline-block">
        {children}
        <span className="absolute bottom-0 right-0 w-0 h-px bg-primary transition-all duration-300 group-hover:w-full" />
      </a>
    );
  }

  if (isHash) {
    return (
      <a href={href} className="hover:text-primary transition-colors relative group inline-block">
        {children}
        <span className="absolute bottom-0 right-0 w-0 h-px bg-primary transition-all duration-300 group-hover:w-full" />
      </a>
    );
  }

  return (
    <Link to={href} className="hover:text-primary transition-colors relative group inline-block">
      {children}
      <span className="absolute bottom-0 right-0 w-0 h-px bg-primary transition-all duration-300 group-hover:w-full" />
    </Link>
  );
};

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
              {quickLinks.map((l) => (
                <li key={l.href}>
                  <FooterLink href={l.href}>{l.label}</FooterLink>
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
              {branches.map((b) => (
                <li key={b.name} className="flex items-center gap-2">
                  <b.icon className="w-3 h-3 text-primary/60 flex-shrink-0" />
                  {b.href ? (
                    <a
                      href={b.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-primary transition-colors"
                    >
                      {b.name}
                    </a>
                  ) : (
                    b.name
                  )}
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
                <a href="tel:+201153961008" className="hover:text-primary transition-colors" dir="ltr">+20 1153961008</a>
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
                Toyota Genuine Parts • Toyota Lubricants • MTX Aftermarket • DENSO • AISIN
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
