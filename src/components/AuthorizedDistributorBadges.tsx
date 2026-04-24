import { motion } from "framer-motion";
import { BadgeCheck, ShieldCheck, Award, Lock } from "lucide-react";

interface Props {
  variant?: "full" | "compact" | "strip";
  className?: string;
}

/**
 * شارات الموزع المعتمد — تظهر في صفحات الدفع لتعزيز المصداقية
 * variant:
 *  - full: بطاقة كاملة بعنوان وشارات (للسايدبار)
 *  - compact: شريط أفقي صغير (للهيدر/فوق زر الدفع)
 *  - strip: شريط نصي بسيط (للفوتر داخل الفورم)
 */
const AuthorizedDistributorBadges = ({ variant = "full", className = "" }: Props) => {
  const badges = [
    {
      icon: BadgeCheck,
      title: "موزع معتمد رسمي",
      desc: "تويوتا مصر",
      color: "text-primary",
      bg: "bg-primary/10",
      border: "border-primary/30",
    },
    {
      icon: Award,
      title: "المركز الأول",
      desc: "توزيع قطع الغيار الأصلية",
      color: "text-[hsl(var(--gold-accent))]",
      bg: "bg-[hsl(var(--gold-accent))]/10",
      border: "border-[hsl(var(--gold-accent))]/30",
    },
    {
      icon: ShieldCheck,
      title: "ضمان الأصالة",
      desc: "100% قطع أصلية",
      color: "text-emerald-600",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/30",
    },
    {
      icon: Lock,
      title: "دفع آمن",
      desc: "تشفير SSL 256-bit",
      color: "text-blue-600",
      bg: "bg-blue-500/10",
      border: "border-blue-500/30",
    },
  ];

  if (variant === "strip") {
    return (
      <div className={`flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-muted-foreground ${className}`}>
        {badges.map((b) => (
          <div key={b.title} className="flex items-center gap-1.5">
            <b.icon className={`w-3.5 h-3.5 ${b.color}`} />
            <span className="font-semibold">{b.title}</span>
          </div>
        ))}
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div className={`flex flex-wrap items-center justify-center gap-2 ${className}`}>
        {badges.map((b, i) => (
          <motion.div
            key={b.title}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${b.bg} ${b.border} border`}
          >
            <b.icon className={`w-3.5 h-3.5 ${b.color}`} />
            <span className="text-[11px] font-bold text-foreground">{b.title}</span>
          </motion.div>
        ))}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-gradient-to-br from-card to-muted/30 rounded-2xl border border-border p-4 shadow-sm ${className}`}
    >
      <div className="flex items-center gap-2 mb-3 pb-3 border-b border-border">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <BadgeCheck className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h4 className="text-sm font-black text-foreground">اعتمادات وضمانات</h4>
          <p className="text-[10px] text-muted-foreground">تسوّق بكامل الثقة</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {badges.map((b, i) => (
          <motion.div
            key={b.title}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.08 }}
            className={`flex flex-col items-center text-center gap-1 p-2.5 rounded-xl ${b.bg} ${b.border} border`}
          >
            <b.icon className={`w-5 h-5 ${b.color}`} />
            <div>
              <p className="text-[11px] font-black text-foreground leading-tight">{b.title}</p>
              <p className="text-[9px] text-muted-foreground leading-tight mt-0.5">{b.desc}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export default AuthorizedDistributorBadges;
