import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Package, CheckCircle2, Truck, Clock, CreditCard,
  XCircle, ArrowRight, Loader2, Phone, MapPin, Calendar,
  ShieldCheck, PackageCheck, ClipboardList
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface OrderData {
  id: string;
  order_number: string;
  status: string;
  total_amount: number;
  created_at: string;
  updated_at: string;
  payment_method: string | null;
  shipping_address: string | null;
  shipping_governorate: string | null;
  notes: string | null;
  bosta_tracking_number?: string | null;
  bosta_status?: string | null;
  items: {
    id: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    product: {
      name_ar: string;
      sku: string;
      image_url: string | null;
    } | null;
  }[];
}

const STATUS_MAP: Record<string, { label: string; color: string; icon: React.ElementType; step: number }> = {
  pending: { label: "تم استلام الطلب", color: "text-blue-600 bg-blue-100 dark:bg-blue-900/30", icon: ClipboardList, step: 1 },
  pending_approval: { label: "بانتظار الموافقة", color: "text-amber-600 bg-amber-100 dark:bg-amber-900/30", icon: Clock, step: 1 },
  confirmed: { label: "تمت الموافقة", color: "text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30", icon: CheckCircle2, step: 2 },
  awaiting_payment: { label: "بانتظار الدفع", color: "text-orange-600 bg-orange-100 dark:bg-orange-900/30", icon: CreditCard, step: 3 },
  processing: { label: "جاري التجهيز", color: "text-indigo-600 bg-indigo-100 dark:bg-indigo-900/30", icon: Package, step: 4 },
  shipped: { label: "تم الشحن", color: "text-purple-600 bg-purple-100 dark:bg-purple-900/30", icon: Truck, step: 5 },
  delivered: { label: "تم التسليم", color: "text-green-600 bg-green-100 dark:bg-green-900/30", icon: PackageCheck, step: 6 },
  cancelled: { label: "ملغي", color: "text-red-600 bg-red-100 dark:bg-red-900/30", icon: XCircle, step: 0 },
};

const TIMELINE_STEPS = [
  { key: "pending", label: "استلام الطلب", icon: ClipboardList },
  { key: "confirmed", label: "الموافقة", icon: CheckCircle2 },
  { key: "awaiting_payment", label: "الدفع", icon: CreditCard },
  { key: "processing", label: "التجهيز", icon: Package },
  { key: "shipped", label: "الشحن", icon: Truck },
  { key: "delivered", label: "التسليم", icon: PackageCheck },
];

const TrackOrderPage = () => {
  const { user } = useAuth();
  const [orderNumber, setOrderNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<OrderData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    const trimmed = orderNumber.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);
    setOrder(null);
    setSearched(true);

    try {
      // Build query — if user is logged in, filter by user_id for security
      let query = supabase
        .from("orders")
        .select("id, order_number, status, total_amount, created_at, updated_at, payment_method, shipping_address, shipping_governorate, notes, bosta_tracking_number, bosta_status")
        .eq("order_number", trimmed);

      if (user) {
        query = query.eq("user_id", user.id);
      }

      const { data: orderData, error: orderErr } = await query.maybeSingle();

      if (orderErr) throw orderErr;
      if (!orderData) {
        setError("لم يتم العثور على طلب بهذا الرقم");
        setLoading(false);
        return;
      }

      // Fetch order items
      const { data: items } = await supabase
        .from("order_items")
        .select("id, quantity, unit_price, total_price, product_id")
        .eq("order_id", orderData.id);

      // Fetch product details for items
      const productIds = items?.map(i => i.product_id) || [];
      let productsMap: Record<string, any> = {};
      if (productIds.length > 0) {
        const { data: products } = await supabase
          .from("products")
          .select("id, name_ar, sku, image_url")
          .in("id", productIds);
        products?.forEach(p => { productsMap[p.id] = p; });
      }

      setOrder({
        ...orderData,
        items: (items || []).map(i => ({
          ...i,
          product: productsMap[i.product_id] || null,
        })),
      });
    } catch (err: any) {
      console.error(err);
      setError("حدث خطأ أثناء البحث. حاول مرة أخرى.");
    } finally {
      setLoading(false);
    }
  };

  const currentStep = order ? (STATUS_MAP[order.status]?.step || 0) : 0;
  const isCancelled = order?.status === "cancelled";

  return (
    <div className="min-h-[100svh] bg-background flex flex-col">
      <Navbar />
      <div className="pt-20 md:pt-24 pb-12 flex-1">
        <div className="container mx-auto px-4 max-w-2xl">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-6 md:mb-8"
          >
            <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <Search className="w-7 h-7 md:w-8 md:h-8 text-primary" />
            </div>
            <h1 className="text-xl md:text-3xl font-black text-foreground">تتبع طلبك</h1>
            <p className="text-xs md:text-sm text-muted-foreground mt-1">أدخل رقم الطلب لمعرفة حالته</p>
          </motion.div>

          {/* Search Box */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-card border border-border rounded-2xl p-4 sm:p-6 mb-6"
          >
            <div className="flex gap-2">
              <Input
                placeholder="مثال: ALM-20260401-XXXX"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="h-11 sm:h-12 text-sm sm:text-base font-mono bg-background"
                dir="ltr"
              />
              <Button
                onClick={handleSearch}
                disabled={loading || !orderNumber.trim()}
                className="h-11 sm:h-12 px-5 sm:px-6 gap-2 shrink-0"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">بحث</span>
              </Button>
            </div>
          </motion.div>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="bg-destructive/5 border border-destructive/20 rounded-xl p-4 mb-6 flex items-center gap-3"
              >
                <XCircle className="w-5 h-5 text-destructive shrink-0" />
                <p className="text-sm text-foreground">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Order Result */}
          <AnimatePresence>
            {order && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                {/* Status Card */}
                <div className="bg-card border border-border rounded-2xl p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">رقم الطلب</p>
                      <p className="font-bold font-mono text-foreground text-sm sm:text-base" dir="ltr">
                        {order.order_number}
                      </p>
                    </div>
                    {STATUS_MAP[order.status] && (
                      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs sm:text-sm font-bold ${STATUS_MAP[order.status].color}`}>
                        {(() => { const Icon = STATUS_MAP[order.status].icon; return <Icon className="w-3.5 h-3.5" />; })()}
                        {STATUS_MAP[order.status].label}
                      </div>
                    )}
                  </div>

                  {/* Timeline */}
                  {!isCancelled && (
                    <div className="mt-6">
                      <div className="flex items-center justify-between relative">
                        {/* Background line */}
                        <div className="absolute top-4 left-4 right-4 h-0.5 bg-border" />
                        {/* Active line */}
                        <div
                          className="absolute top-4 right-4 h-0.5 bg-primary transition-all duration-700"
                          style={{ width: `${Math.max(0, ((currentStep - 1) / (TIMELINE_STEPS.length - 1)) * 100)}%` }}
                        />

                        {TIMELINE_STEPS.map((step, idx) => {
                          const stepNum = idx + 1;
                          const isActive = currentStep >= stepNum;
                          const isCurrent = currentStep === stepNum;
                          const Icon = step.icon;
                          return (
                            <div key={step.key} className="flex flex-col items-center relative z-10">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                                isCurrent
                                  ? "bg-primary text-primary-foreground ring-4 ring-primary/20 scale-110"
                                  : isActive
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted text-muted-foreground"
                              }`}>
                                <Icon className="w-3.5 h-3.5" />
                              </div>
                              <span className={`text-[9px] sm:text-[10px] mt-1.5 font-semibold text-center leading-tight max-w-[50px] ${
                                isActive ? "text-primary" : "text-muted-foreground"
                              }`}>
                                {step.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Bosta tracking */}
                  {order.bosta_tracking_number && (
                    <div className="mt-4 bg-muted/40 border border-border rounded-xl p-3 text-sm">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div>
                          <p className="text-xs text-muted-foreground mb-0.5">رقم بوليصة Bosta</p>
                          <p className="font-mono font-bold text-foreground" dir="ltr">{order.bosta_tracking_number}</p>
                          {order.bosta_status && (
                            <p className="text-xs text-muted-foreground mt-1">الحالة: {order.bosta_status}</p>
                          )}
                        </div>
                        <a
                          href={`https://bosta.co/tracking-shipment/${order.bosta_tracking_number}`}
                          target="_blank" rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline font-semibold"
                        >
                          تتبع مباشرة على Bosta ←
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Cancelled banner */}
                  {isCancelled && (
                    <div className="mt-4 bg-destructive/5 border border-destructive/20 rounded-xl p-3 flex items-center gap-2">
                      <XCircle className="w-5 h-5 text-destructive shrink-0" />
                      <p className="text-sm text-foreground font-semibold">تم إلغاء هذا الطلب</p>
                    </div>
                  )}
                </div>

                {/* Order Details */}
                <div className="bg-card border border-border rounded-2xl p-4 sm:p-6">
                  <h3 className="font-bold text-foreground text-sm sm:text-base mb-3 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-primary" />
                    تفاصيل الطلب
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                      <div>
                        <p className="text-[10px] text-muted-foreground">تاريخ الطلب</p>
                        <p className="font-semibold text-xs">
                          {new Date(order.created_at).toLocaleDateString("ar-EG", { day: "numeric", month: "long", year: "numeric" })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-3.5 h-3.5 text-muted-foreground" />
                      <div>
                        <p className="text-[10px] text-muted-foreground">الإجمالي</p>
                        <p className="font-black text-primary text-sm">{order.total_amount.toLocaleString("ar-EG")} ج.م</p>
                      </div>
                    </div>
                    {order.shipping_governorate && (
                      <div className="flex items-center gap-2 col-span-2">
                        <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <div>
                          <p className="text-[10px] text-muted-foreground">عنوان الشحن</p>
                          <p className="font-semibold text-xs">{order.shipping_governorate}</p>
                        </div>
                      </div>
                    )}
                    {order.payment_method && (
                      <div className="flex items-center gap-2 col-span-2">
                        <CreditCard className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <div>
                          <p className="text-[10px] text-muted-foreground">طريقة الدفع</p>
                          <p className="font-semibold text-xs">
                            {order.payment_method === "cod" ? "الدفع عند الاستلام" :
                             order.payment_method === "paymob" ? "بطاقة بنكية" :
                             order.payment_method}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Order Items */}
                {order.items.length > 0 && (
                  <div className="bg-card border border-border rounded-2xl p-4 sm:p-6">
                    <h3 className="font-bold text-foreground text-sm sm:text-base mb-3 flex items-center gap-2">
                      <Package className="w-4 h-4 text-primary" />
                      المنتجات ({order.items.length})
                    </h3>
                    <div className="space-y-3">
                      {order.items.map((item) => (
                        <div key={item.id} className="flex items-center gap-3 p-2 rounded-xl bg-muted/30">
                          <div className="w-12 h-12 rounded-lg bg-white border border-border shrink-0 flex items-center justify-center overflow-hidden">
                            {item.product?.image_url ? (
                              <img src={item.product.image_url} alt="" className="w-full h-full object-contain p-1" />
                            ) : (
                              <Package className="w-5 h-5 text-muted-foreground/20" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-foreground truncate">
                              {item.product?.name_ar || "منتج"}
                            </p>
                            {item.product?.sku && (
                              <p className="text-[10px] font-mono text-muted-foreground">{item.product.sku}</p>
                            )}
                            <p className="text-[10px] text-muted-foreground">
                              {item.quantity} × {item.unit_price.toLocaleString("ar-EG")} ج.م
                            </p>
                          </div>
                          <p className="text-xs font-bold text-primary shrink-0">
                            {item.total_price.toLocaleString("ar-EG")} ج.م
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* WhatsApp support */}
                <div className="text-center pt-2">
                  <a
                    href={`https://wa.me/201034806288?text=${encodeURIComponent(`استفسار عن الطلب رقم: ${order.order_number}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-xs sm:text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    تواصل معنا عبر واتساب للاستفسار
                  </a>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Empty state after search */}
          {searched && !order && !error && !loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <Package className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">لم يتم العثور على نتائج</p>
            </motion.div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default TrackOrderPage;
