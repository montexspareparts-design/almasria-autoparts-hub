const Footer = () => {
  return (
    <footer className="bg-secondary text-secondary-foreground py-12 border-t border-primary/20">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-3 gap-8 mb-8">
          <div>
            <h3 className="text-xl font-bold mb-3">
              المصرية <span className="text-gradient-red">جروب</span>
            </h3>
            <p className="text-secondary-foreground/60 text-sm leading-relaxed">
              موزع معتمد لقطع غيار وزيوت تويوتا الأصلية في مصر. شريكك الموثوق في سوق قطع غيار السيارات.
            </p>
          </div>
          <div>
            <h4 className="font-bold mb-3">روابط سريعة</h4>
            <ul className="space-y-2 text-sm text-secondary-foreground/60">
              {["الرئيسية", "من نحن", "المنتجات", "تواصل معنا"].map((l) => (
                <li key={l}>
                  <a href={`#${l === "الرئيسية" ? "hero" : l === "من نحن" ? "about" : l === "المنتجات" ? "products" : "contact"}`} className="hover:text-primary transition-colors">
                    {l}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-3">تواصل معنا</h4>
            <ul className="space-y-2 text-sm text-secondary-foreground/60">
              <li>هاتف: +20 123 456 7890</li>
              <li>بريد: info@almasriagroup.com</li>
              <li>القاهرة – التوفيقية</li>
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
