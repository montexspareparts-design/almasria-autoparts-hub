import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import logo from "@/assets/logo.webp";
import { Menu, X, Briefcase, User, LogOut, BookOpen, Download, Globe, ShoppingCart } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCart } from "@/contexts/CartContext";
import NotificationBell from "@/components/NotificationBell";
import DealerAuthDialog from "@/components/DealerAuthDialog";

const mobileMenuVariants = {
  hidden: { opacity: 0, height: 0, filter: "blur(8px)" },
  visible: { opacity: 1, height: "auto", filter: "blur(0px)", transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const } },
  exit: { opacity: 0, height: 0, filter: "blur(6px)", transition: { duration: 0.22, ease: [0.4, 0, 1, 1] as const } },
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
  const { user, dealerAccount, loading: authLoading, isAdmin, isModerator, signOut } = useAuth();
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

  // Close mobile menu on route change
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname, location.search, location.hash]);

  // Lock body scroll + Escape to close while menu is open
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setIsOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [isOpen]);

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

  const isDealer = !!dealerAccount && !isModerator;
  // Moderator-only employee (no dealer / no admin) → minimal staff navbar
  const isStaffOnly = isModerator && !isAdmin && !isDealer;

  // B2B links for dealers — simplified portal navigation
  const dealerLinks = [
    { label: lang === "ar" ? "الرئيسية" : "Home", href: "/", isRoute: true },
    { label: lang === "ar" ? "لوحة التحكم" : "Dashboard", href: "/dealer", isRoute: true },
    { label: lang === "ar" ? "المنتجات" : "Products", href: "/products", isRoute: true },
    { label: lang === "ar" ? "طلباتي" : "My Orders", href: "/dealer?tab=orders", isRoute: true },
    { label: lang === "ar" ? "عروض الأسعار" : "Price Lists", href: "/dealer?tab=price_lists", isRoute: true },
  ];

  // Staff links for moderators (employees) — focused on customer service
  const moderatorLinks = [
    { label: lang === "ar" ? "لوحة المهام" : "Tasks", href: "/admin?section=daily-dashboard", isRoute: true },
    { label: lang === "ar" ? "ملف العملاء" : "Customers", href: "/admin?section=customers", isRoute: true },
    { label: lang === "ar" ? "ذكاء العملاء" : "Intel", href: "/admin?section=customer-intel", isRoute: true },
    { label: lang === "ar" ? "تحليل الأصناف" : "Products", href: "/admin?section=analytics", isRoute: true },
    { label: lang === "ar" ? "إدخال العملاء" : "Leads", href: "/admin?section=leads", isRoute: true },
    { label: lang === "ar" ? "الواتساب" : "WhatsApp", href: "/admin?section=whatsapp-inbox", isRoute: true },
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

  const links = isStaffOnly ? moderatorLinks : (isDealer ? dealerLinks : visitorLinks);

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
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 glass-ios-strong ${
        scrolled
          ? "shadow-lg shadow-black/40"
          : ""
      }`}
    >
      <div className="container mx-auto px-3 md:px-5">
        <div className="flex items-center justify-between h-14 md:h-16">
          {/* Mobile: Hamburger */}
          <button
            className="lg:hidden glass-icon rounded-full text-white/90 h-9 w-9 flex items-center justify-center relative z-10 touch-manipulation"
            onClick={() => setIsOpen(!isOpen)}
            aria-label={isOpen ? "إغلاق القائمة" : "فتح القائمة"}
            aria-expanded={isOpen}
          >
            {isOpen ? <X className="w-[17px] h-[17px]" /> : <Menu className="w-[17px] h-[17px]" />}
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
          <div className="flex lg:hidden items-center gap-1.5 relative z-10">
            <button onClick={toggleLang} className="glass-icon rounded-full text-white/90 hover:text-white h-9 min-w-[38px] px-2 touch-manipulation text-[11px] font-bold flex items-center justify-center">
              {lang === "ar" ? "EN" : "عربي"}
            </button>
            {!isDealer && !isStaffOnly && (
              <button
                onClick={() => navigate("/cart")}
                aria-label={lang === "ar" ? `سلة المشتريات${itemCount > 0 ? ` (${itemCount} عنصر)` : ""}` : `Shopping cart${itemCount > 0 ? ` (${itemCount} items)` : ""}`}
                className="glass-icon rounded-full text-white/90 hover:text-white h-9 w-9 flex items-center justify-center touch-manipulation relative"
              >
                <ShoppingCart className="w-[17px] h-[17px]" aria-hidden="true" />
                {itemCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[9px] font-black min-w-[16px] h-[16px] rounded-full flex items-center justify-center leading-none ring-2 ring-black/50">
                    {itemCount}
                  </span>
                )}
              </button>
            )}
            <div className="glass-icon rounded-full h-9 w-9 flex items-center justify-center">
              <NotificationBell />
            </div>
            <button
              onClick={() => {
                if (!user) return navigate("/auth");
                if (isStaffOnly || isAdmin) return navigate("/admin");
                return navigate(dealerAccount ? "/dealer" : "/dealer-apply");
              }}
              aria-label={lang === "ar" ? "حسابي" : "My account"}
              className="glass-icon rounded-full text-white/90 hover:text-white h-9 w-9 flex items-center justify-center touch-manipulation"
            >
              <User className="w-[17px] h-[17px]" aria-hidden="true" />
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
            {!isDealer && !isStaffOnly && (
              <button
                onClick={() => navigate("/cart")}
                aria-label={lang === "ar" ? `سلة المشتريات${itemCount > 0 ? ` (${itemCount} عنصر)` : ""}` : `Shopping cart${itemCount > 0 ? ` (${itemCount} items)` : ""}`}
                className="glass-icon rounded-full text-white/90 hover:text-white h-9 w-9 flex items-center justify-center relative"
              >
                <ShoppingCart className="w-[17px] h-[17px]" aria-hidden="true" />
                {itemCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[9px] font-black min-w-[15px] h-[15px] rounded-full flex items-center justify-center leading-none ring-2 ring-black/50">
                    {itemCount}
                  </span>
                )}
              </button>
            )}

            {/* Notifications */}
            <div className="glass-icon rounded-full h-9 w-9 flex items-center justify-center">
              <NotificationBell />
            </div>

            {user ? (
              <>
                <div className="w-px h-5 bg-secondary-foreground/10 mx-1" />

                {(isAdmin || isStaffOnly) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate("/admin")}
                    className="text-secondary-foreground/60 hover:text-secondary-foreground text-[13px] font-semibold h-8 px-2.5"
                  >
                    {isStaffOnly ? (lang === "ar" ? "لوحة المهام" : "Staff Panel") : t("nav.admin")}
                  </Button>
                )}

                {/* B2C: show orders + dealer apply (hide for dealer & moderator) */}
                {!isDealer && !isStaffOnly && (
                  <>
                    <Link
                      to="/my-profile"
                      className={`flex items-center gap-1.5 text-[13px] font-semibold px-2.5 py-1.5 rounded-lg transition-colors ${
                        location.pathname === "/my-profile"
                          ? "text-primary bg-primary/10"
                          : "text-secondary-foreground/60 hover:text-secondary-foreground hover:bg-secondary-foreground/5"
                      }`}
                    >
                      <User className="w-3.5 h-3.5" />
                      {lang === "ar" ? "حسابي" : "My Profile"}
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
                  className="glass-icon rounded-full text-white/70 hover:text-primary h-9 w-9 flex items-center justify-center"
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
                  onClick={() => navigate("/auth")}
                  className="text-secondary-foreground/60 hover:text-secondary-foreground text-[13px] font-semibold h-8 px-2.5"
                >
                  {lang === "ar" ? "تسجيل الدخول" : "Login"}
                </Button>
                <button
                  onClick={() => navigate("/dealer-login")}
                  className="group relative inline-flex items-center gap-1.5 h-8 px-4 rounded-full bg-toyota-red text-white font-tajawal font-bold text-[13px] overflow-hidden border border-[hsl(var(--gold)/0.4)] shadow-[0_0_18px_hsl(var(--toyota-red)/0.45)] hover:shadow-[0_0_24px_hsl(var(--toyota-red)/0.7)] hover:scale-[1.03] transition-all duration-300"
                >
                  <span
                    aria-hidden
                    className="absolute inset-y-0 -inset-x-4 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-lux-shimmer-sweep pointer-events-none"
                    style={{ width: "40%" }}
                  />
                  <Briefcase className="relative w-3.5 h-3.5 text-gold" />
                  <span className="relative tracking-wide">
                    {lang === "ar" ? "التسجيل كتاجر" : "Dealer Portal"}
                  </span>
                  <span aria-hidden className="absolute inset-0 rounded-full ring-1 ring-white/20 pointer-events-none" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Mobile Menu — backdrop + scrollable panel */}
        <AnimatePresence>
          {isOpen && (
            <>
              {/* Backdrop overlay (click outside to close) */}
              <motion.div
                key="nav-backdrop"
                initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
                animate={{ opacity: 1, backdropFilter: "blur(14px)" }}
                exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                className="lg:hidden fixed inset-0 top-14 bg-black/40 -z-[1]"
                style={{ WebkitBackdropFilter: "blur(14px)" }}
                onClick={() => setIsOpen(false)}
                aria-hidden="true"
              />
              <motion.div
                key="nav-panel"
                className="lg:hidden pb-4 border-t border-secondary-foreground/10 px-1 overflow-y-auto overscroll-contain bg-secondary"
                style={{ maxHeight: "calc(100dvh - 3.5rem)" }}
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
                    {(isAdmin || isStaffOnly) && (
                      <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-secondary-foreground/70 font-semibold" onClick={() => { navigate("/admin"); setIsOpen(false); }}>
                        {isStaffOnly ? (lang === "ar" ? "لوحة المهام" : "Staff Panel") : t("nav.admin")}
                      </Button>
                    )}
                    {!isDealer && !isStaffOnly && isWholesaleDealer && (
                      <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-primary font-semibold" onClick={() => { navigate("/catalogs"); setIsOpen(false); }}>
                        <BookOpen className="w-4 h-4" /> {t("nav.catalogs")}
                      </Button>
                    )}
                    {!isDealer && !isStaffOnly && (
                      <>
                        <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-secondary-foreground/70 font-semibold" onClick={() => { navigate("/my-profile"); setIsOpen(false); }}>
                          <User className="w-4 h-4" /> {lang === "ar" ? "حسابي" : "My Profile"}
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
                    <Button variant="ghost" size="sm" className="w-full font-semibold" onClick={() => { navigate("/auth"); setIsOpen(false); }}>
                      {lang === "ar" ? "تسجيل الدخول" : "Login"}
                    </Button>
                    <Button variant="default" size="sm" className="w-full gap-2 font-semibold" onClick={() => { navigate("/dealer-login"); setIsOpen(false); }}>
                      <Briefcase className="w-4 h-4" /> {lang === "ar" ? "التسجيل كتاجر" : "Dealer Portal"}
                    </Button>
                  </>
                )}
              </motion.div>
            </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
      <DealerAuthDialog open={authDialogOpen} onOpenChange={setAuthDialogOpen} defaultTab={authDialogTab} />
    </motion.nav>
  );
};

export default Navbar;
