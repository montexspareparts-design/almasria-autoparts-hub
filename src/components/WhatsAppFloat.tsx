import { forwardRef } from "react";
import { motion } from "framer-motion";
import { trackClickWhatsApp } from "@/lib/analytics";

const defaultMsg = "مرحبًا، عايز قطعة غيار لتويوتا [الموديل/السنة/رقم الشاسيه]";

const WhatsAppFloat = forwardRef<HTMLDivElement>((_, ref) => {
  const handleClick = () => {
    trackClickWhatsApp("floating_button");
  };

  return (
    <div ref={ref} className="fixed bottom-24 right-4 md:bottom-24 md:right-6 z-50">
      {/* Pulse rings */}
      <span className="absolute inset-0 rounded-full bg-[#D4AF37]/30 animate-ping" aria-hidden />
      <span className="absolute inset-0 rounded-full bg-[#25D366]/20 animate-pulse" aria-hidden />

      <motion.a
        href={`https://wa.me/201027815696?text=${encodeURIComponent(defaultMsg)}`}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        className="relative flex items-center justify-center w-14 h-14 md:w-16 md:h-16 rounded-full overflow-hidden group"
        style={{
          background:
            "radial-gradient(circle at 30% 30%, #1ee158 0%, #1a8a3f 60%, #0a1f3d 100%)",
          boxShadow:
            "0 10px 30px -5px rgba(37,211,102,0.55), 0 0 0 2px rgba(212,175,55,0.7), inset 0 2px 6px rgba(255,255,255,0.25), inset 0 -3px 8px rgba(0,0,0,0.3)",
        }}
        initial={{ scale: 0, opacity: 0, rotate: -90 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ delay: 0.8, type: "spring", stiffness: 180, damping: 14 }}
        whileHover={{ scale: 1.08, rotate: 4 }}
        whileTap={{ scale: 0.92 }}
        aria-label="تواصل معنا عبر واتساب"
      >
        {/* Glossy highlight */}
        <span
          className="absolute inset-x-2 top-1 h-1/3 rounded-full opacity-60 blur-sm"
          style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.7), transparent)" }}
          aria-hidden
        />
        {/* Shine sweep */}
        <span
          className="pointer-events-none absolute -inset-1 translate-x-[-120%] group-hover:translate-x-[120%] transition-transform duration-700"
          style={{
            background:
              "linear-gradient(110deg, transparent 40%, rgba(255,255,255,0.55) 50%, transparent 60%)",
          }}
          aria-hidden
        />

        <svg viewBox="0 0 32 32" className="relative w-7 h-7 md:w-8 md:h-8 fill-white drop-shadow-[0_2px_3px_rgba(0,0,0,0.45)]">
          <path d="M16.004 0h-.008C7.174 0 0 7.176 0 16c0 3.5 1.128 6.744 3.046 9.378L1.054 31.29l6.118-1.958A15.923 15.923 0 0016.004 32C24.826 32 32 24.822 32 16S24.826 0 16.004 0zm9.335 22.594c-.39 1.1-1.932 2.014-3.164 2.28-.844.18-1.946.322-5.66-1.216-4.752-1.966-7.806-6.778-8.04-7.094-.226-.316-1.892-2.52-1.892-4.808 0-2.288 1.198-3.412 1.624-3.878.39-.426.918-.606 1.224-.606.15 0 .316.008.466.014.426.018.64.044.92.712.352.84 1.21 2.946 1.316 3.162.108.216.216.502.072.788-.136.294-.256.476-.472.732-.216.256-.422.452-.638.728-.196.242-.418.502-.172.928.246.418 1.094 1.804 2.35 2.922 1.618 1.44 2.98 1.888 3.404 2.098.426.21.674.176.92-.106.254-.294 1.088-1.264 1.378-1.698.284-.426.574-.356.964-.214.394.142 2.494 1.176 2.92 1.39.426.216.71.322.816.502.104.178.104 1.04-.286 2.14z" />
        </svg>

        {/* Online dot */}
        <span className="absolute top-1 right-1 w-3 h-3 rounded-full bg-[#D4AF37] ring-2 ring-[#0a1f3d] shadow-[0_0_8px_rgba(212,175,55,0.9)]" aria-hidden />
      </motion.a>

      {/* Tooltip */}
      <motion.div
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 1.6 }}
        className="absolute right-full mr-3 top-1/2 -translate-y-1/2 hidden md:flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap text-white"
        style={{
          background: "linear-gradient(135deg, #0a1f3d, #14305f)",
          border: "1px solid rgba(212,175,55,0.6)",
          boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
        }}
      >
        <span className="text-[#D4AF37]">●</span> تواصل معنا الآن
      </motion.div>
    </div>
  );
});

WhatsAppFloat.displayName = "WhatsAppFloat";

export default WhatsAppFloat;
