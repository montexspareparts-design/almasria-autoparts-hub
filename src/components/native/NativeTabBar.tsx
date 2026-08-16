import { memo, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, LayoutGrid, ShoppingBag, Package, User } from "lucide-react";
import { motion } from "framer-motion";
import { useCart } from "@/contexts/CartContext";
import { haptic } from "@/lib/haptics";
import { springTab, easeStandard } from "@/lib/motion";

/**
 * Floating Liquid-Glass tab bar (iOS 26 pattern).
 *
 * - Inset from the screen edges, never flush — it floats above content.
 * - Collapses to a compact icon-only pill while scrolling down, expands on
 *   scroll up, matching the system tab bar behaviour.
 * - Purely presentational navigation over the existing routes.
 */

const TABS = [
  { to: "/", label: "الرئيسية", icon: Home, match: (p: string) => p === "/" },
  {
    to: "/products",
    label: "المتجر",
    icon: LayoutGrid,
    match: (p: string) => p.startsWith("/products") || p.startsWith("/parts-"),
  },
  { to: "/cart", label: "السلة", icon: ShoppingBag, match: (p: string) => p.startsWith("/cart"), cart: true },
  { to: "/track-order", label: "طلباتي", icon: Package, match: (p: string) => p.startsWith("/track-order") },
  { to: "/my-profile", label: "حسابي", icon: User, match: (p: string) => p.startsWith("/my-profile") },
] as const;

/** Routes that keep their own full-screen chrome (staff / dealer / auth flows). */
const HIDDEN_PREFIXES = [
  "/admin",
  "/dealer", // covers /dealer, /dealer-login, /dealer-register, /dealer-apply
  "/staff",
  "/auth", // covers /auth and /auth-callback
  "/client-register",
  "/checkout",
  "/payment",
  "/reset-password",
];

const NativeTabBar = () => {
  const location = useLocation();
  const { itemCount } = useCart();
  const [compact, setCompact] = useState(false);
  const lastY = useRef(0);

  useEffect(() => {
    lastY.current = window.scrollY;
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        const y = window.scrollY;
        const delta = y - lastY.current;
        if (Math.abs(delta) > 8) {
          setCompact(delta > 0 && y > 120);
          lastY.current = y;
        }
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  const path = location.pathname;
  if (HIDDEN_PREFIXES.some((p) => path === p || path.startsWith(p + "/") || path.startsWith(p + "?"))) {
    return null;
  }

  return (
    <>
      {/* spacer so page content never hides behind the floating bar */}
      <div aria-hidden style={{ height: "calc(84px + env(safe-area-inset-bottom))" }} />

      <div
        dir="rtl"
        className="fixed inset-x-0 bottom-0 z-50 pointer-events-none px-5"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 10px)" }}
      >
        <motion.nav
          animate={{ height: compact ? 54 : 66 }}
          transition={{ duration: 0.25, ease: easeStandard }}
          className="pointer-events-auto mx-auto max-w-[420px] ios-glass rounded-full overflow-hidden"
        >
          <ul className="grid grid-cols-5 h-full">
            {TABS.map((t) => (
              <TabItem
                key={t.to}
                tab={t}
                active={t.match(path)}
                compact={compact}
                badge={"cart" in t && t.cart ? itemCount : 0}
              />
            ))}
          </ul>
        </motion.nav>
      </div>
    </>
  );
};

const TabItem = ({
  tab,
  active,
  compact,
  badge,
}: {
  tab: (typeof TABS)[number];
  active: boolean;
  compact: boolean;
  badge: number;
}) => {
  const Icon = tab.icon;
  return (
    <li className="h-full">
      <Link
        to={tab.to}
        onClick={() => void haptic("light")}
        aria-current={active ? "page" : undefined}
        aria-label={tab.label}
        className="relative h-full flex flex-col items-center justify-center select-none"
      >
        {active && (
          <motion.span
            layoutId="native-tab-pill"
            className="absolute inset-y-1.5 inset-x-1.5 rounded-full bg-white/[0.10]"
            transition={springTab}
          />
        )}

        <span className="relative grid place-items-center">
          <Icon
            className={`w-[21px] h-[21px] transition-colors duration-200 ${
              active ? "text-white" : "text-white/45"
            }`}
            strokeWidth={active ? 2.2 : 1.7}
          />
          {badge > 0 && (
            <span className="absolute -top-1.5 -left-2.5 min-w-[17px] h-[17px] px-1 rounded-full bg-toyota-red text-white text-[10px] font-bold grid place-items-center numeric ring-2 ring-[hsl(0_0%_6%)]">
              {badge > 99 ? "99+" : badge}
            </span>
          )}
        </span>

        <motion.span
          animate={{ opacity: compact ? 0 : 1, height: compact ? 0 : 13, marginTop: compact ? 0 : 4 }}
          transition={{ duration: 0.2, ease: easeStandard }}
          className={`relative overflow-hidden ar-body text-[10.5px] leading-[13px] ${
            active ? "text-white font-semibold" : "text-white/45 font-medium"
          }`}
        >
          {tab.label}
        </motion.span>
      </Link>
    </li>
  );
};

export default memo(NativeTabBar);
