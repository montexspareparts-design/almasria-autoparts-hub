import { ReactNode, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "react-router-dom";

/**
 * Wraps <Routes> with an AnimatePresence keyed by pathname so route changes
 * fade + subtly blur in/out. Falls back to a plain fade when the user
 * prefers reduced motion or the device is narrow (avoids costly
 * fullscreen `filter: blur()` on low-end mobiles).
 */
const AnimatedRoutes = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const [lite, setLite] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const rm = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sm = window.matchMedia("(max-width: 768px)");
    const update = () => setLite(rm.matches || sm.matches);
    update();
    rm.addEventListener("change", update);
    sm.addEventListener("change", update);
    return () => {
      rm.removeEventListener("change", update);
      sm.removeEventListener("change", update);
    };
  }, []);

  // NOTE: `filter: blur()` as an animatable property crashes intermittently on
  // iOS WebView (WKWebView + WebKit compositor) — especially right after
  // sign-in when the /auth → / transition races with lazy chunk load. We now
  // ALWAYS use the lite variant (opacity only). Cheap, stable, and identical
  // visually on mobile where users spend most of their time.
  const variants = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.18, ease: "easeOut" as const },
  };

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        initial={variants.initial}
        animate={variants.animate}
        exit={variants.exit}
        transition={variants.transition}
        style={{ willChange: "opacity" }}
      >

        {children}
      </motion.div>
    </AnimatePresence>
  );
};

export default AnimatedRoutes;

