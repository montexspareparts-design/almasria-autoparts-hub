import { MessageCircle } from "lucide-react";
import { motion } from "framer-motion";

const WhatsAppFloat = () => {
  return (
    <motion.a
      href="https://wa.me/201153961008"
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-4 left-4 md:bottom-6 md:left-6 z-50 flex items-center gap-2 bg-[#25D366] hover:bg-[#1ebe57] text-white rounded-full shadow-[0_4px_15px_rgba(37,211,102,0.4)] hover:shadow-[0_6px_25px_rgba(37,211,102,0.6)] transition-shadow group"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 1, type: "spring", stiffness: 200 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      aria-label="تواصل معنا عبر واتساب"
    >
      <div className="w-14 h-14 flex items-center justify-center">
        <svg viewBox="0 0 32 32" className="w-7 h-7 fill-white">
          <path d="M16.004 0h-.008C7.174 0 0 7.176 0 16c0 3.5 1.128 6.744 3.046 9.378L1.054 31.29l6.118-1.958A15.923 15.923 0 0016.004 32C24.826 32 32 24.822 32 16S24.826 0 16.004 0zm9.335 22.594c-.39 1.1-1.932 2.014-3.164 2.28-.844.18-1.946.322-5.66-1.216-4.752-1.966-7.806-6.778-8.04-7.094-.226-.316-1.892-2.52-1.892-4.808 0-2.288 1.198-3.412 1.624-3.878.39-.426.918-.606 1.224-.606.15 0 .316.008.466.014.426.018.64.044.92.712.352.84 1.21 2.946 1.316 3.162.108.216.216.502.072.788-.136.294-.256.476-.472.732-.216.256-.422.452-.638.728-.196.242-.418.502-.172.928.246.418 1.094 1.804 2.35 2.922 1.618 1.44 2.98 1.888 3.404 2.098.426.21.674.176.92-.106.254-.294 1.088-1.264 1.378-1.698.284-.426.574-.356.964-.214.394.142 2.494 1.176 2.92 1.39.426.216.71.322.816.502.104.178.104 1.04-.286 2.14z" />
        </svg>
      </div>
      <span className="max-w-0 overflow-hidden group-hover:max-w-[120px] transition-all duration-300 text-sm font-bold whitespace-nowrap pr-4">
        تواصل معنا
      </span>
    </motion.a>
  );
};

export default WhatsAppFloat;
