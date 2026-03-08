import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import logo from "@/assets/logo.png";
import { Menu, X, Briefcase, User, LogOut, ShoppingCart, ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { useNavigate } from "react-router-dom";
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
  const [productsOpen, setProductsOpen] = useState(false);
  const [mobileProductsOpen, setMobileProductsOpen] = useState(false);
  const productsTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { user, isDealer, isAdmin, signOut } = useAuth();
  const { itemCount } = useCart();
  const navigate = useNavigate();

  const productCategories = [
    { label: "قطع غيار تويوتا أصلي", href: "/products?brand=toyota-genuine" },
    { label: "زيوت تويوتا أصلي", href: "/products?brand=toyota-oils" },
    { label: "MTX Aftermarket", href: "/products?brand=mtx-aftermarket" },
  ];

  const links = [
    { label: "الرئيسية", href: "#hero" },
    { label: "من نحن", href: "#about" },
    { label: "المنتجات", href: "#products" },
    { label: "لماذا نحن", href: "#why-us" },
    { label: "فروعنا", href: "#branches" },
    { label: "تواصل معنا", href: "/contact", isRoute: true },
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
          {/* Hamburger - mobile only */}
          <motion.button
            className="md:hidden text-secondary-foreground p-1"
            onClick={() => setIsOpen(!isOpen)}
            whileTap={{ scale: 0.9 }}
          >
            <AnimatePresence mode="wait">
              {isOpen ? (
                <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }}>
                  <X className="w-6 h-6" />
                </motion.div>
              ) : (
                <motion.div key="menu" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.2 }}>
                  <Menu className="w-6 h-6" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>

          {/* Logo */}
          <motion.a href="/" className="flex items-center gap-2" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <img src={logo} alt="المصرية جروب" className="h-10 md:h-24" />
          </motion.a>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-6">
            {links.map((link) =>
              link.label === "المنتجات" ? (
                <div
                  key={link.href}
                  className="relative"
                  onMouseEnter={() => {
                    if (productsTimeout.current) clearTimeout(productsTimeout.current);
                    setProductsOpen(true);
                  }}
                  onMouseLeave={() => {
                    productsTimeout.current = setTimeout(() => setProductsOpen(false), 200);
                  }}
                >
                  <motion.a
                    href={link.href}
                    className="text-sm font-medium text-secondary-foreground/80 hover:text-primary transition-colors relative group flex items-center gap-1"
                    whileHover={{ y: -1 }}
                  >
                    {link.label}
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${productsOpen ? "rotate-180" : ""}`} />
                    <span className="absolute -bottom-1 right-0 w-0 h-[2px] bg-primary rounded-full transition-all duration-300 group-hover:w-full" />
                  </motion.a>
                  <AnimatePresence>
                    {productsOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        transition={{ duration: 0.2 }}
                        className="absolute top-full right-0 mt-2 w-56 bg-secondary/95 backdrop-blur-md border border-primary/20 rounded-xl shadow-xl shadow-black/20 overflow-hidden z-50"
                      >
                        {productCategories.map((cat) => (
                          <Link
                            key={cat.href}
                            to={cat.href}
                            onClick={() => setProductsOpen(false)}
                            className="block px-4 py-3 text-sm font-medium text-secondary-foreground/80 hover:text-primary hover:bg-primary/10 transition-colors border-b border-white/5 last:border-b-0"
                          >
                            {cat.label}
                          </Link>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (link as any).isRoute ? (
                <motion.div key={link.href} whileHover={{ y: -1 }}>
                  <Link
                    to={link.href}
                    className="text-sm font-medium text-secondary-foreground/80 hover:text-primary transition-colors relative group"
                  >
                    {link.label}
                    <span className="absolute -bottom-1 right-0 w-0 h-[2px] bg-primary rounded-full transition-all duration-300 group-hover:w-full" />
                  </Link>
                </motion.div>
              ) : (
                <motion.a
                  key={link.href}
                  href={link.href}
                  className="text-sm font-medium text-secondary-foreground/80 hover:text-primary transition-colors relative group"
                  whileHover={{ y: -1 }}
                >
                  {link.label}
                  <span className="absolute -bottom-1 right-0 w-0 h-[2px] bg-primary rounded-full transition-all duration-300 group-hover:w-full" />
                </motion.a>
              )
            )}
          </div>

          {/* Mobile right icons */}
          <div className="flex md:hidden items-center gap-1">
            <motion.button
              onClick={() => navigate("/cart")}
              className="relative text-secondary-foreground/80 hover:text-primary transition-colors p-1.5"
              whileTap={{ scale: 0.9 }}
            >
              <ShoppingCart className="w-5 h-5" />
              <AnimatePresence>
                {itemCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="absolute -top-0.5 -right-0.5 bg-primary text-primary-foreground text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center"
                  >
                    {itemCount}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
            <NotificationBell />
            {user ? (
              <motion.button onClick={() => navigate("/dealer")} className="text-secondary-foreground/80 hover:text-primary transition-colors p-1.5" whileTap={{ scale: 0.9 }}>
                <User className="w-5 h-5" />
              </motion.button>
            ) : (
              <motion.button onClick={() => navigate("/auth")} className="text-secondary-foreground/80 hover:text-primary transition-colors p-1.5" whileTap={{ scale: 0.9 }}>
                <User className="w-5 h-5" />
              </motion.button>
            )}
          </div>

          {/* Desktop right buttons */}
          <div className="hidden md:flex items-center gap-3">
            <motion.button
              onClick={() => navigate("/cart")}
              className="relative text-secondary-foreground/80 hover:text-primary transition-colors p-2"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <ShoppingCart className="w-5 h-5" />
              <AnimatePresence>
                {itemCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    transition={{ type: "spring", stiffness: 300 }}
                    className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center"
                  >
                    {itemCount}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
            <NotificationBell />
            {user ? (
              <>
                {isAdmin && (
                  <Button variant="ghost" size="sm" onClick={() => navigate("/admin")} className="text-secondary-foreground/80">
                    الإدارة
                  </Button>
                )}
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <Button variant="outline" size="sm" className="gap-2" onClick={() => navigate("/dealer")}>
                    <User className="w-4 h-4" />
                    حسابي
                  </Button>
                </motion.div>
                <Button variant="ghost" size="sm" onClick={() => signOut()} className="text-secondary-foreground/60">
                  <LogOut className="w-4 h-4" />
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={() => navigate("/auth")} className="text-secondary-foreground/80">
                  تسجيل الدخول
                </Button>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button variant="default" size="sm" className="gap-2" onClick={() => navigate("/dealer-apply")}>
                    <Briefcase className="w-4 h-4" />
                    التسجيل كـ تاجر
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
              {links.map((link, i) =>
                link.label === "المنتجات" ? (
                  <div key={link.href}>
                    <motion.button
                      custom={i}
                      initial="hidden"
                      animate="visible"
                      variants={linkVariants}
                      className="w-full flex items-center justify-between py-3 text-sm font-medium text-secondary-foreground/80 hover:text-primary transition-colors"
                      onClick={() => setMobileProductsOpen(!mobileProductsOpen)}
                    >
                      {link.label}
                      <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${mobileProductsOpen ? "rotate-180" : ""}`} />
                    </motion.button>
                    <AnimatePresence>
                      {mobileProductsOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden pr-4 border-r-2 border-primary/30"
                        >
                          {productCategories.map((cat) => (
                            <Link
                              key={cat.href}
                              to={cat.href}
                              className="block py-2 text-sm text-secondary-foreground/70 hover:text-primary transition-colors"
                              onClick={() => { setIsOpen(false); setMobileProductsOpen(false); }}
                            >
                              {cat.label}
                            </Link>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ) : (
                  <motion.a
                    key={link.href}
                    href={link.href}
                    custom={i}
                    initial="hidden"
                    animate="visible"
                    variants={linkVariants}
                    className="block py-3 text-sm font-medium text-secondary-foreground/80 hover:text-primary transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    {link.label}
                  </motion.a>
                )
              )}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="border-t border-primary/10 pt-3 mt-2 space-y-2"
              >
                {user ? (
                  <>
                    {isAdmin && (
                      <Button variant="ghost" size="sm" className="w-full justify-start gap-2" onClick={() => { navigate("/admin"); setIsOpen(false); }}>
                        الإدارة
                      </Button>
                    )}
                    <Button variant="outline" size="sm" className="w-full gap-2" onClick={() => { navigate("/dealer"); setIsOpen(false); }}>
                      <User className="w-4 h-4" /> حسابي
                    </Button>
                    <Button variant="ghost" size="sm" className="w-full" onClick={() => { signOut(); setIsOpen(false); }}>
                      <LogOut className="w-4 h-4 ml-2" /> تسجيل الخروج
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="ghost" size="sm" className="w-full" onClick={() => { navigate("/auth"); setIsOpen(false); }}>
                      تسجيل الدخول
                    </Button>
                    <Button variant="default" size="sm" className="w-full gap-2" onClick={() => { navigate("/dealer-apply"); setIsOpen(false); }}>
                      <Briefcase className="w-4 h-4" /> التسجيل كـ تاجر
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
