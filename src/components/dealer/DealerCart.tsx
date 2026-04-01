import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useDealerCart } from "@/hooks/useDealerCart";
import { generateOrderNumber } from "@/lib/orderNumber";
import { pushOrderToERP } from "@/lib/erpSync";
import { notifyNewOrderWhatsApp } from "@/lib/whatsapp";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import {
  ShoppingCart, Trash2, Minus, Plus, Package, Loader2,
  ArrowRight, FileText, XCircle, CheckCircle2, MessageCircle, CreditCard
} from "lucide-react";


interface DealerCartProps {
  onNavigateToOrders: () => void;
  onNavigateToPayment: () => void;
  sharedCart?: ReturnType<typeof useDealerCart>;
}

const DealerCart = ({ onNavigateToOrders, onNavigateToPayment, sharedCart }: DealerCartProps) => {
  const { user, dealerAccount } = useAuth();
  const fallbackCart = useDealerCart();
  const cart = sharedCart || fallbackCart;
  const { items, loading, updateQuantity, removeItem, clearCart, fetchCart } = cart;
  const [tierPrices, setTierPrices] = useState<Record<string, number>>({});
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [shippingAddress, setShippingAddress] = useState("");
  const [shippingGovernorate, setShippingGovernorate] = useState("");


  // Fetch tier prices for all items
  const fetchTierPrices = async () => {
    if (!dealerAccount?.tier || items.length === 0) return;
    setLoadingPrices(true);
    const productIds = items.map(i => i.product_id);
    const { data } = await supabase
      .from("product_tier_prices")
      .select("product_id, price")
      .eq("tier", dealerAccount.tier as any)
      .in("product_id", productIds);

    if (data) {
      const map: Record<string, number> = {};
      data.forEach(tp => { map[tp.product_id] = tp.price; });
      setTierPrices(map);
    }
    setLoadingPrices(false);
  };

  // Fetch tier prices when items change
  useEffect(() => { fetchTierPrices(); }, [items.length]);

  const getPrice = (item: typeof items[0]) => {
    if (tierPrices[item.product_id]) return tierPrices[item.product_id];
    return item.product.base_price;
  };

  const subtotal = items.reduce((sum, item) => sum + getPrice(item) * item.quantity, 0);
  const vat = subtotal * 0.14;
  const total = subtotal + vat;

  const createOrder = async (): Promise<{ id: string; order_number: string } | null> => {
    if (!user || items.length === 0) return null;
    const orderNumber = await generateOrderNumber();
    const { data: order, error } = await supabase
      .from("orders")
      .insert({
        user_id: user.id,
        order_number: orderNumber,
        total_amount: total,
        notes: notes || null,
        shipping_address: shippingAddress || null,
        shipping_governorate: shippingGovernorate || null,
        status: "pending",
      })
      .select()
      .single();

    if (error || !order) return null;

    await supabase.from("order_items").insert(
      items.map(item => ({
        order_id: (order as any).id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: getPrice(item),
        total_price: getPrice(item) * item.quantity,
      }))
    );

    await clearCart();
    pushOrderToERP((order as any).id);
    notifyNewOrderWhatsApp(orderNumber, total);
    return { id: (order as any).id, order_number: orderNumber };
  };

  const handleSubmitOrder = async () => {
    if (!user || items.length === 0) return;
    setSubmitting(true);
    try {
      const order = await createOrder();
      if (!order) {
        toast({ title: "خطأ في إنشاء الطلب", variant: "destructive" });
        return;
      }
      toast({ title: "✅ تم إرسال الطلب بنجاح", description: `رقم الطلب: ${order.order_number}` });
      setNotes(""); setShippingAddress(""); setShippingGovernorate("");
      onNavigateToOrders();
    } catch {
      toast({ title: "حدث خطأ", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handlePayNow = async () => {
    if (!user || items.length === 0) return;
    setSubmittingPayment(true);
    try {
      const order = await createOrder();
      if (!order) {
        toast({ title: "خطأ في إنشاء الطلب", variant: "destructive" });
        return;
      }
      toast({ title: "✅ تم إنشاء الطلب", description: `رقم الطلب: ${order.order_number} — جاري التوجيه للدفع...` });
      setNotes(""); setShippingAddress(""); setShippingGovernorate("");
      onNavigateToPayment();
    } catch {
      toast({ title: "حدث خطأ", variant: "destructive" });
    } finally {
      setSubmittingPayment(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground mr-2">جاري التحميل...</span>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12 space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto">
            <ShoppingCart className="w-8 h-8 text-muted-foreground/40" />
          </div>
          <h3 className="text-lg font-bold text-foreground">السلة فارغة</h3>
          <p className="text-sm text-muted-foreground">أضف أصناف من البحث أو عروض الأسعار</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-foreground flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-primary" />
            سلة المشتريات
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {items.length} صنف في السلة
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={clearCart}
          className="text-destructive hover:text-destructive text-xs gap-1"
        >
          <Trash2 className="w-3.5 h-3.5" />
          تفريغ السلة
        </Button>
      </div>

      {/* Cart Items */}
      <div className="space-y-2">
        <AnimatePresence>
          {items.map((item, idx) => {
            const price = getPrice(item);
            const inStock = item.product.stock_quantity > 0;

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ delay: idx * 0.03 }}
                className="flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-card hover:bg-muted/30 transition-all"
              >
                {/* Image */}
                <div className="w-14 h-14 rounded-lg bg-muted/50 overflow-hidden shrink-0">
                  {item.product.image_url ? (
                    <img src={item.product.image_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-6 h-6 text-muted-foreground/30" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground truncate">{item.product.name_ar}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] font-mono text-muted-foreground">{item.product.sku}</span>
                    <span className={`inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                      inStock ? "text-emerald-700 bg-emerald-500/10" : "text-destructive bg-destructive/10"
                    }`}>
                      {inStock ? <CheckCircle2 className="w-2.5 h-2.5" /> : <XCircle className="w-2.5 h-2.5" />}
                      {inStock ? "متوفر" : "نفد"}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    سعر الوحدة: {price.toLocaleString("ar-EG")} ج.م
                  </p>
                </div>

                {/* Quantity Controls */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                    className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-foreground hover:bg-muted-foreground/20 transition-colors"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-sm font-bold w-8 text-center text-foreground">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                    className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-foreground hover:bg-muted-foreground/20 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Price & Remove */}
                <div className="text-left shrink-0 space-y-1">
                  <p className="text-sm font-black text-primary">
                    {(price * item.quantity).toLocaleString("ar-EG")} ج.م
                  </p>
                  <button
                    onClick={() => removeItem(item.product_id)}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors mr-auto"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Order Details */}
      <div className="space-y-3 rounded-xl border border-border/50 bg-card p-4">
        <h3 className="text-sm font-bold text-foreground">بيانات الطلب</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">المحافظة</label>
            <Input
              value={shippingGovernorate}
              onChange={(e) => setShippingGovernorate(e.target.value)}
              placeholder="مثال: القاهرة"
              className="text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">العنوان التفصيلي</label>
            <Input
              value={shippingAddress}
              onChange={(e) => setShippingAddress(e.target.value)}
              placeholder="مثال: شارع التحرير، المعادي"
              className="text-sm"
            />
          </div>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">ملاحظات (اختياري)</label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="أي ملاحظات أو تعليمات خاصة بالطلب..."
            rows={2}
            className="text-sm resize-none"
          />
        </div>
      </div>

      {/* Summary */}
      <div className="rounded-xl bg-muted/50 border border-border/50 p-4 space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">المجموع الفرعي</span>
          <span className="font-bold text-foreground">{subtotal.toLocaleString("ar-EG")} ج.م</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">ضريبة القيمة المضافة (14%)</span>
          <span className="font-bold text-foreground">{vat.toLocaleString("ar-EG")} ج.م</span>
        </div>
        <div className="border-t border-border/50 pt-3 flex items-center justify-between">
          <span className="text-base font-bold text-foreground">الإجمالي</span>
          <span className="text-xl font-black text-primary">{total.toLocaleString("ar-EG")} ج.م</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-2">
        <Button
          className="flex-1 gap-2 text-sm h-12 bg-emerald-600 hover:bg-emerald-700 text-white"
          onClick={handlePayNow}
          disabled={submittingPayment || submitting || items.length === 0}
        >
          {submittingPayment ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <CreditCard className="w-4 h-4" />
          )}
          ادفع الآن
        </Button>
        <Button
          variant="outline"
          className="flex-1 gap-2 text-sm h-12"
          onClick={handleSubmitOrder}
          disabled={submitting || submittingPayment || items.length === 0}
        >
          {submitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <ArrowRight className="w-4 h-4" />
          )}
          أرسل الطلب (ادفع لاحقاً)
        </Button>
      </div>

      <p className="text-[10px] text-muted-foreground text-center">
        "ادفع الآن" ينقلك مباشرة للدفع الإلكتروني — "أرسل الطلب" يرسله للمراجعة والدفع لاحقاً
      </p>
    </div>
  );
};

export default DealerCart;
