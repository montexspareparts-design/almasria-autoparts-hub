import { Link, useLocation, useNavigate } from "react-router-dom";
import { ChevronRight, ShoppingBag, User } from "lucide-react";
import logoDark from "@/assets/almasria-logo-dark.png";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { haptic } from "@/lib/haptics";

/**
 * Slim glass header used **only inside the native shell**.
 * Replaces the full website navbar (hamburger / EN switch / desktop links)
 * which clashed with the native tab bar and felt like a web page in the app.
 */
const NativeAppHeader = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { itemCount } = useCart();
  const { user } = useAuth();
  const isHome = pathname === "/";

  return (
    <>
      <div
        aria-hidden
        style={{ height: "calc(env(safe-area-inset-top) + 52px)" }}
      />
      <header
        dir="rtl"
        className="fixed top-0 inset-x-0 z-50 ios-glass border-x-0 border-t-0 rounded-none"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="h-[52px] px-4 flex items-center justify-between gap-3">
          {!isHome ? (
            <button
              type="button"
              aria-label="رجوع"
              onClick={() => {
                void haptic("light");
                navigate(-1);
              }}
              className="w-9 h-9 rounded-full bg-white/[0.08] grid place-items-center ios-press shrink-0"
            >
              <ChevronRight className="w-[18px] h-[18px] text-white/80" />
            </button>
          ) : (
            <span className="w-9 h-9 shrink-0" />
          )}

          <Link to="/" className="flex-1 flex justify-center min-w-0">
            <img src={logoDark} alt="المصرية جروب" className="h-7 w-auto object-contain" />
          </Link>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              to="/cart"
              aria-label="السلة"
              onClick={() => void haptic("light")}
              className="relative w-9 h-9 rounded-full bg-white/[0.08] grid place-items-center ios-press"
            >
              <ShoppingBag className="w-[17px] h-[17px] text-white/80" />
              {itemCount > 0 && (
                <span className="absolute -top-1 -left-1 min-w-[17px] h-[17px] px-1 rounded-full bg-toyota-red text-white text-[10px] font-bold grid place-items-center numeric">
                  {itemCount > 99 ? "99" : itemCount}
                </span>
              )}
            </Link>
            <Link
              to={user ? "/my-profile" : "/auth"}
              aria-label="حسابي"
              onClick={() => void haptic("light")}
              className="w-9 h-9 rounded-full bg-white/[0.08] grid place-items-center ios-press"
            >
              <User className="w-[17px] h-[17px] text-white/80" />
            </Link>
          </div>
        </div>
      </header>
    </>
  );
};

export default NativeAppHeader;
