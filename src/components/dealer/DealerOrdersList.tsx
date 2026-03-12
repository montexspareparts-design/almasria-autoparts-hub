import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package, Clock, CheckCircle, Truck, XCircle, ChevronDown, ChevronUp, MessageCircle } from "lucide-react";

interface Order {
  id: string;
  order_number: string;
  status: string;
  total_amount: number;
  created_at: string;
  shipping_address?: string | null;
  shipping_governorate?: string | null;
  payment_method?: string | null;
  notes?: string | null;
}

const statusConfig: Record<string, { label: string; icon: typeof Clock; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "قيد المراجعة", icon: Clock, variant: "secondary" },
  confirmed: { label: "تم التأكيد", icon: CheckCircle, variant: "default" },
  processing: { label: "جاري التجهيز", icon: Package, variant: "default" },
  shipped: { label: "تم الشحن", icon: Truck, variant: "default" },
  delivered: { label: "تم التسليم", icon: CheckCircle, variant: "default" },
  cancelled: { label: "ملغي", icon: XCircle, variant: "destructive" },
};

const DealerOrdersList = ({ userId }: { userId: string }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [orderItems, setOrderItems] = useState<Record<string, any[]>>({});

  useEffect(() => {
    fetchOrders();
  }, [userId]);

  const fetchOrders = async () => {
    const { data } = await supabase
      .from("orders")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    setOrders(data || []);
    setLoading(false);
  };

  const toggleOrder = async (orderId: string) => {
    if (expandedOrder === orderId) {
      setExpandedOrder(null);
      return;
    }
    setExpandedOrder(orderId);
    if (!orderItems[orderId]) {
      const { data } = await supabase
        .from("order_items")
        .select("*, products(name_ar, sku, image_url)")
        .eq("order_id", orderId);
      setOrderItems((prev) => ({ ...prev, [orderId]: data || [] }));
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 rounded-lg bg-muted/50 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">الطلبات ({orders.length})</h2>
      </div>

      {orders.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-10 text-center">
            <Package className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground font-medium">لا توجد طلبات بعد</p>
            <p className="text-xs text-muted-foreground/60 mt-1">ابدأ بتصفح المنتجات وإضافتها للسلة</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const config = statusConfig[order.status] || statusConfig.pending;
            const isExpanded = expandedOrder === order.id;
            const items = orderItems[order.id];

            return (
              <Card key={order.id} className="border-border/50 overflow-hidden">
                <button
                  onClick={() => toggleOrder(order.id)}
                  className="w-full text-right"
                >
                  <CardContent className="p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <config.icon className="w-4 h-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground text-sm truncate">{order.order_number}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(order.created_at).toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric" })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-left">
                        <p className="font-bold text-foreground text-sm">{Number(order.total_amount).toLocaleString("ar-EG")} ج.م</p>
                        <Badge variant={config.variant} className="text-[10px] h-5">
                          {config.label}
                        </Badge>
                      </div>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                    </div>
                  </CardContent>
                </button>

                {isExpanded && (
                  <div className="border-t border-border bg-muted/30 p-4 space-y-3">
                    {order.shipping_governorate && (
                      <p className="text-xs text-muted-foreground">📍 {order.shipping_governorate} — {order.shipping_address}</p>
                    )}
                    {order.payment_method && (
                      <p className="text-xs text-muted-foreground">💳 {order.payment_method}</p>
                    )}

                    {items ? (
                      <div className="space-y-2">
                        {items.map((item: any) => (
                          <div key={item.id} className="flex items-center gap-3 bg-background rounded-lg p-2.5">
                            {item.products?.image_url && (
                              <img src={item.products.image_url} alt="" className="w-10 h-10 rounded object-cover" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-foreground truncate">{item.products?.name_ar}</p>
                              <p className="text-[10px] text-muted-foreground">{item.products?.sku} × {item.quantity}</p>
                            </div>
                            <p className="text-xs font-bold text-foreground shrink-0">{Number(item.total_price).toLocaleString("ar-EG")} ج.م</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="h-8 animate-pulse bg-muted rounded" />
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs"
                      onClick={() => window.open(`https://wa.me/201000000000?text=استفسار عن الطلب رقم ${order.order_number}`, "_blank")}
                    >
                      <MessageCircle className="w-3.5 h-3.5 ml-1.5" />
                      استفسار عن الطلب
                    </Button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DealerOrdersList;
