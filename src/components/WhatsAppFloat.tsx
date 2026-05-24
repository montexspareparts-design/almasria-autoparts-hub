import { forwardRef } from "react";
import { motion } from "framer-motion";
import { trackClickWhatsApp } from "@/lib/analytics";

const defaultMsg = "مرحبًا، عايز قطعة غيار لتويوتا [الموديل/السنة/رقم الشاسيه]";

const WhatsAppFloat = forwardRef<HTMLDivElement>((_, ref) => {
  const handleClick = () => {
    trackClickWhatsApp("floating_button");
  };

  return (
    <div
      ref={ref}
      className="fixed bottom-20 right-4 z-50"
    >
      <motion.a
        href={`https://wa.me/201027815696?text=${encodeURIComponent(defaultMsg)}`}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        aria-label="تواصل معنا عبر واتساب"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.8, type: "spring", stiffness: 200, damping: 18 }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        className="relative flex items-center justify-center w-12 h-12 rounded-full bg-[#25D366] text-white shadow-lg hover:shadow-xl transition-shadow"
      >
        {/* Glow rings */}
        <span className="absolute inset-0 rounded-full bg-[#25D366] opacity-40 animate-ping" style={{ animationDuration: '2s' }} />
        <span className="absolute -inset-1 rounded-full bg-[#25D366]/20 blur-md animate-pulse" style={{ animationDuration: '3s' }} />
        <span className="absolute -inset-2 rounded-full bg-[#25D366]/10 blur-lg" />

        <svg viewBox="0 0 32 32" className="relative z-10 w-6 h-6 fill-white" aria-hidden>
          <path d="M16.004 0h-.008C7.174 0 0 7.176 0 16c0 3.5 1.128 6.744 3.046 9.378L1.054 31.29l6.118-1.958A15.923 15.923 0 0016.004 32C24.826 32 32 24.822 32 16S24.826 0 16.004 0zm9.335 22.594c-.39 1.1-1.932 2.014-3.164 2.28-.844.18-1.946.322-5.66-1.216-4.752-1.966-7.806-6.778-8.04-7.094-.226-.316-1.892-2.52-1.892-4.808 0-2.288 1.198-3.412 1.624-3.878.39-.426.918-.606 1.224-.606.15 0 .316.008.466.014.426.018.64.044.92.712.352.84 1.21 2.946 1.316 3.162.108.216.216.502.072.788-.136.294-.256.476-.472.732-.216.256-.422.452-.638.728-.196.242-.418.502-.172.928.246.418 1.094 1.804 2.35 2.922 1.618 1.44 2.98 1.888 3.404 2.098.426.21.674.176.92-.106.254-.294 1.088-1.264 1.378-1.698.284-.426.574-.356.964-.214.394.142 2.494 1.176 2.92 1.39.426.216.71.322.816.502.104.178.104 1.04-.286 2.14z" />
        </svg>
      </motion.a>
    </div>
  );
});

WhatsAppFloat.displayName = "WhatsAppFloat";

export default WhatsAppFloat;
