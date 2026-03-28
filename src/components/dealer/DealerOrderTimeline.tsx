import { motion } from "framer-motion";
import { CheckCircle2, Clock, Package, Truck, CreditCard, ClipboardCheck, CircleDot } from "lucide-react";

interface Props {
  status: string;
  isRTL?: boolean;
  compact?: boolean;
}

const steps = [
  { key: "pending", icon: Clock, label: "تم الاستلام", labelEn: "Received" },
  { key: "confirmed", icon: ClipboardCheck, label: "تمت الموافقة", labelEn: "Confirmed" },
  { key: "awaiting_payment", icon: CreditCard, label: "بانتظار الدفع", labelEn: "Awaiting Payment" },
  { key: "processing", icon: Package, label: "جاري التجهيز", labelEn: "Processing" },
  { key: "shipped", icon: Truck, label: "تم الشحن", labelEn: "Shipped" },
  { key: "delivered", icon: CheckCircle2, label: "تم التسليم", labelEn: "Delivered" },
];

const statusOrder: Record<string, number> = {
  pending: 0,
  confirmed: 1,
  awaiting_payment: 2,
  processing: 3,
  ready: 4,
  shipped: 4,
  delivered: 5,
  cancelled: -1,
};

const DealerOrderTimeline = ({ status, isRTL = true, compact = false }: Props) => {
  const currentIndex = statusOrder[status] ?? 0;
  const isCancelled = status === "cancelled";

  if (isCancelled) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-destructive/5 rounded-xl border border-destructive/10">
        <CircleDot className="w-4 h-4 text-destructive" />
        <span className="text-xs font-bold text-destructive">{isRTL ? "تم إلغاء الطلب" : "Order Cancelled"}</span>
      </div>
    );
  }

  if (compact) {
    // Compact dot-based timeline
    return (
      <div className="flex items-center gap-1.5">
        {steps.map((step, i) => {
          const isCompleted = i <= currentIndex;
          const isCurrent = i === currentIndex;
          return (
            <div key={step.key} className="flex items-center gap-1.5">
              <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: i * 0.08 }}
                className={`relative w-3 h-3 rounded-full transition-all duration-300 ${
                  isCompleted
                    ? isCurrent
                      ? "bg-primary shadow-md shadow-primary/30 ring-4 ring-primary/10"
                      : "bg-primary"
                    : "bg-muted-foreground/15"
                }`}
              >
                {isCurrent && (
                  <span className="absolute inset-0 rounded-full bg-primary/30 animate-ping" />
                )}
              </motion.div>
              {i < steps.length - 1 && (
                <div className={`w-4 h-0.5 rounded-full transition-colors duration-300 ${
                  i < currentIndex ? "bg-primary" : "bg-muted-foreground/10"
                }`} />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // Full timeline
  return (
    <div className="flex items-start justify-between w-full gap-0 px-1">
      {steps.map((step, i) => {
        const isCompleted = i <= currentIndex;
        const isCurrent = i === currentIndex;
        const StepIcon = step.icon;

        return (
          <div key={step.key} className="flex flex-col items-center flex-1 relative">
            {/* Connector line */}
            {i < steps.length - 1 && (
              <div className={`absolute top-4 ${isRTL ? 'right-1/2' : 'left-1/2'} w-full h-0.5 ${
                i < currentIndex ? "bg-primary" : "bg-muted-foreground/10"
              }`} style={{ zIndex: 0 }} />
            )}

            {/* Icon circle */}
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: i * 0.1, type: "spring", stiffness: 400, damping: 20 }}
              className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-500 ${
                isCompleted
                  ? isCurrent
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30 ring-4 ring-primary/10"
                    : "bg-primary/15 text-primary"
                  : "bg-muted text-muted-foreground/30"
              }`}
            >
              <StepIcon className="w-4 h-4" strokeWidth={isCompleted ? 2.5 : 1.5} />
              {isCurrent && (
                <span className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
              )}
            </motion.div>

            {/* Label */}
            <motion.p
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 + 0.1 }}
              className={`text-[9px] mt-1.5 text-center leading-tight font-semibold ${
                isCompleted
                  ? isCurrent ? "text-primary font-bold" : "text-foreground/70"
                  : "text-muted-foreground/30"
              }`}
            >
              {isRTL ? step.label : step.labelEn}
            </motion.p>
          </div>
        );
      })}
    </div>
  );
};

export default DealerOrderTimeline;
