const Footer = () => {
  return (
    <footer className="bg-secondary text-secondary-foreground py-12 border-t border-primary/20">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          <div>
            <h3 className="text-xl font-bold mb-3">
              المصرية <span className="text-gradient-red">جروب</span>
            </h3>
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
            <h4 className="font-bold mb-3">تواصل معنا</h4>
            <ul className="space-y-2 text-sm text-secondary-foreground/60">
              <li>info@almasriaautoparts.com</li>
              <li>sales.team@almasriaautoparts.com</li>
              <li>مواعيد العمل: 9 ص – 7 م</li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-3">فروعنا</h4>
            <ul className="space-y-2 text-sm text-secondary-foreground/60">
              <li>القاهرة – التوفيقية</li>
              <li>الجيزة – أوسيم</li>
              <li>الأقصر – صعيد مصر</li>
              <li>دبي – الإمارات 🇦🇪</li>
            </ul>
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
