import { memo, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, LayoutGrid, Car, ShoppingBag, User } from "lucide-react";
import { motion } from "framer-motion";
import { useCart } from "@/contexts/CartContext";
import { haptic } from "@/lib/haptics";
import { easeStandard } from "@/lib/motion";

/**
 * Native bottom tab bar — five primary destinations, iOS pattern.
 *
 * Chrome material (the only place glass is allowed alongside sheets and
 * sticky bars), floating inset pill, 44pt touch targets, always-visible
 * labels, `aria-current` on the active destination.
 * Purely presentational navigation over the existing routes.
 */

const TABS = [
  { to: "/", label: "الرئيسية", icon: Home, match: (p: string) => p === "/" },
  {
    to: "/products",
    label: "المتجر",
    icon: LayoutGrid,
    match: (p: string) => p.startsWith("/products") || p.startsWith("/parts-by-type") || p.startsWith("/mtx"),
  },
  {
    to: "/parts-by-model",
    label: "عربيتي",
    icon: Car,
    match: (p: string) => p.startsWith("/parts-by-model"),
  },
  { to: "/cart", label: "السلة", icon: ShoppingBag, match: (p: string) => p.startsWith("/cart"), cart: true },
  {
    to: "/my-profile",
    label: "حسابي",
    icon: User,
    match: (p: string) => p.startsWith("/my-profile") || p.startsWith("/track-order"),
  },
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
          setCompact(delta > 0 && y > 140);
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
      <div aria-hidden style={{ height: "calc(90px + env(safe-area-inset-bottom))" }} />

      <div
        dir="rtl"
        className="fixed inset-x-0 bottom-0 z-50 pointer-events-none px-4"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 10px)" }}
      >
        <motion.nav
          aria-label="التنقل الرئيسي"
          animate={{ height: compact ? 56 : 66 }}
          transition={{ duration: 0.24, ease: easeStandard }}
          className="pointer-events-auto mx-auto max-w-[430px] n-chrome rounded-[26px] overflow-hidden"
        >
          <ul className="grid grid-cols-5 h-full">
            {TABS.map((t) => {
              const active = t.match(path);
              const Icon = t.icon;
              const badge = "cart" in t && t.cart ? itemCount : 0;
              return (
                <li key={t.to} className="min-w-0">
                  <Link
                    to={t.to}
                    onClick={() => void haptic("light")}
                    aria-current={active ? "page" : undefined}
                    aria-label={t.label}
                    className="relative h-full flex flex-col items-center justify-center gap-[3px] n-press"
                    style={{ color: active ? "hsl(var(--n-accent))" : "hsl(var(--n-text-3))" }}
                  >
                    <span className="relative">
                      <Icon
                        className="w-[21px] h-[21px]"
                        strokeWidth={active ? 2.4 : 1.9}
                        aria-hidden
                      />
                      {badge > 0 && (
                        <span
                          className="absolute -top-1.5 -end-2 min-w-[17px] h-[17px] px-1 rounded-full grid place-items-center ar-body text-[10px] font-bold n-num"
                          style={{ background: "hsl(var(--n-error))", color: "#fff" }}
                          aria-label={`${badge} في السلة`}
                        >
                          {badge > 99 ? "99+" : badge}
                        </span>
                      )}
                    </span>
                    <motion.span
                      animate={{ opacity: compact ? 0 : 1, height: compact ? 0 : 13 }}
                      transition={{ duration: 0.18, ease: easeStandard }}
                      className="ar-body text-[10.5px] font-bold leading-none overflow-hidden"
                    >
                      {t.label}
                    </motion.span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </motion.nav>
      </div>
    </>
  );
};

export default memo(NativeTabBar);
