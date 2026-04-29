import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, Plus, Minus, ShoppingCart, ShoppingBag, ArrowRight, AlertTriangle, Package, Shield, Truck, CreditCard, Sparkles, CheckCircle2 } from "lucide-react";
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
          <div className="container mx-auto px-4 text-center py-24">
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.6, type: "spring", stiffness: 200 }}
              className="relative w-32 h-32 mx-auto mb-10"
            >
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/10 to-primary/5 animate-pulse" />
              <div className="absolute inset-2 rounded-full bg-card border border-border flex items-center justify-center shadow-xl">
                <ShoppingCart className="w-14 h-14 text-muted-foreground/25" />
              </div>
            </motion.div>
            <motion.h1
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-3xl font-black text-foreground mb-3"
            >
              سلة المشتريات فارغة
            </motion.h1>
            <motion.p
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-muted-foreground mb-10 text-lg"
            >
              لم تقم بإضافة أي منتجات بعد
            </motion.p>
            <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }}>
              <Button asChild size="lg" className="px-10 h-13 text-base font-bold rounded-xl shadow-lg">
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
      <div className="pt-24 pb-16">
        <div className="container mx-auto px-4">

          {/* Luxury Header */}
          <motion.div
            initial={{ y: -15, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="flex items-center justify-between mb-10"
          >
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <ShoppingBag className="w-5 h-5 text-primary" />
                </div>
                <h1 className="text-2xl md:text-3xl font-black text-foreground">
                  سلة المشتريات
                </h1>
              </div>
              <p className="text-sm text-muted-foreground mt-1 mr-[52px]">
                لديك {itemCount} منتج في السلة
              </p>
            </div>
            <Link to="/products" className="text-sm text-primary hover:text-primary/80 flex items-center gap-1.5 font-semibold transition-colors group">
              <ArrowRight className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              متابعة التسوق
            </Link>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              <AnimatePresence mode="popLayout">
                {items.map((item, i) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    transition={{ delay: i * 0.06, type: "spring", stiffness: 400, damping: 35 }}
                    className="group relative bg-card rounded-2xl border border-border overflow-hidden hover:shadow-xl hover:shadow-primary/5 hover:border-primary/20 transition-all duration-500"
                  >
                    {/* Subtle top accent line */}
                    <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-l from-transparent via-primary/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                    <div className="p-5 md:p-6 flex gap-5">
                      {/* Image with luxury frame */}
                      <div className="relative w-24 h-24 md:w-32 md:h-32 shrink-0">
                        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-muted/50 to-muted/20 border border-border" />
                        <div className="relative w-full h-full rounded-xl overflow-hidden p-2.5 flex items-center justify-center bg-white">
                          {item.image_url ? (
                            <img src={item.image_url} alt={item.name_ar} className="w-full h-full object-contain drop-shadow-sm" />
                          ) : (
                            <Package className="w-12 h-12 text-muted-foreground/15" />
                          )}
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                        <div>
                          <div className="flex items-start justify-between gap-3">
                            <h3 className="font-bold text-card-foreground text-sm md:text-[15px] leading-relaxed line-clamp-2">{item.name_ar}</h3>
                            <button
                              onClick={() => removeItem(item.id)}
                              className="p-2 rounded-xl text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-all shrink-0"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground font-mono mt-2 bg-muted/60 px-2.5 py-1 rounded-md">
                            {item.sku}
                          </span>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between mt-4 gap-3">
                          {/* Price + Quantity row on mobile */}
                          <div className="flex items-end justify-between sm:justify-start sm:gap-5 w-full sm:w-auto">
                            {/* Price */}
                            <div>
                              <p className="text-[11px] text-muted-foreground mb-0.5">سعر الوحدة</p>
                              <p className="text-primary font-black text-lg sm:text-xl leading-none tracking-tight">
                                {item.unit_price.toLocaleString("ar-EG")}
                                <span className="text-xs font-semibold mr-1">ج.م</span>
                              </p>
                            </div>

                            {/* Quantity Controls */}
                            <div className="flex items-center rounded-xl border border-border overflow-hidden shadow-sm bg-card">
                              <button
                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                disabled={item.quantity >= item.stock_quantity}
                                className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors disabled:opacity-30"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                              <span className="text-sm font-black min-w-[2.5rem] sm:min-w-[3rem] text-center border-x border-border py-2 sm:py-2.5 bg-muted/20">{item.quantity}</span>
                              <button
                                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors"
                              >
                                <Minus className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* Item Total */}
                          <div className="flex items-center justify-between sm:block sm:text-left bg-muted/20 sm:bg-transparent rounded-lg px-3 py-2 sm:p-0">
                            <p className="text-[11px] text-muted-foreground mb-0 sm:mb-0.5">الإجمالي</p>
                            <p className="text-lg sm:text-xl font-black text-foreground leading-none">
                              {(item.unit_price * item.quantity).toLocaleString("ar-EG")}
                              <span className="text-xs font-semibold mr-1">ج.م</span>
                            </p>
                          </div>
                        </div>

                        {/* Low stock */}
                        {item.stock_quantity <= 5 && item.stock_quantity > 0 && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex items-center gap-1.5 mt-3 text-[11px] text-destructive bg-destructive/5 rounded-lg px-2.5 py-1.5 w-fit"
                          >
                            <AlertTriangle className="w-3 h-3" />
                            <span className="font-medium">متبقي {item.stock_quantity} فقط — اطلب الآن!</span>
                          </motion.div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Order Summary - Luxury Card */}
            <div className="lg:col-span-1">
              <motion.div
                initial={{ opacity: 0, y: 25 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="rounded-2xl overflow-hidden sticky top-24 border border-border shadow-lg shadow-primary/5"
              >
                {/* Premium Header */}
                <div className="relative bg-secondary text-secondary-foreground px-6 py-5">
                  <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 30% 50%, hsl(var(--primary)) 0%, transparent 60%)' }} />
                  <div className="relative flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold">ملخص الطلب</h2>
                      <p className="text-xs opacity-70 mt-0.5">{itemCount} منتج</p>
                    </div>
                  </div>
                </div>

                <div className="bg-card p-6">
                  {/* Line items */}
                  <div className="space-y-3.5 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">إجمالي المنتجات</span>
                      <span className="font-bold">{subtotal.toLocaleString("ar-EG")} ج.م</span>
                    </div>
                    {discount > 0 && (
                      <motion.div initial={{ x: 10, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="flex justify-between items-center">
                        <span className="text-green-600 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> خصم</span>
                        <span className="text-green-600 font-bold">- {discount.toLocaleString("ar-EG")} ج.م</span>
                      </motion.div>
                    )}
                    {couponDiscount > 0 && (
                      <motion.div initial={{ x: 10, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="flex justify-between items-center">
                        <span className="text-green-600 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> خصم الكوبون</span>
                        <span className="text-green-600 font-bold">- {couponDiscount.toLocaleString("ar-EG")} ج.م</span>
                      </motion.div>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">الشحن</span>
                      <span className="font-bold">{shippingCost > 0 ? `${shippingCost.toLocaleString("ar-EG")} ج.م` : "يحدد لاحقاً"}</span>
                    </div>
                  </div>

                  {/* Grand Total */}
                  <div className="mt-5 pt-5 border-t border-border">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-black text-foreground">الإجمالي</span>
                      <div className="text-left">
                        <motion.span
                          key={total}
                          initial={{ scale: 1.1 }}
                          animate={{ scale: 1 }}
                          className="text-3xl font-black text-primary inline-block"
                        >
                          {total.toLocaleString("ar-EG")}
                        </motion.span>
                        <span className="text-sm font-bold text-primary mr-1">ج.م</span>
                      </div>
                    </div>
                  </div>

                  {/* Coupon */}
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
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-4 bg-destructive/5 border border-destructive/20 rounded-xl p-3.5 flex items-start gap-2 text-destructive text-xs"
                    >
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span className="font-medium">الحد الأدنى للطلب {minOrderAmount.toLocaleString("ar-EG")} ج.م</span>
                    </motion.div>
                  )}

                  {/* CTA Button */}
                  <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} className="mt-6">
                    <Button
                      className="w-full h-14 text-base font-black rounded-xl shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300"
                      size="lg"
                      disabled={belowMinOrder}
                      onClick={() => navigate("/checkout")}
                    >
                      <CreditCard className="w-5 h-5 ml-2" />
                      إتمام الطلب
                    </Button>
                  </motion.div>

                  {/* Trust Section */}
                  <div className="mt-6 pt-5 border-t border-border">
                    <div className="flex items-center justify-center gap-6">
                      <div className="flex flex-col items-center gap-1.5 text-muted-foreground">
                        <div className="w-9 h-9 rounded-full bg-primary/5 flex items-center justify-center">
                          <Shield className="w-4 h-4 text-primary/70" />
                        </div>
                        <span className="text-[10px] font-medium">دفع آمن</span>
                      </div>
                      <div className="w-px h-8 bg-border" />
                      <div className="flex flex-col items-center gap-1.5 text-muted-foreground">
                        <div className="w-9 h-9 rounded-full bg-primary/5 flex items-center justify-center">
                          <Truck className="w-4 h-4 text-primary/70" />
                        </div>
                        <span className="text-[10px] font-medium">شحن سريع</span>
                      </div>
                      <div className="w-px h-8 bg-border" />
                      <div className="flex flex-col items-center gap-1.5 text-muted-foreground">
                        <div className="w-9 h-9 rounded-full bg-primary/5 flex items-center justify-center">
                          <CheckCircle2 className="w-4 h-4 text-primary/70" />
                        </div>
                        <span className="text-[10px] font-medium">أصلي 100%</span>
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
