import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, Plus, Minus, ShoppingCart, ShoppingBag, ArrowRight, AlertTriangle, Package, Shield, Truck, CreditCard, Sparkles, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import CouponInput from "@/components/CouponInput";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

/**
 * Luxury Cart — matches Hero theme:
 * Carbon black background, animated grid, gold corner brackets,
 * red glow accents, shimmer CTA, premium framing.
 */
const CartPage = () => {
  const { items, removeItem, updateQuantity, subtotal, vat, shippingCost, discount, couponCode, couponDiscount, setCouponCode, setCouponDiscount, total, itemCount } = useCart();
  const { isDealer, dealerAccount } = useAuth();
  const navigate = useNavigate();

  const minOrderAmount = dealerAccount?.min_order_amount ?? 0;
  const belowMinOrder = isDealer && minOrderAmount > 0 && subtotal < minOrderAmount;

  // ====== EMPTY STATE ======
  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-carbon relative overflow-hidden">
        {/* Animated grid */}
        <div aria-hidden className="absolute inset-0 lux-grid-bg animate-lux-grid-pan opacity-40" />
        <div aria-hidden className="absolute inset-0 opacity-60" style={{ background: "radial-gradient(ellipse 70% 50% at 50% 40%, hsl(353 92% 48% / 0.18) 0%, transparent 60%)" }} />
        <div aria-hidden className="absolute inset-0" style={{ background: "radial-gradient(ellipse at center, transparent 40%, hsl(0 0% 0% / 0.7) 100%)" }} />
        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-toyota-red to-transparent opacity-80" />

        <Navbar />
        <div className="relative pt-28 pb-24">
          <div className="container mx-auto px-4 text-center">
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.6, type: "spring", stiffness: 200 }}
              className="relative w-36 h-36 mx-auto mb-10"
            >
              <div aria-hidden className="absolute inset-0 rounded-full bg-red-glow animate-lux-pulse-glow" style={{ filter: "blur(30px)" }} />
              <div aria-hidden className="absolute inset-[8%] rounded-full border border-dashed border-[hsl(var(--gold)/0.35)] animate-lux-ring-spin" />
              <div className="absolute inset-3 rounded-full bg-carbon border border-[hsl(var(--gold)/0.4)] flex items-center justify-center shadow-red-glow">
                <ShoppingCart className="w-14 h-14 text-gold/70" />
              </div>
            </motion.div>
            <motion.h1
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="font-tajawal font-black text-white text-3xl md:text-4xl mb-3"
            >
              سلة المشتريات <span className="text-toyota-red">فارغة</span>
            </motion.h1>
            <motion.div className="flex items-center justify-center gap-3 my-5" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
              <span className="h-[1px] w-12 bg-gradient-to-l from-transparent to-toyota-red" />
              <span className="w-1.5 h-1.5 rounded-full bg-toyota-red shadow-red-glow" />
              <span className="h-[1px] w-12 bg-gradient-to-r from-transparent to-toyota-red" />
            </motion.div>
            <motion.p
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.35 }}
              className="text-soft mb-10 text-lg font-tajawal"
            >
              لم تقم بإضافة أي منتجات بعد
            </motion.p>
            <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.45 }}>
              <Link
                to="/products"
                className="group relative inline-flex items-center gap-3 px-10 py-4 rounded-full bg-toyota-red text-white font-tajawal font-black text-base overflow-hidden animate-lux-red-pulse transition-transform duration-300 hover:scale-[1.04]"
              >
                <span aria-hidden className="absolute inset-y-0 -inset-x-4 bg-gradient-to-r from-transparent via-white/35 to-transparent animate-lux-shimmer-sweep" style={{ width: "40%" }} />
                <span className="relative">تصفح المنتجات</span>
                <span aria-hidden className="absolute inset-0 rounded-full ring-1 ring-white/25 pointer-events-none" />
              </Link>
            </motion.div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // ====== MAIN CART ======
  return (
    <div className="min-h-screen bg-carbon relative overflow-hidden">
      {/* Animated grid + ambient */}
      <div aria-hidden className="absolute inset-0 lux-grid-bg animate-lux-grid-pan opacity-30 pointer-events-none" />
      <div aria-hidden className="absolute inset-0 opacity-50 pointer-events-none" style={{ background: "radial-gradient(ellipse 70% 50% at 50% 20%, hsl(353 92% 48% / 0.15) 0%, transparent 60%)" }} />
      <div aria-hidden className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at center, transparent 50%, hsl(0 0% 0% / 0.6) 100%)" }} />
      <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-toyota-red to-transparent opacity-80" />

      <Navbar />
      <div className="relative pt-24 pb-20">
        <div className="container mx-auto px-4">

          {/* Luxury Header */}
          <motion.div
            initial={{ y: -15, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="flex items-center justify-between mb-10"
          >
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="relative w-11 h-11 rounded-xl bg-carbon border border-[hsl(var(--gold)/0.4)] flex items-center justify-center shadow-red-glow">
                  <ShoppingBag className="w-5 h-5 text-gold" />
                </div>
                <h1 className="font-tajawal text-2xl md:text-3xl font-black text-white">
                  سلة <span className="text-toyota-red">المشتريات</span>
                </h1>
              </div>
              <div className="flex items-center gap-2 mr-[56px]">
                <span className="h-px w-8 bg-gradient-to-l from-transparent to-toyota-red/70" />
                <p className="text-xs text-soft font-tajawal tracking-wide">
                  لديك <span className="text-gold font-bold">{itemCount}</span> منتج في السلة
                </p>
              </div>
            </div>
            <Link to="/products" className="group inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/15 hover:border-toyota-red/60 text-soft hover:text-white text-sm font-tajawal font-bold backdrop-blur-sm transition-all">
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
                    className="group relative rounded-2xl overflow-hidden bg-gradient-to-br from-[hsl(0_0%_8%)] to-[hsl(0_0%_5%)] border border-white/10 hover:border-[hsl(var(--gold)/0.4)] hover:shadow-[0_20px_40px_-20px_hsl(var(--toyota-red)/0.4)] transition-all duration-500"
                  >
                    {/* Top hairline */}
                    <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-gold/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    {/* Corner brackets */}
                    <span aria-hidden className="absolute top-2 left-2 w-3 h-3 border-t border-l border-[hsl(var(--gold)/0.5)] opacity-0 group-hover:opacity-100 transition-opacity" />
                    <span aria-hidden className="absolute top-2 right-2 w-3 h-3 border-t border-r border-[hsl(var(--gold)/0.5)] opacity-0 group-hover:opacity-100 transition-opacity" />
                    <span aria-hidden className="absolute bottom-2 left-2 w-3 h-3 border-b border-l border-[hsl(var(--gold)/0.5)] opacity-0 group-hover:opacity-100 transition-opacity" />
                    <span aria-hidden className="absolute bottom-2 right-2 w-3 h-3 border-b border-r border-[hsl(var(--gold)/0.5)] opacity-0 group-hover:opacity-100 transition-opacity" />

                    <div className="p-5 md:p-6 flex gap-5">
                      {/* Image with luxury frame (white bg per brand standard) */}
                      <div className="relative w-24 h-24 md:w-32 md:h-32 shrink-0">
                        <div aria-hidden className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-gold/30 via-toyota-red/20 to-transparent opacity-60 blur-sm" />
                        <div className="relative w-full h-full rounded-xl overflow-hidden p-2.5 flex items-center justify-center bg-white border border-[hsl(var(--gold)/0.3)]">
                          {item.image_url ? (
                            <img src={item.image_url} alt={item.name_ar} className="w-full h-full object-contain drop-shadow-sm" />
                          ) : (
                            <Package className="w-12 h-12 text-muted-foreground/20" />
                          )}
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                        <div>
                          <div className="flex items-start justify-between gap-3">
                            <h3 className="font-tajawal font-bold text-white text-sm md:text-[15px] leading-relaxed line-clamp-2">{item.name_ar}</h3>
                            <button
                              onClick={() => removeItem(item.id)}
                              className="p-2 rounded-xl text-white/30 hover:text-toyota-red hover:bg-toyota-red/10 transition-all shrink-0 border border-transparent hover:border-toyota-red/30"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <span className="inline-flex items-center gap-1 text-[11px] text-gold/80 font-mono mt-2 bg-carbon/60 px-2.5 py-1 rounded-md border border-[hsl(var(--gold)/0.25)]">
                            {item.sku}
                          </span>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between mt-4 gap-3">
                          {/* Price + Quantity row */}
                          <div className="flex items-end justify-between sm:justify-start sm:gap-5 w-full sm:w-auto">
                            {/* Price */}
                            <div>
                              <p className="text-[10px] text-soft mb-1 tracking-[0.2em] font-display font-bold uppercase">سعر الوحدة</p>
                              <p className="text-toyota-red font-display font-black text-lg sm:text-xl leading-none tracking-tight" style={{ textShadow: "0 0 12px hsl(var(--toyota-red) / 0.4)" }}>
                                {item.unit_price.toLocaleString("ar-EG")}
                                <span className="text-xs font-semibold mr-1 text-white/70">ج.م</span>
                              </p>
                            </div>

                            {/* Quantity Controls */}
                            <div className="flex items-center rounded-xl border border-[hsl(var(--gold)/0.3)] overflow-hidden shadow-sm bg-carbon">
                              <button
                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                disabled={item.quantity >= item.stock_quantity}
                                className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center text-white/80 hover:bg-toyota-red hover:text-white transition-colors disabled:opacity-30"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                              <span className="text-sm font-black min-w-[2.5rem] sm:min-w-[3rem] text-center border-x border-[hsl(var(--gold)/0.3)] py-2 sm:py-2.5 bg-white/5 text-white">{item.quantity}</span>
                              <button
                                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center text-white/80 hover:bg-toyota-red hover:text-white transition-colors"
                              >
                                <Minus className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* Item Total */}
                          <div className="flex items-center justify-between sm:block sm:text-left bg-white/5 sm:bg-transparent rounded-lg px-3 py-2 sm:p-0 border border-white/10 sm:border-0">
                            <p className="text-[10px] text-soft mb-0 sm:mb-1 tracking-[0.2em] font-display font-bold uppercase">الإجمالي</p>
                            <p className="text-lg sm:text-xl font-black text-white leading-none">
                              {(item.unit_price * item.quantity).toLocaleString("ar-EG")}
                              <span className="text-xs font-semibold mr-1 text-gold">ج.م</span>
                            </p>
                          </div>
                        </div>

                        {/* Low stock */}
                        {item.stock_quantity <= 5 && item.stock_quantity > 0 && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex items-center gap-1.5 mt-3 text-[11px] text-toyota-red bg-toyota-red/10 border border-toyota-red/30 rounded-lg px-2.5 py-1.5 w-fit"
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
                className="relative rounded-2xl overflow-hidden sticky top-24 border border-[hsl(var(--gold)/0.35)] shadow-[0_25px_50px_-15px_hsl(var(--toyota-red)/0.35)]"
              >
                {/* Corner brackets on whole card */}
                <span aria-hidden className="pointer-events-none absolute top-2 left-2 w-4 h-4 border-t border-l border-[hsl(var(--gold)/0.6)] z-20" />
                <span aria-hidden className="pointer-events-none absolute top-2 right-2 w-4 h-4 border-t border-r border-[hsl(var(--gold)/0.6)] z-20" />
                <span aria-hidden className="pointer-events-none absolute bottom-2 left-2 w-4 h-4 border-b border-l border-[hsl(var(--gold)/0.6)] z-20" />
                <span aria-hidden className="pointer-events-none absolute bottom-2 right-2 w-4 h-4 border-b border-r border-[hsl(var(--gold)/0.6)] z-20" />

                {/* Premium Header */}
                <div className="relative bg-carbon text-white px-6 py-5 border-b border-[hsl(var(--gold)/0.3)]">
                  <div aria-hidden className="absolute inset-0 lux-grid-bg opacity-20" />
                  <div aria-hidden className="absolute inset-0 opacity-70" style={{ background: 'radial-gradient(circle at 30% 50%, hsl(var(--toyota-red) / 0.25) 0%, transparent 60%)' }} />
                  <div className="relative flex items-center gap-3">
                    <div className="relative w-10 h-10 rounded-lg bg-toyota-red/20 border border-[hsl(var(--gold)/0.5)] flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-gold" />
                    </div>
                    <div>
                      <h2 className="font-tajawal text-base font-black tracking-wide">ملخص الطلب</h2>
                      <p className="text-[11px] text-soft mt-0.5 font-display tracking-[0.2em] uppercase">{itemCount} ITEM</p>
                    </div>
                  </div>
                </div>

                <div className="relative bg-gradient-to-br from-[hsl(0_0%_8%)] to-[hsl(0_0%_5%)] p-6">
                  {/* Line items */}
                  <div className="space-y-3.5 text-sm font-tajawal">
                    <div className="flex justify-between items-center">
                      <span className="text-soft">إجمالي المنتجات</span>
                      <span className="font-bold text-white">{subtotal.toLocaleString("ar-EG")} ج.م</span>
                    </div>
                    {discount > 0 && (
                      <motion.div initial={{ x: 10, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="flex justify-between items-center">
                        <span className="text-green-400 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> خصم</span>
                        <span className="text-green-400 font-bold">- {discount.toLocaleString("ar-EG")} ج.م</span>
                      </motion.div>
                    )}
                    {couponDiscount > 0 && (
                      <motion.div initial={{ x: 10, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="flex justify-between items-center">
                        <span className="text-green-400 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> خصم الكوبون</span>
                        <span className="text-green-400 font-bold">- {couponDiscount.toLocaleString("ar-EG")} ج.م</span>
                      </motion.div>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-soft">الشحن</span>
                      <span className="font-bold text-white/80">{shippingCost > 0 ? `${shippingCost.toLocaleString("ar-EG")} ج.م` : "يحدد لاحقاً"}</span>
                    </div>
                  </div>

                  {/* Divider with sparkle */}
                  <div className="my-5 flex items-center gap-3">
                    <span className="flex-1 h-px bg-gradient-to-l from-transparent to-[hsl(var(--gold)/0.4)]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-toyota-red shadow-red-glow" />
                    <span className="flex-1 h-px bg-gradient-to-r from-transparent to-[hsl(var(--gold)/0.4)]" />
                  </div>

                  {/* Grand Total */}
                  <div>
                    <div className="flex justify-between items-center">
                      <span className="font-tajawal text-lg font-black text-white">الإجمالي</span>
                      <div className="text-left">
                        <motion.span
                          key={total}
                          initial={{ scale: 1.15 }}
                          animate={{ scale: 1 }}
                          className="text-3xl font-black text-toyota-red inline-block font-display"
                          style={{ textShadow: "0 0 18px hsl(var(--toyota-red) / 0.55)" }}
                        >
                          {total.toLocaleString("ar-EG")}
                        </motion.span>
                        <span className="text-sm font-bold text-gold mr-1">ج.م</span>
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
                      className="mt-4 bg-toyota-red/10 border border-toyota-red/40 rounded-xl p-3.5 flex items-start gap-2 text-toyota-red text-xs"
                    >
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span className="font-medium">الحد الأدنى للطلب {minOrderAmount.toLocaleString("ar-EG")} ج.م</span>
                    </motion.div>
                  )}

                  {/* CTA Button — Hero-style shimmer */}
                  <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} className="mt-6">
                    <button
                      disabled={belowMinOrder}
                      onClick={() => navigate("/checkout")}
                      className="group relative w-full h-14 rounded-xl bg-toyota-red text-white font-tajawal font-black text-base overflow-hidden animate-lux-red-pulse transition-all duration-300 hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed disabled:animate-none flex items-center justify-center gap-2 border border-[hsl(var(--gold)/0.4)]"
                    >
                      <span aria-hidden className="absolute inset-y-0 -inset-x-4 bg-gradient-to-r from-transparent via-white/35 to-transparent animate-lux-shimmer-sweep pointer-events-none" style={{ width: "40%" }} />
                      <CreditCard className="relative w-5 h-5" />
                      <span className="relative">إتمام الطلب</span>
                      <span aria-hidden className="absolute inset-0 rounded-xl ring-1 ring-white/25 pointer-events-none" />
                    </button>
                  </motion.div>

                  {/* Trust Section */}
                  <div className="mt-6 pt-5 border-t border-[hsl(var(--gold)/0.2)]">
                    <div className="flex items-center justify-center gap-6">
                      <div className="flex flex-col items-center gap-1.5 text-soft">
                        <div className="w-10 h-10 rounded-full bg-carbon border border-[hsl(var(--gold)/0.4)] flex items-center justify-center shadow-red-glow">
                          <Shield className="w-4 h-4 text-gold" />
                        </div>
                        <span className="text-[10px] font-display font-bold tracking-wider text-white/70">دفع آمن</span>
                      </div>
                      <div className="w-px h-10 bg-gradient-to-b from-transparent via-[hsl(var(--gold)/0.4)] to-transparent" />
                      <div className="flex flex-col items-center gap-1.5 text-soft">
                        <div className="w-10 h-10 rounded-full bg-carbon border border-[hsl(var(--gold)/0.4)] flex items-center justify-center shadow-red-glow">
                          <Truck className="w-4 h-4 text-gold" />
                        </div>
                        <span className="text-[10px] font-display font-bold tracking-wider text-white/70">شحن سريع</span>
                      </div>
                      <div className="w-px h-10 bg-gradient-to-b from-transparent via-[hsl(var(--gold)/0.4)] to-transparent" />
                      <div className="flex flex-col items-center gap-1.5 text-soft">
                        <div className="w-10 h-10 rounded-full bg-carbon border border-[hsl(var(--gold)/0.4)] flex items-center justify-center shadow-red-glow">
                          <CheckCircle2 className="w-4 h-4 text-gold" />
                        </div>
                        <span className="text-[10px] font-display font-bold tracking-wider text-white/70">أصلي 100%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom red hairline */}
      <div className="absolute bottom-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-toyota-red to-transparent opacity-80" />
      <Footer />
    </div>
  );
};

export default CartPage;
