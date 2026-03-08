import { motion } from "framer-motion";
import { type LucideIcon } from "lucide-react";

interface ContactInfoCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  href?: string;
  index: number;
}

const ContactInfoCard = ({ icon: Icon, label, value, href, index }: ContactInfoCardProps) => {
  const Wrapper = href ? "a" : "div";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.08 }}
    >
      <Wrapper
        {...(href ? { href, target: href.startsWith("http") ? "_blank" : undefined, rel: href.startsWith("http") ? "noopener noreferrer" : undefined } : {})}
        className="flex items-center gap-3.5 bg-card border border-border rounded-xl p-4 transition-all duration-300 hover:border-primary/30 hover:shadow-[0_4px_20px_hsl(355_90%_48%/0.06)] group block"
      >
        <div className="w-11 h-11 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors group-hover:bg-primary/15">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground font-medium">{label}</div>
          <div className="font-bold text-sm text-card-foreground truncate">{value}</div>
        </div>
      </Wrapper>
    </motion.div>
  );
};

export default ContactInfoCard;
