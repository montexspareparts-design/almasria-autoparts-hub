import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";
import { backdropFade, dsSpring } from "../motion";

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  /** 50% أو 92% من ارتفاع الشاشة */
  snap?: "half" | "full";
  children: React.ReactNode;
}

export const Sheet = ({ open, onClose, title, snap = "half", children }: SheetProps) => {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-end" dir="rtl">
          <motion.div
            {...backdropFade}
            className="absolute inset-0"
            style={{ background: "rgba(11,11,13,0.4)" }}
            onClick={onClose}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={dsSpring}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 120 || info.velocity.y > 600) onClose();
            }}
            className="relative w-full"
            style={{
              height: snap === "full" ? "92dvh" : "50dvh",
              background: "var(--surface-0)",
              borderTopLeftRadius: "var(--r-xl)",
              borderTopRightRadius: "var(--r-xl)",
              boxShadow: "var(--shadow-sheet)",
              paddingBottom: "env(safe-area-inset-bottom, 0px)",
            }}
          >
            <div className="pt-3 pb-2 grid place-items-center">
              <span
                className="w-9 h-1 rounded-full"
                style={{ background: "var(--line-200)" }}
              />
            </div>
            {title && (
              <h3 className="ds-h2 px-5 pb-3" style={{ color: "var(--ink-900)" }}>
                {title}
              </h3>
            )}
            <div className="px-5 pb-5 overflow-y-auto" style={{ maxHeight: "calc(100% - 72px)" }}>
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default Sheet;
