import { motion, AnimatePresence, useScroll } from "framer-motion";
import { ArrowUp } from "lucide-react";
import { useEffect, useState, forwardRef } from "react";

const BackToTop = forwardRef<HTMLDivElement>((_, ref) => {
  const [visible, setVisible] = useState(false);
  const { scrollY } = useScroll();

  useEffect(() => {
    return scrollY.on("change", (y) => setVisible(y > 400));
  }, [scrollY]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div ref={ref}>
      <AnimatePresence>
        {visible && (
          <motion.button
            initial={{ opacity: 0, scale: 0.5, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, y: 20 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={scrollToTop}
            className="fixed bottom-36 left-4 md:bottom-24 z-40 w-10 h-10 md:w-12 md:h-12 rounded-full bg-secondary text-secondary-foreground shadow-lg flex items-center justify-center border border-border hover:bg-secondary/90 transition-colors"
            aria-label="العودة لأعلى"
          >
            <ArrowUp className="w-5 h-5" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
});

BackToTop.displayName = "BackToTop";

export default BackToTop;
