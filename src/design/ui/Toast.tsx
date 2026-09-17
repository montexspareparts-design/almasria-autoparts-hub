import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { dsSpring } from "../motion";

export interface ToastMessage {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

/** hook بسيط داخل نظام التصميم — لا يعتمد على أي مزوّد خارجي */
export const useToast = () => {
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const timer = useRef<number | null>(null);

  const show = useCallback((next: ToastMessage) => {
    setToast(next);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(null), 3000);
  }, []);

  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); }, []);

  return { toast, show, dismiss: () => setToast(null) };
};

export interface ToastProps {
  toast: ToastMessage | null;
  /** مسافة إضافية من الأسفل (فوق شريط التبويبات) */
  offsetBottom?: number;
}

export const Toast = ({ toast, offsetBottom = 80 }: ToastProps) => (
  <AnimatePresence>
    {toast && (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 16 }}
        transition={dsSpring}
        className="fixed z-[80] flex items-center gap-3 px-4 py-3"
        style={{
          insetInlineStart: 20,
          insetInlineEnd: 20,
          bottom: offsetBottom,
          background: "var(--ink-900)",
          color: "var(--surface-0)",
          borderRadius: "var(--r-md)",
          boxShadow: "var(--shadow-2)",
        }}
        role="status"
      >
        <span className="ds-caption flex-1">{toast.message}</span>
        {toast.actionLabel && (
          <button
            type="button"
            className="ds-caption ds-focus"
            style={{ color: "var(--surface-0)", opacity: 0.8 }}
            onClick={toast.onAction}
          >
            {toast.actionLabel}
          </button>
        )}
      </motion.div>
    )}
  </AnimatePresence>
);

export default Toast;
