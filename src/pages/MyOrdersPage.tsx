import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package, Clock, CheckCircle2, Truck, PackageCheck, ChevronDown,
  ChevronUp, ArrowRight, ShoppingCart, MapPin, CreditCard, CalendarDays,
  CircleDot, Phone
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const ORDER_STATUSES = [
  { key: "pending", label: "قيد المراجعة", icon: Clock, color: "text-amber-500", bg: "bg-amber-500" },
  { key: "confirmed", label: "تم التأكيد", icon: CheckCircle2, color: "text-blue-500", bg: "bg-blue-500" },
  { key: "processing", label: "جاري التجهيز", icon: Package, color: "text-purple-500", bg: "bg-purple-500" },
  { key: "shipped", label: "تم الشحن", icon: Truck, color: "text-orange-500", bg: "bg-orange-500" },
  { key: "delivered", label: "تم التسليم", icon: PackageCheck, color: "text-green-600", bg: "bg-green-600" },
];

const paymentLabels: Record<string, string> = {
  cod: "الدفع عند الاستلام",
  card: "بطاقة ائتمان",
  instapay: "InstaPay",
  bank_transfer: "تحويل بنكي",
  wallet: "محفظة إلكترونية",
  paymob: "Paymob",
  fawry: "Fawry",
};

const getStatusIndex = (status: string) => {
  const idx = ORDER_STATUSES.findIndex((s) => s.key === status);
  return idx === -1 ? 0 : idx;
};

const MyOrdersPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const highlightOrder = searchParams.get("highlight");
  const { user, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [orderItems, setOrderItems] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(highlightOrder);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
      return;
    }
    if (user) fetchOrders();
  }, [user, authLoading]);

  const fetchOrders = async () => {
    const { data } = await supabase
      .from("orders")
      .select("*")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false });

    const orderList = data || [];
    setOrders(orderList);

    // Fetch items for all orders
    if (orderList.length > 0) {
      const { data: items } = await supabase
        .from("order_items")
        .select("*, products(name_ar, sku, image_url, brand)")
        .in("order_id", orderList.map((o) => o.id));

      const grouped: Record<string, any[]> = {};
      (items || []).forEach((item) => {
        if (!grouped[item.order_id]) grouped[item.order_id] = [];
        grouped[item.order_id].push(item);
      });
      setOrderItems(grouped);
    }

    setLoading(false);

    // Auto-expand highlighted order
    if (highlightOrder && orderList.find((o) => o.id === highlightOrder)) {
      setExpandedOrder(highlightOrder);
    } else if (highlightOrder && orderList.length > 0) {
      // If highlight is an order_number, find by order_number
      const found = orderList.find((o) => o.order_number === highlightOrder);
      if (found) setExpandedOrder(found.id);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 pb-20 flex items-center justify-center">
          <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-12">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="flex items-center gap-2 mb-6">
            <Link to="/" className="text-sm text-primary hover:underline flex items-center gap-1">
              <ArrowRight className="w-4 h-4" />
              الرئيسية
            </Link>
          </div>

          <h1 className="text-2xl md:text-3xl font-black text-foreground mb-8">
            طلباتي
          </h1>

          {orders.length === 0 ? (
            <div className="text-center py-20">
              <ShoppingCart className="w-20 h-20 text-muted-foreground/20 mx-auto mb-6" />
              <h2 className="text-xl font-bold text-foreground mb-3">لا توجد طلبات بعد</h2>
              <p className="text-muted-foreground mb-6">ابدأ التسوق الآن واطلب قطع الغيار التي تحتاجها</p>
              <Button asChild>
                <Link to="/products">تصفح المنتجات</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order, i) => {
                const statusIdx = getStatusIndex(order.status);
                const currentStatus = ORDER_STATUSES[statusIdx];
                const isExpanded = expandedOrder === order.id;
                const items = orderItems[order.id] || [];
                const isHighlighted = highlightOrder === order.id || highlightOrder === order.order_number;

                return (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={`bg-card border-2 rounded-xl overflow-hidden transition-all ${
                      isHighlighted ? "border-primary shadow-lg shadow-primary/10" : "border-border"
                    }`}
                  >
                    {/* Order Header */}
                    <button
                      onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                      className="w-full p-4 md:p-5 flex items-center justify-between gap-4 hover:bg-muted/30 transition-colors text-right"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-10 h-10 rounded-full ${currentStatus.bg}/10 flex items-center justify-center shrink-0`}>
                          <currentStatus.icon className={`w-5 h-5 ${currentStatus.color}`} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-card-foreground text-sm md:text-base truncate">
                            {order.order_number}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={`text-xs font-semibold ${currentStatus.color}`}>
                              {currentStatus.label}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(order.created_at).toLocaleDateString("ar-EG", {
                                year: "numeric", month: "short", day: "numeric"
                              })}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-black text-primary text-sm md:text-base">
                          {Number(order.total_amount).toLocaleString("ar-EG")} ج.م
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                    </button>

                    {/* Expanded Details */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 md:px-5 pb-5 border-t border-border pt-5 space-y-6">
                            {/* Status Timeline */}
                            <div>
                              <h3 className="text-sm font-bold text-card-foreground mb-4">مسار الطلب</h3>
                              <div className="flex items-center justify-between relative">
                                {/* Progress Line */}
                                <div className="absolute top-4 right-4 left-4 h-0.5 bg-border z-0" />
                                <div
                                  className="absolute top-4 right-4 h-0.5 bg-primary z-0 transition-all duration-700"
                                  style={{ width: `${(statusIdx / (ORDER_STATUSES.length - 1)) * 100}%`, maxWidth: "calc(100% - 2rem)" }}
                                />

                                {ORDER_STATUSES.map((s, idx) => {
                                  const isCompleted = idx <= statusIdx;
                                  const isCurrent = idx === statusIdx;
                                  return (
                                    <div key={s.key} className="relative z-10 flex flex-col items-center gap-1.5">
                                      <motion.div
                                        initial={isCurrent ? { scale: 0.8 } : {}}
                                        animate={isCurrent ? { scale: [0.8, 1.1, 1] } : {}}
                                        transition={{ duration: 0.5 }}
                                        className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                                          isCompleted
                                            ? `${s.bg} border-transparent`
                                            : "bg-card border-border"
                                        }`}
                                      >
                                        <s.icon className={`w-4 h-4 ${isCompleted ? "text-white" : "text-muted-foreground/40"}`} />
                                      </motion.div>
                                      <span className={`text-[9px] md:text-[10px] font-semibold text-center leading-tight max-w-[60px] ${
                                        isCompleted ? s.color : "text-muted-foreground/40"
                                      }`}>
                                        {s.label}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Order Info Cards */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              {order.shipping_address && (
                                <div className="bg-muted/50 rounded-lg p-3 flex items-start gap-2.5">
                                  <MapPin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                                  <div>
                                    <p className="text-[10px] text-muted-foreground font-semibold mb-0.5">عنوان الشحن</p>
                                    <p className="text-xs text-card-foreground whitespace-pre-line leading-relaxed">{order.shipping_address}</p>
                                  </div>
                                </div>
                              )}
                              {order.payment_method && (
                                <div className="bg-muted/50 rounded-lg p-3 flex items-start gap-2.5">
                                  <CreditCard className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                                  <div>
                                    <p className="text-[10px] text-muted-foreground font-semibold mb-0.5">وسيلة الدفع</p>
                                    <p className="text-xs text-card-foreground font-semibold">
                                      {paymentLabels[order.payment_method] || order.payment_method}
                                    </p>
                                  </div>
                                </div>
                              )}
                              <div className="bg-muted/50 rounded-lg p-3 flex items-start gap-2.5">
                                <CalendarDays className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                                <div>
                                  <p className="text-[10px] text-muted-foreground font-semibold mb-0.5">تاريخ الطلب</p>
                                  <p className="text-xs text-card-foreground font-semibold">
                                    {new Date(order.created_at).toLocaleDateString("ar-EG", {
                                      year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit"
                                    })}
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Admin Notes */}
                            {order.notes && (
                              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3 flex items-start gap-2.5">
                                <CircleDot className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                                <div>
                                  <p className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold mb-0.5">ملاحظات على الطلب</p>
                                  <p className="text-xs text-blue-800 dark:text-blue-300">{order.notes}</p>
                                </div>
                              </div>
                            )}

                            {/* Order Items */}
                            <div>
                              <h3 className="text-sm font-bold text-card-foreground mb-3">المنتجات ({items.length})</h3>
                              <div className="space-y-2.5">
                                {items.map((item) => (
                                  <div key={item.id} className="flex items-center gap-3 bg-muted/30 rounded-lg p-3">
                                    <div className="w-12 h-12 rounded-md bg-white overflow-hidden shrink-0 border border-border">
                                      {item.products?.image_url ? (
                                        <img src={item.products.image_url} alt={item.products.name_ar} className="w-full h-full object-contain" />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                          <Package className="w-5 h-5 text-muted-foreground/20" />
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-bold text-card-foreground truncate">
                                        {item.products?.name_ar || "منتج"}
                                      </p>
                                      <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                                        {item.products?.sku}
                                      </p>
                                    </div>
                                    <div className="text-left shrink-0">
                                      <p className="text-xs font-bold text-card-foreground">
                                        {Number(item.total_price).toLocaleString("ar-EG")} ج.م
                                      </p>
                                      <p className="text-[10px] text-muted-foreground">
                                        {item.quantity} × {Number(item.unit_price).toLocaleString("ar-EG")}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Contact Support */}
                            <div className="flex justify-center pt-2">
                              <a
                                href={`https://wa.me/201153961008?text=${encodeURIComponent(`استفسار عن الطلب رقم: ${order.order_number}`)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 text-xs font-semibold text-green-600 hover:text-green-700 transition-colors"
                              >
                                <Phone className="w-3.5 h-3.5" />
                                تواصل معنا بخصوص هذا الطلب
                              </a>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default MyOrdersPage;
