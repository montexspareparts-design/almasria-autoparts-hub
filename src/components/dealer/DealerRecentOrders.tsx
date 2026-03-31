import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ClipboardList, Clock, CheckCircle, Package, Truck,
  XCircle, Wallet, Loader2, ChevronDown, ChevronUp, ExternalLink
} from "lucide-react";
import { cn } from "@/lib/utils";

interface RecentOrder {
  id: string;
  order_number: string;
  status: string;
  total_amount: number;
  created_at: string;
  payment_method: string | null;
}

const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: "بانتظار المراجعة", color: "bg-amber-500/10 text-amber-700 border-amber-200", icon: Clock },
  confirmed: { label: "تمت الموافقة", color: "bg-blue-500/10 text-blue-700 border-blue-200", icon: CheckCircle },
  awaiting_payment: { label: "بانتظار الدفع", color: "bg-orange-500/10 text-orange-700 border-orange-200", icon: Wallet },
  processing: { label: "جاري التجهيز", color: "bg-violet-500/10 text-violet-700 border-violet-200", icon: Package },
  ready: { label: "جاهز", color: "bg-emerald-500/10 text-emerald-700 border-emerald-200", icon: Truck },
  shipped: { label: "تم الشحن", color: "bg-sky-500/10 text-sky-700 border-sky-200", icon: Truck },
  delivered: { label: "تم التسليم", color: "bg-emerald-500/10 text-emerald-700 border-emerald-200", icon: CheckCircle },
  cancelled: { label: "ملغي", color: "bg-destructive/10 text-destructive border-destructive/20", icon: XCircle },
  pending_approval: { label: "بانتظار موافقتك", color: "bg-amber-500/10 text-amber-700 border-amber-200", icon: Clock },
};

interface DealerRecentOrdersProps {
  onNavigateToOrders: () => void;
  onNavigateToPayment: () => void;
}

const DealerRecentOrders = ({ onNavigateToOrders, onNavigateToPayment }: DealerRecentOrdersProps) => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data } = await supabase
        .from("orders")
        .select("id, order_number, status, total_amount, created_at, payment_method")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);
      setOrders(data || []);
      setLoading(false);
    };
    fetch();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (orders.length === 0) return null;

  const displayOrders = expanded ? orders : orders.slice(0, 3);

  return (
    <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-bold text-foreground">طلباتي الأخيرة</h3>
          <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-md font-medium">
            {orders.length}
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      {/* Orders List */}
      <div className="px-4 pb-3 space-y-2">
        {displayOrders.map((order) => {
          const config = statusConfig[order.status] || statusConfig.pending;
          const StatusIcon = config.icon;
          const timeAgo = getTimeAgo(order.created_at);
          const needsPayment = ["awaiting_payment", "pending"].includes(order.status);

          return (
            <div
              key={order.id}
              className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", config.color.split(" ")[0])}>
                <StatusIcon className={cn("w-4 h-4", config.color.split(" ")[1])} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-foreground font-mono">
                    {order.order_number}
                  </span>
                  <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0 h-4 border", config.color)}>
                    {config.label}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-muted-foreground">{timeAgo}</span>
                  <span className="text-[10px] font-bold text-primary">
                    {order.total_amount.toLocaleString("ar-EG")} ج.م
                  </span>
                </div>
              </div>

              {needsPayment && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-[10px] gap-1 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                  onClick={(e) => {
                    e.stopPropagation();
                    onNavigateToPayment();
                  }}
                >
                  <Wallet className="w-3 h-3" />
                  ادفع
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {/* View All */}
      {orders.length > 3 && (
        <div className="px-4 pb-3">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs text-muted-foreground hover:text-primary gap-1"
            onClick={onNavigateToOrders}
          >
            <ExternalLink className="w-3 h-3" />
            عرض جميع الطلبات
          </Button>
        </div>
      )}
    </div>
  );
};

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "الآن";
  if (mins < 60) return `منذ ${mins} د`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `منذ ${hours} س`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `منذ ${days} يوم`;
  return new Date(dateStr).toLocaleDateString("ar-EG");
}

export default DealerRecentOrders;
