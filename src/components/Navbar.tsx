import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import logo from "@/assets/logo.png";
import { Menu, X, Briefcase, User, LogOut, BookOpen, Download, Globe, ShoppingCart } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCart } from "@/contexts/CartContext";
import NotificationBell from "@/components/NotificationBell";

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
  const [activeSection, setActiveSection] = useState<string>("hero");
  const { user, dealerAccount, loading: authLoading, isAdmin, signOut } = useAuth();
  const { t, lang, setLang } = useLanguage();
  const { itemCount } = useCart();
  const isWholesaleDealer = !authLoading && !!dealerAccount?.is_active &&
    (dealerAccount?.tier === "wholesale_tier1" || dealerAccount?.tier === "wholesale_tier2");
  const navigate = useNavigate();
  const location = useLocation();

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

  const links = [
    { label: t("nav.home"), href: "/#hero" },
    { label: t("nav.about"), href: "/about", isRoute: true },
    { label: t("nav.genuine_parts"), href: "/products/toyota-genuine", isRoute: true },
    { label: t("nav.toyota_oils"), href: "/products/toyota-oils", isRoute: true },
    { label: t("nav.mtx"), href: "/mtx", isRoute: true },
    { label: t("nav.contact"), href: "/contact", isRoute: true },
  ];

  return (
    <motion.nav
      initial={{ y: -80 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, type: "spring", stiffness: 100, damping: 20 }}
      className="fixed top-0 left-0 right-0 z-50 bg-secondary/95 backdrop-blur-md border-b border-primary/20"
    >
      <div className="container mx-auto px-3 md:px-4">
        <div className="flex items-center justify-between h-14 md:h-20">
          {/* Hamburger */}
          <button className="md:hidden text-secondary-foreground p-2.5 -ml-2 relative z-10 touch-manipulation" onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>

          {/* Logo */}
          <motion.a href="/" className="flex items-center gap-2" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <img src={logo} alt="المصرية جروب" className="h-10 md:h-24" />
          </motion.a>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-6">
            {links.map((link) => {
              if (link.isRoute) {
                return (
                  <motion.div key={link.href} whileHover={{ y: -1 }}>
                    <Link
                      to={link.href}
                      className={`text-sm font-medium transition-colors relative group ${
                        isLinkActive(link.href, true) ? "text-primary" : "text-secondary-foreground/80 hover:text-primary"
                      }`}
                    >
                      {link.label}
                      <span className={`absolute -bottom-1 ${lang === "ar" ? "right-0" : "left-0"} h-[2px] bg-primary rounded-full transition-all duration-300 ${
                        isLinkActive(link.href, true) ? "w-full" : "w-0 group-hover:w-full"
                      }`} />
                    </Link>
                  </motion.div>
                );
              }
              return (
                <motion.a
                  key={link.href}
                  href={link.href}
                  className={`text-sm font-medium transition-colors relative group ${
                    isLinkActive(link.href) ? "text-primary" : "text-secondary-foreground/80 hover:text-primary"
                  }`}
                  whileHover={{ y: -1 }}
                  onClick={(e) => {
                    const hash = link.href.replace("/", "");
                    if (window.location.pathname === "/") {
                      e.preventDefault();
                      document.querySelector(hash)?.scrollIntoView({ behavior: "smooth" });
                    }
                  }}
                >
                  {link.label}
                  <span className={`absolute -bottom-1 ${lang === "ar" ? "right-0" : "left-0"} h-[2px] bg-primary rounded-full transition-all duration-300 ${
                    isLinkActive(link.href) ? "w-full" : "w-0 group-hover:w-full"
                  }`} />
                </motion.a>
              );
            })}
            {isWholesaleDealer && (
              <motion.div whileHover={{ y: -1 }}>
                <Link
                  to="/catalogs"
                  className={`text-sm font-medium transition-colors relative group flex items-center gap-1 ${
                    location.pathname === "/catalogs" ? "text-primary" : "text-secondary-foreground/80 hover:text-primary"
                  }`}
                >
                  <BookOpen className="w-4 h-4" />
                  {t("nav.catalogs")}
                </Link>
              </motion.div>
            )}
          </div>

          {/* Mobile right icons */}
          <div className="flex md:hidden items-center gap-0.5 relative z-10">
            <button onClick={toggleLang} className="text-secondary-foreground/80 hover:text-primary transition-colors p-2 touch-manipulation text-xs font-bold">
              {lang === "ar" ? "EN" : "عربي"}
            </button>
            <button onClick={() => navigate("/cart")} className="text-secondary-foreground/80 hover:text-primary transition-colors p-2.5 touch-manipulation relative">
              <ShoppingCart className="w-5 h-5" />
              {itemCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-primary text-primary-foreground text-[10px] font-black min-w-[18px] h-[18px] rounded-full flex items-center justify-center leading-none">
                  {itemCount}
                </span>
              )}
            </button>
            <NotificationBell />
            {user ? (
              <button onClick={() => navigate("/dealer")} className="text-secondary-foreground/80 hover:text-primary transition-colors p-2.5 touch-manipulation">
                <User className="w-5 h-5" />
              </button>
            ) : (
              <button onClick={() => navigate("/auth")} className="text-secondary-foreground/80 hover:text-primary transition-colors p-2.5 touch-manipulation">
                <User className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Desktop right buttons */}
          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={toggleLang}
              className="flex items-center gap-1.5 text-secondary-foreground/70 hover:text-primary transition-colors text-sm font-bold px-2 py-1 rounded-md hover:bg-primary/5"
            >
              <Globe className="w-4 h-4" />
              {lang === "ar" ? "English" : "عربي"}
            </button>
            <button
              onClick={() => navigate("/cart")}
              className="flex items-center gap-1.5 text-secondary-foreground/70 hover:text-primary transition-colors text-sm font-bold px-2 py-1 rounded-md hover:bg-primary/5 relative"
            >
              <ShoppingCart className="w-4 h-4" />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] font-black min-w-[16px] h-[16px] rounded-full flex items-center justify-center leading-none">
                  {itemCount}
                </span>
              )}
            </button>
            <NotificationBell />
              <>
                {isAdmin && (
                  <Button variant="ghost" size="sm" onClick={() => navigate("/admin")} className="text-secondary-foreground/80">
                    {t("nav.admin")}
                  </Button>
                )}
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <Button variant="outline" size="sm" className="gap-2" onClick={() => navigate("/dealer")}>
                    <User className="w-4 h-4" />
                    {t("nav.dealer_account")}
                  </Button>
                </motion.div>
                <Button variant="ghost" size="sm" onClick={() => signOut()} className="text-secondary-foreground/60">
                  <LogOut className="w-4 h-4" />
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={() => navigate("/auth")} className="text-secondary-foreground/80">
                  {t("nav.login")}
                </Button>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button variant="default" size="sm" className="gap-2" onClick={() => navigate("/dealer-apply")}>
                    <Briefcase className="w-4 h-4" />
                    {t("nav.register_dealer")}
                  </Button>
                </motion.div>
              </>
            )}
          </div>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              className="md:hidden pb-4 border-t border-primary/10 px-1 overflow-hidden"
              variants={mobileMenuVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              {links.map((link, i) => {
                if (link.isRoute) {
                  return (
                    <motion.div key={link.href} custom={i} initial="hidden" animate="visible" variants={linkVariants}>
                      <Link
                        to={link.href}
                        className="block py-3 text-sm font-medium text-secondary-foreground/80 hover:text-primary transition-colors"
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
                    className="block py-3 text-sm font-medium text-secondary-foreground/80 hover:text-primary transition-colors"
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
                  className="block py-3 text-sm font-bold text-primary hover:text-primary/80 transition-colors flex items-center gap-2"
                  onClick={() => setIsOpen(false)}
                >
                  <Download className="w-4 h-4" />
                  {t("nav.install_app")}
                </Link>
              </motion.div>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="border-t border-primary/10 pt-3 mt-2 space-y-2">
                {user ? (
                  <>
                    {isAdmin && (
                      <Button variant="ghost" size="sm" className="w-full justify-start gap-2" onClick={() => { navigate("/admin"); setIsOpen(false); }}>
                        {t("nav.admin")}
                      </Button>
                    )}
                    {isWholesaleDealer && (
                      <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-primary" onClick={() => { navigate("/catalogs"); setIsOpen(false); }}>
                        <BookOpen className="w-4 h-4" /> {t("nav.catalogs")}
                      </Button>
                    )}
                    <Button variant="outline" size="sm" className="w-full gap-2" onClick={() => { navigate("/dealer"); setIsOpen(false); }}>
                      <User className="w-4 h-4" /> {t("nav.dealer_account")}
                    </Button>
                    <Button variant="ghost" size="sm" className="w-full" onClick={() => { signOut(); setIsOpen(false); }}>
                      <LogOut className="w-4 h-4 ml-2" /> {t("nav.logout")}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="ghost" size="sm" className="w-full" onClick={() => { navigate("/auth"); setIsOpen(false); }}>
                      {t("nav.login")}
                    </Button>
                    <Button variant="default" size="sm" className="w-full gap-2" onClick={() => { navigate("/dealer-apply"); setIsOpen(false); }}>
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
