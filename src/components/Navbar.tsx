import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import logo from "@/assets/logo.png";
import { Menu, X, Briefcase, User, LogOut, BookOpen, Download, Globe, ShoppingCart, ClipboardList } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCart } from "@/contexts/CartContext";
import NotificationBell from "@/components/NotificationBell";
import DealerAuthDialog from "@/components/DealerAuthDialog";

const mobileMenuVariants = {
  hidden: { opacity: 0, height: 0 },
  visible: { opacity: 1, height: "auto", transition: { duration: 0.3, ease: "easeOut" as const } },
  exit: { opacity: 0, height: 0, transition: { duration: 0.2, ease: "easeIn" as const } },
};

const linkVariants = {
  hidden: { opacity: 0, x: -15 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: i * 0.05, duration: 0.3 },
  }),
};

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("hero");
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [authDialogTab, setAuthDialogTab] = useState<"login" | "register">("login");

  const openAuthDialog = (tab: "login" | "register" = "login") => {
    setAuthDialogTab(tab);
    setAuthDialogOpen(true);
    setIsOpen(false);
  };
  const { user, dealerAccount, loading: authLoading, isAdmin, signOut } = useAuth();
  const { t, lang, setLang } = useLanguage();
  const { itemCount } = useCart();
  const isWholesaleDealer = !authLoading && !!dealerAccount?.is_active &&
    (dealerAccount?.tier === "wholesale_tier1" || dealerAccount?.tier === "wholesale_tier2");
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (location.pathname !== "/") return;
    const sectionIds = ["hero", "brands", "distribution"];
    const observers: IntersectionObserver[] = [];
    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      const observer = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveSection(id); },
        { threshold: 0.3, rootMargin: "-80px 0px 0px 0px" }
      );
      observer.observe(el);
      observers.push(observer);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, [location.pathname]);

  const isLinkActive = (href: string, isRoute?: boolean) => {
    if (isRoute) return location.pathname === href;
    const hash = href.replace("/", "").replace("#", "");
    return location.pathname === "/" && activeSection === hash;
  };

  const toggleLang = () => setLang(lang === "ar" ? "en" : "ar");

  const isDealer = !!dealerAccount;

  // B2B links for dealers — simplified portal navigation
  const dealerLinks = [
    { label: lang === "ar" ? "الرئيسية" : "Home", href: "/", isRoute: true },
    { label: lang === "ar" ? "لوحة التحكم" : "Dashboard", href: "/dealer", isRoute: true },
    { label: lang === "ar" ? "المنتجات" : "Products", href: "/products", isRoute: true },
    { label: lang === "ar" ? "طلباتي" : "My Orders", href: "/dealer?tab=orders", isRoute: true },
    { label: lang === "ar" ? "كشوفات الأسعار" : "Price Lists", href: "/dealer?tab=prices", isRoute: true },
  ];

  // B2C links for regular visitors
  const visitorLinks = [
    { label: t("nav.home"), href: "/#hero" },
    { label: t("nav.about"), href: "/about", isRoute: true },
    { label: t("nav.genuine_parts"), href: "/products/toyota-genuine", isRoute: true },
    { label: t("nav.toyota_oils"), href: "/products/toyota-oils", isRoute: true },
    { label: t("nav.mtx"), href: "/mtx", isRoute: true },
    { label: t("nav.contact"), href: "/contact", isRoute: true },
  ];

  const links = isDealer ? dealerLinks : visitorLinks;

  const renderDesktopLink = (link: typeof links[0]) => {
    const active = isLinkActive(link.href, link.isRoute);
    const baseClass = `relative py-1.5 text-[13px] font-semibold tracking-wide transition-all duration-200 ${
      active ? "text-primary" : "text-secondary-foreground/75 hover:text-primary"
    }`;
    const underline = (
      <span className={`absolute -bottom-0.5 inset-x-0 h-[2px] bg-primary rounded-full transition-all duration-300 ${
        active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
      }`} />
    );

    if (link.isRoute) {
      return (
        <Link key={link.href} to={link.href} className={`${baseClass} group`}>
          {link.label}
          {underline}
        </Link>
      );
    }
    return (
      <a
        key={link.href}
        href={link.href}
        className={`${baseClass} group`}
        onClick={(e) => {
          const hash = link.href.replace("/", "");
          if (window.location.pathname === "/") {
            e.preventDefault();
            document.querySelector(hash)?.scrollIntoView({ behavior: "smooth" });
          }
        }}
      >
        {link.label}
        {underline}
      </a>
    );
  };

  return (
    <motion.nav
      initial={{ y: -80 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, type: "spring", stiffness: 100, damping: 20 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-secondary/98 backdrop-blur-xl shadow-lg shadow-black/20 border-b border-primary/10"
          : "bg-secondary/95 backdrop-blur-md border-b border-primary/15"
      }`}
    >
      <div className="container mx-auto px-3 md:px-5">
        <div className="flex items-center justify-between h-14 md:h-16">
          {/* Mobile: Hamburger */}
          <button
            className="lg:hidden text-secondary-foreground p-2.5 -ml-2 relative z-10 touch-manipulation"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {/* Logo */}
          <Link to="/" className="flex items-center shrink-0">
            <motion.img
              src={logo}
              alt="المصرية جروب"
              className="h-9 md:h-14"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            />
          </Link>

          {/* Desktop: Center Navigation */}
          <div className="hidden lg:flex items-center gap-5 xl:gap-7">
            {links.map(renderDesktopLink)}
            {!isDealer && isWholesaleDealer && (
              <Link
                to="/catalogs"
                className={`relative py-1.5 text-[13px] font-semibold tracking-wide transition-all duration-200 group flex items-center gap-1.5 ${
                  location.pathname === "/catalogs" ? "text-primary" : "text-secondary-foreground/75 hover:text-primary"
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                {t("nav.catalogs")}
                <span className={`absolute -bottom-0.5 inset-x-0 h-[2px] bg-primary rounded-full transition-all duration-300 ${
                  location.pathname === "/catalogs" ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
                }`} />
              </Link>
            )}
          </div>

          {/* Mobile: Right Icons */}
          <div className="flex lg:hidden items-center gap-0.5 relative z-10">
            <button onClick={toggleLang} className="text-secondary-foreground/70 hover:text-primary transition-colors p-2 touch-manipulation text-[11px] font-bold">
              {lang === "ar" ? "EN" : "عربي"}
            </button>
            {!isDealer && (
              <button onClick={() => navigate("/cart")} className="text-secondary-foreground/70 hover:text-primary transition-colors p-2 touch-manipulation relative">
                <ShoppingCart className="w-[18px] h-[18px]" />
                {itemCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-primary text-primary-foreground text-[9px] font-black min-w-[16px] h-[16px] rounded-full flex items-center justify-center leading-none">
                    {itemCount}
                  </span>
                )}
              </button>
            )}
            <NotificationBell />
            <button
              onClick={() => user ? navigate(dealerAccount ? "/dealer" : "/dealer-apply") : openAuthDialog("login")}
              className="text-secondary-foreground/70 hover:text-primary transition-colors p-2 touch-manipulation"
            >
              <User className="w-[18px] h-[18px]" />
            </button>
          </div>

          {/* Desktop: Right Actions */}
          <div className="hidden lg:flex items-center gap-1">
            {/* Language Toggle */}
            <button
              onClick={toggleLang}
              className="flex items-center gap-1.5 text-secondary-foreground/60 hover:text-secondary-foreground transition-colors text-[13px] font-semibold px-2.5 py-1.5 rounded-lg hover:bg-secondary-foreground/5"
            >
              <Globe className="w-3.5 h-3.5" />
              {lang === "ar" ? "English" : "عربي"}
            </button>

            <div className="w-px h-5 bg-secondary-foreground/10 mx-1" />

            {/* Cart — B2C only */}
            {!isDealer && (
              <button
                onClick={() => navigate("/cart")}
                className="relative text-secondary-foreground/60 hover:text-secondary-foreground transition-colors p-2 rounded-lg hover:bg-secondary-foreground/5"
              >
                <ShoppingCart className="w-[18px] h-[18px]" />
                {itemCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 bg-primary text-primary-foreground text-[9px] font-black min-w-[15px] h-[15px] rounded-full flex items-center justify-center leading-none ring-2 ring-secondary">
                    {itemCount}
                  </span>
                )}
              </button>
            )}

            {/* Notifications */}
            <NotificationBell />

            {user ? (
              <>
                <div className="w-px h-5 bg-secondary-foreground/10 mx-1" />

                {isAdmin && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate("/admin")}
                    className="text-secondary-foreground/60 hover:text-secondary-foreground text-[13px] font-semibold h-8 px-2.5"
                  >
                    {t("nav.admin")}
                  </Button>
                )}

                {/* B2C: show orders + dealer apply */}
                {!isDealer && (
                  <>
                    <Link
                      to="/my-orders"
                      className={`flex items-center gap-1.5 text-[13px] font-semibold px-2.5 py-1.5 rounded-lg transition-colors ${
                        location.pathname === "/my-orders"
                          ? "text-primary bg-primary/10"
                          : "text-secondary-foreground/60 hover:text-secondary-foreground hover:bg-secondary-foreground/5"
                      }`}
                    >
                      <ClipboardList className="w-3.5 h-3.5" />
                      {lang === "ar" ? "طلباتي" : "My Orders"}
                    </Link>
                    <div className="w-px h-5 bg-secondary-foreground/10 mx-1" />
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-[13px] font-semibold h-8 px-3 border-secondary-foreground/15 hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
                      onClick={() => navigate("/dealer-apply")}
                    >
                      <Briefcase className="w-3.5 h-3.5" />
                      {lang === "ar" ? "تقديم طلب اعتماد" : "Apply as Dealer"}
                    </Button>
                  </>
                )}

                {/* Logout */}
                <button
                  onClick={() => signOut()}
                  className="text-secondary-foreground/40 hover:text-primary transition-colors p-2 rounded-lg hover:bg-primary/5"
                  title={lang === "ar" ? "تسجيل الخروج" : "Logout"}
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
                <div className="w-px h-5 bg-secondary-foreground/10 mx-1" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openAuthDialog("login")}
                  className="text-secondary-foreground/60 hover:text-secondary-foreground text-[13px] font-semibold h-8 px-2.5"
                >
                  {t("nav.login")}
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  className="gap-1.5 text-[13px] font-semibold h-8 px-3"
                  onClick={() => openAuthDialog("register")}
                >
                  <Briefcase className="w-3.5 h-3.5" />
                  {t("nav.register_dealer")}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              className="lg:hidden pb-4 border-t border-secondary-foreground/10 px-1 overflow-hidden"
              variants={mobileMenuVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              {links.map((link, i) => {
                const active = isLinkActive(link.href, link.isRoute);
                if (link.isRoute) {
                  return (
                    <motion.div key={link.href} custom={i} initial="hidden" animate="visible" variants={linkVariants}>
                      <Link
                        to={link.href}
                        className={`block py-3 text-sm font-semibold transition-colors ${
                          active ? "text-primary" : "text-secondary-foreground/70 hover:text-primary"
                        }`}
                        onClick={() => setIsOpen(false)}
                      >
                        {link.label}
                      </Link>
                    </motion.div>
                  );
                }
                return (
                  <motion.a
                    key={link.href}
                    href={link.href}
                    custom={i}
                    initial="hidden"
                    animate="visible"
                    variants={linkVariants}
                    className={`block py-3 text-sm font-semibold transition-colors ${
                      active ? "text-primary" : "text-secondary-foreground/70 hover:text-primary"
                    }`}
                    onClick={(e) => {
                      setIsOpen(false);
                      const hash = link.href.replace("/", "");
                      if (window.location.pathname === "/") {
                        e.preventDefault();
                        setTimeout(() => document.querySelector(hash)?.scrollIntoView({ behavior: "smooth" }), 300);
                      }
                    }}
                  >
                    {link.label}
                  </motion.a>
                );
              })}
              {/* Install App */}
              <motion.div custom={links.length} initial="hidden" animate="visible" variants={linkVariants}>
                <Link
                  to="/install"
                  className="py-3 text-sm font-bold text-primary hover:text-primary/80 transition-colors flex items-center gap-2"
                  onClick={() => setIsOpen(false)}
                >
                  <Download className="w-4 h-4" />
                  {t("nav.install_app")}
                </Link>
              </motion.div>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="border-t border-secondary-foreground/10 pt-3 mt-2 space-y-1.5">
                {user ? (
                  <>
                    {isAdmin && (
                      <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-secondary-foreground/70 font-semibold" onClick={() => { navigate("/admin"); setIsOpen(false); }}>
                        {t("nav.admin")}
                      </Button>
                    )}
                    {!isDealer && isWholesaleDealer && (
                      <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-primary font-semibold" onClick={() => { navigate("/catalogs"); setIsOpen(false); }}>
                        <BookOpen className="w-4 h-4" /> {t("nav.catalogs")}
                      </Button>
                    )}
                    {!isDealer && (
                      <>
                        <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-secondary-foreground/70 font-semibold" onClick={() => { navigate("/my-orders"); setIsOpen(false); }}>
                          <ClipboardList className="w-4 h-4" /> {lang === "ar" ? "طلباتي" : "My Orders"}
                        </Button>
                        <Button variant="outline" size="sm" className="w-full gap-2 font-semibold" onClick={() => { navigate("/dealer-apply"); setIsOpen(false); }}>
                          <Briefcase className="w-4 h-4" /> {lang === "ar" ? "تقديم طلب اعتماد" : "Apply as Dealer"}
                        </Button>
                      </>
                    )}
                    <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-secondary-foreground/50 font-semibold" onClick={() => { signOut(); setIsOpen(false); }}>
                      <LogOut className="w-4 h-4" /> {t("nav.logout")}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="ghost" size="sm" className="w-full font-semibold" onClick={() => openAuthDialog("login")}>
                      {t("nav.login")}
                    </Button>
                    <Button variant="default" size="sm" className="w-full gap-2 font-semibold" onClick={() => openAuthDialog("register")}>
                      <Briefcase className="w-4 h-4" /> {t("nav.register_dealer")}
                    </Button>
                  </>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.nav>
  );
};

export default Navbar;
