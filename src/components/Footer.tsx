import { motion } from "framer-motion";
import { Phone, Mail, MapPin, MessageCircle, Globe, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import logo from "@/assets/logo.png";

const quickLinks = [
  { label: "الرئيسية", href: "/#hero" },
  { label: "قطع غيار تويوتا أصلي", href: "/products/toyota-genuine" },
  { label: "زيوت تويوتا أصلي", href: "/products/toyota-oils" },
  { label: "قطع غيار MTX", href: "/products/mtx-aftermarket" },
  { label: "ما يميزنا", href: "/what-sets-us-apart" },
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

  if (isHash) {
    return (
      <a href={href} className="text-secondary-foreground/50 hover:text-primary transition-colors duration-300">
        {children}
      </a>
    );
  }

  return (
    <Link to={href} className="text-secondary-foreground/50 hover:text-primary transition-colors duration-300">
      {children}
    </Link>
  );
};

const Footer = () => {
  return (
    <footer className="bg-secondary text-secondary-foreground border-t border-primary/10 overflow-hidden">
      {/* Main footer content */}
      <div className="container mx-auto px-4 py-16 pb-28 md:pb-16">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-8">

          {/* Logo & About — spans 4 cols */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="md:col-span-4 order-1"
          >
            <img src={logo} alt="المصرية جروب" className="h-16 mb-5" />
            <p className="text-secondary-foreground/50 text-sm leading-7 max-w-sm">
              موزع معتمد رسمي لقطع غيار وزيوت تويوتا الأصلية في مصر.
              <br />
              خبرة أكثر من 25 عامًا في خدمة قطاع السيارات.
            </p>
            <div className="flex items-center gap-3 mt-6">
              <a
                href="https://wa.me/201020412358"
                target="_blank"
                rel="noopener noreferrer"
                className="w-11 h-11 rounded-xl bg-secondary-foreground/[0.06] border border-secondary-foreground/10 flex items-center justify-center hover:bg-primary hover:border-primary hover:text-primary-foreground transition-all duration-300 group"
              >
                <MessageCircle className="w-5 h-5 text-primary group-hover:text-primary-foreground transition-colors" />
              </a>
              <a
                href="mailto:info@almasriaautoparts.com"
                className="w-11 h-11 rounded-xl bg-secondary-foreground/[0.06] border border-secondary-foreground/10 flex items-center justify-center hover:bg-primary hover:border-primary hover:text-primary-foreground transition-all duration-300 group"
              >
                <Mail className="w-5 h-5 text-primary group-hover:text-primary-foreground transition-colors" />
              </a>
              <a
                href="tel:+201020412358"
                className="w-11 h-11 rounded-xl bg-secondary-foreground/[0.06] border border-secondary-foreground/10 flex items-center justify-center hover:bg-primary hover:border-primary hover:text-primary-foreground transition-all duration-300 group"
              >
                <Phone className="w-5 h-5 text-primary group-hover:text-primary-foreground transition-colors" />
              </a>
            </div>
          </motion.div>

          {/* Quick Links — spans 2 cols */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="md:col-span-2 order-3 md:order-2"
          >
            <h4 className="font-bold text-sm mb-5 text-secondary-foreground/80">روابط سريعة</h4>
            <ul className="space-y-3.5">
              {quickLinks.map((l) => (
                <li key={l.href}>
                  <FooterLink href={l.href}>
                    <span className="text-sm">{l.label}</span>
                  </FooterLink>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Branches — spans 3 cols */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="md:col-span-3 order-4 md:order-3"
          >
            <h4 className="font-bold text-sm mb-5 text-secondary-foreground/80">فروعنا</h4>
            <ul className="space-y-3.5">
              {branches.map((b) => (
                <li key={b.name}>
                  {b.href ? (
                    <a
                      href={b.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2.5 text-secondary-foreground/50 hover:text-primary transition-colors duration-300 group"
                    >
                      <b.icon className="w-4 h-4 text-primary/50 group-hover:text-primary flex-shrink-0 transition-colors" />
                      <span className="text-sm">{b.name}</span>
                      <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-60 transition-opacity" />
                    </a>
                  ) : (
                    <div className="flex items-center gap-2.5 text-secondary-foreground/50">
                      <b.icon className="w-4 h-4 text-primary/50 flex-shrink-0" />
                      <span className="text-sm">{b.name}</span>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Contact — spans 3 cols */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="md:col-span-3 order-2 md:order-4"
          >
            <h4 className="font-bold text-sm mb-5 text-secondary-foreground/80">تواصل معنا</h4>
            <ul className="space-y-4">
              <li>
                <a href="tel:+201020412358" className="flex items-center gap-3 text-secondary-foreground/50 hover:text-primary transition-colors group" dir="ltr">
                  <div className="w-9 h-9 rounded-lg bg-primary/[0.08] flex items-center justify-center flex-shrink-0 group-hover:bg-primary/15 transition-colors">
                    <Phone className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-sm">+20 1020412358</span>
                </a>
              </li>
              <li>
                <a href="mailto:info@almasriaautoparts.com" className="flex items-center gap-3 text-secondary-foreground/50 hover:text-primary transition-colors group">
                  <div className="w-9 h-9 rounded-lg bg-primary/[0.08] flex items-center justify-center flex-shrink-0 group-hover:bg-primary/15 transition-colors">
                    <Mail className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-sm break-all">info@almasriaautoparts.com</span>
                </a>
              </li>
            </ul>

            <div className="mt-6 text-xs text-secondary-foreground/35">
              مواعيد العمل: 9 ص – 7 م
            </div>

            <div className="mt-5 bg-secondary-foreground/[0.04] rounded-xl p-4 border border-secondary-foreground/[0.06]">
              <div className="text-xs font-semibold text-secondary-foreground/60 mb-2">العلامات التي نوزعها</div>
              <div className="text-xs text-secondary-foreground/40 leading-6">
                Toyota Genuine Parts • Toyota Lubricants
                <br />
                MTX Aftermarket • DENSO • AISIN
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-secondary-foreground/[0.06]">
        <div className="container mx-auto px-4 py-5 text-center text-xs text-secondary-foreground/30">
          © {new Date().getFullYear()} المصرية جروب – Al Masria Group. جميع الحقوق محفوظة.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
