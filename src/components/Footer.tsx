import { forwardRef } from "react";
import { Phone, Mail, MapPin, MessageCircle, Send, Download } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { trackClickCall, trackClickWhatsApp } from "@/lib/analytics";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import logo from "@/assets/logo.webp";

const Footer = forwardRef<HTMLElement>((_, ref) => {
  const { t } = useLanguage();
  const { dealerAccount } = useAuth();
  const isDealer = !!dealerAccount;

  const quickLinks = [
    { label: t("footer.home"), href: "/" },
    { label: t("footer.about"), href: "/about" },
    { label: t("footer.products"), href: "/products" },
    { label: t("footer.what_sets_us_apart"), href: "/what-sets-us-apart" },
    { label: t("footer.contact"), href: "/contact" },
    { label: "الشروط والأحكام", href: "/policies?tab=terms" },
    { label: "سياسة الخصوصية", href: "/policies?tab=privacy" },
    { label: "الشحن والتوصيل", href: "/policies?tab=delivery" },
    { label: "الإرجاع والاسترداد", href: "/policies?tab=refund" },
    { label: t("footer.install_app"), href: "/install", icon: Download },
  ];

  return (
    <footer className="bg-secondary text-secondary-foreground border-t border-secondary-foreground/[0.06]">
      <div className="container mx-auto px-4 py-14 pb-24 md:pb-14">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-8">
          <div className="md:col-span-5">
            <img src={logo} alt="المصرية جروب" className="h-14 mb-4" />
            <p className="text-secondary-foreground/45 text-sm leading-7 max-w-sm">{t("footer.desc")}</p>
          </div>
          {!isDealer && (
            <div className="md:col-span-3">
              <h4 className="font-bold text-sm text-secondary-foreground/70 mb-4">{t("footer.quick_links")}</h4>
              <ul className="space-y-2.5">
                {quickLinks.map((l) => (
                  <li key={l.href}>
                    <Link to={l.href} className={`text-sm transition-colors duration-200 flex items-center gap-1.5 ${l.icon ? "text-primary hover:text-primary/80 font-bold" : "text-secondary-foreground/40 hover:text-primary"}`}>
                      {l.icon && <l.icon className="w-4 h-4" />}
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="md:col-span-4">
            <h4 className="font-bold text-sm text-secondary-foreground/70 mb-4">{t("footer.contact_us")}</h4>
            <ul className="space-y-3">
              <li>
                <a href="tel:+201153961008" onClick={() => trackClickCall("+201153961008")} className="flex items-center gap-2.5 text-sm text-secondary-foreground/40 hover:text-primary transition-colors" dir="ltr">
                  <Phone className="w-4 h-4 text-primary/60 flex-shrink-0" />+20 1153961008
                </a>
              </li>
              <li>
                <a href="mailto:info@almasriaautoparts.com" className="flex items-center gap-2.5 text-sm text-secondary-foreground/40 hover:text-primary transition-colors">
                  <Mail className="w-4 h-4 text-primary/60 flex-shrink-0" />info@almasriaautoparts.com
                </a>
              </li>
              <li>
                <a href="https://wa.me/201153961008" target="_blank" rel="noopener noreferrer" onClick={() => trackClickWhatsApp("footer_link")} className="flex items-center gap-2.5 text-sm text-secondary-foreground/40 hover:text-primary transition-colors">
                  <MessageCircle className="w-4 h-4 text-primary/60 flex-shrink-0" />{t("footer.whatsapp")}
                </a>
              </li>
              <li className="flex items-start gap-2.5 text-sm text-secondary-foreground/40">
                <MapPin className="w-4 h-4 text-primary/60 flex-shrink-0 mt-0.5" />
                <span>{t("footer.address")}</span>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-10 pt-6 border-t border-secondary-foreground/[0.06] text-center text-xs text-secondary-foreground/30">
          © {new Date().getFullYear()} {t("footer.copyright")}
        </div>
      </div>
    </footer>
  );
});

Footer.displayName = "Footer";

export default Footer;
