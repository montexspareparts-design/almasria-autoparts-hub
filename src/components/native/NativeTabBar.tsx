import { memo, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, LayoutGrid, Car, ShoppingBag, User } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { useCart } from "@/contexts/CartContext";
import { haptic } from "@/lib/haptics";
import { easeStandard } from "@/lib/motion";

/**
 * Native bottom tab bar — five primary destinations, edge-anchored.
 *
 * Low-profile chrome attached to the bottom edge with a single hairline,
 * no floating pill, no underline indicator. The active destination is
 * communicated by icon weight, label weight and the Al Masria brand tint.
 * Routes and destinations are unchanged.
 */

const TABS = [
  { to: "/", label: "الرئيسية", icon: Home, match: (p: string) => p === "/" },
  {
    to: "/products",
    label: "الكتالوج",
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

const BAR_H = 54;

const NativeTabBar = () => {
  const location = useLocation();
  const { itemCount } = useCart();
  const reduce = useReducedMotion();
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
          setCompact(delta > 0 && y > 160);
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
      {/* spacer so content never sits under the bar */}
      <div aria-hidden style={{ height: `calc(${BAR_H}px + env(safe-area-inset-bottom))` }} />

      <nav
        dir="rtl"
        aria-label="التنقل الرئيسي"
        className="fixed inset-x-0 bottom-0 z-50 n-chrome"
        style={{
          paddingBottom: "env(safe-area-inset-bottom)",
          borderRadius: 0,
          border: "none",
          borderTop: "1px solid hsl(var(--n-border))",
          boxShadow: "none",
        }}
      >
        <ul className="grid grid-cols-5 mx-auto max-w-[520px]" style={{ height: BAR_H }}>
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
                  className="h-full flex flex-col items-center justify-center gap-[3px] n-press"
                  style={{
                    minHeight: 44,
                    color: active ? "hsl(var(--n-accent))" : "hsl(var(--n-text-3))",
                  }}
                >
                  <span className="relative">
                    <Icon className="w-[22px] h-[22px]" strokeWidth={active ? 2.5 : 1.75} aria-hidden />
                    {badge > 0 && (
                      <span
                        className="absolute -top-1.5 -end-2 min-w-[16px] h-[16px] px-1 rounded-full grid place-items-center ar-body text-[9.5px] font-bold n-num"
                        style={{ background: "hsl(var(--n-accent))", color: "#fff" }}
                        aria-label={`${badge} في السلة`}
                      >
                        {badge > 99 ? "99+" : badge}
                      </span>
                    )}
                  </span>
                  <motion.span
                    animate={reduce ? undefined : { opacity: compact ? 0 : 1, height: compact ? 0 : 14 }}
                    transition={{ duration: 0.16, ease: easeStandard }}
                    className="ar-body text-[10px] overflow-hidden flex items-center"
                    style={{ lineHeight: "14px", fontWeight: active ? 800 : 500 }}
                  >
                    {t.label}
                  </motion.span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
};

export default memo(NativeTabBar);
