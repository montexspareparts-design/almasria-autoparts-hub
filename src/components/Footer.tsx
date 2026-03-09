import { Phone, Mail, MapPin, MessageCircle, Send, Download } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { trackClickCall, trackClickWhatsApp } from "@/lib/analytics";
import logo from "@/assets/logo.png";

const quickLinks = [
  { label: "الرئيسية", href: "/" },
  { label: "من نحن", href: "/about" },
  { label: "المتجر", href: "/products" },
  { label: "ما يميزنا", href: "/what-sets-us-apart" },
  { label: "اتصل بنا", href: "/contact" },
  { label: "حمّل التطبيق", href: "/install", icon: Download },
];

const Footer = () => {
  return (
    <footer className="bg-secondary text-secondary-foreground border-t border-secondary-foreground/[0.06]">

      <div className="container mx-auto px-4 py-14 pb-24 md:pb-14">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-8">

          {/* Logo & Brief — 5 cols */}
          <div className="md:col-span-5">
            <img src={logo} alt="المصرية جروب — موزع قطع غيار تويوتا الأصلية" className="h-14 mb-4" />
            <p className="text-secondary-foreground/45 text-sm leading-7 max-w-sm">
              موزع معتمد رسمي لقطع غيار وزيوت تويوتا الأصلية في مصر منذ أكثر من 25 عامًا.
            </p>
          </div>

          {/* Quick Links — 3 cols */}
          <div className="md:col-span-3">
            <h4 className="font-bold text-sm text-secondary-foreground/70 mb-4">روابط سريعة</h4>
            <ul className="space-y-2.5">
              {quickLinks.map((l) => (
                <li key={l.href}>
                  <Link
                    to={l.href}
                    className="text-sm text-secondary-foreground/40 hover:text-primary transition-colors duration-200"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact — 4 cols */}
          <div className="md:col-span-4">
            <h4 className="font-bold text-sm text-secondary-foreground/70 mb-4">تواصل معنا</h4>
            <ul className="space-y-3">
              <li>
                <a
                  href="tel:+201020412358"
                  onClick={() => trackClickCall("+201020412358")}
                  className="flex items-center gap-2.5 text-sm text-secondary-foreground/40 hover:text-primary transition-colors"
                  dir="ltr"
                >
                  <Phone className="w-4 h-4 text-primary/60 flex-shrink-0" />
                  +20 1020412358
                </a>
              </li>
              <li>
                <a href="mailto:info@almasriaautoparts.com" className="flex items-center gap-2.5 text-sm text-secondary-foreground/40 hover:text-primary transition-colors">
                  <Mail className="w-4 h-4 text-primary/60 flex-shrink-0" />
                  info@almasriaautoparts.com
                </a>
              </li>
              <li>
                <a
                  href="https://wa.me/201020412358"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackClickWhatsApp("footer_link")}
                  className="flex items-center gap-2.5 text-sm text-secondary-foreground/40 hover:text-primary transition-colors"
                >
                  <MessageCircle className="w-4 h-4 text-primary/60 flex-shrink-0" />
                  واتساب
                </a>
              </li>
              <li className="flex items-start gap-2.5 text-sm text-secondary-foreground/40">
                <MapPin className="w-4 h-4 text-primary/60 flex-shrink-0 mt-0.5" />
                <span>التوفيقية — القاهرة، مصر</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-10 pt-6 border-t border-secondary-foreground/[0.06] text-center text-xs text-secondary-foreground/30">
          © {new Date().getFullYear()} المصرية جروب — جميع الحقوق محفوظة
        </div>
      </div>
    </footer>
  );
};

export default Footer;