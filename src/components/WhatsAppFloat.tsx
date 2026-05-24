import { forwardRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { trackClickWhatsApp } from "@/lib/analytics";

const defaultMsg = "مرحبًا، عايز قطعة غيار لتويوتا [الموديل/السنة/رقم الشاسيه]";

const WhatsAppFloat = forwardRef<HTMLDivElement>((_, ref) => {
  const [hovered, setHovered] = useState(false);

  const handleClick = () => {
    trackClickWhatsApp("floating_button");
  };

  return (
    <div
      ref={ref}
      className="fixed bottom-24 right-4 md:bottom-24 md:right-6 z-50"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <motion.a
        href={`https://wa.me/201027815696?text=${encodeURIComponent(defaultMsg)}`}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        aria-label="تواصل معنا عبر واتساب"
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.8, type: "spring", stiffness: 180, damping: 16 }}
        whileTap={{ scale: 0.96 }}
        className="relative flex items-center gap-3 pr-2 pl-2 py-2 rounded-full overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, #0a1f3d 0%, #14305f 50%, #0a1f3d 100%)",
          border: "1.5px solid rgba(212,175,55,0.85)",
          boxShadow:
            "0 12px 32px -8px rgba(10,31,61,0.6), 0 0 0 4px rgba(212,175,55,0.08), inset 0 1px 0 rgba(212,175,55,0.25)",
        }}
      >
        {/* Gold shimmer sweep */}
        <span
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            background:
              "linear-gradient(115deg, transparent 35%, rgba(212,175,55,0.18) 50%, transparent 65%)",
            transform: hovered ? "translateX(100%)" : "translateX(-100%)",
            transition: "transform 900ms ease",
          }}
          aria-hidden
        />

        {/* Icon medallion */}
        <div className="relative flex items-center justify-center w-11 h-11 md:w-12 md:h-12 rounded-full shrink-0"
          style={{
            background: "radial-gradient(circle at 30% 30%, #ffffff 0%, #f4f4f4 100%)",
            boxShadow: "inset 0 0 0 1.5px #D4AF37, 0 4px 10px rgba(0,0,0,0.25)",
          }}
        >
          <svg viewBox="0 0 32 32" className="w-6 h-6 md:w-7 md:h-7" aria-hidden>
            <defs>
              <linearGradient id="waGold" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#0a1f3d" />
                <stop offset="100%" stopColor="#14305f" />
              </linearGradient>
            </defs>
            <path
              fill="url(#waGold)"
              d="M16.004 0h-.008C7.174 0 0 7.176 0 16c0 3.5 1.128 6.744 3.046 9.378L1.054 31.29l6.118-1.958A15.923 15.923 0 0016.004 32C24.826 32 32 24.822 32 16S24.826 0 16.004 0zm9.335 22.594c-.39 1.1-1.932 2.014-3.164 2.28-.844.18-1.946.322-5.66-1.216-4.752-1.966-7.806-6.778-8.04-7.094-.226-.316-1.892-2.52-1.892-4.808 0-2.288 1.198-3.412 1.624-3.878.39-.426.918-.606 1.224-.606.15 0 .316.008.466.014.426.018.64.044.92.712.352.84 1.21 2.946 1.316 3.162.108.216.216.502.072.788-.136.294-.256.476-.472.732-.216.256-.422.452-.638.728-.196.242-.418.502-.172.928.246.418 1.094 1.804 2.35 2.922 1.618 1.44 2.98 1.888 3.404 2.098.426.21.674.176.92-.106.254-.294 1.088-1.264 1.378-1.698.284-.426.574-.356.964-.214.394.142 2.494 1.176 2.92 1.39.426.216.71.322.816.502.104.178.104 1.04-.286 2.14z"
            />
          </svg>
          {/* Status dot */}
          <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#22c55e] ring-2 ring-[#0a1f3d]">
            <span className="absolute inset-0 rounded-full bg-[#22c55e] animate-ping opacity-75" />
          </span>
        </div>

        {/* Label */}
        <AnimatePresence initial={false}>
          {hovered && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: "auto", opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="overflow-hidden whitespace-nowrap"
            >
              <div className="flex flex-col leading-tight pl-1 pr-3">
                <span className="text-[10px] uppercase tracking-[0.18em] text-[#D4AF37] font-semibold">
                  Al Masria
                </span>
                <span className="text-sm font-bold text-white">
                  تواصل واتساب
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.a>
    </div>
  );
});

WhatsAppFloat.displayName = "WhatsAppFloat";

export default WhatsAppFloat;
