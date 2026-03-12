import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import {
  Loader2, Package, Clock, Truck, CheckCircle, XCircle,
  ShoppingBag, MapPin, Phone, Mail, ChevronDown, ChevronUp,
  FileText, Edit3, Trash2, Save, Plus, Minus, X,
  ChevronRight, ChevronLeft, Search
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
  pending_approval: { label: "بانتظار موافقة العميل", color: "text-orange-500", bg: "bg-orange-500/10", icon: Clock },
  processing: { label: "جاري التجهيز", color: "text-orange-500", bg: "bg-orange-500/10", icon: Package },
  shipped: { label: "تم الشحن", color: "text-purple-500", bg: "bg-purple-500/10", icon: Truck },
  delivered: { label: "تم التسليم", color: "text-green-500", bg: "bg-green-500/10", icon: CheckCircle },
  cancelled: { label: "ملغي", color: "text-destructive", bg: "bg-destructive/10", icon: XCircle },
};

const statusFlow = ["pending", "confirmed", "processing", "shipped", "delivered"];
const PAGE_SIZE = 15;

const AdminOrders = () => {
  const { toast } = useToast();
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});
  const [editingOrder, setEditingOrder] = useState<string | null>(null);
  const [editedItems, setEditedItems] = useState<Record<string, { id: string; quantity: number; unit_price: number; total_price: number; product_id: string; product?: any }[]>>({});
  const [autoExpandFirst, setAutoExpandFirst] = useState(false);
  const ordersListRef = useRef<HTMLDivElement>(null);

  // Stats fetched once
  const [stats, setStats] = useState({ total: 0, pending: 0, processing: 0, shipped: 0, delivered: 0, totalRevenue: 0 });

  const fetchStats = useCallback(async () => {
    const { data } = await supabase.from("orders").select("status, total_amount");
    if (!data) return;
    setStats({
      total: data.length,
      pending: data.filter(o => o.status === "pending").length,
      processing: data.filter(o => ["confirmed", "processing"].includes(o.status)).length,
      shipped: data.filter(o => o.status === "shipped").length,
      delivered: data.filter(o => o.status === "delivered").length,
      totalRevenue: data.filter(o => o.status !== "cancelled").reduce((s, o) => s + Number(o.total_amount), 0),
    });
  }, []);

  const fetchOrders = useCallback(async () => {
    setLoading(true);

    // Single query with order_items join + batch profiles
    let query = supabase
      .from("orders")
      .select("*, order_items(*, product:products(name_ar, sku, image_url))", { count: "exact" })
      .order("created_at", { ascending: false });

    if (filterStatus !== "all") {
      query = query.eq("status", filterStatus);
    }
    if (searchQuery.trim()) {
      query = query.or(`order_number.ilike.%${searchQuery.trim()}%`);
    }

    const { data, count, error } = await query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    console.log("fetchOrders result:", { data, count, error });

    if (error) {
      console.error("fetchOrders error:", error);
      setOrders([]);
      setTotalCount(0);
      setLoading(false);
      return;
    }

    if (!data || data.length === 0) {
      setOrders([]);
      setTotalCount(count || 0);
      setLoading(false);
      return;
    }

    // Batch fetch profiles for this page only (1 query instead of N)
    const userIds = [...new Set(data.map((o: any) => o.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, phone, email")
      .in("user_id", userIds);

    const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

    const enriched: OrderWithItems[] = data.map((order: any) => ({
      ...order,
      items: order.order_items || [],
      profile: profileMap.get(order.user_id) || undefined,
    }));

    setOrders(enriched);
    setTotalCount(count || 0);
    setLoading(false);
  }, [page, filterStatus, searchQuery]);




  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { fetchOrders(); }, [fetchOrders]);
  useEffect(() => { setPage(0); }, [filterStatus, searchQuery]);

  const statusNotificationMessages: Record<string, { title: string; message: string }> = {
    confirmed: { title: "✅ تم تأكيد طلبك", message: "تم تأكيد طلبك وسيتم تجهيزه قريباً" },
    processing: { title: "📦 جاري تجهيز طلبك", message: "طلبك قيد التجهيز الآن وسيتم شحنه في أقرب وقت" },
    shipped: { title: "🚚 تم شحن طلبك", message: "تم شحن طلبك! يمكنك متابعة حالته من صفحة طلباتي" },
    delivered: { title: "🎉 تم تسليم طلبك", message: "تم تسليم طلبك بنجاح. شكراً لتعاملك معنا!" },
    cancelled: { title: "❌ تم إلغاء طلبك", message: "تم إلغاء طلبك. تواصل معنا لمزيد من التفاصيل" },
  };

  const notifyCustomer = async (order: OrderWithItems, title: string, message: string) => {
    await supabase.from("notifications").insert({
      user_id: order.user_id,
      title,
      message: `${message} (رقم الطلب: ${order.order_number})`,
      type: "order",
    });

    const customerPhone = order.profile?.phone;
    if (customerPhone) {
      try {
        await supabase.functions.invoke("notify-order-whatsapp", {
          body: {
            orderNumber: order.order_number,
            newStatus: order.status,
            customerPhone,
            customerName: order.profile?.full_name || "",
            customMessage: `${title}\n${message} (رقم الطلب: ${order.order_number})`,
          },
        });
      } catch (err) {
        console.error("WhatsApp notification failed:", err);
      }
    }
  };

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    setUpdatingStatus(orderId);
    const updateData: any = { status: newStatus };
    if (adminNotes[orderId]) updateData.notes = adminNotes[orderId];

    const { error } = await supabase.from("orders").update(updateData).eq("id", orderId);

    if (error) {
      toast({ title: "حدث خطأ أثناء تحديث الحالة", variant: "destructive" });
    } else {
      const order = orders.find(o => o.id === orderId);
      const notifData = statusNotificationMessages[newStatus];
      if (order && notifData) await notifyCustomer(order, notifData.title, notifData.message);
      toast({ title: `تم تحديث حالة الطلب إلى: ${statusConfig[newStatus]?.label || newStatus}` });
      fetchOrders();
      fetchStats();
    }
    setUpdatingStatus(null);
  };

  const handleCancel = async (orderId: string) => {
    await handleStatusUpdate(orderId, "cancelled");
  };

  // ─── Edit order items ───
  const startEditing = (order: OrderWithItems) => {
    setEditingOrder(order.id);
    setEditedItems({
      [order.id]: (order.items || []).map(item => ({
        id: item.id,
        quantity: item.quantity,
        unit_price: Number(item.unit_price),
        total_price: Number(item.total_price),
        product_id: item.product_id,
        product: item.product,
      })),
    });
  };

  const updateItemQty = (orderId: string, itemId: string, delta: number) => {
    setEditedItems(prev => ({
      ...prev,
      [orderId]: (prev[orderId] || []).map(item => {
        if (item.id !== itemId) return item;
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty, total_price: newQty * item.unit_price };
      }),
    }));
  };

  const removeEditItem = (orderId: string, itemId: string) => {
    setEditedItems(prev => ({
      ...prev,
      [orderId]: (prev[orderId] || []).filter(item => item.id !== itemId),
    }));
  };

  const saveOrderEdits = async (orderId: string) => {
    const items = editedItems[orderId];
    if (!items || items.length === 0) {
      toast({ title: "لا يمكن حفظ طلب فارغ", variant: "destructive" });
      return;
    }

    setUpdatingStatus(orderId);
    const order = orders.find(o => o.id === orderId);

    // Delete removed items
    const originalIds = (order?.items || []).map(i => i.id);
    const editedIds = items.map(i => i.id);
    const removedIds = originalIds.filter(id => !editedIds.includes(id));

    if (removedIds.length > 0) {
      await supabase.from("order_items").delete().in("id", removedIds);
    }

    // Batch update remaining items
    await Promise.all(
      items.map(item =>
        supabase.from("order_items").update({
          quantity: item.quantity,
          total_price: item.total_price,
        }).eq("id", item.id)
      )
    );

    // Recalculate total
    const newTotal = items.reduce((sum, i) => sum + i.total_price, 0);
    await supabase.from("orders").update({ total_amount: newTotal, status: "pending_approval" }).eq("id", orderId);

    // Build detailed change summary for notification
    if (order) {
      const originalItems = order.items || [];
      const changeLines: string[] = [];

      for (const orig of originalItems) {
        const still = items.find(i => i.id === orig.id);
        if (!still) {
          changeLines.push(`❌ حذف: ${orig.product?.name_ar || orig.product_id} (${orig.product?.sku || ""})`);
        }
      }

      for (const item of items) {
        const orig = originalItems.find(i => i.id === item.id);
        if (orig && orig.quantity !== item.quantity) {
          changeLines.push(`🔄 ${item.product?.name_ar || ""}: الكمية ${orig.quantity} ← ${item.quantity}`);
        }
      }

      const itemsSummary = items.map(i =>
        `• ${i.product?.name_ar || ""} (${i.product?.sku || ""}) — الكمية: ${i.quantity} — ${i.total_price.toLocaleString("ar-EG")} ج.م`
      ).join("\n");

      const detailedMessage = [
        "تم تعديل طلبك وبانتظار موافقتك. التفاصيل المحدثة:",
        "",
        ...(changeLines.length > 0 ? ["التغييرات:", ...changeLines, ""] : []),
        "الأصناف الحالية:",
        itemsSummary,
        "",
        `💰 الإجمالي الجديد: ${newTotal.toLocaleString("ar-EG")} ج.م`,
      ].join("\n");

      await supabase.from("notifications").insert({
        user_id: order.user_id,
        title: "📝 تم تعديل طلبك — يرجى الموافقة أو الرفض",
        message: `[order_edit:${order.id}]\n${detailedMessage}`,
        type: "order_edit",
      });

      const customerPhone = order.profile?.phone;
      if (customerPhone) {
        try {
          await supabase.functions.invoke("notify-order-whatsapp", {
            body: {
              orderNumber: order.order_number,
              newStatus: "pending_approval",
              customerPhone,
              customerName: order.profile?.full_name || "",
              customMessage: `📝 تم تعديل طلبك رقم ${order.order_number}\n${detailedMessage}\n\nيرجى الدخول على حسابك للموافقة أو الرفض.`,
            },
          });
        } catch (err) {
          console.error("WhatsApp notification failed:", err);
        }
      }
    }

    toast({ title: "تم حفظ التعديلات وإبلاغ العميل ✓" });
    setEditingOrder(null);
    setUpdatingStatus(null);
    fetchOrders();
    fetchStats();
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  if (loading && orders.length === 0) {
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

          {/* Filters */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
            <div className="relative flex-1 w-full sm:w-auto">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="بحث برقم الطلب..."
                className="pr-9"
                dir="rtl"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الطلبات</SelectItem>
                {Object.entries(statusConfig).map(([key, val]) => (
                  <SelectItem key={key} value={key}>{val.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">
              {totalCount} طلب
            </span>
          </div>

          {/* Orders List */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : orders.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">لا توجد طلبات</p>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => {
                const status = statusConfig[order.status] || statusConfig.pending;
                const StatusIcon = status.icon;
                const isExpanded = expandedOrder === order.id;
                const isEditing = editingOrder === order.id;
                const canEdit = ["pending", "confirmed", "processing"].includes(order.status);

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
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-semibold text-foreground">المنتجات</h4>
                            {canEdit && !isEditing && (
                              <Button size="sm" variant="outline" className="gap-1 text-xs h-7" onClick={() => startEditing(order)}>
                                <Edit3 className="w-3 h-3" />
                                تعديل الأصناف
                              </Button>
                            )}
                            {isEditing && (
                              <div className="flex gap-2">
                                <Button size="sm" className="gap-1 text-xs h-7" onClick={() => saveOrderEdits(order.id)} disabled={updatingStatus === order.id}>
                                  {updatingStatus === order.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                                  حفظ التعديلات
                                </Button>
                                <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => setEditingOrder(null)}>
                                  <X className="w-3 h-3" />
                                </Button>
                              </div>
                            )}
                          </div>

                          {isEditing ? (
                            <div className="bg-background rounded-lg divide-y divide-border overflow-hidden border border-primary/20">
                              {(editedItems[order.id] || []).map((item) => (
                                <div key={item.id} className="flex items-center gap-3 p-3">
                                  {item.product?.image_url ? (
                                    <img src={item.product.image_url} alt={item.product?.name_ar} className="w-10 h-10 rounded-lg object-cover bg-muted" />
                                  ) : (
                                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                                      <Package className="w-4 h-4 text-muted-foreground" />
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-foreground truncate">{item.product?.name_ar || "منتج"}</p>
                                    <p className="text-[10px] text-muted-foreground">{item.product?.sku}</p>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Button size="icon" variant="outline" className="w-7 h-7" onClick={() => updateItemQty(order.id, item.id, -1)}>
                                      <Minus className="w-3 h-3" />
                                    </Button>
                                    <span className="w-8 text-center text-sm font-bold">{item.quantity}</span>
                                    <Button size="icon" variant="outline" className="w-7 h-7" onClick={() => updateItemQty(order.id, item.id, 1)}>
                                      <Plus className="w-3 h-3" />
                                    </Button>
                                  </div>
                                  <span className="text-sm font-semibold text-foreground w-20 text-left">
                                    {item.total_price.toLocaleString("ar-EG")} ج.م
                                  </span>
                                  <Button size="icon" variant="ghost" className="w-7 h-7 text-destructive hover:bg-destructive/10" onClick={() => removeEditItem(order.id, item.id)}>
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                              ))}
                              <div className="flex justify-between items-center p-3 bg-primary/5">
                                <span className="text-sm font-bold">الإجمالي الجديد</span>
                                <span className="text-lg font-bold text-primary">
                                  {(editedItems[order.id] || []).reduce((s, i) => s + i.total_price, 0).toLocaleString("ar-EG")} ج.م
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="bg-background rounded-lg divide-y divide-border overflow-hidden">
                              {order.items?.map((item) => (
                                <div key={item.id} className="flex items-center gap-3 p-3">
                                  {item.product?.image_url ? (
                                    <img src={item.product.image_url} alt={item.product?.name_ar} className="w-12 h-12 rounded-lg object-cover bg-muted" />
                                  ) : (
                                    <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                                      <Package className="w-5 h-5 text-muted-foreground" />
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-foreground truncate">{item.product?.name_ar || "منتج محذوف"}</p>
                                    <p className="text-xs text-muted-foreground">SKU: {item.product?.sku || "—"}</p>
                                  </div>
                                  <div className="text-left">
                                    <p className="text-sm font-semibold text-foreground">{Number(item.total_price).toLocaleString("ar-EG")} ج.م</p>
                                    <p className="text-xs text-muted-foreground">{item.quantity} × {Number(item.unit_price).toLocaleString("ar-EG")}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {!isEditing && (
                            <div className="flex justify-between items-center mt-2 px-3">
                              <span className="text-sm font-semibold text-foreground">الإجمالي</span>
                              <span className="text-lg font-bold text-primary">
                                {Number(order.total_amount).toLocaleString("ar-EG")} ج.م
                              </span>
                            </div>
                          )}
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
                                .filter(s => statusFlow.indexOf(s) > statusFlow.indexOf(order.status))
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
                              onChange={(e) => setAdminNotes(prev => ({ ...prev, [order.id]: e.target.value }))}
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-4">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                <ChevronRight className="w-4 h-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                {page + 1} / {totalPages}
              </span>
              <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminOrders;
