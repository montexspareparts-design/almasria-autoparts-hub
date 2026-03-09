import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "react-router-dom";
import { ReactNode } from "react";
import { Cog } from "lucide-react";

const PageTransition = ({ children }: { children: ReactNode }) => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <motion.div key={location.pathname}>
        {/* Overlay curtain */}
        <motion.div
          className="fixed inset-0 z-[9999] bg-secondary flex items-center justify-center pointer-events-none"
          initial={{ clipPath: "circle(0% at 50% 50%)" }}
          animate={{ clipPath: "circle(0% at 50% 50%)" }}
          exit={{ clipPath: "circle(150% at 50% 50%)" }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        />

        {/* Enter overlay */}
        <motion.div
          className="fixed inset-0 z-[9999] bg-secondary flex items-center justify-center pointer-events-none"
          initial={{ clipPath: "circle(150% at 50% 50%)" }}
          animate={{ clipPath: "circle(0% at 50% 50%)" }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Rotating gear icon */}
          <motion.div
            initial={{ opacity: 1, scale: 1, rotate: 0 }}
            animate={{ opacity: 0, scale: 0.5, rotate: 180 }}
            transition={{ duration: 0.5, ease: "easeIn" }}
            className="flex flex-col items-center gap-3"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              <Cog className="w-10 h-10 text-primary" strokeWidth={1.5} />
            </motion.div>
            <div className="w-8 h-[2px] bg-primary rounded-full" />
          </motion.div>
        </motion.div>

        {/* Page content */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          {children}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default PageTransition;
