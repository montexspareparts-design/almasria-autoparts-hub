import { useState, useEffect, useMemo } from "react";
import { openWhatsApp } from "@/lib/native";
import { LazyImage } from "@/components/ui/lazy-image";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Package, Clock, CheckCircle, Truck, XCircle, ChevronDown, ChevronUp,
  MessageCircle, Inbox, PackageCheck, Trash2, Pencil, Save, X, Loader2,
  AlertTriangle, Wallet, CreditCard, RefreshCw, RotateCcw, Search, Filter
} from "lucide-react";
import PaymentInstructionsBanner from "@/components/PaymentInstructionsBanner";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { useDealerCart } from "@/hooks/useDealerCart";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger
} from "@/components/ui/alert-dialog";

interface Order {
  id: string;
  order_number: string;
  erp_order_code?: string | null;
  status: string;
  total_amount: number;
  created_at: string;
  shipping_address?: string | null;
  shipping_governorate?: string | null;
  payment_method?: string | null;
  notes?: string | null;
  tracking_number?: string | null;
  shipping_company?: string | null;
  shipped_at?: string | null;
  delivered_at?: string | null;
  pickup_branch?: string | null;
}

const BRANCH_LABELS: Record<string, string> = {
  ossim: "أوسيم",
  luxor: "الأقصر",
  tawfiqia: "التوفيقية",
};

interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  products: {
    name_ar: string;
    sku: string;
    image_url: string | null;
  } | null;
}

const isElectronicPayment = (method?: string | null) =>
  !!method && ["instapay", "wallet", "bank_transfer"].includes(method);

const orderStages = [
  { key: "pending", label: "تم استلام الطلب", icon: Inbox },
  { key: "confirmed", label: "تمت الموافقة", icon: CheckCircle },
  { key: "awaiting_payment", label: "بانتظار الدفع", icon: Wallet },
  { key: "processing", label: "جاري التجهيز", icon: Package },
  { key: "ready", label: "جاهز للاستلام", icon: PackageCheck },
  { key: "delivered", label: "تم التسليم", icon: CheckCircle },
];

const getVisibleStages = (_paymentMethod?: string | null) => {
  // Always show awaiting_payment stage since admin routes all orders through it
  return orderStages;
};

const stageIndex = (status: string, paymentMethod?: string | null) => {
  if (status === "cancelled") return -1;
  const stages = getVisibleStages(paymentMethod);
  // Map statuses to stage keys
  const statusToKey: Record<string, string> = {
    pending: "pending",
    confirmed: "confirmed",
    awaiting_payment: "awaiting_payment",
    pending_approval: "confirmed", // admin modified → stays at confirmed level
    processing: "processing",
    ready: "ready",
    delivered: "delivered",
  };
  const key = statusToKey[status] ?? "pending";
  const idx = stages.findIndex(s => s.key === key);
  return idx >= 0 ? idx : 0;
};

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "تم استلام الطلب", variant: "secondary" },
  confirmed: { label: "تمت الموافقة", variant: "default" },
  awaiting_payment: { label: "بانتظار الدفع", variant: "outline" },
  pending_approval: { label: "بانتظار موافقتك", variant: "outline" },
  processing: { label: "جاري التجهيز", variant: "default" },
  ready: { label: "جاهز للاستلام", variant: "default" },
  delivered: { label: "تم التسليم", variant: "default" },
  cancelled: { label: "ملغي", variant: "destructive" },
};

const canEdit = (status: string) => status === "pending" || status === "confirmed";

/** Send notification to all admins about order modification */
const notifyAdmins = async (orderNumber: string, action: string, details: string) => {
  const { data: adminRoles } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("role", "admin");

  if (adminRoles && adminRoles.length > 0) {
    const notifications = adminRoles.map(admin => ({
      user_id: admin.user_id,
      title: `تعديل على الطلب ${orderNumber}`,
      message: `${action}: ${details}`,
      type: "warning",
    }));
    await supabase.from("notifications").insert(notifications);
  }
};

const DealerOrdersList = ({ userId, onNavigateToPayment }: { userId: string; onNavigateToPayment?: (orderInfo?: { id: string; orderNumber: string; amount: number }) => void }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [orderItems, setOrderItems] = useState<Record<string, OrderItem[]>>({});
  const [editingOrder, setEditingOrder] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState("");
  const [editQuantities, setEditQuantities] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const [reordering, setReordering] = useState<string | null>(null);
  const [paymobLoading, setPaymobLoading] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const { addItem } = useDealerCart();

  const handlePaymob = async (order: Order) => {
    setPaymobLoading(order.id);
    try {
      const { buildPaymobReturnUrl, ensureActiveSession } = await import("@/lib/paymob");
      await ensureActiveSession();

      const { data, error } = await supabase.functions.invoke("create-payment", {
        body: { order_id: order.id, return_url: buildPaymobReturnUrl() },
      });
      if (error || !data?.iframe_url) {
        toast({ title: "حدث خطأ في بوابة الدفع", description: data?.error || "يرجى المحاولة مرة أخرى", variant: "destructive" });
        return;
      }
      // Redirect externally — Paymob blocks iframe embedding
      window.location.href = data.iframe_url;
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "حدث خطأ غير متوقع";
      toast({ title: "حدث خطأ", description: message, variant: "destructive" });
    } finally {
      setPaymobLoading(null);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [userId]);

  const fetchOrders = async () => {
    const { data } = await supabase
      .from("orders")
      .select("*")
      .eq("user_id", userId)
      .neq("status", "cancelled")
      .order("created_at", { ascending: false });
    const ordersList = data || [];
    setOrders(ordersList);
    // Auto-expand first active order to show timeline
    const firstActive = ordersList.find((o: Order) => !["delivered", "cancelled"].includes(o.status));
    if (firstActive && !expandedOrder) {
      setExpandedOrder(firstActive.id);
      // Pre-fetch items
      const { data: items } = await supabase
        .from("order_items")
        .select("*, products(name_ar, sku, image_url)")
        .eq("order_id", firstActive.id);
      setOrderItems(prev => ({ ...prev, [firstActive.id]: (items as OrderItem[]) || [] }));
    }
    setLoading(false);
  };

  const toggleOrder = async (orderId: string) => {
    if (expandedOrder === orderId) { setExpandedOrder(null); setEditingOrder(null); return; }
    setExpandedOrder(orderId);
    setEditingOrder(null);
    if (!orderItems[orderId]) {
      const { data } = await supabase
        .from("order_items")
        .select("*, products(name_ar, sku, image_url)")
        .eq("order_id", orderId);
      setOrderItems(prev => ({ ...prev, [orderId]: (data as OrderItem[]) || [] }));
    }
  };

  const startEditing = (order: Order) => {
    setEditingOrder(order.id);
    setEditNotes(order.notes || "");
    const items = orderItems[order.id] || [];
    const qtys: Record<string, number> = {};
    items.forEach(i => { qtys[i.id] = i.quantity; });
    setEditQuantities(qtys);
  };

  const cancelEditing = () => {
    setEditingOrder(null);
    setEditNotes("");
    setEditQuantities({});
  };

  const saveEdits = async (order: Order) => {
    setSaving(true);
    const items = orderItems[order.id] || [];
    const changes: string[] = [];

    // Update quantities
    for (const item of items) {
      const newQty = editQuantities[item.id];
      if (newQty !== undefined && newQty !== item.quantity) {
        const newTotal = item.unit_price * newQty;
        await supabase.from("order_items")
          .update({ quantity: newQty, total_price: newTotal })
          .eq("id", item.id);
        changes.push(`تغيير كمية "${item.products?.name_ar}" من ${item.quantity} إلى ${newQty}`);
      }
    }

    // Update notes
    if (editNotes !== (order.notes || "")) {
      changes.push(editNotes ? `إضافة ملاحظات: "${editNotes}"` : "إزالة الملاحظات");
    }

    // Recalculate total
    const updatedItems = items.map(i => ({
      ...i,
      quantity: editQuantities[i.id] ?? i.quantity,
      total_price: i.unit_price * (editQuantities[i.id] ?? i.quantity),
    }));
    const newTotal = updatedItems.reduce((sum, i) => sum + i.total_price, 0);

    await supabase.from("orders")
      .update({ total_amount: newTotal, notes: editNotes || null })
      .eq("id", order.id);

    // Notify admins
    if (changes.length > 0) {
      await notifyAdmins(order.order_number, "تعديل الطلب", changes.join(" | "));
    }

    // Refresh data
    setOrderItems(prev => ({ ...prev, [order.id]: updatedItems }));
    setOrders(prev => prev.map(o => o.id === order.id ? { ...o, total_amount: newTotal, notes: editNotes || null } : o));
    setEditingOrder(null);
    setSaving(false);
    toast({ title: "تم التحديث ✓", description: "تم تعديل الطلب وإبلاغ الإدارة" });
  };

  const removeItem = async (order: Order, itemId: string) => {
    setSaving(true);
    const items = orderItems[order.id] || [];
    const removedItem = items.find(i => i.id === itemId);

    if (items.length <= 1) {
      toast({ title: "لا يمكن حذف آخر صنف", description: "يمكنك إلغاء الطلب بالكامل بدلاً من ذلك", variant: "destructive" });
      setSaving(false);
      return;
    }

    await supabase.from("order_items").delete().eq("id", itemId);

    const remaining = items.filter(i => i.id !== itemId);
    const newTotal = remaining.reduce((sum, i) => sum + i.total_price, 0);
    await supabase.from("orders").update({ total_amount: newTotal }).eq("id", order.id);

    // Notify admins
    await notifyAdmins(
      order.order_number,
      "حذف صنف من الطلب",
      `تم حذف "${removedItem?.products?.name_ar}" (${removedItem?.products?.sku})`
    );

    setOrderItems(prev => ({ ...prev, [order.id]: remaining }));
    setOrders(prev => prev.map(o => o.id === order.id ? { ...o, total_amount: newTotal } : o));
    setSaving(false);
    toast({ title: "تم الحذف ✓", description: "تم حذف الصنف وإبلاغ الإدارة" });
  };

  const cancelOrder = async (order: Order) => {
    setSaving(true);
    await supabase.from("orders")
      .update({ status: "cancelled" })
      .eq("id", order.id);

    await notifyAdmins(
      order.order_number,
      "إلغاء الطلب",
      `قام التاجر بإلغاء الطلب بقيمة ${Number(order.total_amount).toLocaleString("ar-EG")} ج.م`
    );

    setOrders(prev => prev.filter(o => o.id !== order.id));
    setEditingOrder(null);
    setSaving(false);
    toast({ title: "تم إلغاء الطلب", description: "تم إبلاغ الإدارة بالإلغاء" });
  };

  const statusFilterTabs = useMemo(() => {
    const counts: Record<string, number> = { all: orders.length };
    orders.forEach(o => { counts[o.status] = (counts[o.status] || 0) + 1; });
    return [
      { key: "all", label: "الكل", icon: Package, count: counts.all },
      { key: "pending", label: "جديد", icon: Inbox, count: counts.pending || 0 },
      { key: "confirmed", label: "موافق عليه", icon: CheckCircle, count: counts.confirmed || 0 },
      { key: "awaiting_payment", label: "بانتظار الدفع", icon: Wallet, count: counts.awaiting_payment || 0 },
      { key: "processing", label: "قيد التجهيز", icon: Package, count: counts.processing || 0 },
      { key: "ready", label: "جاهز", icon: PackageCheck, count: counts.ready || 0 },
      { key: "shipped", label: "تم الشحن", icon: Truck, count: counts.shipped || 0 },
      { key: "delivered", label: "تم التسليم", icon: CheckCircle, count: counts.delivered || 0 },
    ].filter(t => t.key === "all" || t.count > 0);
  }, [orders]);

  const filteredOrders = useMemo(() => {
    let result = orders;
    if (statusFilter !== "all") {
      result = result.filter(o => o.status === statusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(o =>
        o.order_number.toLowerCase().includes(q) ||
        o.erp_order_code?.toLowerCase().includes(q) ||
        o.notes?.toLowerCase().includes(q) ||
        o.total_amount?.toString().includes(q)
      );
    }
    return result;
  }, [orders, statusFilter, searchQuery]);

  const kpis = useMemo(() => {
    const active = orders.filter(o => !["delivered", "cancelled"].includes(o.status));
    const activeTotal = active.reduce((s, o) => s + Number(o.total_amount), 0);
    const delivered = orders.filter(o => o.status === "delivered");
    const deliveredTotal = delivered.reduce((s, o) => s + Number(o.total_amount), 0);
    const needsPayment = orders.filter(o => ["confirmed", "awaiting_payment"].includes(o.status));
    return { activeCount: active.length, activeTotal, deliveredCount: delivered.length, deliveredTotal, needsPaymentCount: needsPayment.length };
  }, [orders]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => <div key={i} className="h-20 rounded-lg bg-muted/50 animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* KPI Summary */}
      {orders.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-card border border-border/40 rounded-xl p-3 text-center">
            <p className="text-lg font-black text-primary">{kpis.activeCount}</p>
            <p className="text-[10px] text-muted-foreground">طلب نشط</p>
            <p className="text-[10px] font-bold text-foreground mt-0.5">{kpis.activeTotal.toLocaleString("ar-EG")} ج.م</p>
          </div>
          <div className="bg-card border border-border/40 rounded-xl p-3 text-center">
            <p className="text-lg font-black text-emerald-600">{kpis.deliveredCount}</p>
            <p className="text-[10px] text-muted-foreground">تم تسليمه</p>
            <p className="text-[10px] font-bold text-foreground mt-0.5">{kpis.deliveredTotal.toLocaleString("ar-EG")} ج.م</p>
          </div>
          <div className="bg-card border border-border/40 rounded-xl p-3 text-center">
            <p className={cn("text-lg font-black", kpis.needsPaymentCount > 0 ? "text-amber-600" : "text-muted-foreground")}>{kpis.needsPaymentCount}</p>
            <p className="text-[10px] text-muted-foreground">بانتظار الدفع</p>
          </div>
        </div>
      )}

      {/* Search + Filter */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
          <Input
            placeholder="ابحث برقم الطلب أو كود الفيصل..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pe-9 h-9 text-xs rounded-xl border-border/60"
          />
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide" style={{ scrollbarWidth: "none" }}>
        {statusFilterTabs.map(tab => {
          const TabIcon = tab.icon;
          const isActive = statusFilter === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-medium whitespace-nowrap shrink-0 transition-all border",
                isActive
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-card text-muted-foreground border-border/40 hover:border-border hover:text-foreground"
              )}
            >
              <TabIcon className="w-3.5 h-3.5" />
              {tab.label}
              {tab.count > 0 && (
                <span className={cn(
                  "text-[10px] px-1.5 py-0 rounded-full font-bold min-w-[18px] text-center",
                  isActive ? "bg-primary-foreground/20" : "bg-muted"
                )}>{tab.count}</span>
              )}
            </button>
          );
        })}
      </div>

      {filteredOrders.length === 0 ? (
        <Card className="border-dashed border-border/60">
          <CardContent className="p-10 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
              <Package className="w-8 h-8 text-muted-foreground/30" />
            </div>
            <p className="text-foreground font-bold">{orders.length === 0 ? "لا توجد طلبات بعد" : "لا توجد طلبات بهذا الفلتر"}</p>
            <p className="text-xs text-muted-foreground mt-1">{orders.length === 0 ? "أنشئ عرض سعر وحوّله لطلب" : "جرب فلتر آخر أو امسح البحث"}</p>
            {(statusFilter !== "all" || searchQuery) && (
              <Button variant="outline" size="sm" className="mt-3 text-xs rounded-xl" onClick={() => { setStatusFilter("all"); setSearchQuery(""); }}>
                مسح الفلاتر
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <p className="text-[11px] text-muted-foreground">{filteredOrders.length} طلب</p>
          {filteredOrders.map(order => {
            const config = statusConfig[order.status] || statusConfig.pending;
            const isExpanded = expandedOrder === order.id;
            const items = orderItems[order.id];
            const currentStage = stageIndex(order.status, order.payment_method);
            const isEditing = editingOrder === order.id;
            const editable = canEdit(order.status);

            return (
              <Card key={order.id} className="border-border/40 rounded-2xl overflow-hidden shadow-sm">
                {/* ─── Order Header ─── */}
                <button onClick={() => toggleOrder(order.id)} className="w-full text-end">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-primary/8 flex items-center justify-center shrink-0">
                      <Package className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-bold text-foreground text-sm">{order.order_number}</p>
                        <Badge variant={config.variant} className="text-[10px] h-5 rounded-md shrink-0">{config.label}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-muted-foreground">
                          {new Date(order.created_at).toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric" })}
                        </p>
                        <span className="text-xs text-muted-foreground/30">|</span>
                        <p className="text-xs font-bold text-foreground">{Number(order.total_amount).toLocaleString("ar-EG")} ج.م</p>
                      </div>
                    </div>
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center transition-all shrink-0",
                      isExpanded ? "bg-primary/10 rotate-180" : "bg-muted/50"
                    )}>
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </CardContent>
                </button>

                {isExpanded && (
                  <div className="border-t border-border/30 bg-muted/20 p-4 space-y-4">

                    {/* ─── Timeline Stepper ─── */}
                    {order.status !== "cancelled" && (
                      <div className="bg-card rounded-xl border border-border/30 p-4">
                        <p className="text-[11px] font-bold text-muted-foreground mb-3">حالة الطلب</p>
                        <div className="flex items-start gap-0">
                          {getVisibleStages(order.payment_method).map((stage, idx) => {
                            const StageIcon = stage.icon;
                            const stages = getVisibleStages(order.payment_method);
                            const isActive = idx <= currentStage;
                            const isCurrent = idx === currentStage;
                            const isLast = idx === stages.length - 1;
                            const isPaymentStage = stage.key === "awaiting_payment";
                            const canClickPayment = isPaymentStage && (order.status === "awaiting_payment" || order.status === "confirmed");
                            return (
                              <div key={stage.key} className="flex items-center flex-1 min-w-0">
                                <div
                                  className={cn("flex flex-col items-center gap-1.5 min-w-[48px]", canClickPayment && "cursor-pointer group")}
                                  onClick={canClickPayment ? () => onNavigateToPayment?.({ id: order.id, orderNumber: order.order_number, amount: Number(order.total_amount) }) : undefined}
                                >
                                  <div className={cn(
                                    "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                                    isCurrent
                                      ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                                      : isActive
                                        ? "bg-primary/15 text-primary"
                                        : "bg-muted/80 text-muted-foreground/30",
                                    canClickPayment && "ring-2 ring-primary/30 group-hover:ring-primary/60 group-hover:scale-105"
                                  )}>
                                    <StageIcon className="w-4.5 h-4.5" />
                                  </div>
                                  <span className={cn(
                                    "text-[9px] text-center leading-tight max-w-[56px]",
                                    isCurrent ? "text-primary font-extrabold" : isActive ? "text-primary/70 font-semibold" : "text-muted-foreground/40 font-medium"
                                  )}>{stage.label}</span>
                                  {canClickPayment && (
                                    <span className="text-[8px] text-primary font-bold bg-primary/10 px-1.5 py-0.5 rounded-md animate-pulse">ادفع الآن</span>
                                  )}
                                </div>
                                {!isLast && (
                                  <div className={cn(
                                    "h-[3px] flex-1 mx-1 rounded-full min-w-[8px] mt-[-20px]",
                                    idx < currentStage ? "bg-primary/30" : "bg-border/60"
                                  )} />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* ─── Shipping Tracking Info ─── */}
                    {(order.status === "shipped" || order.status === "delivered") && order.shipping_company && (
                      <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-4 space-y-2">
                        <div className="flex items-center gap-2 mb-1">
                          <Truck className="w-4.5 h-4.5 text-purple-600" />
                          <span className="text-sm font-bold text-foreground">تتبع الشحنة</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className="text-muted-foreground">شركة الشحن: </span>
                            <span className="font-semibold text-foreground">{order.shipping_company}</span>
                          </div>
                          {order.tracking_number && (
                            <div>
                              <span className="text-muted-foreground">رقم البوليصة: </span>
                              <span className="font-mono font-bold text-foreground" dir="ltr">{order.tracking_number}</span>
                            </div>
                          )}
                          {order.shipped_at && (
                            <div>
                              <span className="text-muted-foreground">تاريخ الشحن: </span>
                              <span className="font-semibold text-foreground">
                                {new Date(order.shipped_at).toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </div>
                          )}
                          {order.status === "delivered" && order.delivered_at && (
                            <div>
                              <span className="text-muted-foreground">تاريخ التسليم: </span>
                              <span className="font-semibold text-green-600">
                                {new Date(order.delivered_at).toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {order.status === "cancelled" && (
                      <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-destructive/8 border border-destructive/15">
                        <XCircle className="w-5 h-5 text-destructive shrink-0" />
                        <span className="text-sm text-destructive font-bold">تم إلغاء الطلب</span>
                      </div>
                    )}

                    {/* ─── Edit/Cancel Actions ─── */}
                    {editable && !isEditing && (
                      <div className="flex items-center gap-3 p-3.5 rounded-xl bg-primary/5 border border-primary/10">
                        <AlertTriangle className="w-5 h-5 text-primary shrink-0" />
                        <span className="text-xs text-muted-foreground flex-1 leading-relaxed">
                          يمكنك تعديل أو إلغاء هذا الطلب قبل بدء التجهيز
                        </span>
                        <div className="flex gap-1.5 shrink-0">
                          <Button variant="outline" size="sm" className="text-xs h-8 gap-1 rounded-lg" onClick={() => startEditing(order)}>
                            <Pencil className="w-3.5 h-3.5" />
                            تعديل
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm" className="text-xs h-8 gap-1 rounded-lg text-destructive border-destructive/30 hover:bg-destructive/10">
                                <Trash2 className="w-3.5 h-3.5" />
                                إلغاء
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>تأكيد إلغاء الطلب</AlertDialogTitle>
                                <AlertDialogDescription>
                                  هل أنت متأكد من إلغاء الطلب رقم {order.order_number}؟ سيتم إبلاغ الإدارة بالإلغاء. لا يمكن التراجع عن هذا الإجراء.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>تراجع</AlertDialogCancel>
                                <AlertDialogAction onClick={() => cancelOrder(order)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                  تأكيد الإلغاء
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    )}

                    {/* ─── Editing Mode Header ─── */}
                    {isEditing && (
                      <div className="flex items-center justify-between p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                        <div className="flex items-center gap-2">
                          <Pencil className="w-4 h-4 text-amber-600" />
                          <span className="text-xs font-bold text-amber-700">وضع التعديل</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Button variant="ghost" size="sm" className="text-xs h-7 rounded-lg" onClick={cancelEditing} disabled={saving}>
                            <X className="w-3.5 h-3.5 ms-1" />
                            إلغاء
                          </Button>
                          <Button size="sm" className="text-xs h-7 rounded-lg" onClick={() => saveEdits(order)} disabled={saving}>
                            {saving ? <Loader2 className="w-3.5 h-3.5 ms-1 animate-spin" /> : <Save className="w-3.5 h-3.5 ms-1" />}
                            حفظ
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* ─── Payment CTA ─── */}
                    {["confirmed", "awaiting_payment", "pending"].includes(order.status) && (
                      <div className="space-y-3">
                          <div className="rounded-xl overflow-hidden border border-primary/20">
                            <div className="bg-gradient-to-l from-primary/5 to-primary/10 p-4 space-y-3">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                                  <CreditCard className="w-5 h-5 text-primary" />
                                </div>
                                <div className="flex-1">
                                  <h4 className="text-sm font-bold text-foreground">ادفع لاستكمال الطلب</h4>
                                  <p className="text-[11px] text-muted-foreground mt-0.5">Visa • Mastercard • Meeza — تأكيد فوري</p>
                                </div>
                                <span className="text-sm font-black text-primary px-2">{Number(order.total_amount).toLocaleString("ar-EG")} ج.م</span>
                              </div>
                              <Button
                                size="sm"
                                className="w-full gap-2 rounded-lg h-10"
                                disabled={paymobLoading === order.id}
                                onClick={() => handlePaymob(order)}
                              >
                                {paymobLoading === order.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <CreditCard className="w-4 h-4" />
                                )}
                                {paymobLoading === order.id ? "جاري التحميل..." : "ادفع بالبطاقة الآن"}
                              </Button>
                            </div>
                          </div>
                      </div>
                    )}

                    {/* ─── Pending Approval Banner ─── */}
                    {order.status === "pending_approval" && (
                      <div className="rounded-xl overflow-hidden border border-orange-300/50">
                        <div className="bg-gradient-to-l from-orange-50 to-orange-100/50 dark:from-orange-950/30 dark:to-orange-900/20 p-4 space-y-3">
                          <div className="flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
                            <div>
                              <p className="text-sm font-bold text-orange-800 dark:text-orange-200">بانتظار موافقتك على التعديلات</p>
                              <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">راجع تفاصيل الطلب المحدّثة ووافق أو ارفض</p>
                            </div>
                          </div>
                          <div className="flex gap-2 me-8">
                            <Button
                              size="sm"
                              className="h-8 text-xs gap-1 rounded-lg"
                              onClick={async () => {
                                await supabase.from("orders").update({ status: "confirmed" }).eq("id", order.id);
                                toast({ title: "تم قبول التعديلات ✓" });
                                fetchOrders();
                              }}
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              موافق
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs gap-1 rounded-lg border-destructive/30 text-destructive hover:bg-destructive/10"
                              onClick={async () => {
                                await supabase.from("orders").update({ status: "cancelled" }).eq("id", order.id);
                                toast({ title: "تم رفض الطلب" });
                                fetchOrders();
                              }}
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              رفض
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ─── Shipping & Payment Info ─── */}
                    {(order.shipping_governorate || order.payment_method || order.pickup_branch) && (
                      <div className="flex flex-wrap gap-2">
                        {order.pickup_branch && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-primary bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-lg">
                            🏢 فرع الاستلام: {BRANCH_LABELS[order.pickup_branch] || order.pickup_branch}
                          </span>
                        )}
                        {order.shipping_governorate && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-lg">
                            📍 {order.shipping_governorate} — {order.shipping_address}
                          </span>
                        )}
                        {order.payment_method && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-lg">
                            💳 {order.payment_method}
                          </span>
                        )}
                      </div>
                    )}

                    {/* ─── Order Items ─── */}
                    {items ? (
                      <div className="space-y-1.5">
                        {items.map((item) => (
                          <div key={item.id} className="flex items-center gap-3 bg-card rounded-xl p-3 border border-border/20">
                            {item.products?.image_url ? (
                              <LazyImage
                                src={item.products.image_url}
                                alt={item.products?.name_ar || ""}
                                wrapperClassName="w-12 h-12 rounded-lg bg-muted/30 shrink-0"
                                className="w-full h-full object-contain p-1"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-lg bg-muted/30 flex items-center justify-center shrink-0">
                                <Package className="w-5 h-5 text-muted-foreground/20" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-foreground truncate">{item.products?.name_ar}</p>
                              <p className="text-[10px] text-muted-foreground font-mono">{item.products?.sku}</p>
                            </div>

                            {isEditing ? (
                              <>
                                <div className="flex items-center gap-1 shrink-0">
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="w-7 h-7 rounded-lg"
                                    onClick={() => setEditQuantities(prev => ({ ...prev, [item.id]: Math.max(1, (prev[item.id] ?? item.quantity) - 1) }))}
                                  >
                                    <span className="text-sm font-bold">−</span>
                                  </Button>
                                  <Input
                                    type="number"
                                    min={1}
                                    value={editQuantities[item.id] ?? item.quantity}
                                    onChange={(e) => setEditQuantities(prev => ({ ...prev, [item.id]: Math.max(1, parseInt(e.target.value) || 1) }))}
                                    className="w-12 h-7 text-center text-sm font-bold px-1 rounded-lg"
                                  />
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="w-7 h-7 rounded-lg"
                                    onClick={() => setEditQuantities(prev => ({ ...prev, [item.id]: (prev[item.id] ?? item.quantity) + 1 }))}
                                  >
                                    <span className="text-sm font-bold">+</span>
                                  </Button>
                                </div>
                                <p className="text-xs font-bold text-foreground shrink-0 w-16 text-start">
                                  {(item.unit_price * (editQuantities[item.id] ?? item.quantity)).toLocaleString("ar-EG")} ج.م
                                </p>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="w-7 h-7 text-destructive shrink-0">
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>حذف الصنف</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        هل أنت متأكد من حذف "{item.products?.name_ar}" من الطلب؟
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>تراجع</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => removeItem(order, item.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                        تأكيد الحذف
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </>
                            ) : (
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-[11px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">× {item.quantity}</span>
                                <p className="text-xs font-bold text-foreground">{Number(item.total_price).toLocaleString("ar-EG")} ج.م</p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="h-10 animate-pulse bg-muted/50 rounded-xl" />
                    )}

                    {/* ─── Edit Notes ─── */}
                    {isEditing && (
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-foreground">ملاحظات الطلب</label>
                        <Textarea
                          placeholder="أضف ملاحظات للإدارة..."
                          value={editNotes}
                          onChange={(e) => setEditNotes(e.target.value)}
                          className="text-sm min-h-[60px] rounded-xl"
                        />
                      </div>
                    )}

                    {/* ─── Notes (view mode) ─── */}
                    {!isEditing && order.notes && (
                      <div className="p-3 rounded-xl bg-muted/30 border border-border/20">
                        <p className="text-[10px] text-muted-foreground/60 mb-0.5 font-bold">ملاحظات:</p>
                        <p className="text-xs text-foreground">{order.notes}</p>
                      </div>
                    )}

                    {/* ─── Edit Total ─── */}
                    {isEditing && items && (
                      <div className="flex items-center justify-between p-3.5 rounded-xl bg-secondary/50 border border-border">
                        <span className="text-sm font-medium text-muted-foreground">الإجمالي بعد التعديل</span>
                        <span className="text-lg font-black text-foreground">
                          {items.reduce((sum, i) => sum + i.unit_price * (editQuantities[i.id] ?? i.quantity), 0).toLocaleString("ar-EG")} ج.م
                        </span>
                      </div>
                    )}

                    {/* ─── Reorder + WhatsApp ─── */}
                    {!isEditing && (
                      <div className="flex gap-2">
                        {order.status === "delivered" && items && items.length > 0 && (
                          <Button
                            variant="default"
                            size="sm"
                            className="flex-1 text-xs rounded-xl h-9 gap-1.5"
                            disabled={reordering === order.id}
                            onClick={async () => {
                              setReordering(order.id);
                              const orderItemsList = orderItems[order.id] || [];
                              for (const item of orderItemsList) {
                                await addItem(item.product_id, item.quantity);
                              }
                              setReordering(null);
                              toast({ title: "✅ تم إضافة كل الأصناف للسلة", description: `${orderItemsList.length} صنف من الطلب ${order.order_number}` });
                            }}
                          >
                            {reordering === order.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                            كرر هذا الطلب
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className={`text-xs rounded-xl h-9 gap-1.5 border-border/40 ${order.status === "delivered" && items && items.length > 0 ? "" : "flex-1 w-full"}`}
                          onClick={() => openWhatsApp(`https://wa.me/201034806288?text=استفسار عن الطلب رقم ${order.order_number}`)}
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          استفسار عن الطلب
                        </Button>
                      </div>
                    )}
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
