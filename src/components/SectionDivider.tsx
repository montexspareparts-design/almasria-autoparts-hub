import { motion } from "framer-motion";
import { Cog } from "lucide-react";

/**
 * Automotive-themed section divider with animated gear icon
 * Use between homepage sections for visual continuity
 */
const SectionDivider = ({ variant = "light" }: { variant?: "light" | "dark" }) => {
  const lineColor = variant === "dark" ? "bg-secondary-foreground/10" : "bg-border";
  const gearColor = variant === "dark" ? "text-primary/30" : "text-primary/20";
  const bgColor = variant === "dark" ? "bg-secondary" : "bg-background";

  return (
    <div className={`relative py-0 ${bgColor}`}>
      <div className="container mx-auto px-4 flex items-center gap-4">
        <motion.div
          className={`flex-1 h-px ${lineColor}`}
          initial={{ scaleX: 0, originX: 1 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        />
        <motion.div
          initial={{ opacity: 0, rotate: -90, scale: 0.5 }}
          whileInView={{ opacity: 1, rotate: 0, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3, type: "spring", stiffness: 120 }}
        >
          <Cog className={`w-5 h-5 ${gearColor}`} strokeWidth={1.2} />
        </motion.div>
        <motion.div
          className={`flex-1 h-px ${lineColor}`}
          initial={{ scaleX: 0, originX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
    </div>
  );
};

export default SectionDivider;
