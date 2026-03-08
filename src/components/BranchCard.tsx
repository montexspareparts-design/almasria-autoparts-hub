import { motion } from "framer-motion";
import { Phone, type LucideIcon } from "lucide-react";

interface BranchCardProps {
  name: string;
  detail: string;
  phones: string[];
  icon: LucideIcon;
  index: number;
}

const BranchCard = ({ name, detail, phones, icon: Icon, index }: BranchCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: 15 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ delay: 0.15 + index * 0.06 }}
      whileHover={{ scale: 1.01 }}
      className="bg-secondary-foreground/8 rounded-xl p-4 transition-all duration-300 hover:bg-secondary-foreground/12 border border-transparent hover:border-primary/10"
    >
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-bold text-secondary-foreground text-sm">{name}</div>
          <div className="text-xs text-secondary-foreground/60 mt-0.5">{detail}</div>
          {phones.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {phones.map((p) => (
                <a
                  key={p}
                  href={`tel:${p}`}
                  className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 bg-primary/10 px-2.5 py-1 rounded-lg transition-colors hover:bg-primary/15 font-medium"
                >
                  <Phone className="w-3 h-3" />
                  {p}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default BranchCard;
