import { Link, useLocation, useNavigate } from "react-router-dom";
import { ChevronRight, ShoppingBag, User } from "lucide-react";
import logoDark from "@/assets/almasria-logo-dark.png";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { haptic } from "@/lib/haptics";

/**
 * Slim header used **only inside the native shell**.
 * Precision Dark: opaque carbon-1 surface + hairline, no backdrop-filter
 * (blur on a sticky bar tanks scroll performance in the WebView).
 */
const NativeAppHeader = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { itemCount } = useCart();
  const { user } = useAuth();
  const isHome = pathname === "/";

  return (
    <header
      dir="rtl"
      className="fixed top-0 inset-x-0 z-50 pd-s1 pd-hair-b"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="h-[52px] px-3 flex items-center justify-between gap-3">
        {!isHome ? (
          <button
            type="button"
            aria-label="رجوع"
            onClick={() => {
              void haptic("light");
              navigate(-1);
            }}
            className="pd-tap rounded-full grid place-items-center ios-press shrink-0"
          >
            <ChevronRight className="w-[20px] h-[20px] text-white/80" />
          </button>
        ) : (
          <span className="w-11 h-11 shrink-0" />
        )}

        <Link to="/" className="flex-1 flex justify-center min-w-0">
          <img src={logoDark} alt="المصرية جروب" className="h-7 w-auto object-contain" />
        </Link>

        <div className="flex items-center shrink-0">
          <Link
            to="/cart"
            aria-label="السلة"
            onClick={() => void haptic("light")}
            className="relative pd-tap rounded-full grid place-items-center ios-press"
          >
            <ShoppingBag className="w-[19px] h-[19px] text-white/80" />
            {itemCount > 0 && (
              <span className="absolute top-1 left-1 min-w-[17px] h-[17px] px-1 rounded-full bg-gold text-black text-[10px] font-semibold grid place-items-center pd-mono">
                {itemCount > 99 ? "99" : itemCount}
              </span>
            )}
          </Link>
          <Link
            to={user ? "/my-profile" : "/auth"}
            aria-label="حسابي"
            onClick={() => void haptic("light")}
            className="pd-tap rounded-full grid place-items-center ios-press"
          >
            <User className="w-[19px] h-[19px] text-white/80" />
          </Link>
        </div>
      </div>
    </header>
  );
};

export default NativeAppHeader;
