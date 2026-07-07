import { ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "react-router-dom";

/**
 * Wraps <Routes> with an AnimatePresence keyed by pathname so route changes
 * fade + subtly blur in/out. Keep transitions short so navigation feels snappy.
 */
const AnimatedRoutes = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, filter: "blur(6px)", y: 6 }}
        animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
        exit={{ opacity: 0, filter: "blur(4px)", y: -4 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        style={{ willChange: "opacity, filter, transform" }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

export default AnimatedRoutes;
