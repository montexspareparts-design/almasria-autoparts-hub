import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, Plus, Minus, ShoppingCart, ShoppingBag, ArrowRight, AlertTriangle, Package, Shield, Truck, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import CouponInput from "@/components/CouponInput";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const CartPage = () => {
  const { items, removeItem, updateQuantity, subtotal, vat, shippingCost, discount, couponCode, couponDiscount, setCouponCode, setCouponDiscount, total, itemCount } = useCart();
  const { isDealer, dealerAccount } = useAuth();
  const navigate = useNavigate();

  const minOrderAmount = dealerAccount?.min_order_amount ?? 0;
  const belowMinOrder = isDealer && minOrderAmount > 0 && subtotal < minOrderAmount;

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 pb-20">
          <div className="container mx-auto px-4 text-center py-20">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, type: "spring" }}
              className="w-28 h-28 mx-auto mb-8 rounded-full bg-muted/50 flex items-center justify-center"
            >
              <ShoppingCart className="w-14 h-14 text-muted-foreground/30" />
            </motion.div>
            <motion.h1
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.15 }}
              className="text-2xl font-bold text-foreground mb-3"
            >
              سلة المشتريات فارغة
            </motion.h1>
            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.25 }}
              className="text-muted-foreground mb-8"
            >
              لم تقم بإضافة أي منتجات بعد
            </motion.p>
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.35 }}>
              <Button asChild size="lg" className="px-8">
                <Link to="/products">تصفح المنتجات</Link>
              </Button>
            </motion.div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-12">
        <div className="container mx-auto px-4">
          {/* Header */}
          <motion.div
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="flex items-center justify-between mb-8"
          >
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-foreground">
                سلة المشتريات
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {itemCount} منتج في السلة
              </p>
            </div>
            <Link to="/products" className="text-sm text-primary hover:underline flex items-center gap-1 font-medium">
              <ArrowRight className="w-4 h-4" />
              متابعة التسوق
            </Link>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-3">
              <AnimatePresence mode="popLayout">
                {items.map((item, i) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -30, scale: 0.95 }}
                    transition={{ delay: i * 0.04, type: "spring", stiffness: 300, damping: 30 }}
                    className="group bg-card border border-border rounded-xl p-4 md:p-5 flex gap-4 hover:shadow-lg hover:border-primary/20 transition-all duration-300"
                  >
                    {/* Image */}
                    <div className="w-24 h-24 md:w-28 md:h-28 rounded-xl overflow-hidden bg-white border border-border shrink-0 p-2">
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.name_ar} className="w-full h-full object-contain" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-10 h-10 text-muted-foreground/20" />
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <h3 className="font-bold text-card-foreground text-sm md:text-base leading-tight line-clamp-2">{item.name_ar}</h3>
                        <p className="text-xs text-muted-foreground font-mono mt-1.5 bg-muted/50 inline-block px-2 py-0.5 rounded">{item.sku}</p>
                      </div>

                      <div className="flex items-end justify-between mt-3">
                        <div>
                          <p className="text-xs text-muted-foreground">سعر الوحدة</p>
                          <p className="text-primary font-bold text-lg">{item.unit_price.toLocaleString("ar-EG")} <span className="text-xs">ج.م</span></p>
                        </div>

                        {/* Quantity Controls */}
                        <div className="flex items-center gap-0 border border-border rounded-lg overflow-hidden">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            disabled={item.quantity >= item.stock_quantity}
                            className="p-2 hover:bg-primary/10 transition-colors disabled:opacity-30 text-primary"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                          <span className="text-sm font-bold min-w-[2.5rem] text-center border-x border-border py-2 bg-muted/30">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="p-2 hover:bg-primary/10 transition-colors text-primary"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Low stock warning */}
                      {item.stock_quantity <= 5 && item.stock_quantity > 0 && (
                        <div className="flex items-center gap-1 mt-2 text-[11px] text-destructive">
                          <AlertTriangle className="w-3 h-3" />
                          <span>متبقي {item.stock_quantity} فقط</span>
                        </div>
                      )}
                    </div>

                    {/* Actions & Total */}
                    <div className="flex flex-col items-end justify-between">
                      <button
                        onClick={() => removeItem(item.id)}
                        className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all opacity-50 group-hover:opacity-100"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      <div className="text-left">
                        <p className="text-xs text-muted-foreground">الإجمالي</p>
                        <p className="text-base md:text-lg font-black text-foreground">
                          {(item.unit_price * item.quantity).toLocaleString("ar-EG")} <span className="text-xs font-medium">ج.م</span>
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-card border border-border rounded-xl overflow-hidden sticky top-24"
              >
                {/* Summary Header */}
                <div className="bg-primary/5 border-b border-border px-6 py-4">
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="w-5 h-5 text-primary" />
                    <h2 className="text-lg font-bold text-card-foreground">ملخص الطلب</h2>
                  </div>
                </div>

                <div className="p-6">
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">إجمالي المنتجات ({itemCount})</span>
                      <span className="font-semibold">{subtotal.toLocaleString("ar-EG")} ج.م</span>
                    </div>
                    {discount > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>الخصم</span>
                        <span>- {discount.toLocaleString("ar-EG")} ج.م</span>
                      </div>
                    )}
                    {couponDiscount > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>خصم الكوبون</span>
                        <span>- {couponDiscount.toLocaleString("ar-EG")} ج.م</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">ضريبة القيمة المضافة (14%)</span>
                      <span className="font-semibold">{vat.toLocaleString("ar-EG")} ج.م</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">الشحن</span>
                      <span className="font-semibold">{shippingCost > 0 ? `${shippingCost.toLocaleString("ar-EG")} ج.م` : "يحدد عند الدفع"}</span>
                    </div>

                    <div className="border-t border-border pt-4 mt-4">
                      <div className="flex justify-between items-baseline">
                        <span className="text-lg font-black">الإجمالي</span>
                        <div className="text-left">
                          <span className="text-2xl font-black text-primary">{total.toLocaleString("ar-EG")}</span>
                          <span className="text-sm font-bold text-primary mr-1">ج.م</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Coupon Input */}
                  <div className="mt-5">
                    <CouponInput
                      subtotal={subtotal}
                      appliedCode={couponCode}
                      appliedDiscount={couponDiscount}
                      onApply={(amount, code) => {
                        setCouponDiscount(amount);
                        setCouponCode(code);
                      }}
                      onRemove={() => {
                        setCouponDiscount(0);
                        setCouponCode(null);
                      }}
                    />
                  </div>

                  {/* Min order warning */}
                  {belowMinOrder && (
                    <div className="mt-4 bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-2 text-destructive text-xs">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>الحد الأدنى للطلب هو {minOrderAmount.toLocaleString("ar-EG")} ج.م. أضف المزيد من المنتجات.</span>
                    </div>
                  )}

                  <Button
                    className="w-full mt-6 h-12 text-base font-bold rounded-xl shadow-lg hover:shadow-xl transition-all"
                    size="lg"
                    disabled={belowMinOrder}
                    onClick={() => navigate("/checkout")}
                  >
                    <CreditCard className="w-5 h-5 ml-2" />
                    إتمام الطلب
                  </Button>

                  {/* Trust badges */}
                  <div className="mt-5 pt-5 border-t border-border">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Shield className="w-4 h-4 text-primary/60" />
                        <span>دفع آمن 100%</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Truck className="w-4 h-4 text-primary/60" />
                        <span>توصيل سريع</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default CartPage;
