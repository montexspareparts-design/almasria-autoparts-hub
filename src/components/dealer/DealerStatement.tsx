import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Receipt, TrendingUp, TrendingDown, Calendar, FileText,
  Download, Filter, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Order {
  id: string;
  order_number: string;
  status: string;
  total_amount: number;
  created_at: string;
  invoice_url: string | null;
}

const DealerStatement = ({ userId }: { userId: string }) => {
  const { dealerAccount } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterPeriod, setFilterPeriod] = useState<"all" | "month" | "3months" | "6months">("all");

  useEffect(() => {
    fetchOrders();
  }, [userId]);

  const fetchOrders = async () => {
    const { data } = await supabase
      .from("orders")
      .select("id, order_number, status, total_amount, created_at, invoice_url")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    setOrders(data || []);
    setLoading(false);
  };

  const filteredOrders = orders.filter(o => {
    if (filterPeriod === "all") return true;
    const date = new Date(o.created_at);
    const now = new Date();
    const months = filterPeriod === "month" ? 1 : filterPeriod === "3months" ? 3 : 6;
    const cutoff = new Date(now.getFullYear(), now.getMonth() - months, now.getDate());
    return date >= cutoff;
  });

  const delivered = filteredOrders.filter(o => o.status === "delivered");
  const pending = filteredOrders.filter(o => !["delivered", "cancelled"].includes(o.status));
  const cancelled = filteredOrders.filter(o => o.status === "cancelled");

  const totalPurchases = delivered.reduce((s, o) => s + Number(o.total_amount), 0);
  const pendingAmount = pending.reduce((s, o) => s + Number(o.total_amount), 0);
  const cancelledAmount = cancelled.reduce((s, o) => s + Number(o.total_amount), 0);
  const creditLimit = Number((dealerAccount as any)?.credit_limit || 0);
  const availableCredit = Math.max(0, creditLimit - pendingAmount);

  const periods = [
    { key: "all", label: "الكل" },
    { key: "month", label: "شهر" },
    { key: "3months", label: "3 أشهر" },
    { key: "6months", label: "6 أشهر" },
  ] as const;

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">كشف الحساب</h2>
        <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
          {periods.map(p => (
            <button
              key={p.key}
              onClick={() => setFilterPeriod(p.key)}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                filterPeriod === p.key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-green-600" />
            </div>
          </div>
          <p className="text-xl font-bold text-foreground">{totalPurchases.toLocaleString("ar-EG")}</p>
          <p className="text-[11px] text-muted-foreground">ج.م — إجمالي المشتريات</p>
          <p className="text-[10px] text-muted-foreground/60">{delivered.length} طلب مكتمل</p>
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Receipt className="w-4 h-4 text-amber-600" />
            </div>
          </div>
          <p className="text-xl font-bold text-foreground">{pendingAmount.toLocaleString("ar-EG")}</p>
          <p className="text-[11px] text-muted-foreground">ج.م — طلبات معلقة</p>
          <p className="text-[10px] text-muted-foreground/60">{pending.length} طلب قيد التنفيذ</p>
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileText className="w-4 h-4 text-primary" />
            </div>
          </div>
          <p className="text-xl font-bold text-foreground">{creditLimit > 0 ? creditLimit.toLocaleString("ar-EG") : "—"}</p>
          <p className="text-[11px] text-muted-foreground">ج.م — حد الائتمان</p>
          <p className="text-[10px] text-muted-foreground/60">{creditLimit > 0 ? `متاح: ${availableCredit.toLocaleString("ar-EG")} ج.م` : "غير محدد"}</p>
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center">
              <TrendingDown className="w-4 h-4 text-destructive" />
            </div>
          </div>
          <p className="text-xl font-bold text-foreground">{cancelledAmount.toLocaleString("ar-EG")}</p>
          <p className="text-[11px] text-muted-foreground">ج.م — طلبات ملغاة</p>
          <p className="text-[10px] text-muted-foreground/60">{cancelled.length} طلب</p>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="p-3 border-b border-border flex items-center justify-between">
          <span className="text-sm font-bold text-foreground">سجل الحركات ({filteredOrders.length})</span>
        </div>

        {filteredOrders.length === 0 ? (
          <div className="p-10 text-center">
            <Receipt className="w-10 h-10 mx-auto text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">لا توجد حركات في هذه الفترة</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredOrders.map(order => {
              const statusLabels: Record<string, { text: string; color: string }> = {
                pending: { text: "قيد المراجعة", color: "text-amber-600 bg-amber-500/10" },
                confirmed: { text: "تم التأكيد", color: "text-blue-600 bg-blue-500/10" },
                processing: { text: "جاري التجهيز", color: "text-orange-600 bg-orange-500/10" },
                shipped: { text: "تم الشحن", color: "text-purple-600 bg-purple-500/10" },
                delivered: { text: "تم التسليم", color: "text-green-600 bg-green-500/10" },
                cancelled: { text: "ملغي", color: "text-destructive bg-destructive/10" },
              };
              const st = statusLabels[order.status] || statusLabels.pending;

              return (
                <div key={order.id} className="flex items-center gap-3 p-3 hover:bg-muted/30 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground">{order.order_number}</p>
                      <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full", st.color)}>{st.text}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {new Date(order.created_at).toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric" })}
                    </p>
                  </div>
                  <div className="text-start shrink-0">
                    <p className={cn("text-sm font-bold", order.status === "cancelled" ? "text-muted-foreground line-through" : "text-foreground")}>
                      {Number(order.total_amount).toLocaleString("ar-EG")} ج.م
                    </p>
                  </div>
                  {order.invoice_url && (
                    <a href={order.invoice_url} target="_blank" rel="noreferrer" className="shrink-0">
                      <Button variant="ghost" size="icon" className="w-7 h-7">
                        <Download className="w-3.5 h-3.5 text-primary" />
                      </Button>
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default DealerStatement;
