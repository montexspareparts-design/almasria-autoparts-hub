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
  if (HIDDEN_PREFIXES.some((p) => path.startsWith(p))) {
    return null;
  }

  return (
    <>
      {/* spacer so page content never hides behind the floating bar */}
      <div aria-hidden style={{ height: "calc(94px + env(safe-area-inset-bottom))" }} />

      <div
        dir="rtl"
        className="fixed inset-x-0 bottom-0 z-50 pointer-events-none px-4"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 12px)" }}
      >
        {/* fade so page content dissolves under the bar instead of colliding with it */}
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[hsl(240_5%_4%)] via-[hsl(240_5%_4%)]/85 to-transparent"
        />

        <motion.nav
          animate={{ height: compact ? 58 : 70 }}
          transition={{ duration: 0.25, ease: easeStandard }}
          className="relative pointer-events-auto mx-auto max-w-[430px] rounded-[24px] overflow-hidden border border-white/[0.07] bg-[linear-gradient(180deg,hsl(240_6%_11%)_0%,hsl(240_6%_7%)_100%)] shadow-[0_-1px_0_0_rgba(255,255,255,0.05)_inset,0_18px_40px_-12px_rgba(0,0,0,0.9)]"
        >
          {/* subtle red energy line along the top edge */}
          <span
            aria-hidden
            className="absolute inset-x-10 top-0 h-px bg-gradient-to-l from-transparent via-[hsl(var(--toyota-red)/0.6)] to-transparent"
          />
          <ul className="grid grid-cols-5 h-full px-1">
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
    <li className="h-full min-w-0">
      <Link
        to={tab.to}
        onClick={() => void haptic("light")}
        aria-current={active ? "page" : undefined}
        aria-label={tab.label}
        className="relative h-full flex flex-col items-center justify-center select-none active:scale-[0.94] transition-transform duration-150"
      >
        {active && (
          <motion.span
            layoutId="native-tab-pill"
            className="absolute inset-y-[7px] inset-x-1 rounded-[18px] bg-[hsl(var(--toyota-red)/0.14)] border border-[hsl(var(--toyota-red)/0.28)] shadow-[0_0_18px_-4px_hsl(var(--toyota-red)/0.55)]"
            transition={springTab}
          />
        )}

        <span className="relative grid place-items-center">
          <Icon
            className={`w-[21px] h-[21px] transition-colors duration-200 ${
              active ? "text-toyota-red" : "text-white/45"
            }`}
            strokeWidth={active ? 2.3 : 1.7}
          />
          {badge > 0 && (
            <span className="absolute -top-1.5 -left-2.5 min-w-[17px] h-[17px] px-1 rounded-full bg-toyota-red text-white text-[10px] font-bold grid place-items-center numeric ring-2 ring-[hsl(240_6%_9%)]">
              {badge > 99 ? "99+" : badge}
            </span>
          )}
        </span>

        <motion.span
          animate={{ opacity: compact ? 0 : 1, height: compact ? 0 : 14, marginTop: compact ? 0 : 3 }}
          transition={{ duration: 0.2, ease: easeStandard }}
          className={`relative overflow-visible whitespace-nowrap ar-body text-[10.5px] leading-[14px] ${
            active ? "text-white font-bold" : "text-white/50 font-medium"
          }`}
        >
          {tab.label}
        </motion.span>
      </Link>
    </li>
  );
};


export default memo(NativeTabBar);
