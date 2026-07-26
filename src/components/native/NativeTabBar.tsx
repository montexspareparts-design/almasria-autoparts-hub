import { memo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Home, LayoutGrid, Package, User, ShoppingCart } from "lucide-react";
import { motion } from "framer-motion";
import { useCart } from "@/contexts/CartContext";

/**
 * Native bottom tab bar — only rendered inside the iOS/Android shell.
 * Purely presentational navigation over existing routes.
 */

const TABS = [
  { to: "/", label: "الرئيسية", icon: Home, match: (p: string) => p === "/" },
  { to: "/products", label: "المتجر", icon: LayoutGrid, match: (p: string) => p.startsWith("/products") || p.startsWith("/parts-") },
  { to: "/track-order", label: "طلباتي", icon: Package, match: (p: string) => p.startsWith("/track-order") },
  { to: "/my-profile", label: "حسابي", icon: User, match: (p: string) => p.startsWith("/my-profile") },
] as const;

/** Routes that keep their own full-screen chrome (staff / dealer / flows). */
const HIDDEN_PREFIXES = [
  "/admin",
  "/dealer",
  "/staff",
  "/auth",
  "/checkout",
  "/payment",
  "/reset-password",
  "/auth-callback",
];

const NativeTabBar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { itemCount } = useCart();

  const path = location.pathname;
  if (HIDDEN_PREFIXES.some((p) => path === p || path.startsWith(p + "/") || path.startsWith(p + "?"))) {
    return null;
  }

  return (
    <>
      {/* spacer so page content never hides behind the bar */}
      <div aria-hidden style={{ height: "calc(72px + env(safe-area-inset-bottom))" }} />

      <nav
        dir="rtl"
        className="fixed bottom-0 inset-x-0 z-50"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div
          className="absolute inset-0 backdrop-blur-2xl border-t border-white/10"
          style={{ background: "hsl(var(--carbon) / 0.9)" }}
        />


        {/* center action */}
        <button
          type="button"
          aria-label="عربة التسوق"
          onClick={() => navigate("/cart")}
          className="absolute left-1/2 -translate-x-1/2 -top-6 w-14 h-14 rounded-full bg-toyota-red text-white grid place-items-center shadow-[0_10px_30px_-6px_hsl(var(--toyota-red)/0.7)] ring-4 ring-carbon active:scale-95 transition-transform"
        >
          <ShoppingCart className="w-6 h-6" strokeWidth={2.2} />
          {itemCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-gold text-carbon text-[11px] font-black grid place-items-center">
              {itemCount > 99 ? "99+" : itemCount}
            </span>
          )}
        </button>

        <ul className="relative grid grid-cols-5 items-end h-[72px] px-1">
          {TABS.slice(0, 2).map((t) => (
            <TabItem key={t.to} tab={t} active={t.match(path)} />
          ))}
          <li aria-hidden />
          {TABS.slice(2).map((t) => (
            <TabItem key={t.to} tab={t} active={t.match(path)} />
          ))}
        </ul>
      </nav>
    </>
  );
};

const TabItem = ({
  tab,
  active,
}: {
  tab: (typeof TABS)[number];
  active: boolean;
}) => {
  const Icon = tab.icon;
  return (
    <li className="h-full">
      <Link
        to={tab.to}
        className="relative h-full flex flex-col items-center justify-center gap-1 select-none"
      >
        {active && (
          <motion.span
            layoutId="native-tab-pill"
            className="absolute top-1.5 w-11 h-9 rounded-2xl bg-toyota-red/15"
            transition={{ type: "spring", stiffness: 400, damping: 32 }}
          />
        )}
        <Icon
          className={`relative w-[22px] h-[22px] transition-colors ${
            active ? "text-toyota-red" : "text-soft"
          }`}
          strokeWidth={active ? 2.4 : 1.9}
        />
        <span
          className={`relative font-tajawal text-[11px] leading-none transition-colors ${
            active ? "text-white font-bold" : "text-soft font-medium"
          }`}
        >
          {tab.label}
        </span>
      </Link>
    </li>
  );
};

export default memo(NativeTabBar);
