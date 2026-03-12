import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import {
  Loader2, Package, Clock, Truck, CheckCircle, XCircle, Eye,
  ShoppingBag, DollarSign, MapPin, Phone, Mail, ChevronDown, ChevronUp,
  FileText
} from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Order = Database["public"]["Tables"]["orders"]["Row"];
type OrderItem = Database["public"]["Tables"]["order_items"]["Row"];

interface OrderWithItems extends Order {
  items?: (OrderItem & { product?: { name_ar: string; sku: string; image_url: string | null } })[];
  profile?: { full_name: string | null; phone: string | null; email: string | null };
}

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: typeof Clock }> = {
  pending: { label: "قيد الانتظار", color: "text-yellow-500", bg: "bg-yellow-500/10", icon: Clock },
  confirmed: { label: "تم التأكيد", color: "text-blue-500", bg: "bg-blue-500/10", icon: CheckCircle },
  processing: { label: "جاري التجهيز", color: "text-orange-500", bg: "bg-orange-500/10", icon: Package },
  shipped: { label: "تم الشحن", color: "text-purple-500", bg: "bg-purple-500/10", icon: Truck },
  delivered: { label: "تم التسليم", color: "text-green-500", bg: "bg-green-500/10", icon: CheckCircle },
  cancelled: { label: "ملغي", color: "text-destructive", bg: "bg-destructive/10", icon: XCircle },
};

const statusFlow = ["pending", "confirmed", "processing", "shipped", "delivered"];

const AdminOrders = () => {
  const { toast } = useToast();
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    const { data: ordersData, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (error || !ordersData) {
      setLoading(false);
      return;
    }

    // Fetch items and profiles for each order
    const enriched: OrderWithItems[] = await Promise.all(
      ordersData.map(async (order) => {
        const [itemsRes, profileRes] = await Promise.all([
          supabase
            .from("order_items")
            .select("*, product:products(name_ar, sku, image_url)")
            .eq("order_id", order.id),
          supabase
            .from("profiles")
            .select("full_name, phone, email")
            .eq("user_id", order.user_id)
            .maybeSingle(),
        ]);

        return {
          ...order,
          items: (itemsRes.data as any) || [],
          profile: profileRes.data || undefined,
        };
      })
    );

    setOrders(enriched);
    setLoading(false);
  };

  const statusNotificationMessages: Record<string, { title: string; message: string }> = {
    confirmed: { title: "✅ تم تأكيد طلبك", message: "تم تأكيد طلبك وسيتم تجهيزه قريباً" },
    processing: { title: "📦 جاري تجهيز طلبك", message: "طلبك قيد التجهيز الآن وسيتم شحنه في أقرب وقت" },
    shipped: { title: "🚚 تم شحن طلبك", message: "تم شحن طلبك! يمكنك متابعة حالته من صفحة طلباتي" },
    delivered: { title: "🎉 تم تسليم طلبك", message: "تم تسليم طلبك بنجاح. شكراً لتعاملك معنا!" },
    cancelled: { title: "❌ تم إلغاء طلبك", message: "تم إلغاء طلبك. تواصل معنا لمزيد من التفاصيل" },
  };

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    setUpdatingStatus(orderId);
    const updateData: any = { status: newStatus };
    if (adminNotes[orderId]) {
      updateData.notes = adminNotes[orderId];
    }

    const { error } = await supabase
      .from("orders")
      .update(updateData)
      .eq("id", orderId);

    if (error) {
      toast({ title: "حدث خطأ أثناء تحديث الحالة", variant: "destructive" });
    } else {
      // Send notification to customer
      const order = orders.find((o) => o.id === orderId);
      const notifData = statusNotificationMessages[newStatus];
      if (order && notifData) {
        const orderNum = order.order_number;
        await supabase.from("notifications").insert({
          user_id: order.user_id,
          title: notifData.title,
          message: `${notifData.message} (رقم الطلب: ${orderNum})`,
          type: "order",
        });
      }

      toast({ title: `تم تحديث حالة الطلب إلى: ${statusConfig[newStatus]?.label || newStatus}` });
      fetchOrders();
    }
    setUpdatingStatus(null);
  };

  const handleCancel = async (orderId: string) => {
    await handleStatusUpdate(orderId, "cancelled");
  };

  const filteredOrders = filterStatus === "all"
    ? orders
    : orders.filter((o) => o.status === filterStatus);

  const stats = {
    total: orders.length,
    pending: orders.filter((o) => o.status === "pending").length,
    processing: orders.filter((o) => ["confirmed", "processing"].includes(o.status)).length,
    shipped: orders.filter((o) => o.status === "shipped").length,
    delivered: orders.filter((o) => o.status === "delivered").length,
    totalRevenue: orders
      .filter((o) => o.status !== "cancelled")
      .reduce((sum, o) => sum + Number(o.total_amount), 0),
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-primary" />
            إدارة الطلبات
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-foreground">{stats.total}</p>
              <p className="text-xs text-muted-foreground">إجمالي</p>
            </div>
            <div className="bg-yellow-500/10 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              <p className="text-xs text-muted-foreground">قيد الانتظار</p>
            </div>
            <div className="bg-orange-500/10 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-orange-600">{stats.processing}</p>
              <p className="text-xs text-muted-foreground">جاري التجهيز</p>
            </div>
            <div className="bg-purple-500/10 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-purple-600">{stats.shipped}</p>
              <p className="text-xs text-muted-foreground">تم الشحن</p>
            </div>
            <div className="bg-green-500/10 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-green-600">{stats.delivered}</p>
              <p className="text-xs text-muted-foreground">تم التسليم</p>
            </div>
            <div className="bg-primary/10 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-primary">{stats.totalRevenue.toLocaleString("ar-EG")}</p>
              <p className="text-xs text-muted-foreground">الإيرادات (ج.م)</p>
            </div>
          </div>

          {/* Filter */}
          <div className="flex items-center gap-3 mb-4">
            <span className="text-sm text-muted-foreground">فلتر:</span>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الطلبات</SelectItem>
                {Object.entries(statusConfig).map(([key, val]) => (
                  <SelectItem key={key} value={key}>{val.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground mr-auto">
              {filteredOrders.length} طلب
            </span>
          </div>

          {/* Orders List */}
          {filteredOrders.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">لا توجد طلبات</p>
          ) : (
            <div className="space-y-3">
              {filteredOrders.map((order) => {
                const status = statusConfig[order.status] || statusConfig.pending;
                const StatusIcon = status.icon;
                const isExpanded = expandedOrder === order.id;

                return (
                  <div key={order.id} className="border border-border rounded-xl overflow-hidden transition-all">
                    {/* Order Header */}
                    <div
                      className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                      onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                    >
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className={`p-2 rounded-lg ${status.bg}`}>
                          <StatusIcon className={`w-5 h-5 ${status.color}`} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-foreground">#{order.order_number}</span>
                            <Badge variant="outline" className={`${status.color} ${status.bg} border-0 text-xs`}>
                              {status.label}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                            <span>{order.profile?.full_name || "عميل"}</span>
                            <span>•</span>
                            <span>{new Date(order.created_at).toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                            <span>•</span>
                            <span className="font-semibold text-foreground">{Number(order.total_amount).toLocaleString("ar-EG")} ج.م</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground hidden md:inline">
                          {order.items?.length || 0} منتج
                        </span>
                        {isExpanded ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="border-t border-border bg-muted/20 p-4 space-y-4">
                        {/* Customer Info */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {order.profile?.phone && (
                            <div className="flex items-center gap-2 text-sm">
                              <Phone className="w-4 h-4 text-muted-foreground" />
                              <span dir="ltr">{order.profile.phone}</span>
                            </div>
                          )}
                          {order.profile?.email && (
                            <div className="flex items-center gap-2 text-sm">
                              <Mail className="w-4 h-4 text-muted-foreground" />
                              <span dir="ltr" className="truncate">{order.profile.email}</span>
                            </div>
                          )}
                          {order.shipping_governorate && (
                            <div className="flex items-center gap-2 text-sm">
                              <MapPin className="w-4 h-4 text-muted-foreground" />
                              <span>{order.shipping_governorate}</span>
                            </div>
                          )}
                        </div>

                        {order.shipping_address && (
                          <div className="text-sm bg-background rounded-lg p-3">
                            <span className="text-muted-foreground">العنوان: </span>
                            <span className="text-foreground">{order.shipping_address}</span>
                          </div>
                        )}

                        {order.payment_method && (
                          <div className="text-sm">
                            <span className="text-muted-foreground">طريقة الدفع: </span>
                            <span className="font-medium text-foreground">{order.payment_method}</span>
                          </div>
                        )}

                        {/* Order Items */}
                        <div>
                          <h4 className="text-sm font-semibold text-foreground mb-2">المنتجات</h4>
                          <div className="bg-background rounded-lg divide-y divide-border overflow-hidden">
                            {order.items?.map((item) => (
                              <div key={item.id} className="flex items-center gap-3 p-3">
                                {item.product?.image_url ? (
                                  <img
                                    src={item.product.image_url}
                                    alt={item.product?.name_ar}
                                    className="w-12 h-12 rounded-lg object-cover bg-muted"
                                  />
                                ) : (
                                  <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                                    <Package className="w-5 h-5 text-muted-foreground" />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-foreground truncate">
                                    {item.product?.name_ar || "منتج محذوف"}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    SKU: {item.product?.sku || "—"}
                                  </p>
                                </div>
                                <div className="text-left">
                                  <p className="text-sm font-semibold text-foreground">
                                    {Number(item.total_price).toLocaleString("ar-EG")} ج.م
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {item.quantity} × {Number(item.unit_price).toLocaleString("ar-EG")}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="flex justify-between items-center mt-2 px-3">
                            <span className="text-sm font-semibold text-foreground">الإجمالي</span>
                            <span className="text-lg font-bold text-primary">
                              {Number(order.total_amount).toLocaleString("ar-EG")} ج.م
                            </span>
                          </div>
                        </div>

                        {/* Admin Notes */}
                        {order.notes && (
                          <div className="text-sm bg-background rounded-lg p-3">
                            <span className="text-muted-foreground flex items-center gap-1 mb-1">
                              <FileText className="w-3.5 h-3.5" /> ملاحظات:
                            </span>
                            <span className="text-foreground">{order.notes}</span>
                          </div>
                        )}

                        {/* Status Update */}
                        {order.status !== "cancelled" && order.status !== "delivered" && (
                          <div className="border-t border-border pt-4 space-y-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium text-foreground">تحديث الحالة:</span>
                              {statusFlow
                                .filter((s) => statusFlow.indexOf(s) > statusFlow.indexOf(order.status))
                                .map((nextStatus) => {
                                  const conf = statusConfig[nextStatus];
                                  return (
                                    <Button
                                      key={nextStatus}
                                      size="sm"
                                      variant="outline"
                                      className={`gap-1.5 ${conf.color}`}
                                      disabled={updatingStatus === order.id}
                                      onClick={() => handleStatusUpdate(order.id, nextStatus)}
                                    >
                                      {updatingStatus === order.id ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                      ) : (
                                        <conf.icon className="w-3.5 h-3.5" />
                                      )}
                                      {conf.label}
                                    </Button>
                                  );
                                })}
                              <Button
                                size="sm"
                                variant="destructive"
                                className="gap-1.5"
                                disabled={updatingStatus === order.id}
                                onClick={() => handleCancel(order.id)}
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                إلغاء
                              </Button>
                            </div>
                            <Textarea
                              placeholder="أضف ملاحظة على الطلب..."
                              value={adminNotes[order.id] || ""}
                              onChange={(e) => setAdminNotes((prev) => ({ ...prev, [order.id]: e.target.value }))}
                              className="text-sm"
                              rows={2}
                            />
                          </div>
                        )}

                        {/* WhatsApp */}
                        {order.profile?.phone && (
                          <div className="border-t border-border pt-3">
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-2 text-green-600 border-green-300 hover:bg-green-50"
                              onClick={() => {
                                const phone = order.profile!.phone!.replace(/^0/, "20").replace(/\D/g, "");
                                const msg = `مرحباً ${order.profile?.full_name || ""}،\nبخصوص طلبك رقم #${order.order_number} من المصرية جروب.\n`;
                                window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, "_blank");
                              }}
                            >
                              💬 تواصل واتساب
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminOrders;
