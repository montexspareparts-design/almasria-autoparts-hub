import { useState } from "react";
import logo from "@/assets/logo.png";
import { Menu, X, Briefcase, User, LogOut, ShoppingCart, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { useNavigate } from "react-router-dom";
import NotificationBell from "@/components/NotificationBell";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, isDealer, isAdmin, signOut } = useAuth();
  const { itemCount } = useCart();
  const navigate = useNavigate();

  const links = [
    { label: "الرئيسية", href: "#hero" },
    { label: "من نحن", href: "#about" },
    { label: "المنتجات", href: "#products" },
    { label: "لماذا نحن", href: "#why-us" },
    { label: "الشراكات", href: "#partnerships" },
    { label: "تواصل معنا", href: "#contact" },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-secondary/95 backdrop-blur-md border-b border-primary/20">
      <div className="container mx-auto px-3 md:px-4">
        <div className="flex items-center justify-between h-14 md:h-20">
          {/* Hamburger - mobile only */}
          <button className="md:hidden text-secondary-foreground p-1" onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>

          {/* Logo - centered on mobile */}
          <a href="/" className="flex items-center gap-2">
            <img src={logo} alt="المصرية جروب" className="h-10 md:h-24" />
          </a>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-6">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-secondary-foreground/80 hover:text-primary transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Mobile right icons */}
          <div className="flex md:hidden items-center gap-1">
            <button onClick={() => navigate("/cart")} className="relative text-secondary-foreground/80 hover:text-primary transition-colors p-1.5">
              <ShoppingCart className="w-5 h-5" />
              {itemCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-primary text-primary-foreground text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {itemCount}
                </span>
              )}
            </button>
            <NotificationBell />
            {user ? (
              <button onClick={() => navigate("/dealer")} className="text-secondary-foreground/80 hover:text-primary transition-colors p-1.5">
                <User className="w-5 h-5" />
              </button>
            ) : (
              <button onClick={() => navigate("/auth")} className="text-secondary-foreground/80 hover:text-primary transition-colors p-1.5">
                <User className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Desktop right buttons */}
          <div className="hidden md:flex items-center gap-3">
            <button onClick={() => navigate("/cart")} className="relative text-secondary-foreground/80 hover:text-primary transition-colors p-2">
              <ShoppingCart className="w-5 h-5" />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {itemCount}
                </span>
              )}
            </button>
            <NotificationBell />
            {user ? (
              <>
                {isAdmin && (
                  <Button variant="ghost" size="sm" onClick={() => navigate("/admin")} className="text-secondary-foreground/80">
                    الإدارة
                  </Button>
                )}
                <Button variant="outline" size="sm" className="gap-2" onClick={() => navigate("/dealer")}>
                  <User className="w-4 h-4" />
                  حسابي
                </Button>
                <Button variant="ghost" size="sm" onClick={() => signOut()} className="text-secondary-foreground/60">
                  <LogOut className="w-4 h-4" />
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={() => navigate("/auth")} className="text-secondary-foreground/80">
                  تسجيل الدخول
                </Button>
                <Button variant="default" size="sm" className="gap-2" onClick={() => navigate("/dealer-apply")}>
                  <Briefcase className="w-4 h-4" />
                  التسجيل كـ تاجر
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Mobile menu */}
        {isOpen && (
          <div className="md:hidden pb-4 border-t border-primary/10 px-1">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="block py-3 text-sm font-medium text-secondary-foreground/80 hover:text-primary transition-colors"
                onClick={() => setIsOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <div className="border-t border-primary/10 pt-3 mt-2 space-y-2">
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
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
