import { Phone } from "lucide-react";
import logo from "@/assets/logo.png";

const Footer = () => {
  return (
    <footer className="bg-secondary text-secondary-foreground py-12 pb-24 md:pb-12 border-t border-primary/20">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          <div>
            <img src={logo} alt="المصرية جروب" className="h-16 mb-3" />
            <p className="text-secondary-foreground/60 text-sm leading-relaxed">
              موزع معتمد رسمي لقطع غيار وزيوت تويوتا الأصلية في مصر. خبرة أكثر من 25 عامًا في سوق قطع غيار السيارات.
            </p>
          </div>
          <div>
            <h4 className="font-bold mb-3">روابط سريعة</h4>
            <ul className="space-y-2 text-sm text-secondary-foreground/60">
              {[
                { label: "الرئيسية", href: "#hero" },
                { label: "من نحن", href: "#about" },
                { label: "المنتجات", href: "#products" },
                { label: "تواصل معنا", href: "#contact" },
              ].map((l) => (
                <li key={l.href}>
                  <a href={l.href} className="hover:text-primary transition-colors">{l.label}</a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-3">فروعنا – مصر 🇪🇬</h4>
            <ul className="space-y-2 text-sm text-secondary-foreground/60">
              <li className="flex items-center gap-2">
                القاهرة – التوفيقية
              </li>
              <li className="flex items-center gap-2">
                الجيزة – أوسيم
              </li>
              <li className="flex items-center gap-2">
                الأقصر – صعيد مصر
              </li>
              <li className="flex items-center gap-2">
                المكتب الإداري – اللبيني، الهرم
              </li>
            </ul>
            <div className="mt-2 text-sm text-secondary-foreground/60">
              <div className="flex items-center gap-1">
                <Phone className="w-3 h-3 text-primary" />
                <a href="tel:01032104861" className="hover:text-primary transition-colors">01032104861</a>
              </div>
            </div>
          </div>
          <div>
            <h4 className="font-bold mb-3">فرعنا – دبي 🇦🇪</h4>
            <div className="bg-secondary-foreground/10 rounded-lg p-4 border border-primary/20">
              <div className="text-sm text-secondary-foreground/80 font-semibold mb-1">المصرية جروب – الإمارات</div>
              <p className="text-xs text-secondary-foreground/60 leading-relaxed">
                مركز إقليمي لدعم التوسع في أسواق الخليج العربي. نوفر خدمات التوزيع والتوريد لعملائنا في المنطقة.
              </p>
            </div>
            <div className="mt-4">
              <h4 className="font-bold mb-2 text-sm">تواصل معنا</h4>
              <ul className="space-y-1 text-sm text-secondary-foreground/60">
                <li>info@almasriaautoparts.com</li>
                <li>مواعيد العمل: 9 ص – 7 م</li>
              </ul>
            </div>
          </div>
        </div>
        <div className="border-t border-secondary-foreground/10 pt-6 text-center text-sm text-secondary-foreground/40">
          © {new Date().getFullYear()} المصرية جروب – Al Masria Group. جميع الحقوق محفوظة.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
