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
    { label: "دليل تمييز قطع تويوتا الأصلية", href: "/guides/identifying-genuine-toyota-parts" },
    { label: "أصلي vs MTX vs Denso", href: "/guides/genuine-vs-mtx-vs-denso" },
    { label: "متى تغيّر فلتر الزيت؟", href: "/guides/when-to-change-oil-filter" },
    { label: "متى تغيّر تيل الفرامل؟", href: "/guides/when-to-change-brake-pads" },
    { label: "صيانة تويوتا كورولا", href: "/guides/toyota-corolla-maintenance" },
    { label: "صيانة تويوتا هايلوكس", href: "/guides/toyota-hilux-maintenance" },
    { label: t("footer.install_app"), href: "/install", icon: Download },
  ];

  return (
    <footer ref={ref} className="relative glass-ios-strong text-white overflow-hidden">
      {/* Hairline accent */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-toyota-red/50 to-transparent" />
      {/* Ambient glow */}
      <div className="absolute -top-32 left-1/3 w-[400px] h-[400px] bg-toyota-red/[0.06] rounded-full blur-[120px] pointer-events-none" />
      {/* Inner top highlight */}
      <div className="absolute top-0 inset-x-0 h-24 bg-gradient-to-b from-white/[0.06] to-transparent pointer-events-none" />

      <div className="container mx-auto px-4 py-14 pb-24 md:pb-14 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-8">
          <div className="md:col-span-5">
            <img src={logo} alt="المصرية جروب" className="h-14 mb-4" />
            <p className="font-tajawal text-white/50 text-sm leading-7 max-w-sm">{t("footer.desc")}</p>
          </div>
          {!isDealer && (
            <div className="md:col-span-3">
              <h4 className="font-tajawal font-black text-sm text-white mb-4 tracking-wide">{t("footer.quick_links")}</h4>
              <ul className="space-y-2.5">
                {quickLinks.map((l) => (
                  <li key={l.href}>
                    <Link to={l.href} className={`font-tajawal text-sm transition-colors duration-200 flex items-center gap-1.5 ${l.icon ? "text-toyota-red hover:text-toyota-red/80 font-bold" : "text-white/50 hover:text-toyota-red"}`}>
                      {l.icon && <l.icon className="w-4 h-4" />}
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="md:col-span-4">
            <h4 className="font-tajawal font-black text-sm text-white mb-4 tracking-wide">{t("footer.contact_us")}</h4>
            <ul className="space-y-3">
              <li>
                <a href="tel:+201153961008" onClick={() => trackClickCall("+201153961008")} className="font-tajawal flex items-center gap-2.5 text-sm text-white/50 hover:text-toyota-red transition-colors" dir="ltr">
                  <Phone className="w-4 h-4 text-toyota-red flex-shrink-0" />+20 1153961008
                </a>
              </li>
              <li>
                <a href="mailto:info@almasriaautoparts.com" className="font-tajawal flex items-center gap-2.5 text-sm text-white/50 hover:text-toyota-red transition-colors">
                  <Mail className="w-4 h-4 text-toyota-red flex-shrink-0" />info@almasriaautoparts.com
                </a>
              </li>
              <li>
                <a href="https://wa.me/201034806288" target="_blank" rel="noopener noreferrer" onClick={() => trackClickWhatsApp("footer_link")} className="font-tajawal flex items-center gap-2.5 text-sm text-white/50 hover:text-toyota-red transition-colors">
                  <MessageCircle className="w-4 h-4 text-toyota-red flex-shrink-0" />{t("footer.whatsapp")}
                </a>
              </li>
              <li className="font-tajawal flex items-start gap-2.5 text-sm text-white/50">
                <MapPin className="w-4 h-4 text-toyota-red flex-shrink-0 mt-0.5" />
                <span>{t("footer.address")}</span>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-10 pt-6 border-t border-white/10 text-center font-tajawal text-xs text-white/35">
          © {new Date().getFullYear()} {t("footer.copyright")}
        </div>
      </div>
    </footer>
  );
});

Footer.displayName = "Footer";

export default Footer;
