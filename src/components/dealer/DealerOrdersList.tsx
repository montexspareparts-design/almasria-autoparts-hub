import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Package, Clock, CheckCircle, Truck, XCircle, ChevronDown, ChevronUp,
  MessageCircle, Inbox, PackageCheck, Trash2, Pencil, Save, X, Loader2,
  AlertTriangle, Wallet, CreditCard
} from "lucide-react";
import PaymentInstructionsBanner from "@/components/PaymentInstructionsBanner";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger
} from "@/components/ui/alert-dialog";

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

const getVisibleStages = (paymentMethod?: string | null) => {
  if (isElectronicPayment(paymentMethod)) return orderStages;
  // For COD/non-electronic, skip "بانتظار الدفع"
  return orderStages.filter(s => s.key !== "awaiting_payment");
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
    .eq("role", "admin" as any);

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

const DealerOrdersList = ({ userId, onNavigateToPayment }: { userId: string; onNavigateToPayment?: () => void }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [orderItems, setOrderItems] = useState<Record<string, OrderItem[]>>({});
  const [editingOrder, setEditingOrder] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState("");
  const [editQuantities, setEditQuantities] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);

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
    setOrders(data || []);
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

    setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: "cancelled" } : o));
    setEditingOrder(null);
    setSaving(false);
    toast({ title: "تم إلغاء الطلب", description: "تم إبلاغ الإدارة بالإلغاء" });
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => <div key={i} className="h-20 rounded-lg bg-muted/50 animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-foreground">الطلبات ({orders.length})</h2>

      {orders.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-10 text-center">
            <Package className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground font-medium">لا توجد طلبات بعد</p>
            <p className="text-xs text-muted-foreground/60 mt-1">أنشئ عرض سعر وحوّله لطلب</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {orders.map(order => {
            const config = statusConfig[order.status] || statusConfig.pending;
            const isExpanded = expandedOrder === order.id;
            const items = orderItems[order.id];
            const currentStage = stageIndex(order.status, order.payment_method);
            const isEditing = editingOrder === order.id;
            const editable = canEdit(order.status);

            return (
              <Card key={order.id} className="border-border/50 overflow-hidden">
                <button onClick={() => toggleOrder(order.id)} className="w-full text-right">
                  <CardContent className="p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Package className="w-4 h-4 text-primary" />
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
                        <Badge variant={config.variant} className="text-[10px] h-5">{config.label}</Badge>
                      </div>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                    </div>
                  </CardContent>
                </button>

                {isExpanded && (
                  <div className="border-t border-border bg-muted/30 p-4 space-y-4">
                    {/* Order Timeline */}
                    {order.status !== "cancelled" && (
                      <div className="flex items-center gap-0 px-1 overflow-x-auto">
                        {getVisibleStages(order.payment_method).map((stage, idx) => {
                          const StageIcon = stage.icon;
                          const stages = getVisibleStages(order.payment_method);
                          const isActive = idx <= currentStage;
                          const isCurrent = idx === currentStage;
                          const isLast = idx === stages.length - 1;
                          return (
                            <div key={stage.key} className="flex items-center flex-1 min-w-0">
                              <div className="flex flex-col items-center gap-1 min-w-[52px]">
                                <div className={cn(
                                  "w-9 h-9 rounded-full flex items-center justify-center transition-all border-2",
                                  isCurrent ? "bg-primary text-primary-foreground border-primary shadow-sm shadow-primary/30" :
                                  isActive ? "bg-primary/15 text-primary border-primary/40" : "bg-muted text-muted-foreground/40 border-border"
                                )}>
                                  <StageIcon className="w-4 h-4" />
                                </div>
                                <span className={cn(
                                  "text-[9px] text-center leading-tight whitespace-nowrap",
                                  isCurrent ? "text-primary font-bold" : isActive ? "text-primary/70 font-medium" : "text-muted-foreground/50"
                                )}>{stage.label}</span>
                              </div>
                              {!isLast && (
                                <div className={cn(
                                  "h-0.5 flex-1 mx-0.5 rounded-full min-w-[12px]",
                                  idx < currentStage ? "bg-primary/40" : "bg-border"
                                )} />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {order.status === "cancelled" && (
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10">
                        <XCircle className="w-5 h-5 text-destructive" />
                        <span className="text-sm text-destructive font-medium">تم إلغاء الطلب</span>
                      </div>
                    )}

                    {/* Edit/Cancel Actions Bar */}
                    {editable && !isEditing && (
                      <div className="flex items-center gap-2 p-2.5 rounded-lg bg-primary/5 border border-primary/10">
                        <AlertTriangle className="w-4 h-4 text-primary shrink-0" />
                        <span className="text-xs text-muted-foreground flex-1">يمكنك تعديل أو إلغاء هذا الطلب قبل بدء التجهيز</span>
                        <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => startEditing(order)}>
                          <Pencil className="w-3.5 h-3.5 ml-1" />
                          تعديل
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" className="text-xs h-7 text-destructive border-destructive/30 hover:bg-destructive/10">
                              <Trash2 className="w-3.5 h-3.5 ml-1" />
                              إلغاء الطلب
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
                    )}

                    {/* Editing Mode Header */}
                    {isEditing && (
                      <div className="flex items-center justify-between p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                        <div className="flex items-center gap-2">
                          <Pencil className="w-4 h-4 text-amber-600" />
                          <span className="text-xs font-semibold text-amber-700">وضع التعديل — سيتم إبلاغ الإدارة بأي تغيير</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" className="text-xs h-7" onClick={cancelEditing} disabled={saving}>
                            <X className="w-3.5 h-3.5 ml-1" />
                            إلغاء
                          </Button>
                          <Button size="sm" className="text-xs h-7" onClick={() => saveEdits(order)} disabled={saving}>
                            {saving ? <Loader2 className="w-3.5 h-3.5 ml-1 animate-spin" /> : <Save className="w-3.5 h-3.5 ml-1" />}
                            حفظ التعديلات
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Payment CTA for electronic payments - only after admin approval */}
                    {isElectronicPayment(order.payment_method) &&
                      ["confirmed", "awaiting_payment"].includes(order.status) && (
                      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700 rounded-xl p-4 space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center shrink-0">
                            <Wallet className="w-5 h-5 text-amber-600" />
                          </div>
                          <div className="flex-1">
                            <h4 className="text-sm font-bold text-amber-800 dark:text-amber-300">💳 ادفع لاستكمال إجراءات الطلب</h4>
                            <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">حوّل المبلغ المطلوب واستكمل الخطوات من صفحة الدفع</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            className="flex-1 gap-2"
                            onClick={() => onNavigateToPayment?.()}
                          >
                            <CreditCard className="w-4 h-4" />
                            انتقل لوسائل الدفع
                          </Button>
                          <span className="text-sm font-black text-primary">{Number(order.total_amount).toLocaleString("ar-EG")} ج.م</span>
                        </div>
                      </div>
                    )}

                    {/* Pending Approval Banner */}
                    {order.status === "pending_approval" && (
                      <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-300 dark:border-orange-700 rounded-xl p-4 flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-bold text-orange-800 dark:text-orange-300">بانتظار موافقتك على تعديلات الإدارة</p>
                          <p className="text-xs text-orange-700 dark:text-orange-400 mt-1">راجع تفاصيل الطلب المحدّثة أدناه ووافق أو ارفض</p>
                        </div>
                      </div>
                    )}

                    {order.shipping_governorate && (
                      <p className="text-xs text-muted-foreground">📍 {order.shipping_governorate} — {order.shipping_address}</p>
                    )}
                    {order.payment_method && (
                      <p className="text-xs text-muted-foreground">💳 {order.payment_method}</p>
                    )}

                    {/* Order Items */}
                    {items ? (
                      <div className="space-y-2">
                        {items.map((item) => (
                          <div key={item.id} className="flex items-center gap-3 bg-background rounded-lg p-2.5">
                            {item.products?.image_url && (
                              <img src={item.products.image_url} alt="" className="w-10 h-10 rounded object-contain bg-white shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-foreground truncate">{item.products?.name_ar}</p>
                              <p className="text-[10px] text-muted-foreground">{item.products?.sku}</p>
                            </div>

                            {isEditing ? (
                              <>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="w-7 h-7"
                                    onClick={() => setEditQuantities(prev => ({ ...prev, [item.id]: Math.max(1, (prev[item.id] ?? item.quantity) - 1) }))}
                                  >
                                    <span className="text-sm font-bold">−</span>
                                  </Button>
                                  <Input
                                    type="number"
                                    min={1}
                                    value={editQuantities[item.id] ?? item.quantity}
                                    onChange={(e) => setEditQuantities(prev => ({ ...prev, [item.id]: Math.max(1, parseInt(e.target.value) || 1) }))}
                                    className="w-14 h-7 text-center text-sm font-bold px-1"
                                  />
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="w-7 h-7"
                                    onClick={() => setEditQuantities(prev => ({ ...prev, [item.id]: (prev[item.id] ?? item.quantity) + 1 }))}
                                  >
                                    <span className="text-sm font-bold">+</span>
                                  </Button>
                                </div>
                                <p className="text-xs font-bold text-foreground shrink-0 w-20 text-left">
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
                                        هل أنت متأكد من حذف "{item.products?.name_ar}" من الطلب؟ سيتم إبلاغ الإدارة.
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
                              <>
                                <p className="text-[10px] text-muted-foreground shrink-0">× {item.quantity}</p>
                                <p className="text-xs font-bold text-foreground shrink-0">{Number(item.total_price).toLocaleString("ar-EG")} ج.م</p>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="h-8 animate-pulse bg-muted rounded" />
                    )}

                    {/* Edit Notes */}
                    {isEditing && (
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-foreground">ملاحظات الطلب</label>
                        <Textarea
                          placeholder="أضف ملاحظات للإدارة..."
                          value={editNotes}
                          onChange={(e) => setEditNotes(e.target.value)}
                          className="text-sm min-h-[60px]"
                        />
                      </div>
                    )}

                    {/* Existing notes (non-edit mode) */}
                    {!isEditing && order.notes && (
                      <div className="p-2.5 rounded-lg bg-muted/50">
                        <p className="text-[10px] text-muted-foreground/70 mb-0.5">ملاحظات:</p>
                        <p className="text-xs text-foreground">{order.notes}</p>
                      </div>
                    )}

                    {/* Edit mode total */}
                    {isEditing && items && (
                      <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border">
                        <span className="text-sm font-medium text-muted-foreground">الإجمالي بعد التعديل</span>
                        <span className="text-lg font-bold text-foreground">
                          {items.reduce((sum, i) => sum + i.unit_price * (editQuantities[i.id] ?? i.quantity), 0).toLocaleString("ar-EG")} ج.م
                        </span>
                      </div>
                    )}

                    {!isEditing && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-xs"
                        onClick={() => window.open(`https://wa.me/201000000000?text=استفسار عن الطلب رقم ${order.order_number}`, "_blank")}
                      >
                        <MessageCircle className="w-3.5 h-3.5 ml-1.5" />
                        استفسار عن الطلب
                      </Button>
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
