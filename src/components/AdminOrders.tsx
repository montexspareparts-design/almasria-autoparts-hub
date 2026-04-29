import { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
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
  ChevronRight, ChevronLeft, Search, CreditCard, MessageCircle, AlertTriangle
} from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import InvoicePreviewDialog from "@/components/admin/InvoicePreviewDialog";
import { Eye } from "lucide-react";

// SLA threshold for first contact (minutes)
const SLA_MINUTES = 15;

function getMinutesAgo(date: string): number {
  return Math.floor((Date.now() - new Date(date).getTime()) / 60000);
}

function formatPhoneForWA(phone: string): string {
  let c = phone.replace(/[\s\-()+]/g, "");
  c = c.replace(/^002/, "").replace(/^0020/, "");
  if (c.startsWith("0")) c = "2" + c;
  if (/^1\d{9}$/.test(c)) c = "20" + c;
  return c;
}

function buildNewOrderMessage(name: string, orderNumber: string, total: number): string {
  return (
    `أهلاً ${name || "عميلنا الكريم"}، معاك المصرية جروب لقطع غيار تويوتا 🚗\n\n` +
    `استلمنا طلبك رقم *${orderNumber}* بقيمة *${Number(total).toLocaleString("ar-EG")} ج.م*.\n` +
    `بنتواصل معاك لتأكيد التفاصيل وأقرب وقت للاستلام/التوصيل.\n\n` +
    `هل تحب نأكد الطلب الآن؟`
  );
}

type Order = Database["public"]["Tables"]["orders"]["Row"];
type OrderItem = Database["public"]["Tables"]["order_items"]["Row"];

interface OrderWithItems extends Order {
  items?: (OrderItem & { product?: { name_ar: string; sku: string; image_url: string | null } })[];
  profile?: { full_name: string | null; phone: string | null; email: string | null };
  isDealer?: boolean;
  dealerTier?: string;
}

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: typeof Clock }> = {
  pending: { label: "طلب جديد — بانتظار الموافقة", color: "text-yellow-500", bg: "bg-yellow-500/10", icon: Clock },
  confirmed: { label: "تمت الموافقة", color: "text-blue-500", bg: "bg-blue-500/10", icon: CheckCircle },
  awaiting_payment: { label: "بانتظار الدفع", color: "text-orange-500", bg: "bg-orange-500/10", icon: Clock },
  pending_approval: { label: "بانتظار موافقة العميل", color: "text-orange-500", bg: "bg-orange-500/10", icon: Clock },
  processing: { label: "جاري التجهيز", color: "text-orange-500", bg: "bg-orange-500/10", icon: Package },
  shipped: { label: "تم الشحن", color: "text-purple-500", bg: "bg-purple-500/10", icon: Truck },
  delivered: { label: "تم التسليم", color: "text-green-500", bg: "bg-green-500/10", icon: CheckCircle },
  cancelled: { label: "ملغي", color: "text-destructive", bg: "bg-destructive/10", icon: XCircle },
};

const statusFlow = ["pending", "confirmed", "awaiting_payment", "processing", "shipped", "delivered"];
const PAGE_SIZE = 15;

const shippingCompanies = ["أرامكس", "بوسطة", "mylerz", "J&T", "DHL", "FedEx", "سعاة خاصين", "استلام من الفرع"];

const AdminOrders = () => {
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [orderTypeFilter, setOrderTypeFilter] = useState<"all" | "wholesale" | "retail">("all");
  const [dateFrom, setDateFrom] = useState<string>(""); // YYYY-MM-DD
  const [dateTo, setDateTo] = useState<string>("");     // YYYY-MM-DD
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});
  const [editingOrder, setEditingOrder] = useState<string | null>(null);
  const [editedItems, setEditedItems] = useState<Record<string, { id: string; quantity: number; unit_price: number; total_price: number; product_id: string; product?: any }[]>>({});
  const [autoExpandFirst, setAutoExpandFirst] = useState(false);
  const ordersListRef = useRef<HTMLDivElement>(null);
  const [shippingInfo, setShippingInfo] = useState<Record<string, { tracking_number: string; shipping_company: string }>>({});
  const [editingShipping, setEditingShipping] = useState<string | null>(null);
  const [savingShipping, setSavingShipping] = useState(false);
  const [invoicePreview, setInvoicePreview] = useState<OrderWithItems | null>(null);
  // Force re-render every minute to update SLA timers
  const [, setNowTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setNowTick((n) => n + 1), 60000);
    return () => clearInterval(t);
  }, []);

  // Highlight order from URL (?highlight=xxx) — auto-expand and scroll
  useEffect(() => {
    const highlightId = searchParams.get("highlight");
    if (highlightId && orders.some((o) => o.id === highlightId)) {
      setExpandedOrder(highlightId);
      setTimeout(() => {
        document.getElementById(`order-${highlightId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
        // Clean URL
        searchParams.delete("highlight");
        setSearchParams(searchParams, { replace: true });
      }, 200);
    }
  }, [orders, searchParams, setSearchParams]);

  // Quick WhatsApp action — marks first contact + opens WA
  const quickWhatsApp = async (order: OrderWithItems) => {
    const phone = order.profile?.phone;
    if (!phone) {
      toast({ title: "لا يوجد رقم موبايل لهذا العميل", variant: "destructive" });
      return;
    }
    if (!(order as any).first_contacted_at) {
      await supabase.from("orders").update({ first_contacted_at: new Date().toISOString() } as any).eq("id", order.id);
      fetchOrders();
    }
    const msg = buildNewOrderMessage(order.profile?.full_name || "", order.order_number, Number(order.total_amount));
    window.open(`https://wa.me/${formatPhoneForWA(phone)}?text=${encodeURIComponent(msg)}`, "_blank");
  };

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
    if (dateFrom) {
      query = query.gte("created_at", `${dateFrom}T00:00:00`);
    }
    if (dateTo) {
      query = query.lte("created_at", `${dateTo}T23:59:59.999`);
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

    // Batch fetch profiles and dealer accounts for this page only
    const userIds = [...new Set(data.map((o: any) => o.user_id))];
    const [{ data: profiles }, { data: dealerAccounts }] = await Promise.all([
      supabase.from("profiles").select("user_id, full_name, phone, email").in("user_id", userIds),
      supabase.from("dealer_accounts").select("user_id, tier, is_active").in("user_id", userIds),
    ]);

    const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
    const dealerMap = new Map((dealerAccounts || []).map(d => [d.user_id, d]));

    let enriched: OrderWithItems[] = data.map((order: any) => {
      const dealer = dealerMap.get(order.user_id);
      return {
        ...order,
        items: order.order_items || [],
        profile: profileMap.get(order.user_id) || undefined,
        isDealer: !!dealer?.is_active,
        dealerTier: dealer?.tier || undefined,
      };
    });

    // Client-side filter by order type
    if (orderTypeFilter === "wholesale") {
      enriched = enriched.filter(o => o.isDealer);
    } else if (orderTypeFilter === "retail") {
      enriched = enriched.filter(o => !o.isDealer);
    }

    setOrders(enriched);
    setTotalCount(orderTypeFilter === "all" ? (count || 0) : enriched.length);
    setLoading(false);

    // Auto-expand first order if triggered by stat card click
    if (autoExpandFirst && enriched.length > 0) {
      setExpandedOrder(enriched[0].id);
      setAutoExpandFirst(false);
      // Scroll to orders list
      setTimeout(() => {
        ordersListRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  }, [page, filterStatus, searchQuery, autoExpandFirst, orderTypeFilter, dateFrom, dateTo]);




  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { fetchOrders(); }, [fetchOrders]);
  useEffect(() => { setPage(0); }, [filterStatus, searchQuery, orderTypeFilter, dateFrom, dateTo]);

  const handleStatClick = (status: string) => {
    setFilterStatus(status);
    setPage(0);
    setAutoExpandFirst(true);
  };

  const statusNotificationMessages: Record<string, { title: string; message: string }> = {
    confirmed: { title: "✅ تمت الموافقة على طلبك", message: "تم مراجعة طلبك والموافقة عليه. يرجى استكمال الدفع لبدء التجهيز" },
    awaiting_payment: { title: "💳 بانتظار الدفع", message: "تم الموافقة على طلبك، يرجى تحويل المبلغ المطلوب لاستكمال الإجراءات" },
    processing: { title: "✅ تم تأكيد استلام الدفع", message: "تم استلام الدفع بنجاح وطلبك قيد التجهيز الآن. سيتم شحنه في أقرب وقت" },
    shipped: { title: "🚚 تم شحن طلبك", message: "تم شحن طلبك! يمكنك متابعة حالته من صفحة طلباتي" },
    delivered: { title: "🎉 تم تسليم طلبك", message: "تم تسليم طلبك بنجاح. شكراً لتعاملك معنا!" },
    cancelled: { title: "❌ تم إلغاء طلبك", message: "تم إلغاء طلبك. تواصل معنا لمزيد من التفاصيل" },
  };

  const notifyCustomerWhatsApp = async (order: OrderWithItems, title: string, message: string) => {
    // In-app notification is handled automatically by DB trigger
    // Here we only send WhatsApp notification
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

    // Add shipping info when marking as shipped
    if (newStatus === "shipped") {
      const info = shippingInfo[orderId];
      if (info?.shipping_company) updateData.shipping_company = info.shipping_company;
      if (info?.tracking_number) updateData.tracking_number = info.tracking_number;
      updateData.shipped_at = new Date().toISOString();
    }

    // Add delivered timestamp
    if (newStatus === "delivered") {
      updateData.delivered_at = new Date().toISOString();
    }
    const { error } = await supabase.from("orders").update(updateData).eq("id", orderId);

    if (error) {
      toast({ title: "حدث خطأ أثناء تحديث الحالة", variant: "destructive" });
    } else {
      const order = orders.find(o => o.id === orderId);
      let notifData = statusNotificationMessages[newStatus];
      // Enrich shipped notification with tracking info
      if (newStatus === "shipped" && notifData) {
        const info = shippingInfo[orderId];
        const trackParts: string[] = [];
        if (info?.shipping_company) trackParts.push(`شركة الشحن: ${info.shipping_company}`);
        if (info?.tracking_number) trackParts.push(`رقم البوليصة: ${info.tracking_number}`);
        if (trackParts.length > 0) {
          notifData = { ...notifData, message: notifData.message + "\n" + trackParts.join(" — ") };
        }
      }
      if (order && notifData) await notifyCustomerWhatsApp(order, notifData.title, notifData.message);

      // Auto-send full invoice to customer when moving to awaiting_payment or processing
      if (newStatus === "awaiting_payment" || newStatus === "processing") {
        try {
          const { data: invRes, error: invErr } = await supabase.functions.invoke("send-invoice-whatsapp", {
            body: { orderId, statusContext: newStatus },
          });
          if (invErr || !invRes?.success) {
            toast({
              title: "تعذّر إرسال الفاتورة على واتساب",
              description: invRes?.error || invErr?.message || (invRes?.requiresTemplate ? "نافذة الـ24 ساعة منتهية — يلزم قالب." : "حاول مجدداً"),
              variant: "destructive",
            });
          } else {
            toast({
              title: "✅ تم إرسال الفاتورة على واتساب",
              description: `للعميل على الرقم ${invRes.formattedPhone || ""}`,
            });
          }
        } catch (e: any) {
          toast({ title: "فشل إرسال الفاتورة على واتساب", description: e?.message, variant: "destructive" });
        }
      }

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
            <div
              className={`rounded-lg p-3 text-center cursor-pointer transition-all hover:ring-2 hover:ring-primary/30 ${filterStatus === "all" ? "ring-2 ring-primary bg-muted" : "bg-muted/50"}`}
              onClick={() => handleStatClick("all")}
            >
              <p className="text-2xl font-bold text-foreground">{stats.total}</p>
              <p className="text-xs text-muted-foreground">إجمالي</p>
            </div>
            <div
              className={`rounded-lg p-3 text-center cursor-pointer transition-all hover:ring-2 hover:ring-yellow-400/50 ${filterStatus === "pending" ? "ring-2 ring-yellow-500" : "bg-yellow-500/10"}`}
              onClick={() => handleStatClick("pending")}
            >
              <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              <p className="text-xs text-muted-foreground">بانتظار الموافقة</p>
            </div>
            <div
              className={`rounded-lg p-3 text-center cursor-pointer transition-all hover:ring-2 hover:ring-orange-400/50 ${filterStatus === "processing" ? "ring-2 ring-orange-500" : "bg-orange-500/10"}`}
              onClick={() => handleStatClick("processing")}
            >
              <p className="text-2xl font-bold text-orange-600">{stats.processing}</p>
              <p className="text-xs text-muted-foreground">جاري التجهيز</p>
            </div>
            <div
              className={`rounded-lg p-3 text-center cursor-pointer transition-all hover:ring-2 hover:ring-purple-400/50 ${filterStatus === "shipped" ? "ring-2 ring-purple-500" : "bg-purple-500/10"}`}
              onClick={() => handleStatClick("shipped")}
            >
              <p className="text-2xl font-bold text-purple-600">{stats.shipped}</p>
              <p className="text-xs text-muted-foreground">تم الشحن</p>
            </div>
            <div
              className={`rounded-lg p-3 text-center cursor-pointer transition-all hover:ring-2 hover:ring-green-400/50 ${filterStatus === "delivered" ? "ring-2 ring-green-500" : "bg-green-500/10"}`}
              onClick={() => handleStatClick("delivered")}
            >
              <p className="text-2xl font-bold text-green-600">{stats.delivered}</p>
              <p className="text-xs text-muted-foreground">تم التسليم</p>
            </div>
            <div className="bg-primary/10 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-primary">{stats.totalRevenue.toLocaleString("ar-EG")}</p>
              <p className="text-xs text-muted-foreground">الإيرادات (ج.م)</p>
            </div>
          </div>

          {/* Order Type Tabs */}
          <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg mb-4 w-fit">
            {([
              { value: "all" as const, label: "الكل" },
              { value: "wholesale" as const, label: "🏢 جملة (B2B)" },
              { value: "retail" as const, label: "🛒 قطاعي (B2C)" },
            ]).map(tab => (
              <button
                key={tab.value}
                onClick={() => setOrderTypeFilter(tab.value)}
                className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${
                  orderTypeFilter === tab.value
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Filters */}
          <div className="flex flex-col gap-3 mb-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
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
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                {totalCount} طلب
              </span>
            </div>

            {/* Date range filter */}
            <div className="flex flex-wrap items-center gap-2 p-3 rounded-lg bg-muted/40 border border-border/60">
              <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">📅 التاريخ:</span>
              <div className="flex items-center gap-1.5">
                <label className="text-xs text-muted-foreground">من</label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  max={dateTo || undefined}
                  className="h-8 w-auto text-xs"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <label className="text-xs text-muted-foreground">إلى</label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  min={dateFrom || undefined}
                  className="h-8 w-auto text-xs"
                />
              </div>

              {/* Quick presets */}
              <div className="flex flex-wrap items-center gap-1 mr-1">
                {[
                  { label: "اليوم", days: 0 },
                  { label: "أمس", days: 1, single: true },
                  { label: "آخر 7 أيام", days: 6 },
                  { label: "آخر 30 يوم", days: 29 },
                  { label: "هذا الشهر", monthStart: true },
                ].map((p) => (
                  <Button
                    key={p.label}
                    variant="outline"
                    size="sm"
                    className="h-7 px-2.5 text-xs"
                    onClick={() => {
                      const today = new Date();
                      const fmt = (d: Date) => d.toISOString().slice(0, 10);
                      if (p.monthStart) {
                        const first = new Date(today.getFullYear(), today.getMonth(), 1);
                        setDateFrom(fmt(first));
                        setDateTo(fmt(today));
                      } else if (p.single) {
                        const d = new Date(today);
                        d.setDate(d.getDate() - (p.days as number));
                        setDateFrom(fmt(d));
                        setDateTo(fmt(d));
                      } else {
                        const d = new Date(today);
                        d.setDate(d.getDate() - (p.days as number));
                        setDateFrom(fmt(d));
                        setDateTo(fmt(today));
                      }
                    }}
                  >
                    {p.label}
                  </Button>
                ))}
                {(dateFrom || dateTo) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                    onClick={() => { setDateFrom(""); setDateTo(""); }}
                  >
                    <X className="w-3 h-3 ml-1" />
                    مسح
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Orders List */}
          <div ref={ordersListRef}></div>
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
                  <div
                    key={order.id}
                    id={`order-${order.id}`}
                    className={`border rounded-xl overflow-hidden transition-all ${
                      order.isDealer ? "border-blue-200 dark:border-blue-800/50" : "border-border"
                    } ${searchParams.get("highlight") === order.id ? "ring-2 ring-primary shadow-lg" : ""}`}
                  >
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
                            <Badge variant="outline" className={`text-[10px] font-bold border-0 ${order.isDealer ? "bg-blue-500/10 text-blue-600 dark:text-blue-400" : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"}`}>
                              {order.isDealer ? "🏢 جملة" : "🛒 قطاعي"}
                            </Badge>
                            {/* SLA Badge — only for new pending orders */}
                            {order.status === "pending" && !(order as any).first_contacted_at && (() => {
                              const mins = getMinutesAgo(order.created_at);
                              const isLate = mins >= SLA_MINUTES;
                              return (
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] font-bold border-0 gap-1 ${
                                    isLate
                                      ? "bg-destructive/15 text-destructive animate-pulse"
                                      : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                                  }`}
                                >
                                  {isLate ? <AlertTriangle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                                  {isLate ? `متأخر ${mins}د` : `${mins}د`}
                                </Badge>
                              );
                            })()}
                            {(order as any).first_contacted_at && order.status === "pending" && (
                              <Badge variant="outline" className="text-[10px] font-bold border-0 bg-green-500/10 text-green-600 dark:text-green-400 gap-1">
                                <CheckCircle className="w-3 h-3" />
                                تم التواصل
                              </Badge>
                            )}
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
                        {/* Quick WhatsApp button — visible for all orders that have phone */}
                        {order.profile?.phone && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs gap-1 border-green-500/40 text-green-600 hover:bg-green-50 dark:hover:bg-green-950/20"
                            onClick={(e) => { e.stopPropagation(); quickWhatsApp(order); }}
                            title="تواصل واتساب فوري"
                          >
                            <MessageCircle className="w-3 h-3" />
                            <span className="hidden md:inline">واتساب</span>
                          </Button>
                        )}
                        {order.status === "pending" && (
                          <Button
                            size="sm"
                            className="h-7 text-xs gap-1"
                            onClick={(e) => { e.stopPropagation(); handleStatusUpdate(order.id, "awaiting_payment"); }}
                            disabled={updatingStatus === order.id}
                          >
                            {updatingStatus === order.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                            موافقة → بانتظار الدفع
                          </Button>
                        )}
                        {order.status === "awaiting_payment" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs gap-1 border-green-300 text-green-700 hover:bg-green-50"
                            onClick={(e) => { e.stopPropagation(); handleStatusUpdate(order.id, "processing"); }}
                            disabled={updatingStatus === order.id}
                          >
                            {updatingStatus === order.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CreditCard className="w-3 h-3" />}
                            تأكيد الدفع
                          </Button>
                        )}
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

                        {(order as any).pickup_branch && (
                          <div className="text-sm bg-primary/5 border border-primary/20 rounded-lg p-3 flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-primary" />
                            <span className="text-muted-foreground">فرع الاستلام:</span>
                            <span className="font-bold text-primary">
                              {({ ossim: "أوسيم", luxor: "الأقصر", tawfiqia: "التوفيقية" } as Record<string, string>)[(order as any).pickup_branch] || (order as any).pickup_branch}
                            </span>
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
                            <>
                              <div className="flex justify-between items-center mt-2 px-3">
                                <span className="text-sm font-semibold text-foreground">الإجمالي</span>
                                <span className="text-lg font-bold text-primary">
                                  {Number(order.total_amount).toLocaleString("ar-EG")} ج.م
                                </span>
                              </div>
                              {(() => {
                                const itemsTotal = (order.items || []).reduce((s, it) => s + Number(it.total_price || 0), 0);
                                const shipping = Math.max(0, Number(order.total_amount) - itemsTotal + Number(order.coupon_discount || 0));
                                const lines = [
                                  `🧾 *فاتورة طلبك من المصرية لقطع غيار السيارات*`,
                                  `رقم الطلب: *${order.order_number}*`,
                                  ``,
                                  `*المنتجات:*`,
                                  ...(order.items || []).map(it => `• ${it.product?.name_ar || "منتج"}\n   ${it.quantity} × ${Number(it.unit_price).toLocaleString("ar-EG")} = ${Number(it.total_price).toLocaleString("ar-EG")} ج.م`),
                                  ``,
                                  `المنتجات: ${itemsTotal.toLocaleString("ar-EG")} ج.م`,
                                  shipping > 0 ? `الشحن: ${shipping.toLocaleString("ar-EG")} ج.م` : `الاستلام: من الفرع`,
                                  Number(order.coupon_discount || 0) > 0 ? `الخصم: -${Number(order.coupon_discount).toLocaleString("ar-EG")} ج.م` : "",
                                  `━━━━━━━━━━━━`,
                                  `💰 *الإجمالي: ${Number(order.total_amount).toLocaleString("ar-EG")} ج.م*`,
                                  ``,
                                  order.shipping_address ? `📍 العنوان: ${order.shipping_address}` : "",
                                  `شكراً لتعاملك معنا 🌹`,
                                ].filter(Boolean).join("\n");
                                const phoneRaw = (order.profile?.phone || "").replace(/\D/g, "");
                                const waPhone = phoneRaw.startsWith("0") ? "20" + phoneRaw.slice(1) : phoneRaw.startsWith("20") ? phoneRaw : phoneRaw;
                                return (
                                  <div className="mt-3 px-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="w-full gap-2 border-primary text-primary hover:bg-primary/5"
                                      onClick={() => setInvoicePreview(order)}
                                    >
                                      <Eye className="w-4 h-4" />
                                      معاينة الفاتورة (PDF / صورة)
                                    </Button>
                                    <Button
                                      size="sm"
                                      className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white"
                                      onClick={() => {
                                        const url = waPhone
                                          ? `https://wa.me/${waPhone}?text=${encodeURIComponent(lines)}`
                                          : `https://wa.me/?text=${encodeURIComponent(lines)}`;
                                        window.open(url, "_blank");
                                      }}
                                    >
                                      📤 إرسال على واتساب
                                    </Button>
                                  </div>
                                );
                              })()}
                            </>
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

                        {/* Shipping Tracking Info (displayed for shipped/delivered) */}
                        {(order.status === "shipped" || order.status === "delivered") && (
                          <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-4 space-y-2">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Truck className="w-4.5 h-4.5 text-purple-600" />
                                <span className="text-sm font-bold text-foreground">بيانات الشحن</span>
                              </div>
                              {editingShipping !== order.id ? (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 text-xs gap-1 text-muted-foreground hover:text-primary"
                                  onClick={() => {
                                    setEditingShipping(order.id);
                                    setShippingInfo(prev => ({
                                      ...prev,
                                      [order.id]: {
                                        shipping_company: (order as any).shipping_company || "",
                                        tracking_number: (order as any).tracking_number || "",
                                      }
                                    }));
                                  }}
                                >
                                  <Edit3 className="w-3 h-3" />
                                  تعديل
                                </Button>
                              ) : (
                                <div className="flex gap-1">
                                  <Button
                                    size="sm"
                                    className="h-7 text-xs gap-1"
                                    disabled={savingShipping}
                                    onClick={async () => {
                                      setSavingShipping(true);
                                      const info = shippingInfo[order.id];
                                      const { error } = await supabase.from("orders").update({
                                        shipping_company: info?.shipping_company || null,
                                        tracking_number: info?.tracking_number || null,
                                      }).eq("id", order.id);
                                      if (error) {
                                        toast({ title: "حدث خطأ أثناء التحديث", variant: "destructive" });
                                      } else {
                                        toast({ title: "تم تحديث بيانات الشحن ✓" });
                                        setEditingShipping(null);
                                        fetchOrders();
                                      }
                                      setSavingShipping(false);
                                    }}
                                  >
                                    {savingShipping ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                                    حفظ
                                  </Button>
                                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingShipping(null)}>
                                    <X className="w-3 h-3" />
                                  </Button>
                                </div>
                              )}
                            </div>

                            {editingShipping === order.id ? (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <Select
                                  value={shippingInfo[order.id]?.shipping_company || ""}
                                  onValueChange={(v) => setShippingInfo(prev => ({ ...prev, [order.id]: { ...prev[order.id], shipping_company: v } }))}
                                >
                                  <SelectTrigger className="text-sm">
                                    <SelectValue placeholder="اختر شركة الشحن" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {shippingCompanies.map(c => (
                                      <SelectItem key={c} value={c}>{c}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Input
                                  placeholder="رقم البوليصة / التتبع"
                                  value={shippingInfo[order.id]?.tracking_number || ""}
                                  onChange={(e) => setShippingInfo(prev => ({ ...prev, [order.id]: { ...prev[order.id], tracking_number: e.target.value } }))}
                                  className="text-sm"
                                  dir="ltr"
                                />
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                                {(order as any).shipping_company && (
                                  <div>
                                    <span className="text-muted-foreground">شركة الشحن: </span>
                                    <span className="font-semibold text-foreground">{(order as any).shipping_company}</span>
                                  </div>
                                )}
                                {(order as any).tracking_number && (
                                  <div>
                                    <span className="text-muted-foreground">رقم البوليصة: </span>
                                    <span className="font-mono font-bold text-foreground" dir="ltr">{(order as any).tracking_number}</span>
                                  </div>
                                )}
                                {(order as any).shipped_at && (
                                  <div>
                                    <span className="text-muted-foreground">تاريخ الشحن: </span>
                                    <span className="font-semibold text-foreground">
                                      {new Date((order as any).shipped_at).toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                                    </span>
                                  </div>
                                )}
                                {!(order as any).shipping_company && !(order as any).tracking_number && (
                                  <span className="text-muted-foreground text-xs">لم يتم إدخال بيانات شحن — اضغط "تعديل" لإضافتها</span>
                                )}
                              </div>
                            )}

                            {order.status === "delivered" && (order as any).delivered_at && (
                              <div className="text-sm pt-1 border-t border-purple-500/10 mt-2">
                                <span className="text-muted-foreground">تاريخ التسليم: </span>
                                <span className="font-semibold text-green-600">
                                  {new Date((order as any).delivered_at).toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                        {order.status !== "cancelled" && order.status !== "delivered" && (
                          <div className="border-t border-border pt-4 space-y-3">
                            {/* Shipping form — show when processing (about to ship) */}
                            {(order.status === "processing" || statusFlow.indexOf(order.status) >= statusFlow.indexOf("processing")) && order.status !== "shipped" && (
                              <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-4 space-y-3">
                                <div className="flex items-center gap-2">
                                  <Truck className="w-4 h-4 text-purple-600" />
                                  <span className="text-sm font-bold text-foreground">بيانات الشحن (اختياري)</span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  <Select
                                    value={shippingInfo[order.id]?.shipping_company || ""}
                                    onValueChange={(v) => setShippingInfo(prev => ({ ...prev, [order.id]: { ...prev[order.id], shipping_company: v, tracking_number: prev[order.id]?.tracking_number || "" } }))}
                                  >
                                    <SelectTrigger className="text-sm">
                                      <SelectValue placeholder="اختر شركة الشحن" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {shippingCompanies.map(c => (
                                        <SelectItem key={c} value={c}>{c}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <Input
                                    placeholder="رقم البوليصة / التتبع"
                                    value={shippingInfo[order.id]?.tracking_number || ""}
                                    onChange={(e) => setShippingInfo(prev => ({ ...prev, [order.id]: { ...prev[order.id], tracking_number: e.target.value, shipping_company: prev[order.id]?.shipping_company || "" } }))}
                                    className="text-sm"
                                    dir="ltr"
                                  />
                                </div>
                              </div>
                            )}

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

      {invoicePreview && (
        <InvoicePreviewDialog
          open={!!invoicePreview}
          onOpenChange={(o) => !o && setInvoicePreview(null)}
          order={{
            order_number: invoicePreview.order_number,
            created_at: invoicePreview.created_at,
            total_amount: Number(invoicePreview.total_amount),
            coupon_discount: Number(invoicePreview.coupon_discount || 0),
            shipping_address: invoicePreview.shipping_address,
            shipping_governorate: invoicePreview.shipping_governorate,
            pickup_branch: invoicePreview.pickup_branch,
            payment_method: invoicePreview.payment_method,
            customer_name: invoicePreview.profile?.full_name || undefined,
            customer_phone: invoicePreview.profile?.phone || undefined,
            items: (invoicePreview.items || []).map(it => ({
              name_ar: it.product?.name_ar,
              sku: it.product?.sku,
              quantity: it.quantity,
              unit_price: Number(it.unit_price),
              total_price: Number(it.total_price),
            })),
          }}
        />
      )}
    </div>
  );
};

export default AdminOrders;
